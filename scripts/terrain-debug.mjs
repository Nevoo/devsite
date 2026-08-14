/**
 * Renders the Germany neighbourhood from `public/terrain.bin` without involving
 * the app. The crop includes all of Jutland so the north coast is a useful
 * orientation check, and enough of the Alps to expose the elevation gradient.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'public/terrain.bin')
const OUTPUT_DIR = join(ROOT, 'scripts/audit-out')
const OUTPUT = join(OUTPUT_DIR, 'terrain-germany.pgm')
const HEADER_BYTES = 12
const bounds = { minLat: 47, maxLat: 58, minLng: 4, maxLng: 16.5 }

const terrain = readFileSync(SOURCE)
if (terrain.toString('ascii', 0, 4) !== 'TRN1') throw new Error('unexpected terrain magic')
const width = terrain.readUInt32BE(4)
const height = terrain.readUInt32BE(8)
if (terrain.length !== HEADER_BYTES + width * height) {
  throw new Error(`invalid terrain length for ${width}x${height}`)
}
const data = terrain.subarray(HEADER_BYTES)

const sample = (lat, lng) => {
  const row = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * height)))
  const col = Math.min(width - 1, Math.max(0, Math.floor(((lng + 180) / 360) * width)))
  return data[row * width + col]
}

const minRow = Math.floor(((90 - bounds.maxLat) / 180) * height)
const maxRow = Math.ceil(((90 - bounds.minLat) / 180) * height)
const minCol = Math.floor(((bounds.minLng + 180) / 360) * width)
const maxCol = Math.ceil(((bounds.maxLng + 180) / 360) * width)
const cropWidth = maxCol - minCol
const cropHeight = maxRow - minRow
const pixels = Buffer.alloc(cropWidth * cropHeight)

for (let row = 0; row < cropHeight; row++) {
  for (let col = 0; col < cropWidth; col++) {
    const packed = data[(minRow + row) * width + minCol + col]
    const land = (packed & 0x80) !== 0
    const elevation = packed & 0x7f
    pixels[row * cropWidth + col] = land ? 48 + Math.round((elevation / 127) * 207) : 0
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true })
writeFileSync(OUTPUT, Buffer.concat([
  Buffer.from(`P5\n${cropWidth} ${cropHeight}\n255\n`, 'ascii'),
  pixels,
]))

const asciiWidth = 88
const asciiHeight = 48
const relief = '.,:;irsXA253hMHGS#9B&@'
console.log(`Germany terrain crop (${bounds.minLat}..${bounds.maxLat}N, ${bounds.minLng}..${bounds.maxLng}E)`)
for (let row = 0; row < asciiHeight; row++) {
  const lat = bounds.maxLat - ((row + 0.5) / asciiHeight) * (bounds.maxLat - bounds.minLat)
  let line = ''
  for (let col = 0; col < asciiWidth; col++) {
    const lng = bounds.minLng + ((col + 0.5) / asciiWidth) * (bounds.maxLng - bounds.minLng)
    const packed = sample(lat, lng)
    if ((packed & 0x80) === 0) line += ' '
    else line += relief[Math.min(relief.length - 1, Math.floor(((packed & 0x7f) / 128) * relief.length))]
  }
  console.log(line)
}
console.log(`wrote ${OUTPUT} — ${cropWidth}x${cropHeight}`)
