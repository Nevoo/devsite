import { Suspense } from 'react'
import { View } from '@react-three/drei'
import { DustLab } from '@/canvas/DustLab'
import type { GlobePointer } from '@/canvas/Globe'
import type { DustSettings } from '@/canvas/dustSettings'

interface DustLabViewProps {
  settingsRef: { current: DustSettings }
  size: number
  bodies: number
  pointerRef: { current: GlobePointer }
}

/**
 * three.js half of the particle sandbox — same chunk split as GLView.
 *
 * NOTE: outside the Canvas, drei's View ignores `track` and renders its own
 * tracking div, so the View itself is the element that must fill the frame.
 */
export default function DustLabView({
  settingsRef,
  size,
  bodies,
  pointerRef,
}: DustLabViewProps) {
  return (
    <View className="gl-view">
      <Suspense fallback={null}>
        {/* key remounts the sim when the particle-count preset changes */}
        <DustLab
          key={size}
          settingsRef={settingsRef}
          size={size}
          bodies={bodies}
          pointerRef={pointerRef}
        />
      </Suspense>
    </View>
  )
}
