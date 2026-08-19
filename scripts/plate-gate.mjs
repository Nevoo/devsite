import assert from 'node:assert/strict'

import { clusters, lonePlaceSlugs } from '../src/content/clusters.ts'
import { places } from '../src/content/places.ts'
import {
  BOX_FILL_TARGET,
  CAPTION_MARGIN_FRACTION,
  CAP_PADDING,
  DEFAULT_PLATE_VIEWPORT,
  LEGACY_SPREAD_MAX,
  MAX_CAP_RADIUS,
  MIN_CAP_RADIUS,
  MIN_PIN_SEPARATION,
  MIN_PLATE_TERRAIN_POINTS,
  MIN_SPREAD,
  PLATE_TERRAIN_CAPACITY,
  PRINT_MARGIN_FRACTION,
  SPREAD_MAX,
  TARGET_PLATE_RADIUS,
  TITLE_BAND_FRACTION,
  ZOOM_FLOOR_SPAN,
  angularDistanceVec3,
  fitPlateFrame,
  latLngToVec3,
  plateBasis,
  plateFramePosition,
  plateFromLocal,
  plateLocal,
  plateProject,
  plateTerrainBudget,
  plateUnproject,
  plateUsableRect,
  precisionReach,
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

/* The tangent frame the fit measures its box in has to be the same geometry
   as the projection that renders it, or the box is a fiction. */
let maxLocalError = 0
let localTrials = 0
try {
  for (const centroid of centroids) {
    for (const direction of directions) {
      if (angularDistanceVec3(direction, centroid) > 1.5) continue
      const local = plateLocal(direction, centroid)
      const recovered = plateFromLocal(local, centroid)
      const error = Math.hypot(
        recovered[0] - direction[0],
        recovered[1] - direction[1],
        recovered[2] - direction[2]
      )
      maxLocalError = Math.max(maxLocalError, error)
      localTrials++
      assert.ok(error < 1e-6, `tangent round-trip error ${error} exceeded 1e-6`)

      // and the tangent frame agrees with plateProject's own offset length
      const projected = plateProject(direction, centroid, 3)
      const offset = Math.hypot(
        projected[0] - centroid[0],
        projected[1] - centroid[1],
        projected[2] - centroid[2]
      )
      const localLength = Math.hypot(local[0], local[1]) * 3
      assert.ok(
        Math.abs(offset - localLength) < 1e-9,
        `tangent length ${localLength} disagrees with projection ${offset}`
      )
    }
  }
  console.log(
    `PASS tangent frame: ${localTrials} trials, max error ${maxLocalError.toExponential(12)}`
  )
} catch (error) {
  console.error(`FAIL tangent frame: max error ${maxLocalError.toExponential(12)}`)
  throw error
}


const frameMembers = (cluster) =>
  cluster.memberIndices.map((index) => ({
    direction: latLngToVec3(places[index].coords),
    reach: precisionReach(places[index].precision),
  }))

/**
 * The shipped v1 framing, kept here alone: a cap centred on the cluster's mean
 * whose spread is whatever makes that cap fill the viewport, floored so pickup
 * cards can read apart. Retained only so the v2 fit can be measured against
 * something rather than asserted about — and so the density the landing is
 * tuned to has a number attached to a real landing rather than to taste.
 */
const legacyFrame = (cluster) => {
  const members = frameMembers(cluster)
  let capRadius = MIN_CAP_RADIUS
  for (const member of members) {
    capRadius = Math.max(
      capRadius,
      angularDistanceVec3(member.direction, cluster.centroid) + CAP_PADDING
    )
  }
  capRadius = Math.min(MAX_CAP_RADIUS, Math.max(MIN_CAP_RADIUS, capRadius))
  let spread = Math.min(
    LEGACY_SPREAD_MAX,
    Math.max(MIN_SPREAD, TARGET_PLATE_RADIUS / capRadius)
  )
  let minPairwise = Infinity
  for (let a = 0; a < members.length; a++) {
    for (let b = a + 1; b < members.length; b++) {
      minPairwise = Math.min(
        minPairwise,
        angularDistanceVec3(members[a].direction, members[b].direction)
      )
    }
  }
  if (minPairwise < Infinity && minPairwise * spread < MIN_PIN_SEPARATION) {
    spread = minPairwise > 1e-6
      ? Math.min(LEGACY_SPREAD_MAX, MIN_PIN_SEPARATION / minPairwise)
      : LEGACY_SPREAD_MAX
  }
  return { center: cluster.centroid, centerLatLng: cluster.centroidLatLng, spread, capRadius }
}

/**
 * The pitch the shipped v1 landing reads at: 12,000 accepted marks across the
 * 4.91 square table units of its landing disc. A MEASUREMENT of a build that
 * exists, written out as a literal on purpose — deriving it from today's
 * constants would make it move whenever the thing it is meant to catch moves.
 */
const V1_DENSITY = 12000 / (Math.PI * 1.25 ** 2)

/* ---------- constants consistency ----------

   Not a data check. Every real cluster clears the zoom floor by a mile, so
   asserting it per cluster proved nothing and read as though it did. What CAN
   drift is the pair of constants: the ceiling is what enforces the floor, and
   nothing else does. */
try {
  const reference = fitPlateFrame([{ direction: latLngToVec3([0, 0]), reach: 0 }])
  const tightestSpan = reference.frameWidth / SPREAD_MAX
  assert.ok(
    tightestSpan >= ZOOM_FLOOR_SPAN,
    `SPREAD_MAX ${SPREAD_MAX} lands a ${Math.round(tightestSpan * 6371)}km frame, ` +
    `under the ${Math.round(ZOOM_FLOOR_SPAN * 6371)}km zoom floor`
  )
  const budget = plateTerrainBudget(reference.sampleArea)
  assert.ok(
    budget <= PLATE_TERRAIN_CAPACITY && budget >= MIN_PLATE_TERRAIN_POINTS,
    `the landed budget ${budget} escaped its own buffer`
  )
  console.log(
    `\nPASS constants: SPREAD_MAX ${SPREAD_MAX} bottoms out at ` +
    `${Math.round(tightestSpan * 6371)}km across, clear of the ` +
    `${Math.round(ZOOM_FLOOR_SPAN * 6371)}km floor`
  )
  console.log(
    `      reference window ${reference.frameWidth.toFixed(3)} × ` +
    `${reference.frameHeight.toFixed(3)} table units at ` +
    `${DEFAULT_PLATE_VIEWPORT.windowWidth}×${DEFAULT_PLATE_VIEWPORT.windowHeight}, ` +
    `view ${Math.round(DEFAULT_PLATE_VIEWPORT.viewWidth)}px at ` +
    `(${Math.round(DEFAULT_PLATE_VIEWPORT.viewLeft)}, ` +
    `${Math.round(DEFAULT_PLATE_VIEWPORT.viewTop)})`
  )
} catch (error) {
  console.error('FAIL constants')
  throw error
}

/* ---------- the landing, per cluster, in both sheet modes ---------- */

const pad = (value, width) => String(value).padStart(width)

const measure = (cluster, reserveSheetSpace) => {
  const frame = fitPlateFrame(frameMembers(cluster), { reserveSheetSpace })
  const basis = plateBasis(frame.center)
  const budget = plateTerrainBudget(frame.sampleArea)
  const anchors = cluster.memberIndices.map((index) => {
    const place = places[index]
    const direction = latLngToVec3(place.coords)
    const [x, y] = plateFramePosition(direction, frame, basis)
    return {
      place,
      direction,
      x,
      y,
      reach: precisionReach(place.precision),
      inside:
        x >= frame.usable.minX &&
        x <= frame.usable.maxX &&
        y >= frame.usable.minY &&
        y <= frame.usable.maxY,
    }
  })
  return { frame, anchors, budget, density: budget / frame.sampleArea }
}

const report = (reserveSheetSpace) => {
  const label = reserveSheetSpace ? 'sheet third reserved' : 'no sheet reserve (ships)'
  console.log(`\nFit-to-content framing — ${label}`)
  const usable = plateUsableRect(reserveSheetSpace)
  console.log(
    `usable rect in frame halves: x ${usable.minX.toFixed(2)}…${usable.maxX.toFixed(2)}, ` +
    `y ${usable.minY.toFixed(2)}…${usable.maxY.toFixed(2)} ` +
    `(title band ${(TITLE_BAND_FRACTION * 100).toFixed(0)}%, prints ` +
    `${(PRINT_MARGIN_FRACTION * 100).toFixed(0)}%, captions ` +
    `${(CAPTION_MARGIN_FRACTION * 100).toFixed(0)}%)`
  )
  console.log(
    'cluster                                  | spread | rule       |' +
    ' fill usable/frame | span km | dots  | dots/u² | vs v1'
  )
  for (const cluster of clusters) {
    const { frame, anchors, budget, density } = measure(cluster, reserveSheetSpace)
    console.log([
      cluster.memberSlugs.join(', ').padEnd(40),
      pad(frame.spread.toFixed(2), 6),
      frame.spreadLimit.padEnd(10),
      `${pad(frame.usableFill.toFixed(2), 8)} /${pad(frame.boxFill.toFixed(2), 6)}`,
      pad(Math.round(frame.groundSpan * 6371), 7),
      pad(budget, 5),
      pad(Math.round(density), 7),
      `${(density / V1_DENSITY).toFixed(2)}×`,
    ].join(' | '))
    for (const anchor of anchors) {
      console.log(
        `    ${anchor.place.slug.padEnd(16)} x ${pad(anchor.x.toFixed(3), 7)}` +
        `  y ${pad(anchor.y.toFixed(3), 7)}  ${anchor.inside ? 'usable' : 'OUTSIDE'}` +
        `  ${anchor.place.precision}`
      )
    }
  }
}

try {
  for (const reserveSheetSpace of [false, true]) {
    report(reserveSheetSpace)
    for (const cluster of clusters) {
      const key = cluster.memberSlugs.join(', ')
      const { frame, anchors, density } = measure(cluster, reserveSheetSpace)

      for (const anchor of anchors) {
        /* Zoom ceiling, stated twice because it fails in two different ways:
           an anchor off the sampled cap has no ground under it at all, and an
           anchor outside the usable rect has ground but is standing where the
           title band, a print stack or the reserved sheet will be. */
        const distance = angularDistanceVec3(anchor.direction, frame.center)
        assert.ok(
          distance + anchor.reach <= frame.capRadius,
          `${key}: ${anchor.place.slug} reaches ${(distance + anchor.reach).toFixed(4)} rad, ` +
          `outside the ${frame.capRadius.toFixed(4)} rad plate`
        )
        assert.ok(
          anchor.inside,
          `${key}: ${anchor.place.slug} lands at ${anchor.x.toFixed(3)}, ` +
          `${anchor.y.toFixed(3)}, outside the usable rect ` +
          `[${frame.usable.minX.toFixed(2)}, ${frame.usable.maxX.toFixed(2)}] × ` +
          `[${frame.usable.minY.toFixed(2)}, ${frame.usable.maxY.toFixed(2)}]`
        )
      }

      /* Fill. When the content chooses the spread the target is arithmetic and
         asserting it proves nothing; when a BOUND takes the choice away the
         cluster can quietly land tiny, and that is the failure worth catching.
         A degenerate box has no extent to fill anything with — it lands at v1's
         scale by rule, not by fit — so it answers to the ceiling instead. */
      if (frame.degenerate) {
        assert.ok(
          frame.spread <= LEGACY_SPREAD_MAX + 1e-9 || frame.spreadLimit === 'separation',
          `${key}: a cluster with no extent landed at spread ${frame.spread.toFixed(2)}, ` +
          `past v1's ${LEGACY_SPREAD_MAX} ceiling, and nothing but the separation ` +
          `floor may ask for that`
        )
      } else if (frame.spreadLimit !== 'fit') {
        assert.ok(
          frame.usableFill >= 0.4,
          `${key}: ${frame.spreadLimit} clamped the spread and the box fills only ` +
          `${frame.usableFill.toFixed(2)} of the usable rect`
        )
      }

      /* The landed pitch is what makes dots a figure rather than a starfield
         (§2.1). It is allowed to differ from v1's, but not to collapse. */
      assert.ok(
        density >= V1_DENSITY * 0.8 && density <= V1_DENSITY * 1.6,
        `${key}: landed pitch ${Math.round(density)} marks/unit² is ` +
        `${(density / V1_DENSITY).toFixed(2)}× v1's ${Math.round(V1_DENSITY)}`
      )
    }
  }
  console.log(
    `\nPASS framing invariants: ${clusters.length} enterable clusters, both sheet modes`
  )
} catch (error) {
  console.error('FAIL framing invariants')
  throw error
}

/* The one cap the concept is written against, old framing beside new. */
console.log('\nGermany cap: v1 centred cap vs v2 fitted frame')
{
  const cluster = clusters.find((candidate) => candidate.memberSlugs.includes('germany'))
  const before = legacyFrame(cluster)
  const { frame: after, budget } = measure(cluster, false)
  const rows = [['', 'v1 (centroid)', 'v2 (fit)']]
  rows.push([
    'centre',
    `${before.centerLatLng[0].toFixed(3)}, ${before.centerLatLng[1].toFixed(3)}`,
    `${after.centerLatLng[0].toFixed(3)}, ${after.centerLatLng[1].toFixed(3)}`,
  ])
  rows.push(['spread', before.spread.toFixed(2), `${after.spread.toFixed(2)} (${after.spreadLimit})`])
  rows.push(['cap radius', before.capRadius.toFixed(4), after.capRadius.toFixed(4)])
  rows.push([
    'frame span km',
    Math.round((after.frameWidth / before.spread) * 6371),
    Math.round(after.groundSpan * 6371),
  ])
  rows.push([
    'marks / unit²',
    Math.round(V1_DENSITY),
    Math.round(budget / after.sampleArea),
  ])
  const beforeBasis = plateBasis(before.center)
  for (const index of cluster.memberIndices) {
    const direction = latLngToVec3(places[index].coords)
    const beforeAt = plateFramePosition(direction, {
      ...after,
      center: before.center,
      spread: before.spread,
    }, beforeBasis)
    const afterAt = plateFramePosition(direction, after)
    rows.push([
      `${places[index].slug} x,y`,
      `${beforeAt[0].toFixed(3)}, ${beforeAt[1].toFixed(3)}`,
      `${afterAt[0].toFixed(3)}, ${afterAt[1].toFixed(3)}`,
    ])
  }
  const width = Math.max(...rows.map((row) => String(row[0]).length))
  for (const [label, first, second] of rows) {
    console.log(`${String(label).padEnd(width)} | ${String(first).padStart(14)} | ${second}`)
  }
  console.log(
    `box fills ${(after.usableFill * 100).toFixed(0)}% of the usable rect's binding axis ` +
    `(target ${(BOX_FILL_TARGET * 100).toFixed(0)}%), ` +
    `${(after.boxFill * 100).toFixed(0)}% of the visible window's`
  )
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
