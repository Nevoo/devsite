import { useRef, useEffect } from 'react'
import { useGSAP, gsap } from '@/lib/gsap'
import { useCursor } from '@/stores/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { isBrowser } from '@/lib/utils'
import styles from './CustomCursor.module.css'

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorDotRef = useRef<HTMLDivElement>(null)
  const cursor = useCursor()
  const prefersReducedMotion = useReducedMotion()
  const isMobile = useIsMobile()

  // Don't render on mobile or with reduced motion
  if (isMobile || prefersReducedMotion) {
    return null
  }

  return <CursorInner cursorRef={cursorRef} cursorDotRef={cursorDotRef} cursor={cursor} />
}

interface CursorInnerProps {
  cursorRef: React.RefObject<HTMLDivElement | null>
  cursorDotRef: React.RefObject<HTMLDivElement | null>
  cursor: { isHovered: boolean; text: string; size: string }
}

function CursorInner({ cursorRef, cursorDotRef, cursor }: CursorInnerProps) {
  const mousePos = useRef({ x: 0, y: 0 })
  const cursorPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isBrowser) return

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useGSAP(() => {
    if (!cursorRef.current || !cursorDotRef.current) return

    // Smooth cursor follow with GSAP ticker
    const updateCursor = () => {
      // Lerp the cursor position
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.15
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x}px, ${cursorPos.current.y}px)`
      }

      // Dot follows exactly
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${mousePos.current.x}px, ${mousePos.current.y}px)`
      }
    }

    gsap.ticker.add(updateCursor)

    return () => {
      gsap.ticker.remove(updateCursor)
    }
  })

  // Animate cursor size based on state
  useGSAP(() => {
    if (!cursorRef.current) return

    const size = cursor.isHovered ? 80 : 40
    const opacity = cursor.isHovered ? 0.15 : 0.1

    gsap.to(cursorRef.current, {
      width: size,
      height: size,
      opacity,
      duration: 0.4,
      ease: 'power3.out',
    })
  }, { dependencies: [cursor.isHovered, cursor.size] })

  return (
    <>
      <div ref={cursorRef} className={styles.cursor}>
        {cursor.text && <span className={styles.cursorText}>{cursor.text}</span>}
      </div>
      <div ref={cursorDotRef} className={styles.cursorDot} />
    </>
  )
}
