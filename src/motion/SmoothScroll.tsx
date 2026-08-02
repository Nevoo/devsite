import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'
import { useUI } from '@/stores/ui'

/** Live handle to the Lenis instance, e.g. for the lightbox to pause scrolling. */
export const lenisRef: { current: Lenis | null } = { current: null }

/**
 * Lenis smooth scroll driven by the GSAP ticker — one loop for the whole page.
 * Writes scroll velocity into the UI store for the WebGL layer to read.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    })
    lenisRef.current = lenis

    lenis.on('scroll', () => {
      ScrollTrigger.update()
      useUI.setState({ scrollVelocity: lenis.velocity })
    })

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return <>{children}</>
}
