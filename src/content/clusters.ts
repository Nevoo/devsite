import {
  greatCircleDistance,
  latLngToVec3,
  vec3ToLatLng,
  type LatLng,
  type Vec3,
} from '../canvas/plate.ts'
import { places } from './places.ts'

export interface PlaceCluster {
  memberIndices: number[]
  memberSlugs: string[]
  centroid: Vec3
  centroidLatLng: LatLng
  totalFrameCount: number
  enterable: true
  congestedSingleton: boolean
}

export const CLUSTER_ANGULAR_THRESHOLD = 0.1
export const CONGESTED_SINGLETON_FRAMES = 8

/**
 * Places are deployment data, so their connected components are deployment
 * data too. Building them here keeps an O(n²) truth out of every render loop
 * and lets route stops with no frames participate on geometry alone.
 */
const parent = places.map((_, index) => index)

const find = (index: number): number => {
  let root = index
  while (parent[root] !== root) root = parent[root]
  while (parent[index] !== index) {
    const next = parent[index]
    parent[index] = root
    index = next
  }
  return root
}

const merge = (a: number, b: number) => {
  const aRoot = find(a)
  const bRoot = find(b)
  if (aRoot !== bRoot) parent[bRoot] = aRoot
}

for (let a = 0; a < places.length; a++) {
  for (let b = a + 1; b < places.length; b++) {
    if (greatCircleDistance(places[a].coords, places[b].coords) <= CLUSTER_ANGULAR_THRESHOLD) {
      merge(a, b)
    }
  }
}

const components = new Map<number, number[]>()
for (let index = 0; index < places.length; index++) {
  const root = find(index)
  const members = components.get(root)
  if (members) members.push(index)
  else components.set(root, [index])
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

  // An exactly antipodal component has no unique spherical mean. It cannot
  // occur below this threshold, but the first member is the honest fallback
  // if future data or thresholds change that invariant.
  return magnitude > 1e-12
    ? [sum[0] / magnitude, sum[1] / magnitude, sum[2] / magnitude]
    : latLngToVec3(places[memberIndices[0]].coords)
}

export const clusters: PlaceCluster[] = [...components.values()].flatMap((memberIndices) => {
  const totalFrameCount = memberIndices.reduce(
    (total, index) => total + places[index].frames.length,
    0
  )
  const congestedSingleton = memberIndices.length === 1
    && totalFrameCount >= CONGESTED_SINGLETON_FRAMES
  if (memberIndices.length < 2 && !congestedSingleton) return []

  const centroid = centroidOf(memberIndices)
  return [{
    memberIndices,
    memberSlugs: memberIndices.map((index) => places[index].slug),
    centroid,
    centroidLatLng: vec3ToLatLng(centroid),
    totalFrameCount,
    enterable: true,
    congestedSingleton,
  }]
})

const clusteredIndices = new Set(clusters.flatMap((cluster) => cluster.memberIndices))
export const lonePlaceIndices = places.flatMap((_, index) => clusteredIndices.has(index) ? [] : [index])
export const lonePlaceSlugs = lonePlaceIndices.map((index) => places[index].slug)
