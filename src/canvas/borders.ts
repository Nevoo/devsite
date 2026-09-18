/**
 * `public/borders.bin` decoder — the coastline and land-border polylines the
 * plate's scan front draws. Built by `scripts/build-borders.mjs`, which owns
 * the source, licensing and editorial notes for this asset.
 *
 * Layout, all integers little-endian:
 *   0..3   ASCII magic "BRDR"
 *   4      uint8  version (1)
 *   5      uint8  flags (bit 0: coordinates are int16 fixed-point; else 0)
 *   6..7   uint16 polylineCount
 *   8..    polylines, each:
 *            uint8  kind (0 = coastline, 1 = border)
 *            uint16 vertexCount
 *            vertexCount x (int16 lat, int16 lon)
 *
 * Fixed point is lat = round(latDeg / 90 * 32767), lon = round(lonDeg / 180 *
 * 32767): about 0.0028 degrees of latitude and 0.0055 of longitude per step,
 * far finer than the 0.2 degree simplification the builder applies.
 *
 * Decoded points come out in radians, not degrees, because every consumer on
 * the canvas side feeds them straight to trigonometry. Keeping this file free
 * of Three.js lets the build script decode its own output as a smoke check.
 */
export type BorderKind = 'coastline' | 'border'

export interface BorderPolyline {
  readonly kind: BorderKind
  /** flat lat, lon pairs in radians; length is always even */
  readonly points: Float32Array
}

const MAGIC = 'BRDR'
const VERSION = 1
const HEADER_BYTES = 8
const POLYLINE_HEADER_BYTES = 3
const LAT_SCALE = Math.PI / 2 / 32767
const LON_SCALE = Math.PI / 32767

export function decodeBorders(buffer: ArrayBuffer): BorderPolyline[] {
  if (buffer.byteLength < HEADER_BYTES) throw new Error('borders asset is shorter than its header')

  const bytes = new Uint8Array(buffer)
  const magic = String.fromCharCode(...bytes.subarray(0, 4))
  if (magic !== MAGIC) throw new Error(`unexpected borders magic ${JSON.stringify(magic)}`)

  const view = new DataView(buffer)
  const version = view.getUint8(4)
  if (version !== VERSION) throw new Error(`unsupported borders version ${version}`)

  const polylineCount = view.getUint16(6, true)
  const polylines: BorderPolyline[] = []
  let offset = HEADER_BYTES

  for (let index = 0; index < polylineCount; index++) {
    if (offset + POLYLINE_HEADER_BYTES > buffer.byteLength) {
      throw new Error(`borders asset ends inside polyline ${index}`)
    }
    const kind = view.getUint8(offset)
    if (kind > 1) throw new Error(`unknown borders polyline kind ${kind}`)
    const vertexCount = view.getUint16(offset + 1, true)
    offset += POLYLINE_HEADER_BYTES

    const vertexBytes = vertexCount * 4
    if (offset + vertexBytes > buffer.byteLength) {
      throw new Error(`borders asset ends inside polyline ${index}`)
    }

    const points = new Float32Array(vertexCount * 2)
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      points[vertex * 2] = view.getInt16(offset + vertex * 4, true) * LAT_SCALE
      points[vertex * 2 + 1] = view.getInt16(offset + vertex * 4 + 2, true) * LON_SCALE
    }
    offset += vertexBytes

    polylines.push({ kind: kind === 1 ? 'border' : 'coastline', points })
  }

  if (offset !== buffer.byteLength) {
    throw new Error(`borders asset has ${buffer.byteLength - offset} trailing bytes`)
  }

  return polylines
}

let bordersPromise: Promise<BorderPolyline[]> | undefined

/** One fetch and one decode, shared even when several plate intents arrive together. */
export function loadBorders(): Promise<BorderPolyline[]> {
  bordersPromise ??= fetch('/borders.bin').then(async (response) => {
    if (!response.ok) throw new Error(`borders fetch failed: ${response.status} ${response.statusText}`)
    return decodeBorders(await response.arrayBuffer())
  }).catch((error) => {
    bordersPromise = undefined
    throw error
  })
  return bordersPromise
}
