import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { lenisRef } from '@/motion/SmoothScroll'
import type { Photo } from '@/content/categories'

interface FramePopProps {
  /** caption + aria: 'bali, id', … */
  label: string
  /** the whole hand this card was lifted from, for stepping */
  photos: Photo[]
  index: number
  /**
   * The fanned card currently standing in for this frame — the geometry the
   * pop flies out of and slides back into. A function, not an element: the
   * card can re-render while the pop is up, and the close animation must
   * measure whatever is in the DOM at close time, not at open time.
   */
  sourceEl: () => HTMLElement | null
  /** the card's resting rotation in the fan, degrees — mirrored from the CSS */
  sourceAngle: number
  onStep: (dir: 1 | -1) => void
  /** called once the card has landed back in the hand */
  onClose: () => void
}

/** the viewer rect: centred, in the free air above the planet */
function fitRect(photo: Photo) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = Math.min(vw * 0.9, 1400)
  const maxH = vh * 0.72
  const ar = photo.width / photo.height
  let w = maxW
  let h = w / ar
  if (h > maxH) {
    h = maxH
    w = h * ar
  }
  // portrait and landscape share a vertical centre, not a top line — the pop
  // always hangs in the same region of air whatever shape the frame is. The
  // floor clears the header pill (bottom edge ~70px) rather than kissing it.
  const cy = vh * 0.47
  return { left: (vw - w) / 2, top: cy - h / 2, width: w, height: h }
}

/**
 * The hero's viewer — NOT a modal. A tap on a fanned card lifts that card out
 * of the hand and flies it up to viewer scale above the planet; a tap
 * anywhere else slides it back down into the fan, the mac-minimize gesture.
 * The page never goes away behind it, because the fan it came from is the
 * navigation: the card visibly leaves the hand (its slot goes empty) and
 * visibly returns.
 *
 * Portaled to <body> on purpose: .hero-globe carries a transform, and a
 * position:fixed element inside a transformed ancestor is fixed to that
 * ancestor, not to the viewport — the pop would ride the sphere's frame.
 *
 * FLIP, not layout animation: the figure is laid out at its final rect and
 * flown from the card's measured geometry with transforms. The card is square
 * and the photo is not, so scaleX/scaleY start unequal and the picture
 * un-squares itself in flight — half a second of controlled distortion that
 * reads as the card unfolding, and much cheaper than animating width/height.
 */
