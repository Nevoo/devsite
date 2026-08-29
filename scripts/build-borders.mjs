/**
 * Bakes the coastline and land-border polylines the country plate strokes.
 *
 *   node scripts/build-borders.mjs
 *
 * Download source, Natural Earth vector release (nvkelso mirror of the
 * official distribution, unrepackaged GeoJSON):
 * https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_boundary_lines_land.geojson
 * https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson
 * with the 110m files of the same names as the fallback resolution.
 *
 * Natural Earth is in the public domain. No permission, fee or attribution is
 * required: https://www.naturalearthdata.com/about/terms-of-use/
 *
 * Editorial note, flagged rather than hidden (CONCEPT-COUNTRY-ZOOM-V2 §9.1):
 * Natural Earth's admin-0 lines follow its DE FACTO boundary policy — they
 * draw who administers ground, not who claims it. That is this site's
 * deliberate default, chosen because it is the one policy with a published,
 * checkable rule behind it, and it is a real loosening of the strictest
 * reading of "nothing labelled that isn't ours". The loosening stops at
 * geometry: the plate renders these lines as dots and never labels a boundary,
 * a territory or a claim. Text about the world stays out of the canvas.
 *
 * `public/borders.bin` layout, all integers little-endian:
 *   0..3   ASCII magic "BRDR"
 *   4      uint8  version (1)
 *   5      uint8  flags — bit 0 set: coordinates are int16 fixed-point.
 *                 Other bits reserved, written as 0.
 *   6..7   uint16 polylineCount
 *   8..    polylines, each:
 *            uint8  kind (0 = coastline, 1 = border)
 *            uint16 vertexCount
 *            vertexCount x (int16 lat, int16 lon)
 *
 * Fixed point is lat = round(latDeg / 90 * 32767), lon = round(lonDeg / 180 *
 * 32767), so both axes use the full int16 range and a step is about 0.0028
 * degrees of latitude, 0.0055 of longitude — an order of magnitude finer than
 * the simplification tolerance, so quantization never shows.
 *
 * Source lines are simplified with Douglas-Peucker in degree space. The first
 * tolerance tried is 0.05 degrees (v4). The old 0.13 was matched to the
 * terrain grid's cell on the argument that the plate cannot resolve finer —
 * but the outline is a FIGURE, a line drawing over the ground, not a terrain
 * sample: a truer line reads sharper regardless of the relief under it, and
 * the landed stills' "low res" verdict traced straight to the simplification.
 * The budget is 150KB on disk (it gzips well and rides the idle prefetch);
 * the builder climbs 0.05 -> 0.08 -> 0.13 -> 0.2 -> 0.3 before it gives up
 * 50m detail and falls back to 110m, because a coarser line at full
 * resolution beats a crisp line with whole islands missing.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decodeBorders } from '../src/canvas/borders.ts'

const SOURCE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = join(ROOT, 'scripts/.cache')
const OUTPUT = join(ROOT, 'public/borders.bin')

const RESOLUTIONS = ['50m', '110m']
const TOLERANCES = [0.05, 0.08, 0.13, 0.2, 0.3]
const BUDGET_BYTES = 150 * 1024

const MAGIC = 'BRDR'
const VERSION = 1
const FLAG_FIXED_POINT = 0x01
const HEADER_BYTES = 8
const POLYLINE_HEADER_BYTES = 3
const MAX_VERTICES = 65535
const KIND_COASTLINE = 0
const KIND_BORDER = 1

const sourceNames = (resolution) => [
  { kind: KIND_BORDER, name: `ne_${resolution}_admin_0_boundary_lines_land.geojson` },
  { kind: KIND_COASTLINE, name: `ne_${resolution}_coastline.geojson` },
]

async function downloadSource(name) {
  const file = join(CACHE_DIR, name)
  if (existsSync(file) && statSync(file).size > 0) {
    console.log(`using cached scripts/.cache/${name}`)
    return file
  }

  mkdirSync(CACHE_DIR, { recursive: true })
  const partial = `${file}.partial`
  rmSync(partial, { force: true })
  const url = `${SOURCE_BASE}/${name}`
  console.log(`downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`borders download failed: ${response.status} ${response.statusText}`)
  }
  writeFileSync(partial, Buffer.from(await response.arrayBuffer()))
  renameSync(partial, file)
  console.log(`cached ${(statSync(file).size / 1024).toFixed(0)}KB source download`)
  return file
}

/**
 * Every LineString in a GeoJSON feature collection, tagged with its kind.
 * Polygons are ignored: the coastline set ships as lines already, and a
 * stray polygon would double every shoreline it touched.
 */
