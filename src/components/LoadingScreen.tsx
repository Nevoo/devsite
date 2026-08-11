import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { heroPhoto } from '@/content/hero'
import { webglAvailable } from '@/lib/webgl'

/* short on purpose: the hero's own entrance is the loading experience, so this
   only has to cover the gap before it can start. A progress bar used to sit
   here — it tweened on a timer rather than on load state, so it was a lie, and
   it made the visitor wait twice for one payoff. */
const MIN_SHOW_MS = 400

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    // This plate is below the fold; never let its warm-up compete with type.
    img.fetchPriority = 'low'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })

/**
 * Full-screen veil shown once. Warms the browser cache for the hero photo
 * (the texture loader hits the same URL) and waits for fonts, then lifts.
 *
 * Under 3D the veil is plain charcoal and lifts as a quick fade: the globe's
 * seed — the entrance's actual subject — is already idling beneath it
 * (Globe.tsx), and a wordmark flashing for 400ms on a fast connection was
 * noise in front of that. Without WebGL, or with reduced motion, there is no
 * seed to reveal, so the veil keeps the wordmark and the old exit.
 */
export function LoadingScreen() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const initialPathname = useRef(pathname).current
  const revealed = useUI((s) => s.revealed)
  const setRevealed = useUI((s) => s.setRevealed)
  const [mode] = useState<'veil' | 'word' | 'reduced'>(() =>
    prefersReducedMotion() ? 'reduced' : webglAvailable() ? 'veil' : 'word'
  )

  useEffect(() => {
    const start = performance.now()
    let cancelled = false

    // Every route opens on a Gilroy heading. Waiting for document.fonts.ready
    // also held the veil for the 785KB Inter variable face (~16s on Slow 4G),
    // even though Inter already has font-display: swap and can arrive safely
    // after the page is usable.
    const displayFace = document.fonts?.load('800 1em Gilroy') ?? Promise.resolve()
    const readiness: Promise<unknown>[] = [displayFace]
    if (initialPathname === '/') {
      // The plate sits several viewports below the home LCP. Warm only its
      // smallest generated source without holding the veil for a below-fold
      // asset; non-home routes never request it at all.
      void preloadImage(heroPhoto.src.replace(/\.(jpe?g)$/i, '-640.webp'))
    }

    Promise.all(readiness).then(() => {
      if (cancelled) return
      const wait = Math.max(MIN_SHOW_MS - (performance.now() - start), 0)
      setTimeout(() => {
        if (!cancelled) setRevealed(true)
      }, wait)
    })

    return () => {
      cancelled = true
    }
  }, [initialPathname, setRevealed])

  useEffect(() => {
    if (!revealed || !rootRef.current) return
    const el = rootRef.current
    if (mode === 'reduced') {
      el.style.display = 'none'
      return
    }
    // the page underneath is live from this beat — the veil is only a picture
    el.style.pointerEvents = 'none'
    const done = () => {
      el.style.display = 'none'
    }
    if (mode === 'veil') {
      // fast fade onto the streaming dust field; the field's own hold gives
      // the visitor a beat of flying through it before the dots stream home
      // (Globe.tsx FIELD_HOLD)
      gsap.to(el, { opacity: 0, duration: 0.4, ease: 'power2.out', onComplete: done })
    } else {
      gsap.to(el, { yPercent: -100, duration: 0.9, delay: 0.2, ease: 'power4.inOut', onComplete: done })
    }
  }, [revealed, mode])

  return (
    <div ref={rootRef} className="loading-screen" aria-hidden={revealed}>
      {mode !== 'veil' && (
        <span className="loading-screen-word display-md">
          rouvens<span className="accent">.</span>work
        </span>
      )}
    </div>
  )
}
