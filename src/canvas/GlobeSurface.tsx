import type { Ref } from 'react'
import type { MeshBasicMaterial } from 'three'

import { patchGlobeSurface } from './shaders/globe'

interface GlobeSurfaceProps {
  radius: number
  materialRef: Ref<MeshBasicMaterial>
  opacity?: number
  depthWrite?: boolean
}

/**
 * The globe's body shares the dot shader's lighting. Keep the material mounted
 * and transparent: the transition owner mutates opacity and depthWrite through
 * materialRef, without a second animation clock or a shader variant switch.
 * The atmosphere is a low-energy grazing term on this same sphere.
 */
export default function GlobeSurface({
  radius,
  materialRef,
  opacity = 1,
  depthWrite = true,
}: GlobeSurfaceProps) {
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[radius, 96, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#18181c"
        transparent
        opacity={opacity}
        depthWrite={depthWrite}
        onBeforeCompile={patchGlobeSurface}
      />
    </mesh>
  )
}
