import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decodeBorders } from '../src/canvas/borders.ts'
import { clusters, lonePlaceSlugs } from '../src/content/clusters.ts'
import { places } from '../src/content/places.ts'
import {
  BORDER_POINT_BUDGET,
  BORDER_SPACING_PITCHES,
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
  PLATE_GRID_CAPACITY,
  PLATE_SAMPLE_MARGIN,
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
  plateBorderSpacing,
  plateFramePosition,
  plateFromLocal,
  plateGridBudget,
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
  /* Three fields share one resident buffer: the outline stroke is seeded from
     the top down, terrain and the graticule from the bottom up. What keeps
     them from meeting is that the stroke's ceiling is subtracted from
     terrain's, so the worst case has to fit with the reserve fully spent.
     Measured at the CEILING, not at this reference frame — every real cap
     lands on the terrain floor, which is exactly why a floor-shaped test of
     this would pass while the invariant it claims to hold was broken. */
  const reservedBudget = PLATE_TERRAIN_CAPACITY - BORDER_POINT_BUDGET
  const worstCaseSpend =
    reservedBudget + plateGridBudget(reservedBudget) + BORDER_POINT_BUDGET
  assert.ok(
    worstCaseSpend <= PLATE_TERRAIN_CAPACITY + PLATE_GRID_CAPACITY,
    `terrain ${reservedBudget} + graticule ${plateGridBudget(reservedBudget)} + ` +
    `outline ${BORDER_POINT_BUDGET} = ${worstCaseSpend} marks, past the ` +
    `${PLATE_TERRAIN_CAPACITY + PLATE_GRID_CAPACITY}-mark plate buffer`
  )
  assert.ok(
    PLATE_TERRAIN_CAPACITY - BORDER_POINT_BUDGET >= MIN_PLATE_TERRAIN_POINTS,
    `a ${BORDER_POINT_BUDGET}-mark outline reserve leaves terrain under its own floor`
  )
  console.log(
    `\nPASS constants: SPREAD_MAX ${SPREAD_MAX} bottoms out at ` +
    `${Math.round(tightestSpan * 6371)}km across, clear of the ` +
    `${Math.round(ZOOM_FLOOR_SPAN * 6371)}km floor`
  )
  console.log(
    `      buffer split: terrain ≤ ${PLATE_TERRAIN_CAPACITY} marks, graticule ≤ ` +
    `${PLATE_GRID_CAPACITY}, outline ≤ ${BORDER_POINT_BUDGET} reserved off ` +
    `terrain's ceiling — worst case ${worstCaseSpend} of ` +
    `${PLATE_TERRAIN_CAPACITY + PLATE_GRID_CAPACITY}`
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
  /* The dots column is what the landing seeds, so it has to answer for the
     outline's reserve rather than pretend the buffer is still all terrain's. */
  const moved = clusters
    .map((cluster) => {
      const frame = fitPlateFrame(frameMembers(cluster), { reserveSheetSpace })
      const before = plateTerrainBudget(frame.sampleArea)
      const after = plateTerrainBudget(frame.sampleArea, BORDER_POINT_BUDGET)
      return { cluster, before, after }
    })
    .filter((row) => row.before !== row.after)
  console.log(
    moved.length === 0
      ? `outline reserve (${BORDER_POINT_BUDGET} marks) moves no cap's dots column: ` +
        `every cap lands on the ${MIN_PLATE_TERRAIN_POINTS}-mark floor, well under the ` +
        `${PLATE_TERRAIN_CAPACITY - BORDER_POINT_BUDGET} reserved ceiling`
      : `outline reserve (${BORDER_POINT_BUDGET} marks) thins ` +
        moved
          .map((row) => `${row.cluster.memberSlugs[0]} ${row.before}→${row.after}`)
          .join(', ')
  )
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

/* ---------- the plotted outline ----------

   What the stroke costs, per cap. The render path walks borders.bin segment by
   segment inside the reseed cursor; this cannot call that (it lives inside a
   React component with three.js under it), so it prices the same asset through
   the same exported frame map and the same exported spacing. It is an
   ESTIMATE of length — a segment counts when either end is on the table, so a
   line that only clips a corner is counted whole — and it is here to answer
   one question the stills cannot: does the figure fit its budget, or does the
   stroke stop halfway round germany. */

const bordersPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'borders.bin'
)
let borderPolylines
try {
  const file = readFileSync(bordersPath)
  borderPolylines = decodeBorders(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  )
  const vertexTotal = borderPolylines.reduce((sum, line) => sum + line.points.length / 2, 0)
  console.log(
    `\nOutline stroke — ${borderPolylines.length} polylines, ${vertexTotal} vertices, ` +
    `${(file.byteLength / 1024).toFixed(1)}KB on disk`
  )
} catch (error) {
  console.error(`FAIL outline asset: cannot decode ${bordersPath}`)
  throw error
}

const strokeCost = (cluster) => {
  const frame = fitPlateFrame(frameMembers(cluster))
  const basis = plateBasis(frame.center)
  const spacing = plateBorderSpacing(frame.sampleArea)
  const limit = 1 + PLATE_SAMPLE_MARGIN
  let visibleLength = 0
  for (const line of borderPolylines) {
    const points = line.points
    let previous = null
    let previousLon = 0
    let previousInside = false
    for (let vertex = 0; vertex < points.length / 2; vertex++) {
      const lat = points[vertex * 2]
      const lon = points[vertex * 2 + 1]
      const direction = latLngToVec3([lat * (180 / Math.PI), lon * (180 / Math.PI)])
      const [x, y] = plateFramePosition(direction, frame, basis)
      const inside = Math.abs(x) <= limit && Math.abs(y) <= limit
      if (previous && (inside || previousInside) && Math.abs(lon - previousLon) <= Math.PI) {
        visibleLength += angularDistanceVec3(previous, direction) * frame.spread
      }
      previous = direction
      previousLon = lon
      previousInside = inside
    }
  }
  return {
    frame,
    spacing,
    visibleLength,
    dots: Math.round(visibleLength / spacing),
  }
}

try {
  console.log(
    'cluster                                  | spacing u² | spacing km | stroke km | dots  | of budget'
  )
  for (const cluster of clusters) {
    const { frame, spacing, visibleLength, dots } = strokeCost(cluster)
    console.log([
      cluster.memberSlugs.join(', ').padEnd(40),
      pad(spacing.toFixed(4), 10),
      pad(((spacing / frame.spread) * 6371).toFixed(1), 10),
      pad(Math.round((visibleLength / frame.spread) * 6371), 9),
      pad(dots, 5),
      `${((dots / BORDER_POINT_BUDGET) * 100).toFixed(0)}%`,
    ].join(' | '))
    assert.ok(
      dots <= BORDER_POINT_BUDGET,
      `${cluster.memberSlugs.join(', ')}: the outline wants ${dots} marks, past the ` +
      `${BORDER_POINT_BUDGET}-mark reserve — the figure would stop mid-stroke. ` +
      `Raise BORDER_POINT_BUDGET (and the buffer that pays for it) or open ` +
      `BORDER_SPACING_PITCHES past ${BORDER_SPACING_PITCHES}`
    )
  }
  console.log(
    `PASS outline budget: every cap's border and coast fit the ` +
    `${BORDER_POINT_BUDGET}-mark reserve at ${BORDER_SPACING_PITCHES}× the landed pitch`
  )
} catch (error) {
  console.error('FAIL outline budget')
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
