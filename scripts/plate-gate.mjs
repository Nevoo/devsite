import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decodeBorders } from '../src/canvas/borders.ts'
import { clusters, lonePlaceSlugs } from '../src/content/clusters.ts'
import { places } from '../src/content/places.ts'
import { decodeTerrain } from '../src/content/terrain.ts'
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
  PLATE_CAMERA_POSITION,
  PLATE_GRID_CAPACITY,
  PLATE_LANDED_PAN_TILT,
  PLATE_LIGHT_ELEVATION,
  PLATE_LIGHT_FRAME_AZIMUTH,
  PLATE_RELIEF_AMBIENT,
  PLATE_RELIEF_EXAGGERATION,
  PLATE_SAMPLE_MARGIN,
  PLATE_SHADE_FLOOR,
  PLATE_TABLE_TILT,
  PLATE_TERRAIN_CAPACITY,
  PRINT_MARGIN_FRACTION,
  SPREAD_MAX,
  TARGET_PLATE_RADIUS,
  TERRAIN_ELEVATION_CEILING_M,
  TITLE_BAND_FRACTION,
  ZOOM_FLOOR_SPAN,
  angularDistanceVec3,
  fitPlateFrame,
  latLngToVec3,
  plateBasis,
  plateBorderSpacing,
  plateFrameLight,
  plateFramePosition,
  plateFromLocal,
  plateGridBudget,
  plateHillshade,
  plateLocal,
  plateProject,
  plateTerrainBudget,
  plateTerrainSlopeInto,
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
         (§2.1). It is allowed to differ from v1's, but not to collapse — and
         not to run away either. The ceiling moved 1.6→2.2 with the v4 density
         ruling (18000-mark floor, "low res" verdict on the landed stills);
         the anchor stays v1's shipped density so the multiple keeps meaning
         the same thing across rulings. */
      assert.ok(
        density >= V1_DENSITY * 0.8 && density <= V1_DENSITY * 2.2,
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

/* ---------- the lamp (stage C) ----------

   Relief ships as illumination, not as size (§2.4, R1), and P5 is the test that
   decides whether it shipped at all: a flat cap and an alpine cap must be
   distinguishable at a glance. That is a stills judgement, but it has a
   measurable precondition, and this is it — the gate decodes the SHIPPED
   terrain.bin, lights it with the SHIPPED lamp through the SHIPPED functions,
   and reads the shade distribution over named boxes of real ground.

   Two questions, per landed window:
     1. does the alpine box actually range, and by more than the flat one?
     2. does the flat box stay EVEN — §6's honest farmland, not amplified
        quantization noise?
   A lamp that fails 1 is invisible; a lamp that fails 2 is a noise machine, and
   the second failure is the quieter one, which is why it has its own bound. */

const terrainPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'terrain.bin'
)
let terrain
try {
  const file = readFileSync(terrainPath)
  terrain = decodeTerrain(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  )
} catch (error) {
  console.error(`FAIL relief asset: cannot decode ${terrainPath}`)
  throw error
}

const cellLat = 180 / terrain.height
const cellLng = 360 / terrain.width
const elevationMetres = (lat, lng) =>
  terrain.elevationAt(lat, lng) * TERRAIN_ELEVATION_CEILING_M

/* Named ground, not sampled windows. A whole window is mostly landform nobody
   argues about; these are the two the concept names — the flat north the plate
   must render calmly, and the alpine arc it must render as light. Boxes are
   [minLat, maxLat, minLng, maxLng] and deliberately inland, so a coastline's
   own step is not what the flat box ends up measuring. */
const RELIEF_BOXES = {
  /* lüneburg heath → mecklenburg: the flattest large inland box in germany's window */
  'north german plain': { kind: 'flat', box: [52.2, 53.6, 8.5, 12.5] },
  /* bavarian + tyrolean alps, the arc that has to read as light */
  'alpine arc': { kind: 'alpine', box: [46.4, 47.6, 10.0, 13.0] },
  /* ashburton → christchurch, inland of the coast and short of the foothills */
  'canterbury plains': { kind: 'flat', box: [-44.05, -43.45, 171.6, 172.4] },
  /* aoraki and its divide */
  'southern alps': { kind: 'alpine', box: [-44.2, -43.2, 169.4, 170.9] },
}

const RELIEF_WINDOWS = [
  { slug: 'germany', flat: 'north german plain', alpine: 'alpine arc' },
  { slug: 'milford-sound', flat: 'canterbury plains', alpine: 'southern alps' },
]

