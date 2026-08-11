import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'

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
 *
 * Resolving the mode on move is only half the lifecycle. Everything that
 * changes the world without moving the pointer — a route change, the lightbox
 * or a popped card taking the screen, the pointer leaving the document, the
 * tab going away — has to clear it too, or the last-hovered word stays frozen
 * over a page that no longer contains the thing it described.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  // imperative handle onto the running effect's clear, so the route effect
  // below can fire it without re-binding the pointer plumbing every navigation
  const clearRef = useRef<() => void>(() => {})
  const { pathname } = useLocation()

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
    /**
     * Single writer for both the DOM and the closure state. Every clear path
     * goes through here: dropping the attribute alone would leave `mode`
     * holding the stale word, and the next genuine hover of that same element
     * would be swallowed by the equality check below.
     */
    const setMode = (next: string) => {
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
    const clear = () => setMode('')
    clearRef.current = clear

    /** the badge follows whatever [data-cursor] ancestor the event landed in */
    const resolve = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.('[data-cursor]')
      setMode(target?.getAttribute('data-cursor') ?? '')
    }

    const onMove = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      resolve(e)
    }
    // a card unmounting under a stationary pointer emits pointerover on
    // whatever is revealed beneath it; no coordinates are read here, so the
    // badge re-labels in place rather than jumping
    const onOver = (e: PointerEvent) => resolve(e)
    const onLeave = () => clear()
    const onVisibility = () => {
      if (document.hidden) clear()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onLeave)

    // the lightbox and a popped card both cover the pointer with a surface the
    // badge was never resolved against, and neither arrives via a pointer event
    const unsubscribe = useUI.subscribe((state, prev) => {
      if (state.lightbox && !prev.lightbox) clear()
      if (state.popOpen && !prev.popOpen) clear()
      if (!state.revealed && prev.revealed) clear()
    })

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onLeave)
      unsubscribe()
      clearRef.current = () => {}
    }
  }, [])

  // navigation replaces the element under the pointer without any pointer
  // event firing; clearing on pathname keeps the word from outliving its page
  useEffect(() => {
    clearRef.current()
  }, [pathname])

  return (
    <div ref={rootRef} className="cursor" aria-hidden>
      <span ref={labelRef} className="cursor-label" />
    </div>
  )
}
