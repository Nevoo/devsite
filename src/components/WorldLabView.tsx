import { Suspense } from 'react'
import { View } from '@react-three/drei'
import type { GlobePointer } from '@/canvas/Globe'
import {
  WorldLab,
  type WorldLabSettings,
  type WorldPlace,
} from '@/canvas/WorldLab'

interface WorldLabViewProps {
  settingsRef: { current: WorldLabSettings }
  places: WorldPlace[]
  generation: number
  spinRef: { current: number }
  pointerRef: { current: GlobePointer }
}

/**
 * three.js half of the world sandbox — same chunk split as GLView.
 *
 * NOTE: outside the Canvas, drei's View ignores `track` and renders its own
 * tracking div, so the View itself is the element that must fill the frame.
 */
export default function WorldLabView({
  settingsRef,
  places,
  generation,
  spinRef,
  pointerRef,
}: WorldLabViewProps) {
  return (
    <View className="gl-view">
      <Suspense fallback={null}>
        <WorldLab
          settingsRef={settingsRef}
          places={places}
          generation={generation}
          spinRef={spinRef}
          pointerRef={pointerRef}
        />
      </Suspense>
    </View>
  )
}