/** A plain may not range further than this, or the lamp is amplifying noise. */
const EVEN_GROUND_SPREAD = 0.06
/** …and the alpine arc must out-range the plain by at least this much (P5). */
const RELIEF_CONTRAST_RATIO = 2

/**
 * Shade over every land cell of a box, under one window's lamp.
 * `slopeGain` is the perturbation hook: at 0 the lambert term is fed flat
 * ground everywhere, which is what the negative control below runs.
 */
const shadeStats = (name, light, slopeGain = 1) => {
  const [minLat, maxLat, minLng, maxLng] = RELIEF_BOXES[name].box
  const slope = new Float64Array(2)
  const shades = []
  let elevationSum = 0
  for (let lat = minLat; lat <= maxLat; lat += cellLat) {
    for (let lng = minLng; lng <= maxLng; lng += cellLng) {
      if (!terrain.landAt(lat, lng)) continue
      plateTerrainSlopeInto(lat, lng, cellLat, cellLng, elevationMetres, slope)
      shades.push(plateHillshade(slope[0] * slopeGain, slope[1] * slopeGain, light))
      elevationSum += elevationMetres(lat, lng)
    }
  }
  shades.sort((a, b) => a - b)
  const at = (p) => shades[Math.min(shades.length - 1, Math.floor(p * shades.length))]
  return {
    name,
    cells: shades.length,
    meanElevation: shades.length ? elevationSum / shades.length : 0,
    min: shades[0] ?? 0,
    max: shades[shades.length - 1] ?? 0,
    p5: at(0.05),
    p50: at(0.5),
    p95: at(0.95),
    get spread() {
      return this.p95 - this.p5
    },
  }
}

/** what the fragment does with a shade, before any mark or wash */
const brightness = (shade) => PLATE_SHADE_FLOOR + (1 - PLATE_SHADE_FLOOR) * shade

/**
 * The gradient relief has to out-shout, measured rather than assumed: the rake
 * carries the far edge of the table further from the camera than the near one,
 * so the same ground draws with a smaller footprint up there. This is that
 * ratio, near edge over far edge, per window — the "36° perspective gradient"
 * of P5, in a number.
 */
const rakeGradient = (frame) => {
  const rake = PLATE_TABLE_TILT - PLATE_LANDED_PAN_TILT
  const distance = Math.hypot(PLATE_CAMERA_POSITION[1], PLATE_CAMERA_POSITION[2])
  const reach = (frame.frameHeight / 2) * Math.sin(rake)
  return (distance + reach) / Math.max(1e-6, distance - reach)
}

