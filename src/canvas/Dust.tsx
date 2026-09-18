import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { softwareGL } from '@/lib/webgl'
import {
  dustSimVertex,
  dustSimFragment,
  dustPointsVertex,
  dustPointsFragment,
} from './shaders/dust'
import type { GlobePointer } from './Globe'
import type { DustBounds, DustPreset } from './dustSettings'

interface DustProps {
  /**
   * the look — read per frame, never re-renders the tree. Production passes
   * a ref to a frozen preset; the lab passes its slider-fed settings ref.
   */
  presetRef: { current: DustPreset }
  /** position texture is size×size → size² particles (DUST_PROD_MAX_SIZE caps production) */
  size: number
  /** where the cloud lives in the mounting view's scene units */
  bounds: DustBounds
  /** the DOM's pointer over the mounting frame — same contract the globe reads */
  pointerRef: { current: GlobePointer }
  /**
   * optional scale coupling: dust fades out as presence rises (the dive is
   * D3's job — until then the air belongs to the world scale only). Accepts
   * the globe's ScaleState ref directly.
   */
  presenceRef?: { current: { presence: number } }
  /** A mounting View may pause its own field without stopping other Views. */
  visibilityRef?: { current: boolean }
}

/** rejection-sample a point in the unit ball, project to the sphere surface */
function getSphere(count: number, radius: number) {
  const data = new Float32Array(count * 4)
  const v = new THREE.Vector3()
  for (let i = 0; i < count * 4; i += 4) {
    do {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
    } while (v.lengthSq() > 1 || v.lengthSq() === 0)
    v.normalize().multiplyScalar(radius)
    data[i] = v.x
    data[i + 1] = v.y
    data[i + 2] = v.z
    data[i + 3] = 1
  }
  return data
}

const ORIGIN: readonly [number, number, number] = [0, 0, 0]

/**
 * Darkroom air: the GPGPU curl-noise ambience with the pointer parting, the
 * production layer extracted from /lab/particles (DUST-PLAN stage D1).
 *
 * A float FBO holds the canonical cloud (stateless positions = f(base, t)),
 * drawn as soft fake-DoF points shaped by `bounds`. The pointer is treated as
 * the camera→cursor RAY: dots are pushed radially clear of it at their own
 * depth, force follows hand speed and releases slowly. That mass response is
 * the only legible interaction in a dense cloud — individual motes never
 * read (the lesson that cost four lab rounds).
 *
 * Camera-agnostic on purpose: the ray derives from the mounting view's live
 * projection each frame (perspective cameras only), so the same component
 * serves the lab's z=6/fov 25 and the globe's plate camera. Dust is the air
 * of the darkroom, never the data — it carries no information and never
 * displaces the globe's dots.
 *
 * The sim render runs at useFrame priority 0, ahead of BackgroundPass (0.5)
 * and the View renders (1+).
 */
export function Dust(props: DustProps) {
  // no GPU, no air: the audit harness (SwiftShader) must not see dust, and
  // reduced-motion gets nothing rather than a frozen field (taste call open
  // on a static sprinkle — absence is the conservative default)
  const gated = useMemo(() => softwareGL() || prefersReducedMotion(), [])
  if (gated) return null
  return <DustField {...props} />
}

