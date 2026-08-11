import { useEffect, useRef } from 'react'
import { Index } from '@/components/Index'
import { useUI } from '@/stores/ui'
import { lenisRef } from '@/motion/SmoothScroll'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

const canRestoreFocus = (element: HTMLElement) =>
  element.isConnected &&
  !element.matches('[disabled], [aria-hidden="true"]') &&
  element.matches(FOCUSABLE_SELECTOR)

/**
 * Fullscreen photo viewer. DOM-based on purpose: crisp images, native feel.
 * Shows whatever stack the opener handed the store — a category gallery, a
 * place's sitting fanned off the globe — and never resolves content itself.
 */
export function Lightbox() {
  const lightbox = useUI((s) => s.lightbox)
  const closeLightbox = useUI((s) => s.closeLightbox)
  const stepLightbox = useUI((s) => s.stepLightbox)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const total = lightbox?.photos.length ?? 0
  const isOpen = lightbox !== null

  useEffect(() => {
    if (!isOpen) return

    const activeElement = document.activeElement
    openerRef.current = activeElement instanceof HTMLElement ? activeElement : null

    lenisRef.current?.stop()
    document.body.classList.add('lightbox-open')
    closeButtonRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement

        if (!first || !last) {
          e.preventDefault()
          dialog.focus()
        } else if (e.shiftKey && (active === first || !dialog.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
          e.preventDefault()
          first.focus()
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        closeLightbox()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepLightbox(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepLightbox(-1)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('lightbox-open')
      lenisRef.current?.start()

      const opener = openerRef.current
      openerRef.current = null
      if (opener && canRestoreFocus(opener)) opener.focus()
    }
  }, [isOpen, closeLightbox, stepLightbox])

  useEffect(() => {
    if (!lightbox) return

    const { photos, index } = lightbox
    const adjacent = [
      (index - 1 + photos.length) % photos.length,
      (index + 1) % photos.length,
    ]

    /* Detached images warm the browser cache without adding layout-bearing
       nodes, so stepping never waits on the next wrapped frame. */
    adjacent.forEach((adjacentIndex) => {
      const preload = new Image()
      preload.src = photos[adjacentIndex].src
    })
  }, [lightbox?.index, lightbox?.photos])

  if (!lightbox) return null

  const photo = lightbox.photos[lightbox.index]
  if (!photo) return null

  return (
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={lightbox.label}
      tabIndex={-1}
      onClick={closeLightbox}
      onTouchStart={(e) => {
        const touch = e.touches[0]
        touchStart.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        const touch = e.changedTouches[0]
        touchStart.current = null
        if (!start || !touch) return

        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          stepLightbox(dx < 0 ? 1 : -1)
        }
      }}
      onTouchCancel={() => {
        touchStart.current = null
      }}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        photo {lightbox.index + 1} of {total}
      </span>
      <img
        key={photo.src}
        className="lightbox-image"
        src={photo.src}
        alt={photo.alt ?? `${lightbox.label} photo ${lightbox.index + 1}`}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        ref={closeButtonRef}
        className="lightbox-close"
        aria-label="close"
        onClick={closeLightbox}
      >
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
      {/* decorative: the changing position is announced by the polite live region */}
      <span className="lightbox-counter">
        <Index n={lightbox.index + 1} of={total} />
      </span>
    </div>
  )
}
