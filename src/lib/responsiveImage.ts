import type { Photo } from '@/content/categories'

const JPEG_RE = /\.(jpe?g)$/i
const RESPONSIVE_WIDTHS = [640, 1024, 1600] as const

// Photo objects are module-level singletons, so per-photo results are stable —
// these run per render for every image on a 45-frame gallery
const thumbnailCache = new WeakMap<Photo, string>()
const srcSetCache = new WeakMap<Photo, string | undefined>()

const derivativeSrc = (src: string, width: number) =>
  src.replace(JPEG_RE, `-${width}.webp`)

const responsiveWidths = (photo: Photo) =>
  JPEG_RE.test(photo.src)
    ? RESPONSIVE_WIDTHS.filter((width) => width <= photo.width)
    : []

/** Smallest shipped derivative is also the fallback for thumbnail surfaces. */
export const responsiveThumbnailSrc = (photo: Photo) => {
  const cached = thumbnailCache.get(photo)
  if (cached !== undefined) return cached
  const width = responsiveWidths(photo)[0]
  const src = width ? derivativeSrc(photo.src, width) : photo.src
  thumbnailCache.set(photo, src)
  return src
}

export const responsiveSrcSet = (photo: Photo) => {
  if (srcSetCache.has(photo)) return srcSetCache.get(photo)
  const widths = responsiveWidths(photo)
  let result: string | undefined
  if (widths.length > 0) {
    const candidates = widths.map((width) => `${derivativeSrc(photo.src, width)} ${width}w`)
    if (!widths.includes(photo.width as (typeof RESPONSIVE_WIDTHS)[number])) {
      candidates.push(`${photo.src} ${photo.width}w`)
    }
    result = candidates.join(', ')
  }
  srcSetCache.set(photo, result)
  return result
}