try {
  console.log(
    `\nThe lamp — ${terrain.width}×${terrain.height} grid, ` +
    `${(cellLat * 111.32).toFixed(1)}km cells, azimuth ` +
    `${Math.round((PLATE_LIGHT_FRAME_AZIMUTH * 180) / Math.PI)}° in the FRAME ` +
    `(upper left), elevation ${Math.round((PLATE_LIGHT_ELEVATION * 180) / Math.PI)}°, ` +
    `ambient ${PLATE_RELIEF_AMBIENT}, exaggeration ${PLATE_RELIEF_EXAGGERATION}×, ` +
    `shade floor ${PLATE_SHADE_FLOOR}`
  )
  for (const window of RELIEF_WINDOWS) {
    const cluster = clusters.find((candidate) => candidate.memberSlugs.includes(window.slug))
    const frame = fitPlateFrame(frameMembers(cluster))
    const light = plateFrameLight(frame.view)
    /* The lamp is fixed in FRAME space, so its compass bearing is whatever the
       table's yaw and rake make of "upper left" — printed because a bearing
       that drifts between caps is the thing this design is buying. */
    const bearing = ((Math.atan2(light.east, light.north) * 180) / Math.PI + 360) % 360
    const gradient = rakeGradient(frame)
    console.log(
      `\n${cluster.memberSlugs.join(', ')} — spread ${frame.spread.toFixed(2)}, ` +
      `${Math.round(frame.groundSpan * 6371)}km across; lamp bears ` +
      `${bearing.toFixed(0)}° true (east ${light.east.toFixed(2)}, north ` +
      `${light.north.toFixed(2)}, up ${light.up.toFixed(2)}); rake gradient ` +
      `${gradient.toFixed(2)}×`
    )
    console.log(
      'box                  | cells | mean m |    p5 |   p50 |   p95 | spread | value near→far'
    )
    const rows = [window.flat, window.alpine].map((name) => shadeStats(name, light))
    for (const row of rows) {
      console.log([
        row.name.padEnd(20),
        pad(row.cells, 5),
        pad(Math.round(row.meanElevation), 6),
        pad(row.p5.toFixed(3), 5),
        pad(row.p50.toFixed(3), 5),
        pad(row.p95.toFixed(3), 5),
        pad(row.spread.toFixed(3), 6),
        `${(brightness(row.p95) / brightness(row.p5)).toFixed(2)}×`,
      ].join(' | '))
    }
    const [flat, alpine] = rows

    for (const row of [flat, alpine]) {
      assert.ok(
        row.cells > 0,
        `${window.slug}: the ${row.name} box holds no land — the box moved off its ground`
      )
      assert.ok(
        row.min >= 0 && row.max <= 1,
        `${window.slug}: ${row.name} shade escaped [0, 1] at ` +
        `${row.min.toFixed(3)}…${row.max.toFixed(3)}`
      )
    }

    /* P5, as a precondition. The alpine box has to range further than the plain
       by a clear factor, or the two caps are the same still. */
    assert.ok(
      alpine.spread >= RELIEF_CONTRAST_RATIO * flat.spread,
      `${window.slug}: ${alpine.name} ranges ${alpine.spread.toFixed(3)} against ` +
      `${flat.name}'s ${flat.spread.toFixed(3)} — under the ` +
      `${RELIEF_CONTRAST_RATIO}× the lamp has to make an alpine cap read by. ` +
      `Raise PLATE_RELIEF_EXAGGERATION or lower the lamp.`
    )
    /* …and it has to beat the tilt's own gradient in VALUE, which is the
       condition §6 states. Brightness alone here: the fill alpha ladder widens
       the same range further, and a gate that counted it would be claiming
       credit twice. */
    const valueRatio = brightness(alpine.p95) / brightness(alpine.p5)
    assert.ok(
      valueRatio >= gradient,
      `${window.slug}: the lamp moves ${alpine.name}'s value by ${valueRatio.toFixed(2)}×, ` +
      `under the rake's own ${gradient.toFixed(2)}× perspective gradient — relief would ` +
      `read as tilt. Lower PLATE_SHADE_FLOOR or raise PLATE_RELIEF_EXAGGERATION.`
    )
    /* Even ground is the honest rendering of farmland (§6). A plain that
       ranges is the lamp amplifying 50m quantization steps. */
    assert.ok(
      flat.spread <= EVEN_GROUND_SPREAD,
      `${window.slug}: ${flat.name} ranges ${flat.spread.toFixed(3)}, past the ` +
      `${EVEN_GROUND_SPREAD} that keeps flat ground even — the lamp is amplifying ` +
      `the grid's 50m steps, not lighting terrain`
    )
  }

  /* The negative control, run every time rather than once by hand: with the
     lambert term fed flat ground, the alpine box must FAIL the contrast assert
     above. An assertion that cannot fail is a comment. */
  {
    const cluster = clusters.find((candidate) => candidate.memberSlugs.includes('germany'))
    const frame = fitPlateFrame(frameMembers(cluster))
    const light = plateFrameLight(frame.view)
    const flattened = shadeStats('alpine arc', light, 0)
    const lit = shadeStats('alpine arc', light, 1)
    assert.ok(
      flattened.spread < RELIEF_CONTRAST_RATIO * EVEN_GROUND_SPREAD &&
        brightness(flattened.p95) / brightness(flattened.p5) < rakeGradient(frame),
      `the perturbation control passed: with the lambert term zeroed the alpine arc ` +
      `still ranges ${flattened.spread.toFixed(3)} — the relief asserts are not ` +
      `measuring the lamp`
    )
    console.log(
      `\nperturbation control: slopes zeroed → alpine arc spread ` +
      `${flattened.spread.toFixed(3)} (lit: ${lit.spread.toFixed(3)}), value ` +
      `${(brightness(flattened.p95) / brightness(flattened.p5)).toFixed(2)}× — the ` +
      `asserts above fail on it, as they must`
    )
  }
  console.log(
    `PASS relief: alpine ground out-ranges flat ground past ${RELIEF_CONTRAST_RATIO}× ` +
    `and past the rake, flat ground stays inside ${EVEN_GROUND_SPREAD}, ` +
    `all shade in [0, 1]`
  )
} catch (error) {
  console.error('FAIL relief')
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
