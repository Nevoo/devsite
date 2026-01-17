import { useRef, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useGSAP, gsap } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './PageTransition.module.css'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion || !contentRef.current) return

    // Animate content in when route changes
    gsap.fromTo(
      contentRef.current,
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'all',
      }
    )
  }, { dependencies: [routerState.location.pathname] })

  return (
    <div ref={contentRef} className={styles.content}>
      {children}
    </div>
  )
}
