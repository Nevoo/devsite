import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { CountryDetail } from './CountryDetail'
import { webglAvailable } from '@/lib/webgl'
import { prefersReducedMotion } from '@/motion/gsap'
import { lenisRef } from '@/motion/SmoothScroll'
import { heroVisibility } from '@/canvas/heroVisibility'
import { responsiveSrcSet, responsiveThumbnailSrc } from '@/lib/responsiveImage'
import { useUI } from '@/stores/ui'
import type { GlobePointer, PinProjection, ScaleState } from '@/canvas/Globe'
import { clusters, type PlaceCluster } from '@/content/clusters'
import { places, framesAt, firstAt, precisionWord, type Place } from '@/content/places'
import { flightArcs, waypointAirports } from '@/content/flights'

const GlobeView = lazy(() => import('./GlobeView'))

/**
 * The waypoint layer: cities the route flew through that hold no photographs.
 * A city already wearing a place pin keeps the pin — a mono label under the
 * same word would just double it — so anything within ~2.5° (~275km) of a
 * place drops out here. Everything else gets a small instrument-register
 * label, which is what keeps the sphere's far side from reading as empty
 * ocean between pins.
 */
const nearAPlace = ([lat, lng]: [number, number]) =>
  places.some((p) => Math.hypot(p.coords[0] - lat, p.coords[1] - lng) < 2.5)
const waypoints = waypointAirports.filter((a) => !nearAPlace(a.coords))

/* Module scope, and that matters. These used to be built inline in the render
   body, so every WorldGlobe render handed the canvas fresh array identities —
   which re-ran Globe's seed pass and re-rolled the entrance's random tiebreaks.
   Harmless in practice (the one render that lands mid-entrance is the reveal
   flip, while the dots are still parked in the dust) but it is a live wire
   under a sequence whose whole premise is that nothing is decided twice.
   `places` and `waypoints` are module constants; so are these. */
const pinCoords = places.map((p) => p.coords)
const pinPrecisions = places.map((place) => place.precision)
const pinWeights = places.map((place) => framesAt(place).length)
const waypointCoords = waypoints.map((a) => a.coords)

/* The static fallback needs the same congestion truth as the live globe.
   clusters.ts is pure deployment-data math, so keeping this lookup at module
   scope adds no Three.js/canvas dependency and decides every grouping once. */
const clusterForPlace = new Int16Array(places.length).fill(-1)
clusters.forEach((cluster, clusterIndex) => {
  for (const placeIndex of cluster.memberIndices) clusterForPlace[placeIndex] = clusterIndex
})

/* ONE FACE PER COUNTRY (v4.1). At world scale a country shows exactly one
   thing: a small photo preview standing on its heaviest place. Singleton
   piles, chip-only clusters and bare text labels were three different rest
   presentations for the same kind of object; now the heaviest member's stack
   is the country's face, every other member presentation waits for the
   landed table, and the preview's card count is capped in CSS. */
const previewPlaceForCluster = new Int16Array(clusters.length).fill(-1)
clusters.forEach((cluster, clusterIndex) => {
  let best = -1
  let bestFrames = 0
  for (const placeIndex of cluster.memberIndices) {
    const count = framesAt(places[placeIndex]).length
    if (count > bestFrames) {
      best = placeIndex
      bestFrames = count
    }
  }
  previewPlaceForCluster[clusterIndex] = best
})

const worldTour = Array.from(previewPlaceForCluster).filter((index) => index >= 0)

const regionNames = new Intl.DisplayNames('en', { type: 'region' })
const withoutCountrySuffix = (label: string) => label.replace(/,\s*[a-z]{2}$/i, '')

/**
 * The display title IS the unit now: a cluster is a country (v3), so the
 * title is the country's display name, full stop. The heaviest-member
 * heuristic this replaces existed to paper over cross-border caps like
 * `germany · vienna · dolomites` — a grouping that can no longer be built.
 * The member list still demotes to the instrument meta line under the title
 * and stays whole in the chip's accessible name.
 */
const clusterLabel = (cluster: PlaceCluster) =>
  (regionNames.of(cluster.countryCode) ?? cluster.countryCode).toLocaleLowerCase('en')
/** the demoted line: every member of the cap, in travelled order */
const clusterMemberList = (cluster: PlaceCluster) =>
  cluster.memberIndices
    .map((placeIndex) => withoutCountrySuffix(places[placeIndex].label))
    .join(' · ')

const clusterLabels = clusters.map(clusterLabel)
const clusterMembers = clusters.map(clusterMemberList)
/** `4 places` / `1 place` — the one half of the count line that is still prose */
const placesWord = (count: number) => `${count} ${count === 1 ? 'place' : 'places'}`
/**
 * The bracket half, split so the digit can be lifted into accent: everything
 * before the number, then the number, then everything after it. `[ 24 ]` and
 * never `[ 24 frames ]` — the stack captions set the register and a second
 * spelling of the same count is the site disagreeing with itself.
 */
