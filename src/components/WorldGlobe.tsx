import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { webglAvailable } from '@/lib/webgl'
import { prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { FramePop } from '@/components/FramePop'
import type { PinProjection } from '@/canvas/Globe'
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

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** '2023-10-16T…' → "oct '23" */
const stamp = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} '${iso.slice(2, 4)}`

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
  const internalActiveRef = useRef(-1)
  const internalSelectedRef = useRef(-1)
  const activeRef = sharedActiveRef ?? internalActiveRef
  const selectedRef = sharedSelectedRef ?? internalSelectedRef
  const spinRef = useRef(0)
  const tiltRef = useRef(0)
  const draggingRef = useRef(false)
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  const lastXRef = useRef(0)
  const lastYRef = useRef(0)
  const revealed = useUI((s) => s.revealed)

  /* the card currently popped out of its hand at viewer scale, or null. React
     state on purpose: it changes on taps, not per frame, and the fan below
     needs to re-render so the lifted card's slot goes visibly empty. */
  const [pop, setPop] = useState<{ pin: number; frame: number } | null>(null)
  /* the card buttons by `pin:frame`, so the pop can measure the exact card it
     flies out of — and, at close time, whatever that card's geometry is NOW */
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())

  const [has3D] = useState(() => webglAvailable() && !prefersReducedMotion())
  const pins = places.map((p) => p.coords)

  /* One rAF loop for every label, reading the positions the canvas wrote on its
     own frame. Writing transforms straight to the nodes keeps a turning globe
     at zero React renders — the alternative is setState sixty times a second
     for a dozen elements, which is how a 3D hero starts costing more than it
     is worth. */
  useEffect(() => {
    if (!has3D || places.length === 0) return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const frame = frameRef.current
      if (!frame) return
      const { top, width, height } = frame.getBoundingClientRect()
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
        const sink = Math.max(0, Math.min(1, (horizonY - screenY) / 60))
        const visible = limb * sink
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
        node.style.opacity = (limb * sink * cap).toFixed(3)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [has3D, activeRef, selectedRef])

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
    // fed into the group's rotation and damped there, so a flick keeps coasting
    spinRef.current += (e.clientX - lastXRef.current) * 0.00035
    tiltRef.current += (e.clientY - lastYRef.current) * 0.00035
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    pressRef.current = null
    if (!draggingRef.current) return
    draggingRef.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
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

      {has3D && (
        <Suspense fallback={null}>
          {revealed && (
            <GlobeView
              pins={pins}
              weights={places.map((place) => framesAt(place).length)}
              legs={flightArcs}
              waypoints={waypoints.map((a) => a.coords)}
              waypointProjectionRef={waypointProjectionRef}
              projectionRef={projectionRef}
              activeRef={activeRef}
              selectedRef={selectedRef}
              spinRef={spinRef}
              tiltRef={tiltRef}
            />
          )}
        </Suspense>
      )}

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
          return (
            <li
              key={place.slug}
              ref={(node) => {
                pinRefs.current[i] = node
              }}
              className="globe-pin"
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
                            // fanned hand lifts that card out to viewer scale
                            if (selectedRef.current !== i) {
                              selectedRef.current = i
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
