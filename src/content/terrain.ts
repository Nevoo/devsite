/**
 * `public/terrain.bin` layout, all integers big-endian:
 *   0..3   ASCII magic "TRN1"
 *   4..7   uint32 width
 *   8..11  uint32 height
 *   12..   row-major packed samples, starting at 90N/180W
 *
 * Each sample uses bit 7 as land and bits 0..6 as elevation in 50m steps.
 * The normalized sampler deliberately returns the stored 0..127 range rather
 * than metres: presentation decides its own exaggeration in a later stage.
 */
export interface Terrain {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
  landAt(lat: number, lng: number): boolean
  elevationAt(lat: number, lng: number): number
}

const HEADER_BYTES = 12
const MAGIC = 'TRN1'

const cellIndex = (lat: number, lng: number, width: number, height: number) => {
  const row = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * height)))
  const col = Math.min(width - 1, Math.max(0, Math.floor(((lng + 180) / 360) * width)))
  return row * width + col
}

export function decodeTerrain(buffer: ArrayBuffer): Terrain {
  if (buffer.byteLength < HEADER_BYTES) throw new Error('terrain asset is shorter than its header')

  const bytes = new Uint8Array(buffer)
  const magic = String.fromCharCode(...bytes.subarray(0, 4))
  if (magic !== MAGIC) throw new Error(`unexpected terrain magic ${JSON.stringify(magic)}`)

  const view = new DataView(buffer)
  const width = view.getUint32(4)
  const height = view.getUint32(8)
  const expectedBytes = HEADER_BYTES + width * height
  if (width === 0 || height === 0 || buffer.byteLength !== expectedBytes) {
    throw new Error(`invalid terrain dimensions ${width}x${height} for ${buffer.byteLength} bytes`)
  }

  const data = bytes.subarray(HEADER_BYTES)
  return {
    width,
    height,
    data,
    landAt(lat, lng) {
      return (data[cellIndex(lat, lng, width, height)] & 0x80) !== 0
    },
    elevationAt(lat, lng) {
      return (data[cellIndex(lat, lng, width, height)] & 0x7f) / 127
    },
  }
}

let terrainPromise: Promise<Terrain> | undefined

/** One fetch and one decode, shared even when several plate intents arrive together. */
export function loadTerrain(): Promise<Terrain> {
  terrainPromise ??= fetch('/terrain.bin').then(async (response) => {
    if (!response.ok) throw new Error(`terrain fetch failed: ${response.status} ${response.statusText}`)
    return decodeTerrain(await response.arrayBuffer())
  })
  return terrainPromise
}
