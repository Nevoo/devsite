import {
  latLngToVec3,
  vec3ToLatLng,
  type LatLng,
  type Vec3,
} from '../canvas/plate.ts'
import { countryOf, places } from './places.ts'

/**
 * THE COUNTRY IS THE UNIT (country view v3, 2026-08-20). A cluster is a
 * visited country: every place belongs to exactly one, every country is
 * enterable, and no frame count gates the door — a 2-frame country enters the
 * same way a 15-frame one does. The old geometric union-find is gone with the
 * two lies it told: a 637km threshold that welded germany, vienna and the
 * dolomites into one cross-border cap, and a frame floor that left sydney and
 * brisbane doorless on opposite sides of a near-miss.
 */
export interface PlaceCluster {
  /** ISO-3166 alpha-2 — the identity of the unit, straight from the labels */
  countryCode: string
  memberIndices: number[]
  memberSlugs: string[]
  centroid: Vec3
  centroidLatLng: LatLng
  totalFrameCount: number
  enterable: true
  /**
   * A one-place country. It gets no chip — its own pickup stack is the door
   * (the stack carries the dive affordance), so the map keeps the photograph
   * where the old model would have swapped it for a count.
   */
  congestedSingleton: boolean
}

/* Insertion order = first appearance in `places`, which is the editorial
   order of the sheet — the tour and the chips inherit it unchanged. */
const byCountry = new Map<string, number[]>()
for (let index = 0; index < places.length; index++) {
  const code = countryOf(places[index])
  if (!code) continue
  const members = byCountry.get(code)
  if (members) members.push(index)
  else byCountry.set(code, [index])
}

const centroidOf = (memberIndices: number[]): Vec3 => {
  const sum = memberIndices.reduce<[number, number, number]>((acc, index) => {
    const direction = latLngToVec3(places[index].coords)
    acc[0] += direction[0]
    acc[1] += direction[1]
    acc[2] += direction[2]
    return acc
  }, [0, 0, 0])
  const magnitude = Math.hypot(...sum)

  // An exactly antipodal component has no unique spherical mean. No country
  // sheet gets close, but the first member stays the honest fallback.
  return magnitude > 1e-12
    ? [sum[0] / magnitude, sum[1] / magnitude, sum[2] / magnitude]
    : latLngToVec3(places[memberIndices[0]].coords)
}

export const clusters: PlaceCluster[] = [...byCountry.entries()].map(
  ([countryCode, memberIndices]) => {
    const centroid = centroidOf(memberIndices)
    return {
      countryCode,
      memberIndices,
      memberSlugs: memberIndices.map((index) => places[index].slug),
      centroid,
      centroidLatLng: vec3ToLatLng(centroid),
      totalFrameCount: memberIndices.reduce(
        (total, index) => total + places[index].frames.length,
        0
      ),
      enterable: true,
      congestedSingleton: memberIndices.length === 1,
    }
  }
)

/** country code → cluster index, for the world-scale country pointer work */
export const clusterIndexByCountry = new Map<string, number>(
  clusters.map((cluster, index) => [cluster.countryCode, index])
)

/* Places whose label carries no country. None exist today; the exports stay
   because the gates print them as a standing audit of that claim. */
const clusteredIndices = new Set(clusters.flatMap((cluster) => cluster.memberIndices))
export const lonePlaceIndices = places.flatMap((_, index) => clusteredIndices.has(index) ? [] : [index])
export const lonePlaceSlugs = lonePlaceIndices.map((index) => places[index].slug)
