import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// Configure defaults
gsap.defaults({
  ease: 'power3.out',
  duration: 0.8,
})

// Configure ScrollTrigger defaults
ScrollTrigger.defaults({
  markers: false,
})

// Export everything for use in components
export { gsap, ScrollTrigger, useGSAP }

// Type exports
export type { GSAPTween, GSAPTimeline } from 'gsap'
