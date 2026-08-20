/**
 * countries.bin — the country atlas for the world scale, two things in one
 * fetch (country view v3 phase 2):
 *
 *   1. A country-index MASK: uint8 admin-0 id per texel, 1024x512 (0.35°),
 *      RLE-encoded. Powers per-dot visited-country lift and pointer→country
 *      resolution (hover + click-anywhere-in-the-country).
 *   2. Outline RINGS for the VISITED countries only: closed admin-0 polygon
 *      rings, quantized like borders.bin. Powers the hover stroke. borders.bin
 *      stays untouched — its anonymous merged stroke is the plate's figure;
 *      these rings are the world scale's, and only ~a dozen countries need one.
 *
 * Source: Natural Earth 110m admin-0 countries (nvkelso mirror), cached in
 * scripts/.cache like the other geo builders. Visited countries come from the
 * real deployment data (clusters.ts), so the ring set can never drift from
 * the places sheet.
 *
 * Layout (all multi-byte ints little-endian):
 *   0..3   ASCII "CTRY"
 *   4      uint8  version = 1
 *   5..6   uint16 mask width
 *   7..8   uint16 mask height
 *   9      uint8  tableCount              (mask id i ↔ table[i-1]; 0 = none)
 *   ..     tableCount × 2 ASCII           (ISO2, '??' when the source has none)
 *   ..     uint32 rleLength, then rleLength/2 × (uint8 run, uint8 id)
 *   ..     uint8  outlineCountryCount
 *   ..     per country: 2 ASCII ISO2, uint8 ringCount,
 *            per ring: uint16 vertexCount, vertexCount × (int16 lat, int16 lon)
 *
 * Quantization matches borders.ts: lat × 32767/(π/2), lon × 32767/π.
 */
import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clusters } from '../src/content/clusters.ts'
import { decodeCountries } from '../src/canvas/countries.ts'

const SOURCE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const SOURCE_NAME = 'ne_110m_admin_0_countries.geojson'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = join(ROOT, 'scripts/.cache')
const OUTPUT = join(ROOT, 'public/countries.bin')

const MASK_W = 1024
const MASK_H = 512
const MAGIC = 'CTRY'
const VERSION = 1
const LAT_SCALE = 32767 / (Math.PI / 2)
const LON_SCALE = 32767 / Math.PI
/** whole-file ceiling — the mask RLE is the variable part, rings are tiny */
const BUDGET_BYTES = 96 * 1024
/** per-ring decimation target: hover dots step ~1° anyway, finer is waste */
const RING_MAX_VERTICES = 160
/** islands below this bbox span (degrees) don't earn a hover ring at 110m */
const RING_MIN_SPAN_DEG = 0.4

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
    throw new Error(`countries download failed: ${response.status} ${response.statusText}`)
  }
  writeFileSync(partial, Buffer.from(await response.arrayBuffer()))
  renameSync(partial, file)
  return file
}

/** ISO2 with the Natural Earth '-99' pothole filled from the alternates. */
const isoOf = (props) => {
  for (const key of ['ISO_A2', 'ISO_A2_EH', 'WB_A2']) {
    const value = props[key]
    if (typeof value === 'string' && /^[A-Z]{2}$/.test(value)) return value
  }
  return '??'
}

/** [[ring, ...], ...] per polygon — ring = [[lng, lat], ...] */
const polygonsOf = (geometry) =>
  geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : []

/** even-odd crossing test across one polygon's rings (holes cancel) */
const inPolygon = (rings, lng, lat) => {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
  }
  return inside
}