export function FramePop({
  label,
  photos,
  index,
  sourceEl,
  sourceAngle,
  onStep,
  onClose,
}: FramePopProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  const figRef = useRef<HTMLElement>(null)
  const skinRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLElement>(null)
  const rectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)
  const closingRef = useRef(false)
  const mountedRef = useRef(false)
  const touchX = useRef<number | null>(null)
  const setPopOpen = useUI((s) => s.setPopOpen)

  const photo = photos[index]
  const total = photos.length

  /* the source card's true centre and size. getBoundingClientRect of a rotated
     card returns an inflated axis-aligned box, but its CENTRE is exact; the
     true size comes from the hand square it occupies (× the fan's card scale,
     mirrored from the CSS). */
  const sourceGeom = () => {
    const el = sourceEl()
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }
  }

  /* same session contract as the Lightbox: page scroll stops, the canvas tour
     freezes (via popOpen), and everything restores on unmount */
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const root = document.getElementById('root')
    const wasInert = root?.inert ?? false
    if (root) root.inert = true
    closeRef.current?.focus({ preventScroll: true })
    setPopOpen(true)
    lenisRef.current?.stop()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (root) root.inert = wasInert
      previousFocus?.focus({ preventScroll: true })
      lenisRef.current?.start()
      setPopOpen(false)
    }
  }, [setPopOpen])

  useEffect(() => {
    const resize = () => setViewportVersion((version) => version + 1)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    if (prefersReducedMotion()) { onClose(); return }
    const fig = figRef.current
    const rect = rectRef.current
    const src = sourceGeom()
    if (!fig || !rect || !src) {
      onClose()
      return
    }
    gsap.killTweensOf([fig, skinRef.current, backRef.current, captionRef.current])
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(captionRef.current, { opacity: 0, duration: 0.12, ease: 'none' }, 0)
    tl.to(backRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0)
    /* the minimize: x, scale and rotation converge evenly while y accelerates
       into the hand — the split easing is what bends the path into a swoop
       down rather than a straight-line shrink */
    tl.to(
      fig,
      {
        x: src.cx - (rect.left + rect.width / 2),
        scaleX: src.w / rect.width,
        scaleY: src.h / rect.height,
        rotation: sourceAngle,
        duration: 0.45,
        ease: 'power2.inOut',
      },
      0
    )
    tl.to(fig, { y: src.cy - (rect.top + rect.height / 2), duration: 0.45, ease: 'power3.in' }, 0)
    /* THE SUCK. The vacuum read comes from the bottom edge tightening first:
       the skin pitches back around its TOP edge (perspective on the figure
       foreshortens the bottom, ~20% narrower at peak) while stretching a
       little taller — pinched and elongated is what "being inhaled" looks
       like — then flattens out over the tail of the flight so it lands as a
       flat card in the fan. */
    tl.to(skinRef.current, { rotationX: -26, scaleY: 1.09, duration: 0.16, ease: 'power2.in' }, 0)
    tl.to(skinRef.current, { rotationX: 0, scaleY: 1, duration: 0.29, ease: 'power2.out' }, 0.16)
  }

  /* one listener for the pop's life; the ref keeps it seeing the current
     step/close/total without re-attaching */
  const keyHandlers = useRef({ onStep, requestClose, total })
  useEffect(() => {
    keyHandlers.current = { onStep, requestClose, total }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { onStep, requestClose, total } = keyHandlers.current
      if (e.key === 'Escape') { e.preventDefault(); requestClose() }
      if (e.key === 'ArrowRight' && total > 1) { e.preventDefault(); onStep(1) }
      if (e.key === 'ArrowLeft' && total > 1) { e.preventDefault(); onStep(-1) }
      if (e.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* first mount: fly out of the hand. Step: the figure is already up, so only
     glide to the new frame's rect and blink the picture over. */
  useLayoutEffect(() => {
    const fig = figRef.current
    if (!fig || !photo) return
    const rect = fitRect(photo)
    rectRef.current = rect

    if (prefersReducedMotion()) {
      Object.assign(fig.style, {
        left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      })
      if (captionRef.current) captionRef.current.style.opacity = '1'
      return
    }

    if (!mountedRef.current) {
      mountedRef.current = true
      Object.assign(fig.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      const src = sourceGeom()
      if (src) {
        gsap.fromTo(
          fig,
          {
            x: src.cx - (rect.left + rect.width / 2),
            y: src.cy - (rect.top + rect.height / 2),
            scaleX: src.w / rect.width,
            scaleY: src.h / rect.height,
            rotation: sourceAngle,
          },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.55, ease: 'power3.out' }
        )
        // the inverse of the close's suck: it leaves the hand bottom-pinched
        // and unfurls flat as it rises
        gsap.fromTo(
          skinRef.current,
          { rotationX: -20, scaleY: 1.05 },
          { rotationX: 0, scaleY: 1, duration: 0.55, ease: 'power3.out' }
        )
      } else {
        // the card vanished under us (re-render mid-tap): arrive in place
        gsap.fromTo(fig, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.35 })
      }
      gsap.fromTo(backRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'none' })
      gsap.fromTo(
        captionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, delay: 0.35, ease: 'none' }
      )
    } else {
      gsap.to(fig, { ...rect, duration: 0.4, ease: 'power3.out' })
      const img = fig.querySelector('img')
      if (img) gsap.fromTo(img, { opacity: 0.25 }, { opacity: 1, duration: 0.3, ease: 'none' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, viewportVersion])

  if (!photo) return null

  return createPortal(
    <div
      ref={dialogRef}
      className="frame-pop"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — frame ${index + 1} of ${total}`}
    >
      <div ref={backRef} className="frame-pop-backdrop" onClick={requestClose} aria-hidden />
      <button ref={closeRef} type="button" className="frame-pop-close" onClick={requestClose}>
        close <span aria-hidden>×</span>
      </button>
      {total > 1 && (
        <nav className="frame-pop-controls" aria-label="photograph navigation">
          <button type="button" onClick={() => onStep(-1)} aria-label="previous photograph">←</button>
          <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
          <button type="button" onClick={() => onStep(1)} aria-label="next photograph">→</button>
        </nav>
      )}
      <figure
        ref={figRef}
        className="frame-pop-fig"
        onClick={() => (total > 1 ? onStep(1) : requestClose())}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 60 && total > 1) onStep(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {/* the skin carries the vacuum distortion (perspective pinch), the
            figure carries the flight — two writers, two transforms */}
        <div ref={skinRef} className="frame-pop-skin">
          <img src={photo.src} alt={`${label} frame ${index + 1}`} draggable={false} />
        </div>
        <figcaption ref={captionRef} className="frame-pop-caption">
          {label} <span className="frame-pop-sep">·</span> {String(index + 1).padStart(2, '0')} /{' '}
          {String(total).padStart(2, '0')}
        </figcaption>
      </figure>
    </div>,
    document.body
  )
}
