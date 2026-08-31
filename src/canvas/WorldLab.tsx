import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Dust } from './Dust'
import type { GlobePointer } from './Globe'
import { DUST_HERO, type DustBounds } from './dustSettings'

/**
 * /lab/world — the "little world" experiment (globe-lab Gate 2 candidate).
 *
 * Animal Crossing Wild World's trick, rebuilt for taste-testing: a horizon
 * planet with place-images STANDING on its curve as billboards. The images
 * come from public/world-lab/ via manifest.json — drop in stylized cutouts
 * generated with the templates in WORLD-LAB.md, hit reload, spin the world.
 * The scene decides nothing; it exists so three styled places can be judged
 * side by side in the site's own light before any real build.
 *
 * Billboards are tangent-planted (up = sphere normal), not camera-facing:
 * things wrap over the horizon as the world turns, which is where the whole
 * charm lives. Background melting is free when the generated image's bg is
 * the page charcoal (#101013); the chroma-key threshold is for images that
 * arrive on any other flat colour.
 */

export const WORLD_RADIUS = 3.4
export const WORLD_CENTER: [number, number, number] = [0, -2.7, 0]
const CAMERA_POSITION: [number, number, number] = [0, 1.4, 6.8]
const CAMERA_FOV = 38
/** wider than this and a board center-crops: things STAND on a world,
    landscape frames read as fallen screens */
const MAX_BOARD_ASPECT = 0.8

export interface WorldLabSettings {
  /** billboard height multiplier over each place's manifest height */
  heightScale: number
  /** chroma-key distance threshold — 0 disables keying entirely */
  keyThreshold: number
  /** softness band above the threshold */
  keySoft: number
  /** idle spin, radians/s at the equator's pace */
  autoSpin: number
  /** the darkroom air over the world */
  dust: boolean
}

export const WORLD_LAB_DEFAULTS: WorldLabSettings = {
  heightScale: 1,
  keyThreshold: 0,
  keySoft: 0.12,
  autoSpin: 0.02,
  dust: true,
}

export interface WorldPlace {
  file: string
  label?: string
  /** degrees around the world; 0 faces the camera */
  lon: number
  /** degrees above the equator; higher = closer to the visible top */
  lat: number
  /** world-units tall before heightScale */
  height?: number
}

interface WorldLabProps {
  settingsRef: { current: WorldLabSettings }
  places: WorldPlace[]
  /** cache-busting token — bump to re-fetch every texture */
  generation: number
  spinRef: { current: number }
  pointerRef: { current: GlobePointer }
}

const billboardVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const billboardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uKey;
  uniform float uThreshold;
  uniform float uSoft;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float alpha = c.a;
    if (uThreshold > 0.001) {
      float d = distance(c.rgb, uKey);
      alpha *= smoothstep(uThreshold, uThreshold + uSoft, d);
    }
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(c.rgb, alpha);
  }
`

interface Board {
  place: WorldPlace
  texture: THREE.Texture
  aspect: number
  material: THREE.ShaderMaterial
}

const DEG = Math.PI / 180

/** surface normal for a manifest (lat, lon); lon 0 faces the camera (+Z) */
function placeNormal(place: WorldPlace, out: THREE.Vector3) {
  const phi = (90 - place.lat) * DEG
  const theta = place.lon * DEG
  return out.set(
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.cos(theta)
  )
}

const WORLD_DUST_PRESET = { current: DUST_HERO }
const WORLD_DUST_BOUNDS: DustBounds = {
  kind: 'shell',
  inner: WORLD_RADIUS + 0.2,
  outer: WORLD_RADIUS + 1.8,
  center: WORLD_CENTER,
}

export function WorldLab({ settingsRef, places, generation, spinRef, pointerRef }: WorldLabProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [dustOn, setDustOn] = useState(settingsRef.current.dust)

  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    Promise.all(
      places.map(
        (place) =>
          new Promise<Board | null>((resolve) => {
            loader.load(
              `/world-lab/${place.file}?v=${generation}`,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                const image = texture.image as { width: number; height: number }
                const aspect = image.width / Math.max(1, image.height)
                const displayAspect = Math.min(aspect, MAX_BOARD_ASPECT)
                if (displayAspect < aspect) {
                  // centre-crop wide stand-ins into a standing card
                  texture.repeat.set(displayAspect / aspect, 1)
                  texture.offset.x = (1 - displayAspect / aspect) / 2
                }
                resolve({
                  place,
                  texture,
                  aspect: displayAspect,
                  material: new THREE.ShaderMaterial({
                    vertexShader: billboardVertex,
                    fragmentShader: billboardFragment,
                    uniforms: {
                      uMap: { value: texture },
                      uKey: { value: new THREE.Color('#101013') },
                      uThreshold: { value: 0 },
                      uSoft: { value: 0.12 },
                    },
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                  }),
                })
              },
              undefined,
              () => resolve(null) // a bad file skips its board, the rest land
            )
          })
      )
    ).then((loaded) => {
      if (alive) setBoards(loaded.filter((b): b is Board => b !== null))
    })
    return () => {
      alive = false
    }
  }, [places, generation])

  useEffect(() => {
    return () => {
      for (const board of boards) {
        board.texture.dispose()
        board.material.dispose()
      }
    }
  }, [boards])

  useFrame((_, delta) => {
    const s = settingsRef.current
    const group = groupRef.current
    if (group) {
      // drag target + idle drift, damped like the globe's own spin
      spinRef.current += s.autoSpin * delta
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, spinRef.current, 6, delta)
    }
    for (const board of boards) {
      board.material.uniforms.uThreshold.value = s.keyThreshold
      board.material.uniforms.uSoft.value = s.keySoft
    }
    group?.traverse((node) => {
      if (node.userData.billboard) node.scale.setScalar(s.heightScale)
    })
    if (s.dust !== dustOn) setDustOn(s.dust)
  })

  const up = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const Y = new THREE.Vector3(0, 1, 0)

  return (
    <>
      <PerspectiveCamera makeDefault position={CAMERA_POSITION} fov={CAMERA_FOV} />
      <group position={WORLD_CENTER}>
        <group ref={groupRef}>
          {/* the world: same near-charcoal mass as the globe's occluder */}
          <mesh>
            <sphereGeometry args={[WORLD_RADIUS, 96, 64]} />
            <meshBasicMaterial color="#17171b" />
          </mesh>
          {boards.map((board) => {
            placeNormal(board.place, up)
            quat.setFromUnitVectors(Y, up)
            const height = board.place.height ?? 1.2
            return (
              <group
                key={board.place.file}
                position={[
                  up.x * WORLD_RADIUS,
                  up.y * WORLD_RADIUS,
                  up.z * WORLD_RADIUS,
                ]}
                quaternion={quat.clone()}
              >
                {/* the scaled node carries the base pivot, so the height
                    slider grows boards off the surface, not through it */}
                <group userData={{ billboard: true }}>
                  <mesh material={board.material} position={[0, height / 2, 0]}>
                    <planeGeometry args={[height * board.aspect, height]} />
                  </mesh>
                </group>
              </group>
            )
          })}
        </group>
      </group>
      {dustOn && (
        <Dust
          presetRef={WORLD_DUST_PRESET}
          size={64}
          bounds={WORLD_DUST_BOUNDS}
          pointerRef={pointerRef}
        />
      )}
    </>
  )
}
