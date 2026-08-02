import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* dev only: lets a headless probe slow the global timeline down and sample the
   entrance frame by frame. Entrance choreography is impossible to review at
   1x through screenshots — every capture lands somewhere different in the
   tween depending on how warm the image cache is. */
if (import.meta.env.DEV) {
  ;(window as unknown as { gsap: typeof gsap }).gsap = gsap
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, ScrollTrigger }