async function main() {
  const raw = JSON.parse(readFileSync(await downloadSource(SOURCE_NAME), 'utf8'))
  const features = raw.features.filter((f) => polygonsOf(f.geometry).length > 0)
  if (features.length > 255) throw new Error(`${features.length} features overflow uint8 mask ids`)
  const codes = features.map((f) => isoOf(f.properties))

  /* ---- the mask: rasterize each feature over its own bbox only ---- */
  const mask = new Uint8Array(MASK_W * MASK_H)
  const texLat = (y) => 90 - ((y + 0.5) * 180) / MASK_H
  const texLng = (x) => -180 + ((x + 0.5) * 360) / MASK_W
  features.forEach((feature, index) => {
    const id = index + 1
    for (const rings of polygonsOf(feature.geometry)) {
      let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
      }
      const x0 = Math.max(0, Math.floor(((minLng + 180) / 360) * MASK_W) - 1)
      const x1 = Math.min(MASK_W - 1, Math.ceil(((maxLng + 180) / 360) * MASK_W) + 1)
      const y0 = Math.max(0, Math.floor(((90 - maxLat) / 180) * MASK_H) - 1)
      const y1 = Math.min(MASK_H - 1, Math.ceil(((90 - minLat) / 180) * MASK_H) + 1)
      for (let y = y0; y <= y1; y++) {
        const lat = texLat(y)
        for (let x = x0; x <= x1; x++) {
          if (inPolygon(rings, texLng(x), lat)) mask[y * MASK_W + x] = id
        }
      }
    }
  })

  /* ---- RLE: one continuous stream over the row-major mask ---- */
  const rle = []
  for (let i = 0; i < mask.length; ) {
    const id = mask[i]
    let run = 1
    while (run < 255 && i + run < mask.length && mask[i + run] === id) run++
    rle.push(run, id)
    i += run
  }

  /* ---- visited-country rings, from the same features ---- */
  const visited = [...new Set(clusters.map((c) => c.countryCode))]
  const missing = visited.filter((code) => !codes.includes(code))
  if (missing.length > 0) throw new Error(`visited countries missing from source: ${missing.join(', ')}`)
  const outlines = visited.map((code) => {
    const feature = features[codes.indexOf(code)]
    const rings = polygonsOf(feature.geometry)
      .flat()
      .filter((ring) => {
        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
        return maxLng - minLng >= RING_MIN_SPAN_DEG || maxLat - minLat >= RING_MIN_SPAN_DEG
      })
      .map((ring) => {
        const step = Math.max(1, Math.ceil(ring.length / RING_MAX_VERTICES))
        const kept = []
        for (let i = 0; i < ring.length - 1; i += step) kept.push(ring[i])
        kept.push(ring[0]) // stays closed after decimation
        return kept
      })
    return { code, rings }
  })

  /* ---- encode ---- */
  const ringBytes = outlines.reduce(
    (total, o) => total + 3 + o.rings.reduce((t, r) => t + 2 + r.length * 4, 0),
    1
  )
  const size = 10 + codes.length * 2 + 4 + rle.length + ringBytes
  const buffer = Buffer.alloc(size)
  let at = 0
  buffer.write(MAGIC, at, 'ascii'); at += 4
  buffer.writeUInt8(VERSION, at); at += 1
  buffer.writeUInt16LE(MASK_W, at); at += 2
  buffer.writeUInt16LE(MASK_H, at); at += 2
  buffer.writeUInt8(codes.length, at); at += 1
  for (const code of codes) { buffer.write(code, at, 'ascii'); at += 2 }
  buffer.writeUInt32LE(rle.length, at); at += 4
  for (const value of rle) { buffer.writeUInt8(value, at); at += 1 }
  buffer.writeUInt8(outlines.length, at); at += 1
  for (const { code, rings } of outlines) {
    buffer.write(code, at, 'ascii'); at += 2
    buffer.writeUInt8(rings.length, at); at += 1
    for (const ring of rings) {
      buffer.writeUInt16LE(ring.length, at); at += 2
      for (const [lng, lat] of ring) {
        buffer.writeInt16LE(Math.round((lat * Math.PI / 180) * LAT_SCALE), at); at += 2
        buffer.writeInt16LE(Math.round((lng * Math.PI / 180) * LON_SCALE), at); at += 2
      }
    }
  }
  if (at !== size) throw new Error(`encode drift: wrote ${at} of ${size}`)
  if (size > BUDGET_BYTES) throw new Error(`countries.bin ${size}B over the ${BUDGET_BYTES}B budget`)

  /* ---- smoke: the shipped decoder must read back what was written ---- */
  const atlas = decodeCountries(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + size))
  const probes = [
    ['DE', 51.0, 10.2],
    ['NZ', -44.9, 168.2],
    ['AU', -30.7, 152.2],
    ['JP', 35.68, 139.65],
    [null, 0, -140], // pacific
  ]
  for (const [expected, lat, lng] of probes) {
    const got = atlas.codeAt(lat, lng)
    if (got !== expected) throw new Error(`smoke: codeAt(${lat}, ${lng}) = ${got}, expected ${expected}`)
  }
  for (const code of visited) {
    if (code === 'AU' && !atlas.outlines.has(code)) throw new Error('smoke: AU outline missing')
  }

  writeFileSync(OUTPUT, buffer)
  const landTexels = mask.reduce((n, v) => n + (v > 0 ? 1 : 0), 0)
  console.log(
    `countries.bin: ${(size / 1024).toFixed(1)}KB (mask rle ${(rle.length / 1024).toFixed(1)}KB, ` +
      `${codes.length} countries, ${outlines.length} visited outlines, ` +
      `${((landTexels / mask.length) * 100).toFixed(0)}% land texels)`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
