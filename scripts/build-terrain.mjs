/**
 * Bakes the relief grid used by the country plate.
 *
 *   node scripts/build-terrain.mjs
 *
 * Download source (GPlates data mirror), NOAA/NCEI ETOPO1 Ice Surface,
 * grid-registered GMT 4 netCDF:
 * https://repo.gplates.org/webdav/present-day-rasters/ETOPO1_Ice_g_gmt4.grd.gz
 * NOAA's canonical NGDC URL returned HTTP 503 during this build; this mirror
 * serves the same named ETOPO1 distribution file without repackaging it.
 *
 * ETOPO1 is produced by NOAA/NCEI and is not subject to copyright protection
 * in the United States. Cite: Amante, C. and B.W. Eakins, 2009, ETOPO1
 * 1 Arc-Minute Global Relief Model, NOAA Technical Memorandum NESDIS NGDC-24,
 * doi:10.7289/V5C8276M. ETOPO1 is used instead of ETOPO 2022 because this GMT
 * 4 file is NetCDF-3 classic and can be decoded with Node alone; the newer
 * product's NetCDF-4/HDF5 and GeoTIFF distributions need another parser.
 *
 * `public/terrain.bin` layout, all integers big-endian:
 *   0..3   ASCII magic "TRN1"
 *   4..7   uint32 width
 *   8..11  uint32 height
 *   12..   row-major packed samples, starting at 90N/180W
 *
 * Each sample uses bit 7 as land and bits 0..6 as elevation in 50m steps.
 * The 1-arc-minute source is nearest-neighbour sampled at target cell centres.
 * Nearest-neighbour keeps the elevation sign—and therefore the coastline—from
 * being blurred across zero while still discarding seven eighths of each axis.
 */
import { createReadStream, createWriteStream } from 'node:fs'
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const SOURCE_URL = 'https://repo.gplates.org/webdav/present-day-rasters/ETOPO1_Ice_g_gmt4.grd.gz'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = join(ROOT, 'scripts/.cache')
const SOURCE_GZIP = join(CACHE_DIR, 'ETOPO1_Ice_g_gmt4.grd.gz')
const SOURCE_GRID = join(CACHE_DIR, 'ETOPO1_Ice_g_gmt4.grd.tmp')
const OUTPUT = join(ROOT, 'public/terrain.bin')

const TARGET_WIDTH = 2700
const TARGET_HEIGHT = 1350
const HEADER_BYTES = 12
const MAGIC = 'TRN1'
const NC_DIMENSION = 10
const NC_VARIABLE = 11
const NC_ATTRIBUTE = 12
const TYPE_BYTES = new Map([
  [1, 1], // NC_BYTE
  [2, 1], // NC_CHAR
  [3, 2], // NC_SHORT
  [4, 4], // NC_INT
  [5, 4], // NC_FLOAT
  [6, 8], // NC_DOUBLE
])

const pad4 = (length) => (length + 3) & ~3

class HeaderCursor {
  constructor(buffer) {
    this.buffer = buffer
    this.offset = 0
  }

  uint32() {
    const value = this.buffer.readUInt32BE(this.offset)
    this.offset += 4
    return value
  }

  uint64() {
    const value = Number(this.buffer.readBigUInt64BE(this.offset))
    this.offset += 8
    return value
  }

  name() {
    const length = this.uint32()
    const value = this.buffer.toString('utf8', this.offset, this.offset + length)
    this.offset += pad4(length)
    return value
  }

  skipAttributes() {
    const tag = this.uint32()
    const count = this.uint32()
    if (tag === 0 && count === 0) return
    if (tag !== NC_ATTRIBUTE) throw new Error(`invalid NetCDF attribute tag ${tag}`)
    for (let index = 0; index < count; index++) {
      this.name()
      const type = this.uint32()
      const values = this.uint32()
      const bytes = TYPE_BYTES.get(type)
      if (!bytes) throw new Error(`unsupported NetCDF attribute type ${type}`)
      this.offset += pad4(values * bytes)
    }
  }
}

