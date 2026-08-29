import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useFBO } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import {
  dustSimVertex,
  dustSimFragment,
  dustPointsVertex,
  dustPointsFragment,
} from './shaders/dust'
import { DustPhysics } from './DustPhysics'
import {
  DUST_CAMERA_FOV,
  DUST_CAMERA_Z,
  DUST_HALF_H,
  type DustSettings,
} from './dustSettings'

interface DustLabProps {
  /** live tuning values — read per frame, never re-renders the tree */
  settingsRef: { current: DustSettings }
  /** position texture is size×size → size² particles */
  size: number
  /** rapier mote count — structural, rebuilds the physics world */
  bodies: number
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

/**
 * The dust sandbox, two layers reading as one cloud:
 *
 *  - ambience: the GPGPU curl-noise field (stateless positions = f(base, t)
 *    into an FBO, drawn as soft-DoF points). Not interactive — it is the
 *    room's air.
 *  - interaction: a few hundred real rapier bodies (DustPhysics) with the
 *    same rendered look. The pointer is a kinematic collider that physically
 *    knocks them about; they bump each other and drift home.
 *
 * The sim render runs at useFrame priority 0, ahead of BackgroundPass (0.5)
 * and the View renders (1+).
 */
export function DustLab({ settingsRef, size, bodies }: DustLabProps) {
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const timeRef = useRef(0)

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
        uPointerView: { value: new THREE.Vector3(0, 0, -DUST_CAMERA_Z) },
        uForce: { value: 0 },
        uPointerRadius: { value: 0.3 },
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

  // pointer, unprojected onto the z=0 plane — feeds the kinematic collider.
  // Lightly smoothed so the ball sweeps rather than teleports (rapier derives
  // its collision velocity from consecutive translations).
  const pointer = useRef({
    target: new THREE.Vector3(),
    smoothed: new THREE.Vector3(),
    prev: new THREE.Vector3(),
    step: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    force: 0,
    seen: false,
  })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pointer.current
      const aspect = window.innerWidth / Math.max(window.innerHeight, 1)
      p.target.set(
        ((e.clientX / window.innerWidth) * 2 - 1) * DUST_HALF_H * aspect,
        (-(e.clientY / window.innerHeight) * 2 + 1) * DUST_HALF_H,
        0
      )
      // first sample teleports instead of sweeping in from the origin
      if (!p.seen) {
        p.smoothed.copy(p.target)
        p.seen = true
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, delta) => {
    const s = settingsRef.current
    if (!reduced) timeRef.current += delta * s.speed

    // pointer smoothing + a speed-following force envelope for the parting:
    // it rises as the hand sweeps and releases slowly, so the channel eases
    // shut behind the cursor instead of snapping
    const p = pointer.current
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
    u.uOpacity.value = s.opacity
    u.uAccentFrac.value = s.accent
    ;(u.uPointerView.value as THREE.Vector3).set(
      p.smoothed.x,
      p.smoothed.y,
      -DUST_CAMERA_Z
    )
    u.uForce.value = p.force
    u.uPointerRadius.value = s.pointerRadius
    points.material.blending = s.additive ? THREE.AdditiveBlending : THREE.NormalBlending

    // a barely-there yaw so the cloud reads as a volume, not a screensaver
    points.object.rotation.y = timeRef.current * 0.0006

    state.gl.setRenderTarget(target)
    state.gl.clear()
    state.gl.render(sim.scene, sim.camera)
    state.gl.setRenderTarget(null)
  }, 0)

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 0, DUST_CAMERA_Z]}
        fov={DUST_CAMERA_FOV}
      />
      <primitive object={points.object} />
      <DustPhysics
        settingsRef={settingsRef}
        pointerPos={pointer.current.smoothed}
        count={bodies}
      />
    </>
  )
}
