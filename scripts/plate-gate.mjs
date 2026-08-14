import assert from 'node:assert/strict'

import { clusters, lonePlaceSlugs } from '../src/content/clusters.ts'
import { places } from '../src/content/places.ts'
import {
  latLngToVec3,
  plateProject,
  plateUnproject,
} from '../src/canvas/plate.ts'

let randomState = 0x5eed1234
const random = () => {
  randomState ^= randomState << 13
  randomState ^= randomState >>> 17
  randomState ^= randomState << 5
  return (randomState >>> 0) / 0x1_0000_0000
}

const randomUnit = () => {
  const y = random() * 2 - 1
  const theta = random() * Math.PI * 2
  const radius = Math.sqrt(1 - y * y)
  return [Math.cos(theta) * radius, y, Math.sin(theta) * radius]
}

const centroids = [
  latLngToVec3([0, 0]),
  latLngToVec3([51, 10.2]),
  latLngToVec3([-45, 168]),
  latLngToVec3([78, -42]),
  latLngToVec3([-20, -120]),
]
const directions = Array.from({ length: 500 }, randomUnit)
directions.push(...centroids)
directions.push(latLngToVec3([51 + 1e-8, 10.2 - 1e-8]))

let maxError = 0
let trials = 0
try {
  for (const centroid of centroids) {
    for (const spread of [1, 2.2]) {
      for (const direction of directions) {
        const projected = plateProject(direction, centroid, spread)
        const recovered = plateUnproject(projected, centroid, spread)
        const error = Math.hypot(
          recovered[0] - direction[0],
          recovered[1] - direction[1],
          recovered[2] - direction[2]
        )
        maxError = Math.max(maxError, error)
        trials++
        assert.ok(error < 1e-6, `round-trip error ${error} exceeded 1e-6`)
      }
    }
  }
  console.log(`PASS plate round-trip: ${trials} trials, max error ${maxError.toExponential(12)}`)
} catch (error) {
  console.error(`FAIL plate round-trip: max error ${maxError.toExponential(12)}`)
  throw error
}

console.log('\nClusters')
console.log('members | frames | centroid lat,lng | enterable | congestedSingleton')
for (const cluster of clusters) {
  const [lat, lng] = cluster.centroidLatLng
  console.log([
    cluster.memberSlugs.join(', '),
    cluster.totalFrameCount,
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    cluster.enterable,
    cluster.congestedSingleton,
  ].join(' | '))
}

console.log('\nLone places')
for (const slug of lonePlaceSlugs) {
  const place = places.find((candidate) => candidate.slug === slug)
  console.log(`${slug} (${place?.frames.length ?? 0} frames)`)
}
