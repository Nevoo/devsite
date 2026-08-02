import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'

/**
 * The label each [data-cursor] mode grows into. Keeping the words here rather
 * than in the markup means a badge can never disagree with the gesture the
 * element actually supports.
 */
const LABELS: Record<string, string> = {
  view: 'view',
  grade: 'grade',
}

/**
 * Labelled badge that appears over [data-cursor] targets and nowhere else —
 * there is no free-floating dot, so nothing rides the pointer across the
 * globe or the photographs. Desktop pointers only; the native cursor stays
 * visible. Position is tracked on every move so the badge materialises where
 * the pointer already is, not where it last was.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) {
      el.style.display = 'none'
      return
    }

    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' })

    let mode = ''
    const onMove = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      const target = (e.target as Element | null)?.closest?.('[data-cursor]')
      const next = target?.getAttribute('data-cursor') ?? ''
      // the label is only rewritten on an actual mode change, so the badge
      // never swaps its word mid-transition while it is still opening
      if (next === mode) return
      mode = next
      // a mode with no word gets no badge: the globe's "spin" surface used to
      // grow an empty accent circle here, which read as obstruction, not help
      if (labelRef.current) labelRef.current.textContent = LABELS[next] ?? ''
      if (LABELS[next]) el.dataset.mode = next
      else delete el.dataset.mode
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div ref={rootRef} className="cursor" aria-hidden>
      <span ref={labelRef} className="cursor-label" />
    </div>
  )
}