const countsLead = (placeCount: number) => `${placesWord(placeCount)} · [ `
const COUNTS_TAIL = ' ]'
const clusterAccessibleName = (cluster: PlaceCluster, clusterIndex: number) => {
  const placeCount = cluster.memberIndices.length
  const frameCount = cluster.totalFrameCount
  /* the short title is a display move, not an information move: a screen
     reader still hears every place this chip covers */
  const members = clusterMembers[clusterIndex]
  const named =
    members === clusterLabels[clusterIndex] ? members : `${clusterLabels[clusterIndex]}: ${members}`
  return `enter ${named} — ${placesWord(placeCount)}, ${frameCount} ${
    frameCount === 1 ? 'frame' : 'frames'
  }`
}

/* Group a cluster when its newest member is reached, then keep its members in
   travelled order beneath one counts line. Lone places retain the same order
   around those groups, and empty stops remain ordinary label-only rows. */
const staticPlaces: {
  place: Place
  index: number
  cluster?: PlaceCluster
  clusterIndex?: number
}[] = []
const emittedStaticClusters = new Uint8Array(clusters.length)
for (let index = places.length - 1; index >= 0; index--) {
  const clusterIndex = clusterForPlace[index]
  if (clusterIndex < 0) {
    staticPlaces.push({ place: places[index], index })
    continue
  }
  if (emittedStaticClusters[clusterIndex] === 1) continue
  emittedStaticClusters[clusterIndex] = 1
  const cluster = clusters[clusterIndex]
  const memberIndices = cluster.memberIndices.slice().sort((a, b) => b - a)
  memberIndices.forEach((memberIndex, memberOrder) => {
    staticPlaces.push({
      place: places[memberIndex],
      index: memberIndex,
      cluster: memberOrder === 0 ? cluster : undefined,
      clusterIndex: memberOrder === 0 ? clusterIndex : undefined,
    })
  })
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** '2023-10-16T…' → "oct '23" */
const stamp = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} '${iso.slice(2, 4)}`
const easeCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

/** Avoid invalidating style and accessibility trees for unchanged frame values. */
const writeStyle = (node: HTMLElement | null | undefined, name: string, value: string) => {
  if (node && node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value)
}
const writeAttribute = (node: HTMLElement | null | undefined, name: string, value: string) => {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value)
}
const writeInert = (node: HTMLElement | null | undefined, value: boolean) => {
  if (node && node.inert !== value) node.inert = value
}
const writeClass = (node: HTMLElement, name: string, on: boolean) => {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on)
}

/**
 * The line under the place name. A stop that has been travelled but not yet
 * imported has neither a date nor a frame count, so rather than print "0
 * frames" — which reads as a shoot that failed — it says what is true: the
 * photographs are not on the site yet.
 */
const meta = (place: Place) => {
  const count = place.frames.length
  if (count === 0) return 'frames to come'
  const from = firstAt(place)
  return from ? `${stamp(from)} · ${count} ${count === 1 ? 'frame' : 'frames'}` : `${count} frames`
}

interface WorldGlobeProps {
  /**
   * Shared with the projection panel: the index into `places` currently being
   * presented, written every frame by the canvas, read by whoever needs it
   * without a React render in between. Optional so the globe still works alone.
   */
  activeRef?: { current: number }
  /**
   * The other direction: the index the visitor TAPPED, written here by the
   * pickup buttons, consumed by the canvas (swing it front-on, hold it long)
   * and by the panel (lock onto its collection). Cleared canvas-side when the
   * tour moves on or the sphere is grabbed.
   */
  selectedRef?: { current: number }
  /** The existing hero subject nodes; scene progress crossfades their layers. */
  titleRef?: RefObject<HTMLHeadingElement | null>
  subtitleRef?: RefObject<HTMLParagraphElement | null>
}

/**
 * Layer 2 half of the globe: a DOM frame that owns layout and every readable
 * word, with a drei <View> scissoring the shared canvas onto it.
 *
 * The 3D never renders text. Each place is a real DOM element carrying a real
 * place name and a real date, positioned each frame from the projection the
 * canvas reports back — so the labels are indexable and legible to a screen
 * reader whether or not WebGL ever starts. (Not selectable: the frame turns
 * off user-select, because a drag across it was selecting the page.)
 *
 * With no WebGL or reduced motion it renders a plain ordered list of the same
 * places instead, in the order travelled. Nothing on this site lives behind the
 * ability to run a 3D scene, and until the `!has3D` branch below existed that
 * was a claim rather than a fact.
 */
