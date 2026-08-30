import { Suspense } from 'react'
import { View } from '@react-three/drei'
import { Dust } from '@/canvas/Dust'
import {
  Globe,
  type GlobeCluster,
  type GlobePointer,
  type PinProjection,
  type ScaleState,
} from '@/canvas/Globe'
import { DUST_HERO, type DustBounds } from '@/canvas/dustSettings'
import type { PlacePrecision } from '@/content/places'

interface GlobeViewProps {
  pins: [number, number][]
  precisions: PlacePrecision[]
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
  pointerRef?: { current: GlobePointer }
  hoverCountryRef?: { current: number }
}

/**
 * three.js half of WorldGlobe, in its own chunk so the main bundle stays free
 * of three/R3F/drei — same split as GLView.
 *
 * NOTE: outside the Canvas, drei's View ignores `track` and renders its own
 * tracking div, so the View itself is the element that must fill the frame
 * (see .gl-view in global.css).
 */

/* The hero's air (DUST-PLAN D2). A shell around the planet does band + room
   in one: the occluder sphere writes depth, so the shell's far half vanishes
   behind the planet and what survives is a band hugging the visible cap plus
   soft foreground bokeh toward the lens. The preset is frozen — tuning
   happens in /lab/particles, never here. Dust fades with scale presence: at
   the plate the air is gone until D3 brings it into the dive on purpose. */
const HERO_DUST_PRESET = { current: DUST_HERO }
const HERO_DUST_BOUNDS: DustBounds = { kind: 'shell', inner: 1.06, outer: 2.2 }
export default function GlobeView({
  pins,
  precisions,
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
  pointerRef,
  hoverCountryRef,
}: GlobeViewProps) {
  return (
    <View className="gl-view">
      <Suspense fallback={null}>
        <Globe
          pins={pins}
          precisions={precisions}
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
          pointerRef={pointerRef}
          hoverCountryRef={hoverCountryRef}
        />
        {pointerRef && (
          <Dust
            presetRef={HERO_DUST_PRESET}
            size={64}
            bounds={HERO_DUST_BOUNDS}
            pointerRef={pointerRef}
            presenceRef={scaleRef}
          />
        )}
      </Suspense>
    </View>
  )
}
