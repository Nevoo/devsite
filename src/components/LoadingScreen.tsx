import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { heroPhoto } from '@/content/hero'

/* short on purpose: the hero's own develop is the loading experience, so this
   only has to cover the gap before it can start. A progress bar used to sit
   here — it tweened on a timer rather than on load state, so it was a lie, and
   it made the visitor wait twice for one payoff. */
const MIN_SHOW_MS = 400

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })

/**
 * Full-screen loader shown once. Warms the browser cache for the hero photo
 * (the texture loader hits the same URL) and waits for fonts, then reveals.
 * Deliberately three.js-free so it lives in the critical bundle.
 */
export function LoadingScreen() {
  const rootRef = useRef<HTMLDivElement>(null)
  const revealed = useUI((s) => s.revealed)
  const setRevealed = useUI((s) => s.setRevealed)

  useEffect(() => {
    const start = performance.now()
    let cancelled = false

    Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      // same source of truth as the hero, so swapping the picture can't
      // silently leave this preloading the wrong file
      preloadImage(heroPhoto.src),
    ]).then(() => {
      if (cancelled) return
      const wait = Math.max(MIN_SHOW_MS - (performance.now() - start), 0)
      setTimeout(() => {
        if (!cancelled) setRevealed(true)
      }, wait)
    })

    return () => {
      cancelled = true
    }
  }, [setRevealed])

  useEffect(() => {
    if (!revealed || !rootRef.current) return
    const el = rootRef.current
    if (prefersReducedMotion()) {
      el.style.display = 'none'
      return
    }
    gsap.to(el, {
      yPercent: -100,
      duration: 0.9,
      delay: 0.2,
      ease: 'power4.inOut',
      onComplete: () => {
        el.style.display = 'none'
      },
    })
  }, [revealed])

  return (
    <div ref={rootRef} className="loading-screen" aria-hidden={revealed}>
      <span className="loading-screen-word display-md">
        rouvens<span className="accent">.</span>work
      </span>
    </div>
  )
}
