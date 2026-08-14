import { Suspense } from 'react'
import { View } from '@react-three/drei'
import {
  Globe,
  type GlobeCluster,
  type PinProjection,
  type ScaleState,
} from '@/canvas/Globe'

interface GlobeViewProps {
  pins: [number, number][]
  /** frames placed at each pin — the opening view faces their weighted centre */
  weights: number[]
  legs: [[number, number], [number, number]][]
  /** flown-through cities, projected for the DOM's waypoint labels */
  waypoints?: [number, number][]
  waypointProjectionRef?: { current: PinProjection[] }
  projectionRef: { current: PinProjection[] }
  activeRef: { current: number }
  selectedRef: { current: number }
  spinRef: { current: number }
  tiltRef: { current: number }
  clusters?: GlobeCluster[]
  chipProjectionRef?: { current: PinProjection[] }
  scaleRef: { current: ScaleState }
  enterRef: { current: number }
  exitRef: { current: boolean }
}

/**
 * three.js half of WorldGlobe, in its own chunk so the main bundle stays free
 * of three/R3F/drei — same split as GLView.
 *
 * NOTE: outside the Canvas, drei's View ignores `track` and renders its own
 * tracking div, so the View itself is the element that must fill the frame
 * (see .gl-view in global.css).
 */
export default function GlobeView({
  pins,
  weights,
  legs,
  waypoints,
  waypointProjectionRef,
  projectionRef,
  activeRef,
  selectedRef,
  spinRef,
  tiltRef,
  clusters,
  chipProjectionRef,
  scaleRef,
  enterRef,
  exitRef,
}: GlobeViewProps) {
  return (
    <View className="gl-view">
      <Suspense fallback={null}>
        <Globe
          pins={pins}
          weights={weights}
          legs={legs}
          waypoints={waypoints}
          waypointProjectionRef={waypointProjectionRef}
          projectionRef={projectionRef}
          activeRef={activeRef}
          selectedRef={selectedRef}
          spinRef={spinRef}
          tiltRef={tiltRef}
          clusters={clusters}
          chipProjectionRef={chipProjectionRef}
          scaleRef={scaleRef}
          enterRef={enterRef}
          exitRef={exitRef}
        />
      </Suspense>
    </View>
  )
}
