import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { View, Preload } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { backgroundVertex, backgroundFragment } from './shaders/background'

/**
 * Layer 1: the single persistent WebGL canvas. Mounted once in App,
 * never unmounts across routes. Every 3D surface on the site is a
 * <View> rendered through View.Port here.
 */
export default function CanvasRoot() {
  return (
    <div className="canvas-root" aria-hidden>
      <Canvas
        eventSource={document.body}
        eventPrefix="client"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <BackgroundPass />
        <View.Port />
        <Preload all />
      </Canvas>
    </div>
  )
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

  useMemo(() => {
    scene.add(mesh)
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