export function WorldGlobe({
  activeRef: sharedActiveRef,
  selectedRef: sharedSelectedRef,
  titleRef,
  subtitleRef,
}: WorldGlobeProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pinRefs = useRef<(HTMLLIElement | null)[]>([])
  const pinLabelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const projectionRef = useRef<PinProjection[]>([])
  const waypointRefs = useRef<(HTMLLIElement | null)[]>([])
  const waypointProjectionRef = useRef<PinProjection[]>([])
  const chipRefs = useRef<(HTMLLIElement | null)[]>([])
  const chipButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const chipProjectionRef = useRef<PinProjection[]>([])
  /* v4: a chip is the HOVER LABEL of its country, not a resting billboard.
     One damped presence per chip, driven by the canvas's hover answer (and by
     keyboard focus, which must always be able to see what it is standing on). */
  const chipFadeRef = useRef(new Float32Array(clusters.length))
  const onProjectRef = useRef<((delta: number) => void) | null>(null)
  const metricsDirtyRef = useRef(true)
  const heroBottomRef = useRef(Number.POSITIVE_INFINITY)
  const [mountedCluster, setMountedCluster] = useState(-1)
  const mountedClusterRef = useRef(-1)
  const internalActiveRef = useRef(-1)
  const internalSelectedRef = useRef(-1)
  const activeRef = sharedActiveRef ?? internalActiveRef
  const selectedRef = sharedSelectedRef ?? internalSelectedRef
  const spinRef = useRef(0)
  const tiltRef = useRef(0)
  const scaleRef = useRef<ScaleState>({
    phase: 'world',
    cluster: -1,
    morph: 0,
    presence: 0,
    scan: 0,
  })
  const enterRef = useRef(-1)
  const exitRef = useRef(false)
  /* the country pointer contract (v3 phase 2): the DOM writes where the
     pointer is, the canvas answers which visited country is under it */
  const globePointerRef = useRef<GlobePointer>({ x: 0, y: 0, active: false })
  const hoverCountryRef = useRef(-1)
  const frameRectRef = useRef<{ rect: DOMRect | null; scrollY: number }>({ rect: null, scrollY: 0 })
  const wasDragRef = useRef(false)
  const grabRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const entryFocusRef = useRef<HTMLElement | null>(null)
  const detailFocusedRef = useRef(false)
  const draggingRef = useRef(false)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const lastXRef = useRef(0)
  const lastYRef = useRef(0)
  const dragVelocityRef = useRef({ x: 0, y: 0, at: 0 })
  const originalDocumentTitleRef = useRef(
    typeof document === 'undefined' ? 'rouvens.work' : document.title
  )
  const [has3D] = useState(() => webglAvailable() && !prefersReducedMotion())

  const enterCountry = (index: number) => {
    const frame = frameRef.current
    const hero = frame?.closest<HTMLElement>('.hero')
    if (frame && hero) {
      if (lenisRef.current) lenisRef.current.scrollTo(hero, { immediate: true })
      else hero.scrollIntoView({ block: 'start' })
      frameRectRef.current = { rect: frame.getBoundingClientRect(), scrollY: window.scrollY }
      metricsDirtyRef.current = true
    }
    enterRef.current = index
  }

  useEffect(() => {
    if (!has3D) return
    const frame = frameRef.current
    const hero = frame?.closest<HTMLElement>('.hero') ?? frame
    if (!frame || !hero) return
    let intersects = false
    const publishVisibility = () => {
      heroVisibility.current = intersects && !document.hidden
      if (!heroVisibility.current) globePointerRef.current.active = false
    }
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting && entry.intersectionRatio > 0
      publishVisibility()
    })
    observer.observe(hero)
    document.addEventListener('visibilitychange', publishVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', publishVisibility)
      heroVisibility.current = false
    }
  }, [has3D])

  useEffect(() => {
    metricsDirtyRef.current = true
    const resize = new ResizeObserver(() => {
      metricsDirtyRef.current = true
    })
    const nodes = [frameRef.current, titleRef?.current, subtitleRef?.current, detailRef.current]
    for (const node of nodes) if (node) resize.observe(node)
    const onFonts = () => {
      metricsDirtyRef.current = true
    }
    document.fonts.addEventListener('loadingdone', onFonts)
    return () => {
      resize.disconnect()
      document.fonts.removeEventListener('loadingdone', onFonts)
    }
  }, [mountedCluster, has3D, titleRef, subtitleRef])

  /* The scene invokes this after moving the camera and projecting its anchors.
     Geometry is read in one pass when invalidated; all following work writes
     cached nodes. Scene updates only render React when the country changes. */
  useEffect(() => {
    if (!has3D || places.length === 0) return

    const hero = frameRef.current?.closest<HTMLElement>('.hero')
    const sky = hero?.querySelector<HTMLElement>('.hero-sky')
    let measuredScrollY = 0
    let frameBounds: DOMRect | null = null
    const readMetrics = () => {
      if (!metricsDirtyRef.current && frameBounds) return
      metricsDirtyRef.current = false
      measuredScrollY = window.scrollY
      frameBounds = frameRef.current?.getBoundingClientRect() ?? null
      frameRectRef.current = { rect: frameBounds, scrollY: measuredScrollY }
      heroBottomRef.current = (hero?.getBoundingClientRect().bottom ?? Infinity) + measuredScrollY
    }

    const tick = (delta: number) => {
      const frame = frameRef.current
      if (!frame || !heroVisibility.current) return
      const tickDelta = Math.min(0.1, Math.max(0, delta))
      readMetrics()
      if (!frameBounds) return
      const { width, height } = frameBounds
      const scrollOffset = window.scrollY - measuredScrollY
      const top = frameBounds.top - scrollOffset
      const scaleState = scaleRef.current
      const worldScale = scaleState.phase === 'world'
      const nextMountedCluster = worldScale ? -1 : scaleState.cluster
      if (mountedClusterRef.current !== nextMountedCluster) {
        mountedClusterRef.current = nextMountedCluster
        setMountedCluster(nextMountedCluster)
        metricsDirtyRef.current = true
        detailFocusedRef.current = false
        if (nextMountedCluster >= 0) {
          entryFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        } else {
          entryFocusRef.current?.focus({ preventScroll: true })
        }
      }
      const platePresence = Math.max(0, Math.min(1, scaleState.presence))
      const annotation = 1 - easeCubic(Math.max(0, Math.min(1, scaleState.morph / 0.3)))
      writeAttribute(frame, 'data-phase', scaleState.phase)
      writeAttribute(frame, 'data-morph', scaleState.morph.toFixed(3))
      writeAttribute(frame, 'data-presence', platePresence.toFixed(3))
      writeAttribute(frame, 'data-scan', scaleState.scan.toFixed(3))
      writeAttribute(frame, 'data-cluster', String(scaleState.cluster))
      /* the country under the pointer, as affordance: the grab hand becomes a
         pointing one over an enterable country (canvas answers per frame) */
      if (grabRef.current) {
        writeStyle(grabRef.current, 'cursor',
          scaleState.phase === 'world' && hoverCountryRef.current >= 0 ? 'pointer' : '')
      }
      writeStyle(hero, '--plate-presence', platePresence.toFixed(3))
      writeStyle(document.documentElement, '--plate-presence', platePresence.toFixed(3))
      const detailPresence = easeCubic(Math.max(0, Math.min(1, (platePresence - 0.45) / 0.55)))
      writeStyle(hero, '--country-presence', detailPresence.toFixed(3))
      writeStyle(sky, 'opacity', (1 - Math.min(1, platePresence * 2)).toFixed(3))
      writeInert(sky, platePresence > 0.25)
      if (detailRef.current) {
        writeInert(detailRef.current, detailPresence < 0.6 || scaleState.phase === 'return')
        if (!detailRef.current.inert && !detailFocusedRef.current) {
          detailFocusedRef.current = true
          detailRef.current.focus({ preventScroll: true })
        }
      }
      const country = clusters[scaleState.cluster]
      const nextTitle = worldScale || !country ? originalDocumentTitleRef.current
        : `${clusterLabels[scaleState.cluster]} — rouvens.work`
      if (document.title !== nextTitle) document.title = nextTitle
      const horizonY = window.innerHeight * 0.78
      for (let i = 0; i < places.length; i++) {
        const node = pinRefs.current[i]
        const projection = projectionRef.current[i]
        if (!node || !projection) continue
        // fade out as a pin rounds the limb rather than popping at the edge
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.02) / 0.28))
        const screenY = top + projection.y * height
        const sink = worldScale
          ? Math.max(0, Math.min(1, (horizonY - screenY) / 60))
          : 1
        /* the entrance holds this pickup back until the ground under IT has
           landed — per pin, not per globe. A single shared progress value
           meant every label in the world arrived on the same frame, which is
           most of what read as "and now the planet is here" (Globe.tsx, the
           seed pass). 1 on a formed mount, so nothing waits on a remount. */
        const clusterIndex = clusterForPlace[i]
        /* one face per country (v4.1): at world scale only the preview place
           shows — bare labels and sibling stacks wait for the landed table */
        const isCountryPreview =
          clusterIndex >= 0 && previewPlaceForCluster[clusterIndex] === i
        const scaleVisible = worldScale
          ? (isCountryPreview ? 1 : 0)
          : isCountryPreview ? 1 - Math.min(1, platePresence * 1.6) : 0
        const visible = limb * sink * projection.form * scaleVisible
        /* depth is drawn, not implied: a pickup near the limb shrinks as well
           as fades, and the stacking order follows facing so a front pickup
           always overlaps one further round the curve */
        const depthScale = 0.55 + 0.45 * Math.max(0, Math.min(1, projection.facing))
        const scale = depthScale + (1 - depthScale) * platePresence
        const localX = projection.x * width
        const localY = projection.y * height
        writeStyle(node, 'transform', `translate3d(${localX.toFixed(2)}px, ${localY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`)
        writeStyle(node, 'opacity', visible.toFixed(3))
        /* a fanned hand must ride over every neighbouring pickup, whatever
           its facing says — the visitor just asked for this one. The tour's
           presented hand gets the same treatment one tier down: the mock
           coordinates cluster hard, and without the boost a presented hand
           can open UNDER a neighbour's resting pile. */
        writeStyle(node, 'z-index',
          i === selectedRef.current
            ? '400'
            : i === activeRef.current
              ? '300'
              : String(100 + Math.round(Math.max(0, projection.facing) * 100)))
        writeStyle(node, 'pointer-events', visible > 0.6 ? 'auto' : 'none')
        writeInert(node, visible <= 0.6)
        writeClass(node, 'globe-pin-active', i === activeRef.current)
        writeClass(node, 'globe-pin-selected', i === selectedRef.current)
      }
      /* the waypoint labels: same projection ride, quieter thresholds. They
         start fading later round the limb than pickups do (they are texture,
         not targets) and never take pointer events, so the loop only writes
         transform and opacity. One-leg cities cap dimmer than hubs — with
         eleven labels over Europe the rank is what keeps the layer readable. */
      for (let i = 0; i < waypoints.length; i++) {
        const node = waypointRefs.current[i]
        const projection = waypointProjectionRef.current[i]
        if (!node || !projection) continue
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.12) / 0.3))
        const screenY = top + projection.y * height
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        /* near-full even for minors: node opacity dims the knockout plate too,
           and a see-through plate defeats its purpose — rank is expressed in
           the text colours and size (see .globe-waypoint-minor), not here */
        const cap = waypoints[i].legCount > 1 ? 1 : 0.9
        const scale = 0.7 + 0.3 * Math.max(0, Math.min(1, projection.facing))
        writeStyle(node, 'transform', `translate3d(${(projection.x * width).toFixed(2)}px, ${(projection.y * height).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`)
        writeStyle(node, 'opacity', (limb * sink * cap * projection.form * annotation).toFixed(3))
      }

      const active = document.activeElement
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]
        if (cluster.congestedSingleton) continue
        const button = chipButtonRefs.current[i]
        const expandedValue = scaleState.phase !== 'world' && scaleState.cluster === i
          ? 'true'
          : 'false'
        if (button?.getAttribute('aria-expanded') !== expandedValue) {
          button?.setAttribute('aria-expanded', expandedValue)
        }
        const node = chipRefs.current[i]
        const projection = chipProjectionRef.current[i]
        if (!node || !projection) continue
        writeInert(node, !worldScale)
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.02) / 0.28))
        const screenY = top + projection.y * height
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        /* v4: the chip is the country's hover label. At rest it is absent —
           the resting statement of "where I've been" is the canvas's own
           (outline, lift, photographs) — and it develops in when the canvas
           answers that this country is under the pointer, or when the chip
           itself holds keyboard focus. The damp keeps a pointer crossing a
           border from strobing two labels. */
        const chipFade = chipFadeRef.current
        const wanted = worldScale &&
          (hoverCountryRef.current === i || node.contains(active))
          ? 1
          : 0
        chipFade[i] += (wanted - chipFade[i]) * Math.min(1, 14 * tickDelta)
        if (chipFade[i] < 0.001 && wanted === 0) chipFade[i] = 0
        const visible = limb * sink * projection.form * chipFade[i]
        const depthScale = 0.72 + 0.28 * Math.max(0, Math.min(1, projection.facing))
        writeStyle(node, 'transform', `translate3d(${(projection.x * width).toFixed(2)}px, ${(projection.y * height).toFixed(2)}px, 0) scale(${depthScale.toFixed(3)})`)
        writeStyle(node, 'opacity', visible.toFixed(3))
        writeStyle(node, 'z-index', String(250 + Math.round(Math.max(0, projection.facing) * 80)))
        writeStyle(node, 'pointer-events', worldScale && visible > 0.6 ? 'auto' : 'none')
        const chipTabIndex = worldScale ? 0 : -1
        if (button && button.tabIndex !== chipTabIndex) button.tabIndex = chipTabIndex
      }

    }
    onProjectRef.current = tick
    return () => {
      onProjectRef.current = null
      hero?.style.removeProperty('--plate-presence')
      hero?.style.removeProperty('--country-presence')
      sky?.style.removeProperty('opacity')
      if (sky) sky.inert = false
      document.documentElement.style.removeProperty('--plate-presence')
      if (document.title !== originalDocumentTitleRef.current) {
        document.title = originalDocumentTitleRef.current
      }
    }
  }, [has3D, activeRef, selectedRef, titleRef, subtitleRef])

  useEffect(() => {
    let lastScrollY = window.scrollY
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || scaleRef.current.phase === 'world') return
      const ui = useUI.getState()
      if (ui.popOpen) return
      exitRef.current = true
    }
    /* the composition is decided in screen space, so a resized window is a
       different composition */
    const onResize = () => {
      metricsDirtyRef.current = true
    }
    const onScroll = () => {
      const nextScrollY = window.scrollY
      if (
        nextScrollY > lastScrollY &&
        scaleRef.current.phase !== 'world' &&
        heroBottomRef.current - nextScrollY <= window.innerHeight
      ) {
        exitRef.current = true
      }
      lastScrollY = nextScrollY
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const devWindow = window as typeof window & {
      __dive?: (clusterIndex: number) => void
      __exitDive?: () => void
      __hoverCountry?: () => number
      __clusterIndexOf?: (slug: string) => number
    }
    /* Probe-only intent hooks. They deliberately do not mutate scaleRef, so
       Globe's useFrame remains the state machine's single writer. */
    devWindow.__dive = (clusterIndex) => {
      enterCountry(clusterIndex)
    }
    devWindow.__exitDive = () => {
      exitRef.current = true
    }
    /* read-only: which visited country's cluster is under the pointer (v3) */
    devWindow.__hoverCountry = () => hoverCountryRef.current
    /* probe door for chipless (one-place) countries: slug → cluster index */
    devWindow.__clusterIndexOf = (slug) => {
      const placeIndex = places.findIndex((place) => place.slug === slug)
      return placeIndex >= 0 ? clusterForPlace[placeIndex] : -1
    }
    return () => {
      delete devWindow.__dive
      delete devWindow.__exitDive
      delete devWindow.__hoverCountry
    }
  }, [])

  /* A press is not yet a drag. The pickups are buttons INSIDE the drag
     surface, and capturing the pointer on pointerdown (as this used to)
     retargets the whole gesture to the frame — the browser then never
     composes a click for the button underneath, so every tap on a pickup
     would silently die. So the press is only recorded here; the drag begins
     in the move handler once travel crosses a threshold, and a clean tap
     never crosses it. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!has3D || e.button !== 0) return
    // Portaled country controls still bubble through this React component.
    // Let buttons keep native focus and scrolling; only the map starts a drag.
    if (e.target instanceof Element && e.target.closest('button, a, .country-detail')) return
    // mouse only: on touch the browser owns the gesture until touch-action says
    // otherwise, and preventing the default there would eat the page scroll
    if (e.pointerType === 'mouse') e.preventDefault()
    wasDragRef.current = false
    pressRef.current = { x: e.clientX, y: e.clientY }
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
    dragVelocityRef.current.x = 0
    dragVelocityRef.current.y = 0
    dragVelocityRef.current.at = performance.now()
  }
  /* Both axes. Horizontal alone could never show you the whole globe: spinning
     about Y sweeps a single band of latitudes past the camera and the poles are
     simply unreachable, so half the sphere existed but could not be looked at.

     Vertical is mouse-only in practice and deliberately so — .globe-frame sets
     touch-action: pan-y, so on a touchscreen a vertical drag is the browser's
     scroll and never reaches this handler. Taking it would mean trapping the
     page inside the hero. */
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    /* The hover and drag use the same cached frame, corrected for scrolling.
       Layout is read only while a resize or font change invalidates it. */
    const rectCache = frameRectRef.current
    if (!rectCache.rect || metricsDirtyRef.current) {
      rectCache.rect = e.currentTarget.getBoundingClientRect()
      rectCache.scrollY = window.scrollY
    }
    const pointer = globePointerRef.current
    pointer.x = (e.clientX - rectCache.rect.left) / Math.max(1, rectCache.rect.width)
    const frameTop = rectCache.rect.top - (window.scrollY - rectCache.scrollY)
    pointer.y = (e.clientY - frameTop) / Math.max(1, rectCache.rect.height)
    pointer.active = true

    const press = pressRef.current
    if (!press) return
    if (!draggingRef.current) {
      // 5px of slop: under it a press is a tap, over it the hand has the globe
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const dx = e.clientX - lastXRef.current
    const dy = e.clientY - lastYRef.current
    const now = performance.now()
    const elapsed = Math.max(1, now - dragVelocityRef.current.at)
    dragVelocityRef.current.x = dx / elapsed
    dragVelocityRef.current.y = dy / elapsed
    dragVelocityRef.current.at = now
    // Angular velocity, radians/second. The scene integrates velocity * delta
    // once per frame, independent of display and pointer polling rates.
    spinRef.current = Math.max(-6, Math.min(6, (dx / elapsed) * 1000 * 0.0025))
    tiltRef.current = Math.max(-6, Math.min(6, (dy / elapsed) * 1000 * 0.0015))
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    pressRef.current = null
    if (!draggingRef.current) return
    draggingRef.current = false
    // the click that composes after this pointerup is the drag's echo, not an
    // intent — the grab's click handler reads and clears this
    wasDragRef.current = true
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (
      scaleRef.current.phase === 'plate' &&
      Math.hypot(dragVelocityRef.current.x, dragVelocityRef.current.y) >= 0.55
    ) {
      exitRef.current = true
    }
  }

  /* The static fallback. `has3D` is false under reduced motion as well as under
     no WebGL, and the rAF loop above is the ONLY thing that ever writes a pin's
     transform or opens its card — so without this branch the pins would render
     stacked at top:0 left:0 with their cards clipped to max-width:0. Same
     information as the sphere, in the order travelled, and a place that holds
     photographs shows them as a strip: the projection panel must never be the
     only surface the frames exist on. */
  if (!has3D) {
    return (
      <div className="gl-frame globe-frame globe-frame-static">
        <ol className="globe-log">
          {staticPlaces.map(({ place, cluster, clusterIndex }) => {
              const frames = framesAt(place)
              return (
                <li key={place.slug} className="globe-log-row">
                  {cluster && clusterIndex !== undefined && (
                    <div className="globe-log-cluster">
                      <span className="globe-log-cluster-members">
                        {clusterLabels[clusterIndex]} —
                      </span>
                      <span className="globe-log-cluster-count">
                        {cluster.memberIndices.length}{' '}
                        {cluster.memberIndices.length === 1 ? 'place' : 'places'} ·{' '}
                        {cluster.totalFrameCount}{' '}
                        {cluster.totalFrameCount === 1 ? 'frame' : 'frames'}
                      </span>
                    </div>
                  )}
                  <div className="globe-log-line">
                    <span className="globe-log-place">{place.label}</span>
                    <span className="globe-log-meta">{meta(place)}</span>
                  </div>
                  {frames.length > 0 && (
                    <ul className="globe-log-frames">
                      {frames.map((photo) => (
                        <li key={photo.src}>
                          <img
                            src={responsiveThumbnailSrc(photo)}
                            srcSet={responsiveSrcSet(photo)}
                            sizes="(max-width: 640px) 40vw, 240px"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
        </ol>
      </div>
    )
  }

  if (places.length === 0) {
    /* Nothing has been placed yet. The cameras carry no GPS, so coordinates are
       hand-recalled in places.ts, and until they are this refuses to invent a
       world to draw pins on. See the note at the top of that file. */
    return (
      <div className="globe-empty" role="status">
        <span className="globe-empty-mark" aria-hidden />
        <p>
          the map is waiting on its coordinates. add a place to{' '}
          <code>src/content/places.ts</code> and it appears here.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={frameRef}
      className={`gl-frame globe-frame${has3D ? ' globe-frame-live' : ''}`}
      data-cursor={has3D ? 'spin' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        globePointerRef.current.active = false
      }}
    >
      {/* The drag surface. The frame itself takes no pointer events any more —
          it spans most of the section and would swallow clicks on everything
          the sphere bleeds behind — so the grab circle IS the planet's hit
          area, and its events bubble up to the frame's handlers above.

          It is also the click-anywhere-in-the-country door (v3): a tap on the
          sphere over a visited country dives into it. Chips and pickup cards
          sit ABOVE this surface, so their taps never reach it — and it stays
          aria-hidden on purpose: the chips and stacks remain the accessible,
          named doors; this is the pointing hand's shortcut. */}
      <div
        ref={grabRef}
        className="globe-grab"
        data-cursor="spin"
        aria-hidden
        onClick={() => {
          if (wasDragRef.current) {
            wasDragRef.current = false
            return
          }
          if (scaleRef.current.phase !== 'world') return
          const hovered = hoverCountryRef.current
          if (hovered >= 0) enterCountry(hovered)
        }}
      />

      {/* mounted immediately, NOT gated on the reveal: the entrance's seed
          must already be idling under the loader's veil when it lifts —
          Globe.tsx waits for the reveal beat itself before growing */}
      {has3D && (
        <Suspense fallback={null}>
          <GlobeView
            pins={pinCoords}
            precisions={pinPrecisions}
            weights={pinWeights}
            worldTour={worldTour}
            legs={flightArcs}
            waypoints={waypointCoords}
            waypointProjectionRef={waypointProjectionRef}
            projectionRef={projectionRef}
            activeRef={activeRef}
            selectedRef={selectedRef}
            spinRef={spinRef}
            tiltRef={tiltRef}
            clusters={clusters}
            chipProjectionRef={chipProjectionRef}
            scaleRef={scaleRef}
            enterRef={enterRef}
            exitRef={exitRef}
            pointerRef={globePointerRef}
            hoverCountryRef={hoverCountryRef}
            onProjectRef={onProjectRef}
            viewportRef={frameRectRef}
          />
        </Suspense>
      )}

      <ul className="globe-clusters">
        {clusters.map((cluster, i) =>
          cluster.congestedSingleton ? null : (
            <li
              key={cluster.memberSlugs.join(':')}
              ref={(node) => {
                chipRefs.current[i] = node
              }}
              className="globe-cluster"
              data-cluster-index={i}
              data-cluster-slugs={cluster.memberSlugs.join(' ')}
            >
              <button
                ref={(node) => {
                  chipButtonRefs.current[i] = node
                }}
                type="button"
                className="globe-cluster-chip instrument-line"
                aria-label={clusterAccessibleName(cluster, i)}
                aria-expanded={false}
                onClick={() => {
                  enterCountry(i)
                }}
              >
                {/* v4: the chip is a hover label now, so it must SAY what the
                    pointer is standing on — the country's name leads, and the
                    count grammar of the stack captions follows one scale up:
                    brackets muted, digit in accent, no shape around either
                    (CONCEPT-COUNTRY-ZOOM-V2 §6, P3). The chip's whole member
                    list stays in aria-label above. */}
                <span className="globe-cluster-name">{clusterLabels[i]}</span>
                {' · '}
                {countsLead(cluster.memberIndices.length)}
                <span className="globe-print-count-num">{cluster.totalFrameCount}</span>
                {COUNTS_TAIL}
              </button>
            </li>
          )
        )}
      </ul>

      {/* The waypoints: flown-through cities in the instrument register,
          positioned by the same rAF loop as the pickups. aria-hidden as a
          layer — the cities that matter to a reader are the places, and
          thirty decorative labels would drown them in a screen reader. */}
      <ul className="globe-waypoints" aria-hidden>
        {waypoints.map((airport, i) => (
          <li
            key={airport.code}
            ref={(node) => {
              waypointRefs.current[i] = node
            }}
            className={`globe-waypoint${airport.legCount > 1 ? '' : ' globe-waypoint-minor'}`}
          >
            <span className="globe-waypoint-city">{airport.city}</span>
            <span className="globe-waypoint-code">[ {airport.code.toLowerCase()} ]</span>
          </li>
        ))}
      </ul>

      {/* One geographic photo preview per country, opening its collection. */}
      <ul className="globe-pins">
        {places.map((place, i) => {
          const frames = framesAt(place)
          const placeClusterIndex = clusterForPlace[i]
          const placeCluster = placeClusterIndex >= 0 ? clusters[placeClusterIndex] : undefined
          const countryIsMounted = placeClusterIndex >= 0 && placeClusterIndex === mountedCluster
          const isPreview = placeClusterIndex >= 0 && previewPlaceForCluster[placeClusterIndex] === i
          if (!isPreview) return null
          // The preview retains its geographic anchor throughout the approach.
          const mountedFrames = frames.slice(0, 1)
          return (
            <li
              key={place.slug}
              ref={(node) => {
                pinRefs.current[i] = node
              }}
              className="globe-pin"
              data-place-slug={place.slug}
            >
              {frames.length > 0 ? (
                <span className="globe-pickup">
                  {/* the float wrapper owns the bob, so the animation never
                      fights the transform the rAF loop writes on the li */}
                  <span
                    className="globe-pickup-float"
                    style={{ animationDelay: `${(i * -0.83).toFixed(2)}s` }}
                  >
                    <span className="globe-pickup-hand">
                      {mountedFrames.map((frame, k) => (
                        <button
                          key={frame.src}
                          type="button"
                          className="globe-pickup-card"
                          style={
                            {
                              '--i': k,
                              '--n': mountedFrames.length,
                              // resting-stack jitter: top card straight, the
                              // rest peeking out alternately like a loose pile
                              '--jitter': 0,
                            } as React.CSSProperties
                          }
                          aria-label={
                            k === 0
                              ? `${place.label} — ${meta(place)}`
                              : `${place.label}, frame ${k + 1} of ${frames.length}`
                          }
                          onClick={() => {
                            /* ONE DOOR (v4). At world scale a photograph is
                               part of the country it stands on: tapping a card
                               is the same gesture as tapping the sphere beside
                               it, and both dive into that country. The pick-up
                               fan and FramePop live on the landed table now —
                               the world scale has exactly one interaction. */
                            if (
                              scaleRef.current.phase === 'world' &&
                              placeClusterIndex >= 0
                            ) {
                              enterCountry(placeClusterIndex)
                            }
                          }}
                        >
                          <img
                            src={responsiveThumbnailSrc(frame)}
                            srcSet={responsiveSrcSet(frame)}
                            sizes={countryIsMounted ? '16.5vh' : '(max-width: 640px) 6rem, 8.25rem'}
                            width={frame.width}
                            height={frame.height}
                            alt=""
                            loading={countryIsMounted ? 'eager' : 'lazy'}
                            decoding="async"
                            draggable={false}
                          />
                        </button>
                      ))}
                      {/* every country's preview wears the same count line —
                          the COUNTRY's total, since the stack is the door to
                          the whole cap, not to this one place (v4.1) */}
                      {placeCluster && previewPlaceForCluster[placeClusterIndex] === i && (
                        <span className="globe-dive-count" aria-hidden>
                          [ {placeCluster.totalFrameCount} frames ]
                        </span>
                      )}
                      {/* The stack's caption, plate scale only (CSS fades it in
                          with --plate-presence): what this pile is, how well
                          the site knows where it was made, and how many prints
                          are in it — the count in typography, never in a shape.
                          Decorative: every word of it is already in the top
                          card's accessible name and in the precision the
                          canvas draws, so it stays out of the reading order. */}
                      <span
                        className="instrument-line globe-print-caption"
                        aria-hidden
                      >
                        {place.label}
                        {' · '}
                        {precisionWord(place.precision)}
                        {' · [ '}
                        <span className="globe-print-count-num">{frames.length}</span>
                        {' ]'}
                      </span>
                    </span>
                    <span
                      ref={(node) => {
                        pinLabelRefs.current[i] = node
                      }}
                      className="globe-pickup-label"
                      aria-hidden
                    >
                      <span className="globe-pickup-place">{place.label}</span>
                      <span className="globe-pickup-meta">{meta(place)}</span>
                    </span>
                  </span>
                  <span className="globe-pickup-stalk" aria-hidden />
                  <span className="globe-pin-dot" aria-hidden />
                </span>
              ) : (
                <>
                  <span className="globe-pin-dot globe-pin-dot-bare" aria-hidden />
                  <span
                    ref={(node) => {
                      pinLabelRefs.current[i] = node
                    }}
                    className="globe-pickup-label globe-pickup-label-bare"
                  >
                    <span className="globe-pickup-place">{place.label}</span>
                    <span className="globe-pickup-meta">{meta(place)}</span>
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {mountedCluster >= 0 && frameRef.current?.closest('.hero') && createPortal(
        <CountryDetail
          key={mountedCluster}
          ref={detailRef}
          cluster={clusters[mountedCluster]}
          name={clusterLabels[mountedCluster]}
          onExit={() => { exitRef.current = true }}
        />,
        frameRef.current.closest('.hero')!
      )}

    </div>
  )
}
