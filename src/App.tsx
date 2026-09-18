import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useParams,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import { SmoothScroll } from '@/motion/SmoothScroll'
import { useUI } from '@/stores/ui'
import { ScrollTrigger } from '@/motion/gsap'
import { Cursor } from '@/components/Cursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Lightbox } from '@/components/Lightbox'
import {
  isTransitioning,
  PageTransitionOverlay,
  runPopstateTransition,
} from '@/components/TransitionLink'
import { webglAvailable } from '@/lib/webgl'
import { Home } from '@/pages/Home'
import { Journal } from '@/pages/Journal'
import { Gallery } from '@/pages/Gallery'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Privacy } from '@/pages/Privacy'

// keep the three.js bundle off the critical path — the DOM shell paints first
const CanvasRoot = lazy(() => import('@/canvas/CanvasRoot'))

const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)

/** analytics is never part of the first paint — it waits for an idle main thread */
function DeferredAnalytics() {
  const [mounted, setMounted] = useState(false)
  const revealed = useUI((s) => s.revealed)

  useEffect(() => {
    if (!revealed) return
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setMounted(true))
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(() => setMounted(true), 2000)
    return () => window.clearTimeout(timer)
  }, [revealed])

  if (!mounted) return null

  return (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  )
}

// dev-only particle sandbox; the guard is a compile-time constant, so the
// chunk never even gets built for production
const ParticleLab = import.meta.env.DEV
  ? lazy(() => import('@/pages/ParticleLab'))
  : null

// dev-only "little world" sandbox — billboards on a horizon planet
const WorldLab = import.meta.env.DEV
  ? lazy(() => import('@/pages/WorldLab'))
  : null

function RouteChangeEffects() {
  const { key, pathname } = useLocation()
  const navigationType = useNavigationType()
  const mountedRef = useRef(false)
  const previousLocationKeyRef = useRef(key)

  useEffect(() => {
    const isInitialRun = !mountedRef.current
    const locationChanged = previousLocationKeyRef.current !== key
    mountedRef.current = true
    previousLocationKeyRef.current = key

    if (navigationType === 'POP' && !isInitialRun && locationChanged) {
      // A POP during an active wipe has already committed. Let the in-flight
      // transition settle instead of double-firing and corrupting its state.
      if (isTransitioning()) return
      void runPopstateTransition(pathname)
      return
    }

    // the wipe refreshes at the right moment itself (after paint, while the
    // screen is covered). The initial entry is tagged POP, but still takes this
    // plain refresh branch so it cannot cover over the LoadingScreen.
    if (!isTransitioning()) ScrollTrigger.refresh()
  }, [key, navigationType, pathname])

  return null
}

export default function App() {
  const [hasWebGL] = useState(webglAvailable)

  useEffect(() => {
    document.body.classList.toggle('no-webgl', !hasWebGL)
  }, [hasWebGL])

  return (
    <BrowserRouter>
      <SmoothScroll>
        {hasWebGL && (
          <Suspense fallback={null}>
            <CanvasRoot />
          </Suspense>
        )}
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:category" element={<Gallery />} />
            <Route path="/work" element={<LegacyWork />} />
            <Route path="/work/:category" element={<LegacyWork />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            {ParticleLab && (
              <Route
                path="/lab/particles"
                element={
                  <Suspense fallback={null}>
                    <ParticleLab />
                  </Suspense>
                }
              />
            )}
            {WorldLab && (
              <Route
                path="/lab/world"
                element={
                  <Suspense fallback={null}>
                    <WorldLab />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<Home />} />
          </Routes>
          <Footer />
        </main>
        <Lightbox />
        <Cursor />
        <PageTransitionOverlay />
        <LoadingScreen />
        <RouteChangeEffects />
        <DeferredAnalytics />
      </SmoothScroll>
    </BrowserRouter>
  )
}

// old /work links keep resolving
function LegacyWork() {
  const { category } = useParams()
  return <Navigate to={category ? `/journal/${category}` : '/journal'} replace />
}