function readPolylines(file, kind) {
  const geo = JSON.parse(readFileSync(file, 'utf8'))
  const polylines = []
  for (const feature of geo.features ?? []) {
    const geometry = feature.geometry
    if (!geometry) continue
    const parts =
      geometry.type === 'LineString' ? [geometry.coordinates]
      : geometry.type === 'MultiLineString' ? geometry.coordinates
      : []
    for (const part of parts) {
      if (Array.isArray(part) && part.length >= 2) polylines.push({ kind, points: part })
    }
  }
  return polylines
}

/**
 * Douglas-Peucker, iterative so a 10k-vertex coastline cannot blow the stack.
 * Distances are plain planar distances in degrees. At a 0.2 degree tolerance
 * the equirectangular stretch only makes the filter *more* conservative near
 * the poles, which is where over-simplification would be most visible.
 */
function simplify(points, tolerance) {
  if (points.length < 3) return points

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1

  const toleranceSquared = tolerance * tolerance
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    if (last <= first + 1) continue

    const [x1, y1] = points[first]
    const [x2, y2] = points[last]
    const dx = x2 - x1
    const dy = y2 - y1
    const segmentSquared = dx * dx + dy * dy

    let farthest = -1
    let farthestSquared = 0
    for (let index = first + 1; index < last; index++) {
      const [px, py] = points[index]
      let distanceSquared
      if (segmentSquared === 0) {
        distanceSquared = (px - x1) ** 2 + (py - y1) ** 2
      } else {
        const projection = Math.min(1, Math.max(0, ((px - x1) * dx + (py - y1) * dy) / segmentSquared))
        distanceSquared = (px - (x1 + projection * dx)) ** 2 + (py - (y1 + projection * dy)) ** 2
      }
      if (distanceSquared > farthestSquared) {
        farthestSquared = distanceSquared
        farthest = index
      }
    }

    if (farthestSquared > toleranceSquared) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }

  return points.filter((_, index) => keep[index] === 1)
}

/**
 * Two splits, both guards rather than expected work: a run longer than the
 * uint16 vertex count, and a segment that jumps more than 180 degrees of
 * longitude. Natural Earth already clips at the antimeridian, so the second
 * one should never fire — but a wrapped segment would draw a line straight
 * across the plate, which is exactly the kind of lie the concept forbids.
 */
function splitRuns(points) {
  const runs = []
  let run = [points[0]]
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]
    const current = points[index]
    const wraps = Math.abs(current[0] - previous[0]) > 180
    if (wraps || run.length >= MAX_VERTICES) {
      runs.push(run)
      run = wraps ? [current] : [previous, current]
      continue
    }
    run.push(current)
  }
  runs.push(run)
  return runs.filter((candidate) => candidate.length >= 2)
}

const quantizeLat = (lat) => Math.max(-32767, Math.min(32767, Math.round((lat / 90) * 32767)))
const quantizeLon = (lon) => Math.max(-32767, Math.min(32767, Math.round((lon / 180) * 32767)))

function encode(polylines) {
  const vertexCount = polylines.reduce((total, polyline) => total + polyline.points.length, 0)
  const buffer = Buffer.alloc(
    HEADER_BYTES + polylines.length * POLYLINE_HEADER_BYTES + vertexCount * 4
  )

  buffer.write(MAGIC, 0, 'ascii')
  buffer.writeUInt8(VERSION, 4)
  buffer.writeUInt8(FLAG_FIXED_POINT, 5)
  buffer.writeUInt16LE(polylines.length, 6)

  let offset = HEADER_BYTES
  for (const polyline of polylines) {
    buffer.writeUInt8(polyline.kind, offset)
    buffer.writeUInt16LE(polyline.points.length, offset + 1)
    offset += POLYLINE_HEADER_BYTES
    for (const [lon, lat] of polyline.points) {
      buffer.writeInt16LE(quantizeLat(lat), offset)
      buffer.writeInt16LE(quantizeLon(lon), offset + 2)
      offset += 4
    }
  }

  return buffer
}

/** simplify, split, drop degenerates — the whole geometry pass for one tolerance */
function prepare(sources, tolerance) {
  const polylines = []
  for (const source of sources) {
    const simplified = simplify(source.points, tolerance)
    if (simplified.length < 2) continue
    for (const run of splitRuns(simplified)) {
      polylines.push({ kind: source.kind, points: run })
    }
  }
  return polylines
}

async function loadResolution(resolution) {
  const sources = []
  for (const { kind, name } of sourceNames(resolution)) {
    sources.push(...readPolylines(await downloadSource(name), kind))
  }
  return sources
}