function parseNetCdfHeader(fd) {
  // Classic headers are normally a few kilobytes. One MiB leaves room for
  // verbose source metadata without ever reading the 900MB data body here.
  const buffer = Buffer.alloc(1024 * 1024)
  const bytesRead = readSync(fd, buffer, 0, buffer.length, 0)
  const cursor = new HeaderCursor(buffer.subarray(0, bytesRead))
  const magic = cursor.buffer.toString('ascii', 0, 3)
  const version = cursor.buffer[3]
  cursor.offset = 4
  if (magic !== 'CDF' || (version !== 1 && version !== 2)) {
    throw new Error('terrain source is not NetCDF-3 classic or 64-bit-offset')
  }

  cursor.uint32() // numrecs; ETOPO has no unlimited record dimension

  const dimensionTag = cursor.uint32()
  const dimensionCount = cursor.uint32()
  const dimensions = []
  if (dimensionTag !== 0 || dimensionCount !== 0) {
    if (dimensionTag !== NC_DIMENSION) throw new Error(`invalid NetCDF dimension tag ${dimensionTag}`)
    for (let index = 0; index < dimensionCount; index++) {
      dimensions.push({ name: cursor.name(), length: cursor.uint32() })
    }
  }

  cursor.skipAttributes()

  const variableTag = cursor.uint32()
  const variableCount = cursor.uint32()
  const variables = []
  if (variableTag !== 0 || variableCount !== 0) {
    if (variableTag !== NC_VARIABLE) throw new Error(`invalid NetCDF variable tag ${variableTag}`)
    for (let index = 0; index < variableCount; index++) {
      const name = cursor.name()
      const dimensionIds = Array.from({ length: cursor.uint32() }, () => cursor.uint32())
      cursor.skipAttributes()
      const type = cursor.uint32()
      const size = cursor.uint32()
      const begin = version === 1 ? cursor.uint32() : cursor.uint64()
      variables.push({ name, dimensionIds, type, size, begin })
    }
  }

  return { dimensions, variables }
}

function readValue(buffer, offset, type) {
  switch (type) {
    case 1: return buffer.readInt8(offset)
    case 3: return buffer.readInt16BE(offset)
    case 4: return buffer.readInt32BE(offset)
    case 5: return buffer.readFloatBE(offset)
    case 6: return buffer.readDoubleBE(offset)
    default: throw new Error(`unsupported numeric NetCDF type ${type}`)
  }
}

function readNumericVariable(fd, variable, count) {
  const bytesPerValue = TYPE_BYTES.get(variable.type)
  if (!bytesPerValue || variable.type === 2) {
    throw new Error(`NetCDF variable ${variable.name} is not numeric`)
  }
  const buffer = Buffer.alloc(count * bytesPerValue)
  const bytesRead = readSync(fd, buffer, 0, buffer.length, variable.begin)
  if (bytesRead !== buffer.length) throw new Error(`short read for NetCDF variable ${variable.name}`)
  return Array.from({ length: count }, (_, index) =>
    readValue(buffer, index * bytesPerValue, variable.type)
  )
}

const nearestCoordinateIndex = (coordinates, value) => {
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  const fraction = (value - first) / (last - first)
  return Math.max(0, Math.min(coordinates.length - 1, Math.round(fraction * (coordinates.length - 1))))
}

async function downloadSource() {
  if (existsSync(SOURCE_GZIP) && statSync(SOURCE_GZIP).size > 0) {
    console.log(`using cached ${SOURCE_GZIP}`)
    return
  }

  mkdirSync(CACHE_DIR, { recursive: true })
  const partial = `${SOURCE_GZIP}.partial`
  rmSync(partial, { force: true })
  console.log(`downloading ${SOURCE_URL}`)
  const response = await fetch(SOURCE_URL)
  if (!response.ok || !response.body) {
    throw new Error(`terrain download failed: ${response.status} ${response.statusText}`)
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial))
  renameSync(partial, SOURCE_GZIP)
  console.log(`cached ${(statSync(SOURCE_GZIP).size / 1024 / 1024).toFixed(1)}MB source download`)
}

