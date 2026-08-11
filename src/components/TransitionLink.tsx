import { type MouseEvent, type ReactNode } from 'react'
import {
  useHref,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from 'react-router-dom'
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/motion/gsap'
import { lenisRef } from '@/motion/SmoothScroll'
import { useUI } from '@/stores/ui'
import { getCategory } from '@/content/categories'

let transitioning = false

/** true while the wipe is in flight — RouteChangeEffects skips its refresh then */
export const isTransitioning = () => transitioning

/** lowercase word shown on the curtain while the next page mounts */
const labelFor = (to: string) => {
  const [, root, slug] = to.split('/')
  if (!root) return 'home'
  if (root === 'work' && slug) return getCategory(slug)?.title ?? 'work'
  if (root === 'work') return 'work'
  if (root === 'about') return 'about me'
  if (root === 'contact') return 'get in touch'
  return root
}

/** resolves after the next route has committed AND painted (two rAFs) */
const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

interface TransitionElements {
  overlay: HTMLElement
  underprint: Element
  face: Element
  wordUnder: Element
  wordMain: Element
  words: NodeListOf<Element>
}

const getTransitionElements = (): TransitionElements | null => {
  const overlay = document.getElementById('page-transition')
  const underprint = overlay?.querySelector('.page-transition-accent')
  const face = overlay?.querySelector('.page-transition-base')
  const wordPasses = overlay?.querySelectorAll('.page-transition-label-inner')
  const words = overlay?.querySelectorAll('.page-transition-word')

  if (
    !overlay ||
    !underprint ||
    !face ||
    !wordPasses ||
    wordPasses.length < 2 ||
    !words ||
    words.length < 2
  ) {
    return null
  }

  return {
    overlay,
    underprint,
    face,
    // wordPasses[0] is the orange under-pass, [1] the cream main pass
    wordUnder: wordPasses[0],
    wordMain: wordPasses[1],
    words,
  }
}

/**
 * Storyboard — the registered poster pull. Absolute seconds; cover times run
 * from transition start, reveal times from reveal start. The metaphor the
 * numbers serve: an orange UNDERPRINT leads, the charcoal POSTER FACE catches
 * it (the 80ms gap is registration, not parallax), the destination is printed
 * onto the face in two registered passes, the sheet rests, the route swaps
 * behind it, and the whole object continues upward — underprint trailing as
 * a narrow registration rim.
 */
const COVER = {
  underprint: { at: 0, dur: 0.52 },
  face: { at: 0.08, dur: 0.52 },
  wordUnder: { at: 0.48, dur: 0.34 },
  wordMain: { at: 0.52, dur: 0.38 },
  /** total cover length — the 0.90–0.95 tail is deliberate stillness */
  still: 0.95,
}
/** the reveal never starts before this — slow paints extend the stillness,
    fast paints never shorten the destination's reading interval */
const REVEAL_AT_MS = 1200
const REVEAL = {
  wordOut: { at: 0, dur: 0.26 },
  face: { at: 0.04, dur: 0.56 },
  underprint: { at: 0.12, dur: 0.56 },
}

async function runPostCommitTransition(
  elements: TransitionElements,
  start: number,
  syncScroll: () => void
) {
  const { underprint, face, wordUnder, wordMain } = elements

  syncScroll()
  await nextPaint()
  ScrollTrigger.refresh()

  // hold the registered sheet until the reveal beat — a stable reading
  // interval for the word even when the route paints instantly
  const remaining = REVEAL_AT_MS - (performance.now() - start)
  if (remaining > 45) await delay(remaining - 40)

  useUI.getState().setCanvasFrozen(false)
  // The canvas needs one frame containing the new route's planes before the
  // reveal exposes it. The existing hold budget pays for this; the storyboard
  // timing above is deliberately not extended.
  await nextPaint()

  const holdRemaining = REVEAL_AT_MS - (performance.now() - start)
  if (holdRemaining > 0) await delay(holdRemaining)
  useUI.setState({ revealed: true })

  // the sheet continues through the frame: word exits with it, face lifts,
  // underprint trails as the departing registration rim
  await gsap
    .timeline()
    .to(
      [wordUnder, wordMain],
      { yPercent: -120, duration: REVEAL.wordOut.dur, ease: 'power3.in' },
      REVEAL.wordOut.at
    )
    .to(
      face,
      { yPercent: -100, duration: REVEAL.face.dur, ease: 'power4.out' },
      REVEAL.face.at
    )
    .to(
      underprint,
      { yPercent: -100, duration: REVEAL.underprint.dur, ease: 'power4.out' },
      REVEAL.underprint.at
    )
}

/**
 * The wipe: nothing is on a timer it doesn't own. Cover (await) → swap route
 * + hard scroll reset while hidden → wait for paint → refresh triggers → hold
 * until the reveal beat → flip `revealed` so entrances start with the reveal
 * → reveal (await). Lenis is frozen for the whole ride.
 */
async function runTransition(navigate: NavigateFunction, to: string) {
  useUI.getState().closeLightbox()
  transitioning = true
  const start = performance.now()
  const lenis = lenisRef.current
  lenis?.stop()
  useUI.setState({ revealed: false })
  const elements = getTransitionElements()

  try {
    if (!elements) {
      navigate(to)
      lenis?.scrollTo(0, { immediate: true, force: true })
      window.scrollTo(0, 0)
      useUI.setState({ revealed: true })
      return
    }

    const { overlay, underprint, face, wordUnder, wordMain, words } = elements
    overlay.style.pointerEvents = 'all'
    words.forEach((w) => (w.textContent = labelFor(to)))

    // the sheet feeds up: underprint leads, face catches it, the word prints
    // in two registered passes, then absolute stillness.
    // y: 0 is load-bearing — the CSS resting state is translateY(100%), which
    // GSAP parses from the computed matrix as a PIXEL y offset (one viewport!).
    // Without zeroing it, yPercent animates on top of that phantom offset and
    // the curtain sweeps entirely below the visible screen.
    await gsap
      .timeline()
      .fromTo(
        underprint,
        { y: 0, yPercent: 100 },
        { yPercent: 0, duration: COVER.underprint.dur, ease: 'power4.in' },
        COVER.underprint.at
      )
      .fromTo(
        face,
        { y: 0, yPercent: 100 },
        { yPercent: 0, duration: COVER.face.dur, ease: 'power4.in' },
        COVER.face.at
      )
      .fromTo(
        wordUnder,
        { y: 0, yPercent: 120 },
        { yPercent: 0, duration: COVER.wordUnder.dur, ease: 'power3.out' },
        COVER.wordUnder.at
      )
      .fromTo(
        wordMain,
        { y: 0, yPercent: 120 },
        { yPercent: 0, duration: COVER.wordMain.dur, ease: 'power3.out' },
        COVER.wordMain.at
      )
      .to({}, { duration: 0.05 }, COVER.still - 0.05)

    useUI.getState().setCanvasFrozen(true)
    navigate(to)
    await runPostCommitTransition(elements, start, () => {
      // reset scroll while the screen is hidden — instant, and force past stop()
      lenis?.scrollTo(0, { immediate: true, force: true })
      window.scrollTo(0, 0)
    })
  } catch (err) {
    console.error('Page transition failed; falling back to a full navigation.', err)
    window.location.assign(to)
  } finally {
    transitioning = false
    if (useUI.getState().canvasFrozen) useUI.getState().setCanvasFrozen(false)
    lenis?.start()
    if (elements) {
      const { overlay, underprint, face, wordUnder, wordMain } = elements
      gsap.set(overlay, { pointerEvents: 'none' })
      gsap.set([underprint, face], { yPercent: 100 })
      gsap.set([wordUnder, wordMain], { yPercent: 120 })
    }
  }
}

/** Completes the transition lifecycle after BrowserRouter has committed a POP. */
export async function runPopstateTransition(pathname: string) {
  transitioning = true
  const start = performance.now()
  const lenis = lenisRef.current
  lenis?.stop()
  useUI.setState({ revealed: false })
  useUI.getState().closeLightbox()
  const elements = getTransitionElements()

  try {
    if (!elements) {
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
      ScrollTrigger.refresh()
      useUI.setState({ revealed: true })
      return
    }

    const { overlay, underprint, face, wordUnder, wordMain, words } = elements
    overlay.style.pointerEvents = 'all'
    words.forEach((w) => (w.textContent = labelFor(pathname)))

    // BrowserRouter has already committed the POP, so cover synchronously:
    // there is no outgoing route left to animate away gracefully.
    gsap.set([underprint, face], { y: 0, yPercent: 0 })
    gsap.set([wordUnder, wordMain], { y: 0, yPercent: 0 })
    useUI.getState().setCanvasFrozen(true)

    await runPostCommitTransition(elements, start, () => {
      // Preserve native POP restoration and align Lenis with its landing point.
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
    })
  } catch (err) {
    console.error('Popstate transition failed; falling back to a full navigation.', err)
    window.location.assign(pathname)
  } finally {
    transitioning = false
    if (useUI.getState().canvasFrozen) useUI.getState().setCanvasFrozen(false)
    lenis?.start()
    if (elements) {
      const { overlay, underprint, face, wordUnder, wordMain } = elements
      gsap.set(overlay, { pointerEvents: 'none' })
      gsap.set([underprint, face], { yPercent: 100 })
      gsap.set([wordUnder, wordMain], { yPercent: 120 })
    }
  }
}

async function runReducedMotionTransition(navigate: NavigateFunction, to: string) {
  useUI.getState().closeLightbox()
  transitioning = true
  useUI.setState({ revealed: false })
  const lenis = lenisRef.current
  const overlay = document.getElementById('page-transition')
  const face = overlay?.querySelector('.page-transition-base')

  try {
    if (!overlay || !face) {
      navigate(to)
      lenis?.scrollTo(0, { immediate: true, force: true })
      window.scrollTo(0, 0)
      useUI.setState({ revealed: true })
      return
    }

    overlay.style.pointerEvents = 'all'
    gsap.set(face, { y: 0, yPercent: 0, opacity: 0 })
    await gsap.to(face, { opacity: 1, duration: 0.1, ease: 'power1.inOut' })

    navigate(to)
    lenis?.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
    await nextPaint()
    ScrollTrigger.refresh()
    useUI.setState({ revealed: true })

    await gsap.to(face, { opacity: 0, duration: 0.1, ease: 'power1.inOut' })
  } catch (err) {
    console.error(
      'Reduced-motion page transition failed; falling back to a full navigation.',
      err
    )
    window.location.assign(to)
  } finally {
    transitioning = false
    if (overlay) overlay.style.pointerEvents = 'none'
    if (face) gsap.set(face, { yPercent: 100, opacity: 1 })
  }
}

export function useTransitionNavigate() {
  const navigate = useNavigate()
  const location = useLocation()

  return (to: string) => {
    if (transitioning || to === location.pathname) return

    if (prefersReducedMotion()) {
      void runReducedMotionTransition(navigate, to)
      return
    }

    void runTransition(navigate, to)
  }
}

interface TransitionLinkProps {
  to: string
  children: ReactNode
  className?: string
  'aria-label'?: string
}

/** In-app link that routes through the page-transition wipe. */
export function TransitionLink({ to, children, ...rest }: TransitionLinkProps) {
  const href = useHref(to)
  const transitionNavigate = useTransitionNavigate()

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    transitionNavigate(to)
  }

  return (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  )
}

/**
 * The registered poster pull. Roles, not colors: .page-transition-accent is
 * the orange UNDERPRINT, .page-transition-base the charcoal POSTER FACE. The
 * destination word is ink on the face, printed in two passes — an orange
 * under-pass offset by 2px (CSS left/top, so GSAP keeps full ownership of the
 * transforms) that the cream pass catches during the hold. Query order
 * matters: runTransition reads label-inner[0] as under, [1] as main.
 */
export function PageTransitionOverlay() {
  return (
    <div id="page-transition" className="page-transition">
      <div className="page-transition-accent" />
      <div className="page-transition-base">
        <div className="page-transition-lockup container">
          <span className="page-transition-label display-lg" aria-hidden>
            <span className="page-transition-label-inner page-transition-label-under">
              <span className="page-transition-word" />
              <span>.</span>
            </span>
            <span className="page-transition-label-inner page-transition-label-main">
              <span className="page-transition-word" />
              <span className="accent">.</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
