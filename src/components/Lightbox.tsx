import { useEffect, useRef } from 'react'
import { Index } from '@/components/Index'
import { useUI } from '@/stores/ui'
import { lenisRef } from '@/motion/SmoothScroll'

/**
 * Fullscreen photo viewer. DOM-based on purpose: crisp images, native feel.
 * Shows whatever stack the opener handed the store — a category gallery, a
 * place's sitting fanned off the globe — and never resolves content itself.
 */
export function Lightbox() {
  const lightbox = useUI((s) => s.lightbox)
  const closeLightbox = useUI((s) => s.closeLightbox)
  const stepLightbox = useUI((s) => s.stepLightbox)
  const touchStartX = useRef<number | null>(null)

  const total = lightbox?.photos.length ?? 0

  useEffect(() => {
    if (!lightbox) return

    lenisRef.current?.stop()
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') stepLightbox(1)
      if (e.key === 'ArrowLeft') stepLightbox(-1)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      lenisRef.current?.start()
    }
  }, [lightbox, closeLightbox, stepLightbox])

  if (!lightbox) return null

  const photo = lightbox.photos[lightbox.index]
  if (!photo) return null

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${lightbox.label} photo ${lightbox.index + 1} of ${total}`}
      onClick={closeLightbox}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 60) stepLightbox(dx < 0 ? 1 : -1)
        touchStartX.current = null
      }}
    >
      <img
        key={photo.src}
        className="lightbox-image"
        src={photo.src}
        alt={`${lightbox.label} photo ${lightbox.index + 1}`}
        onClick={(e) => e.stopPropagation()}
      />

      <button className="lightbox-close" aria-label="close" onClick={closeLightbox}>
        ×
      </button>
      <button
        className="lightbox-nav lightbox-prev"
        aria-label="previous photo"
        onClick={(e) => {
          e.stopPropagation()
          stepLightbox(-1)
        }}
      >
        ←
      </button>
      <button
        className="lightbox-nav lightbox-next"
        aria-label="next photo"
        onClick={(e) => {
          e.stopPropagation()
          stepLightbox(1)
        }}
      >
        →
      </button>
      {/* decorative: the position is already announced by the dialog's aria-label */}
      <span className="lightbox-counter">
        <Index n={lightbox.index + 1} of={total} />
      </span>
    </div>
  )
}
