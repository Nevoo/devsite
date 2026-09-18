import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { softwareGL } from '@/lib/webgl'
import { useUI } from '@/stores/ui'
import { backgroundVertex, backgroundFragment } from './shaders/background'
import {
  dustSimVertex,
  dustSimFragment,
  dustPointsVertex,
  dustPointsFragment,
} from './shaders/dust'
import { patchDotAlpha, patchGlobeSurface } from './shaders/globe'
import { imagePlaneVertex, imagePlaneFragment } from './shaders/imagePlane'

/**
 * Layer 1: the single persistent WebGL canvas. Mounted once in App,
 * never unmounts across routes. Every 3D surface on the site is a
 * <View> rendered through View.Port here.
 *
 * NO MSAA WHERE THERE IS NO GPU, and this is a measurement, not a taste.
 *
 * This canvas sits BEHIND the page (`.canvas-root`, z-index 1, `main` on top),
 * so the compositor cannot hand it straight to the screen: it has to sample it
 * as a texture and draw the page over it. Every such sample costs a resolve of
 * the multisampled buffer plus a copy of the result — and on the home route,
 * where the hero is a full-viewport transparent hole with the planet showing
 * through, that sample covers the entire canvas rather than a few small image
 * frames. Traced in the audit harness's Chrome (ANGLE/SwiftShader, so the copy
 * runs on the CPU): 246 resolve+readback pairs at ~8ms each, 1.98s of GPU-side
 * work, all of it landing between the /contact → / route commit and the point
 * where the transition's reveal needs a frame. The main thread was idle for the
 * whole 1.9s — nothing was compiling, nothing was uploading, the page simply
 * could not get a frame out. maskedMs measured 2.4s against a ~675ms family
 * median. Dropping MSAA cuts each pair to ~2.6ms and the stall with it.
 *
 * Almost nothing here was buying anything from it. The globe is point sprites
 * (square by construction — their softness is the shader's per-dot alpha, not
 * coverage sampling), the photographs are axis-aligned quads clipped by a
 * View's scissor, and the occluder sphere's silhouette is #17171b against a
 * #101013 page. Side-by-side captures of the settled hero at dpr 2 are
 * pixel-comparable everywhere except one place, and that place is a real cost,
 * not a free lunch: THE ROUTE ARCS STEP. They are the only diagonal 1px edges
 * in the composition, and below dpr 2 the staircase is visible on a slow curve.
 *
 * WHICH IS WHY THIS IS A BRANCH AND NOT A CONSTANT. The whole cost above is a
 * property of CPU rasterisation: a software renderer pays ~8ms per resolve and
 * copy and buys responsiveness by giving up the smoothing, while a real GPU
 * pays close to nothing for the same sample and keeps the line clean. So the
 * question is not "is MSAA worth it" but "is there a GPU here" (softwareGL),
 * and VMs, blocklisted drivers and the audit harness answer it for themselves.
 *
 * `alpha` stays true: the canvas is the bottom layer and the page's own
 * background has to survive under it. Measured at no cost either way.
 */
