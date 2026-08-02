import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SmoothScroll } from '@/motion/SmoothScroll'
import { ScrollTrigger } from '@/motion/gsap'
import { Cursor } from '@/components/Cursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Lightbox } from '@/components/Lightbox'
import { isTransitioning, PageTransitionOverlay } from '@/components/TransitionLink'
import { webglAvailable } from '@/lib/webgl'
import { Home } from '@/pages/Home'
import { Work } from '@/pages/Work'
import { Gallery } from '@/pages/Gallery'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Privacy } from '@/pages/Privacy'

// keep the three.js bundle off the critical path — the DOM shell paints first
const CanvasRoot = lazy(() => import('@/canvas/CanvasRoot'))

function RouteChangeEffects() {
  const { pathname } = useLocation()

  useEffect(() => {
    // the wipe refreshes at the right moment itself (after paint, while the
    // screen is covered) — this only handles popstate / non-wipe navigation
    if (!isTransitioning()) ScrollTrigger.refresh()
  }, [pathname])

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
