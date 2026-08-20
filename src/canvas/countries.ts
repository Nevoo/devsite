/**
 * countries.bin decoder — the world scale's country atlas (v3 phase 2).
 * Format documented in scripts/build-countries.mjs. Two consumers:
 *
 *   - the MASK: uint8 admin-0 id per texel; `codeAt(lat, lng)` resolves a
 *     coordinate to an ISO2 code with a one-texel neighbour fallback, because
 *     the world dots are accepted against the 110m LAND mask whose coastline
 *     disagrees with admin-0 by up to a texel — a shore dot must not lose its
 *     country to that disagreement.
 *   - the OUTLINES: closed rings for visited countries, [lat, lon, ...] in
 *     radians like borders.ts, for the hover stroke.
 */

export interface CountryAtlas {
  width: number
  height: number
  /** row-major from 90N/180W; 0 = no country */
  ids: Uint8Array
  /** mask id i ↔ codes[i - 1] */
  codes: string[]
  /** ISO2 → closed rings, each a flat [lat, lon, ...] in radians */
  outlines: Map<string, Float32Array[]>
  idAt(lat: number, lng: number): number
  codeAt(lat: number, lng: number): string | null
}

const LAT_SCALE = Math.PI / 2 / 32767
const LON_SCALE = Math.PI / 32767

export function decodeCountries(buffer: ArrayBuffer): CountryAtlas {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  if (
    bytes.length < 10 ||
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'CTRY'
  ) {
    throw new Error('countries.bin: bad magic')
  }
  if (bytes[4] !== 1) throw new Error(`countries.bin: unsupported version ${bytes[4]}`)
  const width = view.getUint16(5, true)
  const height = view.getUint16(7, true)
  const tableCount = bytes[9]
  let at = 10
  const codes: string[] = []
  for (let i = 0; i < tableCount; i++) {
    codes.push(String.fromCharCode(bytes[at], bytes[at + 1]))
    at += 2
  }

  const rleLength = view.getUint32(at, true)
  at += 4
  const ids = new Uint8Array(width * height)
  let cell = 0
  for (let i = 0; i < rleLength; i += 2) {
    const run = bytes[at + i]
    const id = bytes[at + i + 1]
    ids.fill(id, cell, cell + run)
    cell += run
  }
  at += rleLength
  if (cell !== ids.length) throw new Error(`countries.bin: rle drift (${cell} of ${ids.length})`)

  const outlineCount = bytes[at]
  at += 1
  const outlines = new Map<string, Float32Array[]>()
  for (let i = 0; i < outlineCount; i++) {
    const code = String.fromCharCode(bytes[at], bytes[at + 1])
    const ringCount = bytes[at + 2]
    at += 3
    const rings: Float32Array[] = []
    for (let r = 0; r < ringCount; r++) {
      const vertexCount = view.getUint16(at, true)
      at += 2
      const ring = new Float32Array(vertexCount * 2)
      for (let v = 0; v < vertexCount; v++) {
        ring[v * 2] = view.getInt16(at, true) * LAT_SCALE
        ring[v * 2 + 1] = view.getInt16(at + 2, true) * LON_SCALE
        at += 4
      }
      rings.push(ring)
    }
    outlines.set(code, rings)
  }
  if (at !== bytes.length) throw new Error(`countries.bin: ${bytes.length - at} trailing bytes`)

  const rawIdAt = (x: number, y: number) =>
    x < 0 || x >= width || y < 0 || y >= height ? 0 : ids[y * width + x]
  const idAt = (lat: number, lng: number): number => {
    const x = Math.floor(((lng + 180) / 360) * width)
    const y = Math.floor(((90 - lat) / 180) * height)
    const direct = rawIdAt(x, y)
    if (direct > 0) return direct
    // the land-mask/admin-0 shoreline disagreement: probe the 4 neighbours
    return rawIdAt(x - 1, y) || rawIdAt(x + 1, y) || rawIdAt(x, y - 1) || rawIdAt(x, y + 1)
  }

  return {
    width,
    height,
    ids,
    codes,
    outlines,
    idAt,
    codeAt: (lat, lng) => {
      const id = idAt(lat, lng)
      return id > 0 ? (codes[id - 1] ?? null) : null
    },
  }
}

let pending: Promise<CountryAtlas> | null = null

/** Fetched once per session and kept, exactly like borders.ts. */
export function loadCountries(): Promise<CountryAtlas> {
  pending ??= fetch('/countries.bin')
    .then((response) => {
      if (!response.ok) throw new Error(`countries.bin: HTTP ${response.status}`)
      return response.arrayBuffer()
    })
    .then(decodeCountries)
    .catch((error) => {
      pending = null
      throw error
    })
  return pending
}
