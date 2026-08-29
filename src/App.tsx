import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SmoothScroll } from '@/motion/SmoothScroll'
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
import { Work } from '@/pages/Work'
import { Gallery } from '@/pages/Gallery'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Privacy } from '@/pages/Privacy'

// keep the three.js bundle off the critical path — the DOM shell paints first
const CanvasRoot = lazy(() => import('@/canvas/CanvasRoot'))

// dev-only particle sandbox; the guard is a compile-time constant, so the
// chunk never even gets built for production
const ParticleLab = import.meta.env.DEV
  ? lazy(() => import('@/pages/ParticleLab'))
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
            <Route path="/work" element={<Work />} />
            <Route path="/work/:category" element={<Gallery />} />
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
            <Route path="*" element={<Home />} />
          </Routes>
          <Footer />
        </main>
        <Lightbox />
        <Cursor />
        <PageTransitionOverlay />
        <LoadingScreen />
        <RouteChangeEffects />
        <Analytics />
      </SmoothScroll>
    </BrowserRouter>
  )
}
