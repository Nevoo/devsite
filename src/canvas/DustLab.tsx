import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Dust } from './Dust'
import { DustPhysics } from './DustPhysics'
import type { GlobePointer } from './Globe'
import {
  DUST_CAMERA_FOV,
  DUST_CAMERA_Z,
  DUST_HALF_H,
  type DustBounds,
  type DustSettings,
} from './dustSettings'

interface DustLabProps {
  /** live tuning values — read per frame, never re-renders the tree */
  settingsRef: { current: DustSettings }
  /** position texture is size×size → size² particles */
  size: number
  /** rapier mote count — structural, rebuilds the physics world */
  bodies: number
  /** frame-relative pointer over the stage, written by the page (production contract) */
  pointerRef: { current: GlobePointer }
}

/** the showpiece ball — radius 2 is the canonical cloud, untransformed */
const LAB_BOUNDS: DustBounds = { kind: 'ball', radius: 2 }

/**
 * The dust sandbox, two layers reading as one cloud:
 *
 *  - ambience: the production <Dust> layer (extracted in D1) — the GPGPU
 *    curl-noise field with the pointer parting. The lab rides the shipped
 *    component so tuning here exercises exactly what production renders
 *    (which also means the lab inherits its gates: nothing under softwareGL
 *    or prefers-reduced-motion).
 *  - interaction: a few hundred real rapier bodies (DustPhysics) with the
 *    same rendered look. The pointer is a kinematic collider that physically
 *    knocks them about; they bump each other and drift home.
 *
 * Dust reads the frame-relative pointerRef; the window listener below exists
 * only for the rapier collider, which needs a world-space position on the
 * z=0 plane (analytic against the lab's fixed camera — a lab assumption the
 * production layer no longer makes).
 */
export function DustLab({ settingsRef, size, bodies, pointerRef }: DustLabProps) {
  // rapier's kinematic ball: lightly smoothed so it sweeps rather than
  // teleports (rapier derives its collision velocity from consecutive
  // translations)
  const pointer = useRef({
    target: new THREE.Vector3(),
    smoothed: new THREE.Vector3(),
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

  useFrame((_, delta) => {
    const p = pointer.current
    p.smoothed.lerp(p.target, 1 - Math.exp(-delta * 20))
  })

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 0, DUST_CAMERA_Z]}
        fov={DUST_CAMERA_FOV}
      />
      <Dust
        presetRef={settingsRef}
        size={size}
        bounds={LAB_BOUNDS}
        pointerRef={pointerRef}
      />
      <DustPhysics
        settingsRef={settingsRef}
        pointerPos={pointer.current.smoothed}
        count={bodies}
      />
    </>
  )
}
