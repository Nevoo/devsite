import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { webglAvailable } from '@/lib/webgl'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { FramePop } from '@/components/FramePop'
import type { PinProjection, ScaleState } from '@/canvas/Globe'
import type { PlaceCluster } from '@/content/clusters'
import { places, framesAt, firstAt, type Place } from '@/content/places'
import { flightArcs, waypointAirports } from '@/content/flights'

/**
 * The fan's spread per card, degrees — MUST mirror the CSS
 * (.globe-pin-selected .globe-pickup-card). The pop flies out of a rotated
 * card and slides back into one, so it needs the card's real resting angle.
 */
const FAN_STEP = 20

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

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** '2023-10-16T…' → "oct '23" */
const stamp = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} '${iso.slice(2, 4)}`
const easeCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

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
}: WorldGlobeProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pinRefs = useRef<(HTMLLIElement | null)[]>([])
  const projectionRef = useRef<PinProjection[]>([])
  const waypointRefs = useRef<(HTMLLIElement | null)[]>([])
  const waypointProjectionRef = useRef<PinProjection[]>([])
  const chipRefs = useRef<(HTMLLIElement | null)[]>([])
  const chipProjectionRef = useRef<PinProjection[]>([])
  const internalActiveRef = useRef(-1)
  const internalSelectedRef = useRef(-1)
  const activeRef = sharedActiveRef ?? internalActiveRef
  const selectedRef = sharedSelectedRef ?? internalSelectedRef
  const spinRef = useRef(0)
  const tiltRef = useRef(0)
  const scaleRef = useRef<ScaleState>({ phase: 'world', cluster: -1, morph: 0 })
  const enterRef = useRef(-1)
  const exitRef = useRef(false)
  const instrumentRef = useRef<HTMLSpanElement>(null)
  const worldButtonRef = useRef<HTMLButtonElement>(null)
  const instrumentPositionRef = useRef({ lat: 0, lng: 0 })
  const draggingRef = useRef(false)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const lastXRef = useRef(0)
  const lastYRef = useRef(0)
  const dragVelocityRef = useRef({ x: 0, y: 0, at: 0 })
  const [has3D] = useState(() => webglAvailable() && !prefersReducedMotion())

  /* Dynamic on purpose: WorldGlobe itself is entry code, while clustering and
     its plate math belong to the globe feature chunk. Terrain remains one
     boundary later and is requested only when enterRef is consumed. */
  const [clusterData, setClusterData] = useState<PlaceCluster[]>([])
  useEffect(() => {
    if (!has3D) return
    let mounted = true
    void import('@/content/clusters').then((module) => {
      if (mounted) setClusterData(module.clusters)
    })
    return () => {
      mounted = false
    }
  }, [has3D])

  const clusterForPlace = useMemo(() => {
    const lookup = new Int16Array(places.length).fill(-1)
    clusterData.forEach((cluster, clusterIndex) => {
      cluster.memberIndices.forEach((placeIndex) => {
        lookup[placeIndex] = clusterIndex
      })
    })
    return lookup
  }, [clusterData])

  /* the card currently popped out of its hand at viewer scale, or null. React
     state on purpose: it changes on taps, not per frame, and the fan below
     needs to re-render so the lifted card's slot goes visibly empty. */
  const [pop, setPop] = useState<{ pin: number; frame: number } | null>(null)
  /* the card buttons by `pin:frame`, so the pop can measure the exact card it
     flies out of — and, at close time, whatever that card's geometry is NOW */
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())

  /* One loop for every label, reading the positions the canvas wrote on its
     own frame. Writing transforms straight to the nodes keeps a turning globe
     at zero React renders — the alternative is setState sixty times a second
     for a dozen elements, which is how a 3D hero starts costing more than it
     is worth. Rides the GSAP ticker rather than its own rAF: the ticker
     already drives Lenis and every timeline (SmoothScroll), so the labels
     update in the same frame as scroll-driven layout instead of racing it
     on a second loop. */
  useEffect(() => {
    if (!has3D || places.length === 0) return
    const tick = () => {
      const frame = frameRef.current
      if (!frame) return
      const { top, width, height } = frame.getBoundingClientRect()
      const scaleState = scaleRef.current
      const worldScale = scaleState.phase === 'world'
      const annotation = 1 - easeCubic(Math.max(0, Math.min(1, scaleState.morph / 0.3)))
      frame.dataset.phase = scaleState.phase
      frame.dataset.morph = scaleState.morph.toFixed(3)
      /* the horizon: pickups sink out of view before they reach the byline
         band. Facing alone can't catch this any more — with the sphere cut
         at the bottom, a pin near the disc centre faces the camera almost
         perfectly while standing in the gradient under the page's text,
         half-buried but still clickable. */
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
        const cluster = clusterIndex >= 0 ? clusterData[clusterIndex] : undefined
        const hiddenUnderChip = worldScale && cluster && !cluster.congestedSingleton
        const belongsOnPlate = !worldScale && clusterIndex === scaleState.cluster
        const scaleVisible = worldScale ? (hiddenUnderChip ? 0 : 1) : belongsOnPlate ? 1 : 0
        const visible = limb * sink * projection.form * scaleVisible
        /* depth is drawn, not implied: a pickup near the limb shrinks as well
           as fades, and the stacking order follows facing so a front pickup
           always overlaps one further round the curve */
        const scale = 0.55 + 0.45 * Math.max(0, Math.min(1, projection.facing))
        node.style.transform = `translate3d(${projection.x * width}px, ${projection.y * height}px, 0) scale(${scale.toFixed(3)})`
        node.style.opacity = String(visible)
        /* a fanned hand must ride over every neighbouring pickup, whatever
           its facing says — the visitor just asked for this one. The tour's
           presented hand gets the same treatment one tier down: the mock
           coordinates cluster hard, and without the boost a presented hand
           can open UNDER a neighbour's resting pile. */
        node.style.zIndex =
          i === selectedRef.current
            ? '400'
            : i === activeRef.current
              ? '300'
              : String(100 + Math.round(Math.max(0, projection.facing) * 100))
        node.style.pointerEvents = visible > 0.6 ? 'auto' : 'none'
        node.classList.toggle('globe-pin-active', i === activeRef.current)
        node.classList.toggle('globe-pin-selected', i === selectedRef.current)
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
        node.style.transform = `translate3d(${projection.x * width}px, ${projection.y * height}px, 0) scale(${scale.toFixed(3)})`
        node.style.opacity = (limb * sink * cap * projection.form * annotation).toFixed(3)
      }

      for (let i = 0; i < clusterData.length; i++) {
        const cluster = clusterData[i]
        if (cluster.congestedSingleton) continue
        const node = chipRefs.current[i]
        const projection = chipProjectionRef.current[i]
        if (!node || !projection) continue
        const limb = Math.max(0, Math.min(1, (projection.facing - 0.02) / 0.28))
        const screenY = top + projection.y * height
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        const visible = limb * sink * projection.form
        const depthScale = 0.72 + 0.28 * Math.max(0, Math.min(1, projection.facing))
        node.style.transform = `translate3d(${projection.x * width}px, ${projection.y * height}px, 0) scale(${depthScale.toFixed(3)})`
        node.style.opacity = visible.toFixed(3)
        node.style.zIndex = String(250 + Math.round(Math.max(0, projection.facing) * 80))
        node.style.pointerEvents = worldScale && visible > 0.6 ? 'auto' : 'none'
      }

      const instrument = instrumentRef.current
      const worldButton = worldButtonRef.current
      if (instrument && worldButton) {
        const activeCluster = clusterData[scaleState.cluster]
        const showing = !worldScale && Boolean(activeCluster)
        instrument.style.opacity = showing ? '1' : '0'
        worldButton.style.opacity = showing ? '1' : '0'
        worldButton.style.pointerEvents = showing ? 'auto' : 'none'
        worldButton.tabIndex = showing ? 0 : -1
        if (activeCluster) {
          if (scaleState.phase === 'dive' && scaleState.morph < 0.58) {
            const position = instrumentPositionRef.current
            const targetLat = activeCluster.centroidLatLng[0]
            const targetLng = activeCluster.centroidLatLng[1]
            const step = 1 - Math.exp(-0.08 * gsap.ticker.deltaRatio(60))
            position.lat += (targetLat - position.lat) * step
            position.lng += (targetLng - position.lng) * step
            instrument.textContent = `${position.lat.toFixed(3)}° / ${position.lng.toFixed(3)}°`
          } else if (scaleState.phase === 'dive') {
            const scan = Math.round(
              Math.max(0, Math.min(1, (scaleState.morph - 0.58) / 0.42)) * 100
            )
            instrument.textContent = `scan … ${String(scan).padStart(2, '0')}%`
          } else {
            instrument.textContent = `${activeCluster.memberIndices.length} ${
              activeCluster.memberIndices.length === 1 ? 'place' : 'places'
            } · ${activeCluster.totalFrameCount} frames`
          }
        } else {
          instrumentPositionRef.current.lat = 0
          instrumentPositionRef.current.lng = 0
        }
      }
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
    }
  }, [has3D, activeRef, selectedRef, clusterData, clusterForPlace])

  useEffect(() => {
    let lastScrollY = window.scrollY
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && scaleRef.current.phase !== 'world') {
        exitRef.current = true
      }
    }
    const onScroll = () => {
      const nextScrollY = window.scrollY
      const hero = frameRef.current?.closest('.hero')
      if (
        nextScrollY > lastScrollY &&
        scaleRef.current.phase !== 'world' &&
        hero &&
        hero.getBoundingClientRect().bottom <= window.innerHeight
      ) {
        exitRef.current = true
      }
      lastScrollY = nextScrollY
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const devWindow = window as typeof window & {
      __dive?: (clusterIndex: number) => void
      __exitDive?: () => void
    }
    /* Probe-only intent hooks. They deliberately do not mutate scaleRef, so
       Globe's useFrame remains the state machine's single writer. */
    devWindow.__dive = (clusterIndex) => {
      enterRef.current = clusterIndex
    }
    devWindow.__exitDive = () => {
      exitRef.current = true
    }
    return () => {
      delete devWindow.__dive
      delete devWindow.__exitDive
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
    // mouse only: on touch the browser owns the gesture until touch-action says
    // otherwise, and preventing the default there would eat the page scroll
    if (e.pointerType === 'mouse') e.preventDefault()
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
    // fed into the group's rotation and damped there at world scale; on a
    // plate the canvas consumes the same deltas as cap-clamped re-aims
    spinRef.current += dx * 0.00035
    tiltRef.current += dy * 0.00035
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    pressRef.current = null
    if (!draggingRef.current) return
    draggingRef.current = false
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
          {places
            .slice()
            .reverse()
            .map((place) => {
              const frames = framesAt(place)
              return (
                <li key={place.slug} className="globe-log-row">
                  <div className="globe-log-line">
                    <span className="globe-log-place">{place.label}</span>
                    <span className="globe-log-meta">{meta(place)}</span>
                  </div>
                  {frames.length > 0 && (
                    <ul className="globe-log-frames">
                      {frames.map((photo) => (
                        <li key={photo.src}>
                          <img src={photo.src} alt="" loading="lazy" decoding="async" />
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
    >
      {/* The drag surface. The frame itself takes no pointer events any more —
          it spans most of the section and would swallow clicks on everything
          the sphere bleeds behind — so the grab circle IS the planet's hit
          area, and its events bubble up to the frame's handlers above. */}
      <div className="globe-grab" data-cursor="spin" aria-hidden />

      {/* mounted immediately, NOT gated on the reveal: the entrance's seed
          must already be idling under the loader's veil when it lifts —
          Globe.tsx waits for the reveal beat itself before growing */}
      {has3D && (
        <Suspense fallback={null}>
          <GlobeView
            pins={pinCoords}
            precisions={pinPrecisions}
            weights={pinWeights}
            legs={flightArcs}
            waypoints={waypointCoords}
            waypointProjectionRef={waypointProjectionRef}
            projectionRef={projectionRef}
            activeRef={activeRef}
            selectedRef={selectedRef}
            spinRef={spinRef}
            tiltRef={tiltRef}
            clusters={clusterData}
            chipProjectionRef={chipProjectionRef}
            scaleRef={scaleRef}
            enterRef={enterRef}
            exitRef={exitRef}
          />
        </Suspense>
      )}

      <div className="globe-scale-instrument" aria-live="off">
        <span ref={instrumentRef} className="instrument-line globe-scale-readout" />
        <button
          ref={worldButtonRef}
          type="button"
          className="instrument-line globe-world-button"
          tabIndex={-1}
          onClick={() => {
            exitRef.current = true
          }}
        >
          ← world
        </button>
      </div>

      <ul className="globe-clusters">
        {clusterData.map((cluster, i) =>
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
                type="button"
                className="globe-cluster-chip instrument-line"
                onClick={() => {
                  enterRef.current = i
                }}
              >
                {cluster.memberIndices.length} places · {cluster.totalFrameCount} frames
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

      {/* The pickups. Every place wears its photographs ON the globe as a
          small stack of cards over the dot — a game's pickup, not a map's
          tooltip. First tap selects the place (globe swings it up the visible
          arc) and the stack SPREADS into a hand-held fan, one card per frame;
          hovering a fanned card pops it a little, tapping it lifts THAT card
          out of the hand and flies it up to viewer scale above the planet
          (FramePop) — a tap anywhere else slides it back into the fan. That
          two-tap ladder is also the entire mobile story: no hover required
          anywhere. A place with no frames yet stays a bare dot with its
          label: visibly a different kind of object. */}
      <ul className="globe-pins">
        {places.map((place, i) => {
          const frames = framesAt(place)
          const placeClusterIndex = clusterForPlace[i]
          const placeCluster = placeClusterIndex >= 0 ? clusterData[placeClusterIndex] : undefined
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
                      {frames.map((frame, k) => (
                        <button
                          key={frame.src}
                          type="button"
                          ref={(el) => {
                            const key = `${i}:${k}`
                            if (el) cardRefs.current.set(key, el)
                            else cardRefs.current.delete(key)
                          }}
                          className={`globe-pickup-card${
                            pop && pop.pin === i && pop.frame === k
                              ? ' globe-pickup-card-lifted'
                              : ''
                          }`}
                          style={
                            {
                              '--i': k,
                              '--n': frames.length,
                              // resting-stack jitter: top card straight, the
                              // rest peeking out alternately like a loose pile
                              '--jitter': k === 0 ? 0 : (k % 2 ? -1 : 1) * (2 + k * 2),
                            } as React.CSSProperties
                          }
                          aria-label={
                            k === 0
                              ? `${place.label} — ${meta(place)}`
                              : `${place.label}, frame ${k + 1} of ${frames.length}`
                          }
                          onClick={() => {
                            // first tap picks the place up; a tap on the
                            // presented congested singleton dives instead.
                            // Sparse lone pins keep the existing fan ladder.
                            if (selectedRef.current !== i) {
                              selectedRef.current = i
                            } else if (
                              placeCluster?.congestedSingleton &&
                              scaleRef.current.phase === 'world'
                            ) {
                              enterRef.current = placeClusterIndex
                            } else {
                              setPop({ pin: i, frame: k })
                            }
                          }}
                        >
                          <img
                            src={frame.src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                        </button>
                      ))}
                      {frames.length > 1 && (
                        <span className="globe-pickup-count" aria-hidden>
                          {frames.length}
                        </span>
                      )}
                      {placeCluster?.congestedSingleton && (
                        <span className="globe-dive-count" aria-hidden>
                          [ {frames.length} frames ]
                        </span>
                      )}
                    </span>
                    <span className="globe-pickup-label" aria-hidden>
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
                  <span className="globe-pickup-label globe-pickup-label-bare">
                    <span className="globe-pickup-place">{place.label}</span>
                    <span className="globe-pickup-meta">{meta(place)}</span>
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {/* the popped card, portaled to <body> (this frame is inside a
          transformed ancestor, which would capture position:fixed) */}
      {pop &&
        (() => {
          const place = places[pop.pin]
          const frames = framesAt(place)
          return (
            <FramePop
              label={place.label}
              photos={frames}
              index={pop.frame}
              sourceEl={() => cardRefs.current.get(`${pop.pin}:${pop.frame}`) ?? null}
              sourceAngle={(pop.frame - (frames.length - 1) / 2) * FAN_STEP}
              onStep={(dir) =>
                setPop((p) => p && { ...p, frame: (p.frame + dir + frames.length) % frames.length })
              }
              onClose={() => setPop(null)}
            />
          )
        })()}
    </div>
  )
}