async function build() {
  await downloadSource()
  rmSync(SOURCE_GRID, { force: true })
  console.log('inflating NetCDF source')
  await pipeline(createReadStream(SOURCE_GZIP), createGunzip(), createWriteStream(SOURCE_GRID))

  let fd
  try {
    fd = openSync(SOURCE_GRID, 'r')
    const { dimensions, variables } = parseNetCdfHeader(fd)
    const z = variables.find((variable) => variable.name === 'z')
    if (!z || z.dimensionIds.length !== 2) {
      throw new Error('NetCDF source has no two-dimensional z variable')
    }

    const yDimension = dimensions[z.dimensionIds[0]]
    const xDimension = dimensions[z.dimensionIds[1]]
    if (!xDimension || !yDimension) throw new Error('z variable references an unknown dimension')

    const xVariable = variables.find((variable) => variable.name === xDimension.name)
    const yVariable = variables.find((variable) => variable.name === yDimension.name)
    if (!xVariable || !yVariable) throw new Error('NetCDF source is missing coordinate variables')

    const x = readNumericVariable(fd, xVariable, xDimension.length)
    const y = readNumericVariable(fd, yVariable, yDimension.length)
    const sampleBytes = TYPE_BYTES.get(z.type)
    if (!sampleBytes || z.type === 2) throw new Error(`unsupported z variable type ${z.type}`)

    console.log(
      `sampling ${xDimension.length}x${yDimension.length} ${z.name} grid `
      + `(${sampleBytes} bytes/sample) to ${TARGET_WIDTH}x${TARGET_HEIGHT}`
    )

    const output = Buffer.alloc(HEADER_BYTES + TARGET_WIDTH * TARGET_HEIGHT)
    output.write(MAGIC, 0, 'ascii')
    output.writeUInt32BE(TARGET_WIDTH, 4)
    output.writeUInt32BE(TARGET_HEIGHT, 8)

    const sourceRow = Buffer.alloc(xDimension.length * sampleBytes)
    const sourceColumns = Array.from({ length: TARGET_WIDTH }, (_, col) => {
      const lng = -180 + ((col + 0.5) / TARGET_WIDTH) * 360
      return nearestCoordinateIndex(x, lng)
    })

    for (let row = 0; row < TARGET_HEIGHT; row++) {
      const lat = 90 - ((row + 0.5) / TARGET_HEIGHT) * 180
      const sourceRowIndex = nearestCoordinateIndex(y, lat)
      const sourceOffset = z.begin + sourceRowIndex * sourceRow.length
      const bytesRead = readSync(fd, sourceRow, 0, sourceRow.length, sourceOffset)
      if (bytesRead !== sourceRow.length) throw new Error(`short read for source row ${sourceRowIndex}`)

      for (let col = 0; col < TARGET_WIDTH; col++) {
        const elevation = readValue(sourceRow, sourceColumns[col] * sampleBytes, z.type)
        const land = elevation > 0
        const quantized = land ? Math.min(127, Math.max(0, Math.round(elevation / 50))) : 0
        output[HEADER_BYTES + row * TARGET_WIDTH + col] = (land ? 0x80 : 0) | quantized
      }
    }

    mkdirSync(dirname(OUTPUT), { recursive: true })
    writeFileSync(OUTPUT, output)
    console.log(`wrote public/terrain.bin — ${TARGET_WIDTH}x${TARGET_HEIGHT}, ${output.length} bytes`)
  } finally {
    if (fd !== undefined) closeSync(fd)
    rmSync(SOURCE_GRID, { force: true })
  }
}

await build()