export default function CanvasRoot() {
  return (
    <div className="canvas-root" aria-hidden>
      <Canvas
        eventSource={document.body}
        eventPrefix="client"
        dpr={[1, 1.75]}
        gl={{ antialias: !softwareGL(), alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <FrameloopGate />
        <ShaderProgramWarmup />
        <BackgroundPass />
        <View.Port />
      </Canvas>
    </div>
  )
}

/**
 * Hold one reference to each route-owned program in the persistent renderer.
 * Three destroys a cached WebGLProgram when the last material using it is
 * disposed, which otherwise turns every Home remount into a cold shader link.
 *
 * WebGLRenderer.compileAsync() cannot solve that on devices without
 * KHR_parallel_shader_compile: it calls compile() synchronously before it
 * returns a Promise. Compile the actual cache variants here instead, one
 * per frame, ahead of navigation. The retained objects contain no textures and
 * are disposed if the root canvas ever unmounts.
 */
function ShaderProgramWarmup() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const camera = new THREE.PerspectiveCamera()
    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    pointGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute([1], 1))
    pointGeometry.setAttribute('aPlate', new THREE.Float32BufferAttribute([0, 0, 0], 3))
    pointGeometry.setAttribute('aTint', new THREE.Float32BufferAttribute([0], 1))
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    )
    lineGeometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute([1, 1], 1))
    lineGeometry.setAttribute(
      'aPlate',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    )
    lineGeometry.setAttribute('aTint', new THREE.Float32BufferAttribute([0, 0], 1))
    const planeGeometry = new THREE.PlaneGeometry(1, 1)

    const pointsMaterial = new THREE.PointsMaterial({
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
    pointsMaterial.onBeforeCompile = patchDotAlpha
    const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false })
    lineMaterial.onBeforeCompile = patchDotAlpha
    const occluderMaterial = new THREE.MeshBasicMaterial({ transparent: true })
    occluderMaterial.onBeforeCompile = patchGlobeSurface
    const imageMaterial = new THREE.ShaderMaterial({
      vertexShader: imagePlaneVertex,
      fragmentShader: imagePlaneFragment,
    })
    const transparentImageMaterial = new THREE.ShaderMaterial({
      vertexShader: imagePlaneVertex,
      fragmentShader: imagePlaneFragment,
      transparent: true,
    })

    const warmups: THREE.Object3D[] = [
      new THREE.Points(pointGeometry, pointsMaterial),
      new THREE.LineSegments(lineGeometry, lineMaterial),
      new THREE.Mesh(planeGeometry, occluderMaterial),
      new THREE.Mesh(planeGeometry, imageMaterial),
      new THREE.Mesh(planeGeometry, transparentImageMaterial),
    ]

    // the dust programs (sim quad + points), same gate as <Dust> itself:
    // where dust never renders there is nothing to keep warm
    const dustMaterials: THREE.Material[] = []
    if (!softwareGL() && !prefersReducedMotion()) {
      const dustSimMaterial = new THREE.ShaderMaterial({
        vertexShader: dustSimVertex,
        fragmentShader: dustSimFragment,
        uniforms: {
          positions: { value: null },
          uTime: { value: 0 },
          uCurlFreq: { value: 0.25 },
          uCondense: { value: 0 },
          uCondenseRadius: { value: 1.2 },
        },
      })
      const dustPointsMaterial = new THREE.ShaderMaterial({
        vertexShader: dustPointsVertex,
        fragmentShader: dustPointsFragment,
        uniforms: {
          positions: { value: null },
          uFocus: { value: 5 },
          uBlur: { value: 34 },
          uSize: { value: 2 },
          uDensity: { value: 0.35 },
          uOpacity: { value: 0.5 },
          uColor: { value: new THREE.Color() },
          uAccent: { value: new THREE.Color() },
          uAccentFrac: { value: 0 },
          uPointerView: { value: new THREE.Vector3(0, 0, -1) },
          uForce: { value: 0 },
          uPointerRadius: { value: 0.3 },
          uBoundsMode: { value: 0 },
          uBoundsA: { value: new THREE.Vector3(1, 1, 1) },
          uBoundsCenter: { value: new THREE.Vector3() },
        },
        transparent: true,
      })
      dustMaterials.push(dustSimMaterial, dustPointsMaterial)
      warmups.push(
        new THREE.Mesh(planeGeometry, dustSimMaterial),
        new THREE.Points(pointGeometry, dustPointsMaterial)
      )
    }
    let index = 0
    let frame = window.requestAnimationFrame(function compileNext() {
      gl.compile(warmups[index], camera, scene)
      index += 1
      if (index < warmups.length) frame = window.requestAnimationFrame(compileNext)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      pointGeometry.dispose()
      lineGeometry.dispose()
      planeGeometry.dispose()
      pointsMaterial.dispose()
      lineMaterial.dispose()
      occluderMaterial.dispose()
      imageMaterial.dispose()
      transparentImageMaterial.dispose()
      for (const material of dustMaterials) material.dispose()
    }
  }, [gl, scene])

  return null
}

function FrameloopGate() {
  const frozen = useUI((s) => s.canvasFrozen)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const [hidden, setHidden] = useState(() => document.hidden)

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    // One arbiter owns the render loop. The transition freeze remains mandatory
    // for a tear-free route swap. Hero visibility gates its own simulation and
    // projection: the other image Views must keep rendering after it scrolls away.
    // A controlled 20-navigation bisection found that stopping/restarting the
    // loop retains ~900KB–1MB more heap than never toggling it. A raw store write
    // retained the same amount, so allocation reduction lives in the View/image
    // lifecycle rather than in weakening this correctness boundary.
    setFrameloop(frozen || hidden ? 'never' : 'always')
  }, [frozen, hidden, setFrameloop])

  return null
}

/**
 * Fullscreen pass that runs BEFORE the Views every frame (priority 0.5 vs 1).
 * Does double duty: repaints the entire canvas (without it, Views smear stale
 * pixels while scrolling) and gives the site its darkroom backdrop — a slow
 * warm/cool drift, vignette, dither. Deliberately has nothing that tracks the
 * pointer: the backdrop is the room, not an object in it.
 */
function BackgroundPass() {
  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
  const reduced = useMemo(() => prefersReducedMotion(), [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    []
  )

  const mesh = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: backgroundVertex,
      fragmentShader: backgroundFragment,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    return quad
  }, [uniforms])

  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
  }, [scene, mesh])

  useFrame((state, delta) => {
    if (!reduced) uniforms.uTime.value += delta
    uniforms.uRes.value.set(state.size.width, state.size.height)

    // full-canvas pass: reset any scissor left by a View, repaint everything
    state.gl.setScissorTest(false)
    state.gl.setViewport(0, 0, state.size.width, state.size.height)
    state.gl.render(scene, camera)
  }, 0.5)

  return null
}
