#!/usr/bin/env node
/**
 * Build responsive WebP derivatives next to every referenced photographic
 * original. Naming is `<stem>-<width>.webp`, for example:
 *
 *   DSC03694.jpeg -> DSC03694-640.webp
 *
 * Originals are never changed. Widths larger than the source are skipped, and
 * an up-to-date derivative is left alone unless `--force` is passed.
 *
 * WebP quality 85 was chosen after 100% crop comparisons on the hero plate, a
 * foliage-heavy frame and a low-light concert frame. q80 visibly softened fine
 * grass; q85 kept that texture while remaining much smaller than the JPEGs.
 * AVIF was tested through ImageMagick at the same nominal quality and omitted:
 * it encoded 2-3x slower and produced files 1.9-2.1x larger than WebP across
 * those three representative images on this source set.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGE_ROOT = join(ROOT, 'public', 'images')
const CWEBP = '/opt/homebrew/bin/cwebp'
const MAGICK = '/opt/homebrew/bin/magick'
const WIDTHS = [640, 1024, 1600]
const QUALITY = 85
const CATEGORY_SLUGS = ['nature', 'travel', 'street', 'concerts', 'weddings', 'animals']
const FORCE = process.argv.includes('--force')

const fail = (message) => {
  console.error(`[images] ${message}`)
  process.exit(1)
}

if (!existsSync(CWEBP)) fail(`cwebp not found at ${CWEBP}`)
if (!existsSync(MAGICK)) fail(`ImageMagick not found at ${MAGICK}`)

const originals = []
for (const slug of CATEGORY_SLUGS) {
  const categoryDir = join(IMAGE_ROOT, 'categories', slug)
  const cover = join(categoryDir, 'cover.jpeg')
  if (!existsSync(cover)) fail(`missing category cover: ${cover}`)
  originals.push(cover)

  const galleryDir = join(categoryDir, 'gallery')
  const frames = readdirSync(galleryDir)
    .filter((name) => /\.(?:jpe?g)$/i.test(name))
    .sort()
    .map((name) => join(galleryDir, name))
  originals.push(...frames)
}
originals.push(join(IMAGE_ROOT, 'hero-plate.jpg'), join(IMAGE_ROOT, 'portrait.jpg'))

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.error) fail(result.error.message)
  if (result.status !== 0) fail(`${basename(command)} exited with ${result.status}`)
}

const imageWidth = (source) => {
  const result = spawnSync(MAGICK, ['identify', '-format', '%w', source], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (result.error) fail(result.error.message)
  if (result.status !== 0) fail(`could not identify ${source}`)
  const width = Number(result.stdout)
  if (!Number.isFinite(width) || width <= 0) fail(`invalid width for ${source}`)
  return width
}

let generated = 0
let current = 0
let skippedUpscale = 0

for (const source of originals) {
  if (!existsSync(source)) fail(`missing source: ${source}`)
  const sourceWidth = imageWidth(source)
  const sourceMtime = statSync(source).mtimeMs
  const extension = extname(source)
  const stem = source.slice(0, -extension.length)

  for (const width of WIDTHS) {
    const relativeSource = source.slice(ROOT.length + 1)
    if (sourceWidth < width) {
      skippedUpscale++
      console.log(`[images] skip ${relativeSource} @ ${width}w (source is ${sourceWidth}w)`)
      continue
    }

    const output = `${stem}-${width}.webp`
    if (!FORCE && existsSync(output) && statSync(output).mtimeMs >= sourceMtime) {
      current++
      console.log(`[images] current ${output.slice(ROOT.length + 1)}`)
      continue
    }

    run(CWEBP, [
      '-quiet',
      '-mt',
      '-q',
      String(QUALITY),
      '-metadata',
      'icc',
      '-resize',
      String(width),
      '0',
      source,
      '-o',
      output,
    ])
    generated++
    console.log(`[images] wrote ${output.slice(ROOT.length + 1)}`)
  }
}

console.log(
  `[images] done: ${generated} generated, ${current} current, ${skippedUpscale} upscale skips, ${originals.length} sources`
)