function DustField({ presetRef, size, bounds, pointerRef, presenceRef, visibilityRef }: DustProps) {
  const timeRef = useRef(0)
  const camera = useThree((state) => state.camera)

  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    // half float renders everywhere WebGL2 runs; plenty of precision here
    type: THREE.HalfFloatType,
  })

  const sim = useMemo(() => {
    // radius 128 matches the source demo: it is the noise-domain scale, not a
    // scene position — the curl field output lives around the origin
    const baseTexture = new THREE.DataTexture(
      getSphere(size * size, 128),
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    baseTexture.needsUpdate = true

    const material = new THREE.ShaderMaterial({
      vertexShader: dustSimVertex,
      fragmentShader: dustSimFragment,
      uniforms: {
        positions: { value: baseTexture },
        uTime: { value: 0 },
        uCurlFreq: { value: 0.25 },
        uCondense: { value: 0 },
        uCondenseRadius: { value: 1.2 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    scene.add(quad)
    return { scene, camera, quad, material, baseTexture }
  }, [size])

  const points = useMemo(() => {
    // per-point position.xy is the texel to read; z unused
    const length = size * size
    const uvs = new Float32Array(length * 3)
    for (let i = 0; i < length; i++) {
      uvs[i * 3] = (i % size) / size
      uvs[i * 3 + 1] = Math.floor(i / size) / size
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(uvs, 3))

    const material = new THREE.ShaderMaterial({
      vertexShader: dustPointsVertex,
      fragmentShader: dustPointsFragment,
      uniforms: {
        positions: { value: null },
        uFocus: { value: 5.1 },
        uBlur: { value: 34 },
        uSize: { value: 2 },
        uDensity: { value: 0.35 },
        uOpacity: { value: 0.55 },
        uColor: { value: new THREE.Color('#f4efe9') },
        uAccent: { value: new THREE.Color('#ff2d1a') },
        uAccentFrac: { value: 0.04 },
        uPointerView: { value: new THREE.Vector3(0, 0, -1) },
        uForce: { value: 0 },
        uPointerRadius: { value: 0.3 },
        uBoundsMode: { value: 0 },
        uBoundsA: { value: new THREE.Vector3(1, 1, 1) },
        uBoundsCenter: { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite: false,
    })
    const object = new THREE.Points(geometry, material)
    // real positions live in the FBO — the buffer's bounds are meaningless
    object.frustumCulled = false
    return { object, geometry, material }
  }, [size])

  useEffect(() => {
    return () => {
      sim.quad.geometry.dispose()
      sim.material.dispose()
      sim.baseTexture.dispose()
    }
  }, [sim])

  useEffect(() => {
    return () => {
      points.geometry.dispose()
      points.material.dispose()
    }
  }, [points])

  // bounds are structural per mount (D3 will animate them off ScaleState)
  useEffect(() => {
    const u = points.material.uniforms
    const center = bounds.center ?? [0, 0, 0]
    ;(u.uBoundsCenter.value as THREE.Vector3).set(...center)
    const a = u.uBoundsA.value as THREE.Vector3
    if (bounds.kind === 'ball') {
      u.uBoundsMode.value = 0
      a.setScalar(bounds.radius / 2)
    } else if (bounds.kind === 'shell') {
      u.uBoundsMode.value = 1
      a.set(bounds.inner, bounds.outer, 0)
    } else {
      u.uBoundsMode.value = 2
      a.set(...bounds.extents)
    }
  }, [points, bounds])

  // pointer state in view-space units at the cloud's depth: the smoothing
  // sweeps rather than teleports, and the force envelope follows hand speed
  const pointer = useRef({
    target: new THREE.Vector3(),
    smoothed: new THREE.Vector3(),
    prev: new THREE.Vector3(),
    step: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    force: 0,
    seen: false,
  })
  const scratch = useRef({
    ray: new THREE.Vector3(),
    center: new THREE.Vector3(),
  })

  useFrame((state, delta) => {
    if (visibilityRef && !visibilityRef.current) {
      points.object.visible = false
      return
    }
    const s = presetRef.current

    // faded out (deep in the dive): stop paying for the sim entirely — the
    // air freezes invisible and resumes when the return brings it back
    const dim = 1 - (presenceRef?.current.presence ?? 0)
    if (dim <= 0.01) {
      points.object.visible = false
      return
    }
    points.object.visible = true

    timeRef.current += delta * s.speed

    // ── the cursor ray, from the live view camera ──
    // The parting needs one point on the camera→cursor ray in view space.
    // Unproject the frame-relative pointer through the actual projection
    // (no analytic camera assumptions — the plate camera moves), then scale
    // the near-plane point out to the bounds-centre depth so uPointerRadius
    // keeps meaning "channel radius at the cloud", same as the lab tuning.
    const p = pointer.current
    const v = scratch.current
    const center = bounds.center ?? ORIGIN
    v.center.set(center[0], center[1], center[2]).applyMatrix4(camera.matrixWorldInverse)
    const refDepth = Math.max(-v.center.z, 0.001)

    const gp = pointerRef.current
    if (gp.active) {
      v.ray
        .set(gp.x * 2 - 1, -(gp.y * 2 - 1), -1)
        .applyMatrix4(camera.projectionMatrixInverse)
      v.ray.multiplyScalar(refDepth / Math.max(-v.ray.z, 1e-6))
      p.target.set(v.ray.x, v.ray.y, 0)
      // first sample teleports instead of sweeping in from the origin
      if (!p.seen) {
        p.smoothed.copy(p.target)
        p.seen = true
      }
    }

    // smoothing + a speed-following force envelope for the parting: it rises
    // as the hand sweeps and releases slowly, so the channel eases shut
    // behind the cursor instead of snapping
    const k = 1 - Math.exp(-delta * 20)
    p.prev.copy(p.smoothed)
    p.smoothed.lerp(p.target, k)
    p.step.copy(p.smoothed).sub(p.prev).divideScalar(Math.max(delta, 1e-4))
    p.vel.lerp(p.step, 1 - Math.exp(-delta * 8))
    p.force = Math.max(
      p.force * Math.exp(-delta * 2.5),
      Math.min(p.vel.length() * 0.6, 1)
    )

    const simU = sim.material.uniforms
    simU.uTime.value = timeRef.current
    simU.uCurlFreq.value = THREE.MathUtils.lerp(simU.uCurlFreq.value, s.curl, 0.1)
    simU.uCondense.value = THREE.MathUtils.lerp(simU.uCondense.value, s.condense, 0.06)

    const u = points.material.uniforms
    u.positions.value = target.texture
    u.uFocus.value = THREE.MathUtils.lerp(u.uFocus.value, s.focus, 0.1)
    u.uBlur.value = THREE.MathUtils.lerp(u.uBlur.value, s.blur, 0.1)
    u.uSize.value = s.size
    u.uDensity.value = s.density
    u.uOpacity.value = s.opacity * dim
    u.uAccentFrac.value = s.accent
    ;(u.uPointerView.value as THREE.Vector3).set(p.smoothed.x, p.smoothed.y, -refDepth)
    u.uForce.value = p.force
    u.uPointerRadius.value = s.pointerRadius
    const blending = s.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    if (points.material.blending !== blending) points.material.blending = blending

    // a barely-there yaw so the cloud reads as a volume, not a screensaver
    points.object.rotation.y = timeRef.current * 0.0006

    state.gl.setRenderTarget(target)
    state.gl.clear()
    state.gl.render(sim.scene, sim.camera)
    state.gl.setRenderTarget(null)
  }, 0)

  return <primitive object={points.object} />
}