async function build() {
  let chosen
  const attempts = []

  for (const resolution of RESOLUTIONS) {
    let sources
    try {
      sources = await loadResolution(resolution)
    } catch (error) {
      console.log(`${resolution} source unavailable (${error.message}), trying the next resolution`)
      continue
    }

    const rawVertices = sources.reduce((total, source) => total + source.points.length, 0)
    console.log(`${resolution} source: ${sources.length} polylines, ${rawVertices} vertices`)

    for (const tolerance of TOLERANCES) {
      const polylines = prepare(sources, tolerance)
      const buffer = encode(polylines)
      attempts.push({ resolution, tolerance, bytes: buffer.length })
      console.log(
        `  tolerance ${tolerance} deg -> ${polylines.length} polylines, `
        + `${polylines.reduce((total, polyline) => total + polyline.points.length, 0)} vertices, `
        + `${buffer.length} bytes${buffer.length <= BUDGET_BYTES ? '' : ' — over budget'}`
      )
      if (buffer.length <= BUDGET_BYTES) {
        chosen = { resolution, tolerance, polylines, buffer, rawVertices, sources: sources.length }
        break
      }
    }

    if (chosen) break
  }

  if (!chosen) {
    throw new Error(
      `no resolution/tolerance pair fit ${BUDGET_BYTES} bytes: `
      + attempts.map((attempt) => `${attempt.resolution}@${attempt.tolerance}=${attempt.bytes}`).join(', ')
    )
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, chosen.buffer)

  const vertices = chosen.polylines.reduce((total, polyline) => total + polyline.points.length, 0)
  const borders = chosen.polylines.filter((polyline) => polyline.kind === KIND_BORDER).length
  console.log('')
  console.log('build report')
  console.log(`  source resolution   ${chosen.resolution} (Natural Earth, public domain)`)
  console.log(`  simplify tolerance  ${chosen.tolerance} degrees, Douglas-Peucker`)
  console.log(`  polylines           ${chosen.polylines.length} (${borders} border, ${chosen.polylines.length - borders} coastline)`)
  console.log(`  vertices            ${chosen.rawVertices} source -> ${vertices} simplified`)
  console.log(`  bytes written       ${chosen.buffer.length} (${(chosen.buffer.length / 1024).toFixed(1)}KB of a ${BUDGET_BYTES / 1024}KB budget)`)

  return { ...chosen, vertices }
}

/** re-read what was just written and decode it with the module the app uses */
function smokeCheck(expected) {
  const bytes = readFileSync(OUTPUT)
  const decoded = decodeBorders(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  )

  if (decoded.length !== expected.polylines.length) {
    throw new Error(`decoded ${decoded.length} polylines, expected ${expected.polylines.length}`)
  }

  let vertices = 0
  let maxLat = 0
  let maxLon = 0
  for (let index = 0; index < decoded.length; index++) {
    const polyline = decoded[index]
    const source = expected.polylines[index]
    const expectedKind = source.kind === KIND_BORDER ? 'border' : 'coastline'
    if (polyline.kind !== expectedKind) {
      throw new Error(`polyline ${index} decoded as ${polyline.kind}, expected ${expectedKind}`)
    }
    if (polyline.points.length !== source.points.length * 2) {
      throw new Error(`polyline ${index} decoded ${polyline.points.length / 2} vertices, expected ${source.points.length}`)
    }
    for (let vertex = 0; vertex < source.points.length; vertex++) {
      const [lon, lat] = source.points[vertex]
      maxLat = Math.max(maxLat, Math.abs(polyline.points[vertex * 2] * (180 / Math.PI) - lat))
      maxLon = Math.max(maxLon, Math.abs(polyline.points[vertex * 2 + 1] * (180 / Math.PI) - lon))
    }
    vertices += polyline.points.length / 2
  }

  if (vertices !== expected.vertices) {
    throw new Error(`decoded ${vertices} vertices, expected ${expected.vertices}`)
  }
  // One fixed-point step is 90/32767 lat, 180/32767 lon, so rounding can cost
  // at most half a step. The margin is the float32 storage error the decoder
  // adds: 24 bits of mantissa on a 180 degree magnitude is about 2e-5 degrees.
  // Anything past this means the encoder and the decoder disagree.
  const float32Margin = 180 * 2 ** -23
  const latTolerance = 90 / 32767 / 2 + float32Margin
  const lonTolerance = 180 / 32767 / 2 + float32Margin
  if (maxLat > latTolerance || maxLon > lonTolerance) {
    throw new Error(`round-trip drifted ${maxLat} lat / ${maxLon} lon degrees`)
  }

  console.log('')
  console.log(
    `PASS borders round-trip: ${decoded.length} polylines, ${vertices} vertices, `
    + `max error ${Math.max(maxLat, maxLon).toExponential(3)} degrees`
  )
}

smokeCheck(await build())
