import { useEffect, type ReactNode } from 'react'
import type Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

/** Live handle to the Lenis instance, e.g. for the lightbox to pause scrolling. */
export const lenisRef: { current: Lenis | null } = { current: null }

/** Current smooth-scroll velocity, read transiently in useFrame — a plain ref so
 *  a scroll frame never triggers a React render. */
export const scrollVelocityRef = { current: 0 }

/**
 * Lenis smooth scroll driven by the GSAP ticker — one loop for the whole page.
 * Writes scroll velocity into a module ref for the WebGL layer to read.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return

    let cancelled = false
    let lenis: Lenis | null = null
    let raf: ((time: number) => void) | null = null

    const start = async () => {
      const { default: Lenis } = await import('lenis')
      const instance = new Lenis({
        duration: 1.1,
        smoothWheel: true,
      })
      // the effect may have torn down while the chunk was in flight
      if (cancelled) {
        instance.destroy()
        return
      }
      lenis = instance
      lenisRef.current = instance

      instance.on('scroll', () => {
        ScrollTrigger.update()
        scrollVelocityRef.current = instance.velocity
      })

      raf = (time: number) => instance.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    }

    void start()

    return () => {
      cancelled = true
      if (raf) gsap.ticker.remove(raf)
      lenis?.destroy()
      lenisRef.current = null
      scrollVelocityRef.current = 0
    }
  }, [])

  return <>{children}</>
}
