import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import {
  BallCollider,
  CapsuleCollider,
  Physics,
  RigidBody,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { dustBodyVertex, dustPointsFragment } from './shaders/dust'
import { DUST_CAMERA_Z, type DustSettings } from './dustSettings'

interface DustPhysicsProps {
  settingsRef: { current: DustSettings }
  /** smoothed pointer position on the z=0 plane, owned by DustLab */
  pointerPos: THREE.Vector3
  /** structural: changing the count rebuilds the world */
  count: number
}

/**
 * The interactive layer: real rigid bodies in a zero-gravity rapier world,
 * after the pmndrs ssgi-spheres example. Each mote is a dynamic body with a
 * ball collider and a per-frame impulse pulling it back to its home spot in
 * the cloud; the pointer is a kinematic collider ball that physically plows
 * through the crowd. The bumping is genuine collision response — a shoved
 * mote knocks its neighbours, they knock theirs, damping settles everyone,
 * the home impulse walks them back.
 *
 * The bodies themselves render nothing. A Points object mirrors their
 * translations each frame and draws them with the same soft-DoF look as the
 * GPGPU ambience behind them, so both layers read as one cloud.
 */
export function DustPhysics({ settingsRef, pointerPos, count }: DustPhysicsProps) {
  return (
    <Physics gravity={[0, 0, 0]} timeStep="vary">
      <Motes settingsRef={settingsRef} count={count} />
      <PointerBall settingsRef={settingsRef} pointerPos={pointerPos} />
    </Physics>
  )
}

function Motes({
  settingsRef,
  count,
}: {
  settingsRef: { current: DustSettings }
  count: number
}) {
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const colliders = useRef<(RapierCollider | null)[]>([])
  const radiusRef = useRef(0)

  const homes = useMemo(() => {
    const list: THREE.Vector3[] = []
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      // ball distribution matching the ambience cloud across its FULL depth —
      // the focus plane sits around z≈1, and if no homes reach past it, only
      // blurry background motes are ever physical
      do {
        v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      } while (v.lengthSq() > 1)
      list.push(new THREE.Vector3(v.x * 1.5, v.y * 1.5, v.z * 1.3))
    }
    return list
  }, [count])

  const cloud = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const kicks = new Float32Array(count)
    for (let i = 0; i < count; i++) seeds[i] = Math.random()

    const geometry = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(positions, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    const kickAttr = new THREE.BufferAttribute(kicks, 1)
    kickAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', posAttr)
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.setAttribute('aKick', kickAttr)

    const material = new THREE.ShaderMaterial({
      vertexShader: dustBodyVertex,
      fragmentShader: dustPointsFragment,
      uniforms: {
        uFocus: { value: 5.1 },
        uBlur: { value: 34 },
        uSize: { value: 2 },
        uOpacity: { value: 0.55 },
        uColor: { value: new THREE.Color('#f4efe9') },
        uAccent: { value: new THREE.Color('#ff2d1a') },
        uAccentFrac: { value: 0.04 },
      },
      transparent: true,
      depthWrite: false,
    })
    const object = new THREE.Points(geometry, material)
    object.frustumCulled = false
    return { object, geometry, material, posAttr, kickAttr }
  }, [count])

  useEffect(() => {
    return () => {
      cloud.geometry.dispose()
      cloud.material.dispose()
    }
  }, [cloud])

  const impulse = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const s = settingsRef.current
    const dt = Math.min(delta, 0.1)

    // collider radius is tuned live without rebuilding the world
    if (s.moteRadius !== radiusRef.current) {
      radiusRef.current = s.moteRadius
      for (const c of colliders.current) c?.setRadius(s.moteRadius)
    }

    const pos = cloud.posAttr.array as Float32Array
    const kick = cloud.kickAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      const body = bodies.current[i]
      if (!body) continue

      body.setLinearDamping(s.damping)

      const t = body.translation()
      const home = homes[i]
      // impulse toward home, demo-style but mass-normalised so the feel
      // survives collider-radius changes (mass scales with r³)
      impulse
        .set(home.x - t.x, home.y - t.y, home.z - t.z)
        .multiplyScalar(s.attract * body.mass() * dt * 60)
      body.applyImpulse(impulse, true)

      pos[i * 3] = t.x
      pos[i * 3 + 1] = t.y
      pos[i * 3 + 2] = t.z
      const lv = body.linvel()
      kick[i] = Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z)
    }
    cloud.posAttr.needsUpdate = true
    cloud.kickAttr.needsUpdate = true

    const u = cloud.material.uniforms
    u.uFocus.value = s.focus
    u.uBlur.value = s.blur
    u.uSize.value = s.size
    u.uOpacity.value = s.opacity
    u.uAccentFrac.value = s.accent
    cloud.material.blending = s.additive ? THREE.AdditiveBlending : THREE.NormalBlending
  })

  return (
    <>
      {homes.map((home, i) => (
        <RigidBody
          key={i}
          ref={(el: RapierRigidBody | null) => {
            bodies.current[i] = el
          }}
          position={[home.x, home.y, home.z]}
          linearDamping={4}
          angularDamping={1}
          friction={0.1}
          colliders={false}
        >
          <BallCollider
            ref={(el: RapierCollider | null) => {
              colliders.current[i] = el
            }}
            args={[settingsRef.current.moteRadius]}
          />
        </RigidBody>
      ))}
      <primitive object={cloud.object} />
    </>
  )
}

/** covers the cloud's depth (homes reach z≈±1.3) along the view ray */
const POINTER_HALF_LENGTH = 1.9
const Y_UP = new THREE.Vector3(0, 1, 0)

function PointerBall({
  settingsRef,
  pointerPos,
}: {
  settingsRef: { current: DustSettings }
  pointerPos: THREE.Vector3
}) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const radiusRef = useRef(0)
  const rayDir = useMemo(() => new THREE.Vector3(), [])
  const rotation = useMemo(() => new THREE.Quaternion(), [])

  useFrame(() => {
    const s = settingsRef.current
    if (s.pointerRadius !== radiusRef.current) {
      radiusRef.current = s.pointerRadius
      collider.current?.setRadius(s.pointerRadius)
    }
    // the cursor is a ray, so its collider is a capsule lying along the
    // camera→cursor line: the swept column disturbs motes at EVERY depth,
    // sharp foreground and blurry background alike. A ball at the pointer
    // plane only ever reached one slab of the cloud.
    rayDir.copy(pointerPos).setZ(pointerPos.z - DUST_CAMERA_Z).normalize()
    rotation.setFromUnitVectors(Y_UP, rayDir)
    // kinematic: rapier derives velocity from these transforms, so a fast
    // sweep transfers real momentum into whatever it hits
    body.current?.setNextKinematicRotation(rotation)
    body.current?.setNextKinematicTranslation(pointerPos)
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false}>
      <CapsuleCollider
        ref={collider}
        args={[POINTER_HALF_LENGTH, settingsRef.current.pointerRadius]}
      />
    </RigidBody>
  )
}
