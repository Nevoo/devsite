import { Suspense } from 'react'
import { View } from '@react-three/drei'
import { ImagePlane } from '@/canvas/ImagePlane'
import type { Photo } from '@/content/categories'

interface GLViewProps {
  photo: Photo
  planeSize: [number, number]
  visible: boolean
  onscreen?: boolean
  hovered: boolean
  edgeFade?: number
  dissolveRef?: { current: number }
  parallax?: number
  parallaxRef?: { current: number }
  develop?: boolean
  onDevelopStart?: () => void
  gradeRef?: { current: number | null }
}

/**
 * The three.js half of WebGLImage, split into its own chunk so the
 * main bundle ships without three/R3F/drei.
 *
 * NOTE: outside the Canvas, drei's View ignores `track` and renders its
 * own tracking div — so the View itself is the element that must fill
 * the .gl-frame (see .gl-view in global.css).
 */
export default function GLView({
  photo,
  planeSize,
  visible,
  onscreen,
  hovered,
  edgeFade,
  dissolveRef,
  parallax,
  parallaxRef,
  develop,
  onDevelopStart,
  gradeRef,
}: GLViewProps) {
  return (
    <View className="gl-view">
      <Suspense fallback={null}>
        <ImagePlane
          photo={photo}
          planeSize={planeSize}
          visible={visible}
        onscreen={onscreen}
          hovered={hovered}
          edgeFade={edgeFade}
          dissolveRef={dissolveRef}
          parallax={parallax}
          parallaxRef={parallaxRef}
          develop={develop}
          onDevelopStart={onDevelopStart}
          gradeRef={gradeRef}
        />
      </Suspense>
    </View>
  )
}
