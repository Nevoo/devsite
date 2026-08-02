import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { isLand } from '@/content/land-mask'
import { useUI } from '@/stores/ui'

/** live projected state of one pin, written every frame, read by the DOM half */
export interface PinProjection {
  /** 0..1 across the tracked frame */
  x: number
  y: number
  /** 1 = facing the camera, 0 = edge on, <0 = round the back */
  facing: number
}

interface GlobeProps {
  /** [lat, lng] per pin, in the same order as the DOM labels */
  pins: [number, number][]
  /**
   * frames placed at each pin. Not drawn — this is the opening-view weighting:
   * the sphere wakes facing the side of the world that actually holds the
   * archive, instead of whichever place happens to be first in the array.
   */
  weights?: number[]
  /** consecutive legs of the route, drawn as great-circle arcs */
  legs?: [[number, number], [number, number]][]
  /**
   * [lat, lng] per waypoint label — flown-through cities with no photographs.
   * Projected and reported exactly like pins, but the tour never visits one:
   * they are texture on the map, not stops on it.
   */
  waypoints?: [number, number][]
  /** written every frame for the waypoint labels, same contract as pins */
  waypointProjectionRef?: { current: PinProjection[] }
  /** written every frame; never triggers a React render */
  projectionRef: { current: PinProjection[] }
  /** index of the pin currently being presented, or -1 */
  activeRef: { current: number }
  /**
   * index of the pin the visitor tapped, or -1. Written by the DOM half's
   * pickup buttons; consumed here (swing it front-on, hold it), and cleared
   * here when the tour moves on or the visitor grabs the sphere — the DOM
   * never has to guess when a selection expired.
   */
  selectedRef: { current: number }
  /** damped pointer-drag spin about Y, offered by the DOM half */
  spinRef: { current: number }
  /** damped pointer-drag tilt about X */
  tiltRef: { current: number }
}

const RADIUS = 1

/** total samples on the sphere before the land mask throws the sea away */
const SHELL_POINTS = 36000
/** a second, much sparser field over the water, so the sphere keeps its mass */
const SEA_POINTS = 2400

/**
 * How far a land dot looks around itself to decide it sits on a coast, in
 * degrees. Tuned to the dot spacing (~1.07° at 36k samples), so the coast
 * reads as a one-dot-wide outline rather than a thick band or a dashed one.
 */
const COAST_REACH = 0.8

/**
 * Antarctica is dropped below this latitude. Not an editorial judgement about
 * the continent: an equirectangular mask over-samples the poles brutally, so it
 * arrives as the single brightest mass on the globe, roughly a fifth of all the
 * land dots, permanently parked under the route. It is the one landmass nobody
 * is going to look for on a travel diary, and it was drowning Australia.
 */
const ANTARCTIC = -58

/**
 * The occluder sits a hair inside the dots rather than well inside them.
 *
 * Any solid sphere used to hide the far side has to be smaller than the shell,
 * and everything in that gap leaks around the silhouette as a bright rim: the
 * visible width of the leak goes as sqrt(1 - k²), so k = 0.992 gave a 12% halo
 * and looked like atmosphere nobody asked for. 0.9985 puts it under 6%, which
 * reads as an edge rather than a glow, and the gap is still wide enough that
 * the two surfaces do not z-fight.
 */
const OCCLUDER = 0.9985

/** seconds a place stays front-and-centre with its card open before the next */
const HOLD = 2.6

/**
 * Seconds a TAPPED place holds before the tour takes over again. Much longer
 * than HOLD: the visitor asked for this one and its hand is standing open as
 * a fan — 2.6 seconds is a glance, not a browse.
 */
const SELECT_HOLD = 10

/**
 * How far above the sphere's camera-front point a place is presented, in
 * radians. The planet stands at the bottom of the viewport now, cut by its
 * lower edge — so the point actually facing the camera (the centre of the
 * visible disc) sits at or below the fold, under the horizon gradient. A
 * place swung dead front-on would be presented into the one region of the
 * sphere nobody can see. This lifts every presentation up the visible arc
 * instead: the tour under-tilts by this much, and the manual "which pin is
 * being looked at" test measures against the same lifted direction. cos(0.55)
 * ≈ 0.85, so a presented pin still clears every facing gate the DOM half
 * runs (fade starts at 0.30, pointer events at 0.6-ish).
 */
const PRESENT_BIAS = 0.55

/**
 * How far the globe can be tilted by hand, in radians — ASYMMETRIC, because
 * the presentation point is not the camera-front point any more. Northward,
 * 1.35 (a little under vertical) still puts the north pole fully into view
 * without letting the sphere go over the top. Southward, every view runs
 * PRESENT_BIAS later: a place only reads as "being looked at" once it is up
 * on the visible arc, so reaching latitude L there takes |L| + PRESENT_BIAS
 * of tilt. The old symmetric ±1.35 stopped exactly at New Zealand — the
 * south "blocked" 0.55 rad early. The floor now puts the south pole itself
 * on the presented arc.
 */
const TILT_MAX = 1.35
const TILT_MIN = -(Math.PI / 2) - PRESENT_BIAS

/**
 * Seconds of no input before the tour takes the globe back.
 *
 * The tour used to resume on HOLD, which meant that tilting up to look at the
 * north pole got you about two and a half seconds before the globe hauled
 * itself back to whatever latitude was next in the route. Long enough to feel
 * like the thing was fighting you. This is the pause after you stop, not the
 * pause between places, so it gets its own number and a longer one.
 */
const GRACE = 6

/** lat/lng in degrees to a point on the sphere. +lng east, +lat north. */
function toVec3(lat: number, lng: number, r = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

/** golden-angle point i of n on the unit sphere, plus its lat/lng */
function fibonacci(i: number, n: number) {
  const y = 1 - (i / (n - 1)) * 2
  const radius = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = Math.PI * (3 - Math.sqrt(5)) * i
  const x = Math.cos(theta) * radius
  const z = Math.sin(theta) * radius
  // inverse of toVec3 below, so a point can be asked what is underneath it
  const lat = (Math.asin(y) * 180) / Math.PI
  const lng = (Math.atan2(z, -x) * 180) / Math.PI - 180
  return { x, y, z, lat, lng: lng < -180 ? lng + 360 : lng }
}

/**
 * The globe. Dots on a sphere, distributed by the golden angle so there are no
 * seams or pole clumping, then filtered through a land mask so that the dense
 * ones only exist over ground. That last part is the whole difference between
 * an object that says "here is a sphere" and one that says "here is where I
 * was": without coastlines a pin over Brisbane and a pin over open ocean are
 * the same picture.
 *
 * The mask is 8.8KB gzipped and resolves finer than the globe is ever drawn,
 * so this stays a drawing rather than becoming a photograph of the earth, which
 * would be the only literal object in an identity built from charcoal, one
 * accent and outlined forms.
 *
 * It does not know what an outing is. It takes coordinates and reports back
 * where they landed on screen; the DOM half owns every word the visitor reads.
 */
export function Globe({
  pins,
  weights,
  legs = [],
  waypoints = [],
  waypointProjectionRef,
  projectionRef,
  activeRef,
  selectedRef,
  spinRef,
  tiltRef,
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const reduced = useMemo(() => prefersReducedMotion(), [])

  /* Three fields off one distribution, and the split is what makes the map
     legible. A uniform halftone gives every land dot equal weight, so at
     planet scale the continents read as one smear with no edges — the
     coastline only existed as "where the dots stop", and the sea field blurred
     even that. So each land dot asks the mask whether any of its neighbours is
     water: the ones on the boundary become the COAST layer, drawn brighter and
     a touch larger, which traces actual continent outlines; the interior fill
     drops back; the sea keeps the sphere's mass at a fraction of either. Still
     a drawing — the hierarchy is dots, never a texture. */
  const [coast, shell, sea] = useMemo(() => {
    const isCoast = (lat: number, lng: number) => {
      // longitude reach widens toward the poles so the probe distance stays
      // roughly metric; clamped so the poles don't wrap the whole ring
      const lngReach = COAST_REACH / Math.max(0.25, Math.cos((lat * Math.PI) / 180))
      return (
        !isLand(lat + COAST_REACH, lng) ||
        !isLand(lat - COAST_REACH, lng) ||
        !isLand(lat, lng + lngReach) ||
        !isLand(lat, lng - lngReach)
      )
    }
    const edge: number[] = []
    const fill: number[] = []
    for (let i = 0; i < SHELL_POINTS; i++) {
      const p = fibonacci(i, SHELL_POINTS)
      if (p.lat < ANTARCTIC) continue
      if (!isLand(p.lat, p.lng)) continue
      ;(isCoast(p.lat, p.lng) ? edge : fill).push(p.x * RADIUS, p.y * RADIUS, p.z * RADIUS)
    }
    const water: number[] = []
    for (let i = 0; i < SEA_POINTS; i++) {
      const p = fibonacci(i, SEA_POINTS)
      if (!isLand(p.lat, p.lng)) water.push(p.x * RADIUS, p.y * RADIUS, p.z * RADIUS)
    }
    const build = (values: number[]) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(values, 3))
      return g
    }
    return [build(edge), build(fill), build(water)]
  }, [])

  /* The route, as great-circle arcs lifted off the surface.
     Slerp gives the shortest path over the sphere, which is the line a flight
     actually takes and the reason a leg from Sydney to Tokyo bends the way it
     does on a globe and looks wrong on a flat map. The lift is proportional to
     leg length, so a hop within Thailand hugs the ground while a Pacific
     crossing arcs well clear of it. */
  const arcs = useMemo(() => {
    if (legs.length === 0) return null
    const SEGMENTS = 48
    const points: number[] = []
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const p = new THREE.Vector3()
    for (const [from, to] of legs) {
      a.copy(toVec3(from[0], from[1], 1))
      b.copy(toVec3(to[0], to[1], 1))
      const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
      if (omega < 1e-4) continue
      const lift = 0.06 + (omega / Math.PI) * 0.22
      for (let s = 0; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS
        p.copy(a)
          .multiplyScalar(Math.sin((1 - t) * omega) / Math.sin(omega))
          .addScaledVector(b, Math.sin(t * omega) / Math.sin(omega))
          .setLength(RADIUS * (1 + lift * Math.sin(Math.PI * t)))
        // doubled interior vertices, because one buffer of lineSegments is
        // cheaper than one draw call per leg
        if (s > 0 && s < SEGMENTS) points.push(p.x, p.y, p.z)
        points.push(p.x, p.y, p.z)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return g
  }, [legs])

  // the graticule: equator plus two tropics, three meridians. Enough to read as
  // a globe and to make the rotation legible, few enough to stay a drawing.
  const graticule = useMemo(() => {
    const segments = 128
    const points: number[] = []
    const ring = (fn: (t: number) => THREE.Vector3) => {
      for (let i = 0; i < segments; i++) {
        const a = fn((i / segments) * Math.PI * 2)
        const b = fn(((i + 1) / segments) * Math.PI * 2)
        points.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
    const r = RADIUS * 1.001
    for (const lat of [-35, 0, 35]) {
      const y = Math.sin((lat * Math.PI) / 180) * r
      const rad = Math.cos((lat * Math.PI) / 180) * r
      ring((t) => new THREE.Vector3(Math.cos(t) * rad, y, Math.sin(t) * rad))
    }
    for (const lng of [0, 60, 120]) {
      const a = (lng * Math.PI) / 180
      ring((t) =>
        new THREE.Vector3(Math.cos(t) * r * Math.cos(a), Math.sin(t) * r, Math.cos(t) * r * Math.sin(a))
      )
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [])

  /* The pins are NOT drawn in here. Each one already exists as a DOM node
     carrying its place name, so drawing a second marker in WebGL would mean two
     sources of truth for one position, and a gl_PointSize point renders as a
     hard square unless you spend a texture on rounding it. The canvas reports
     where the coordinate landed; the DOM draws the dot. */
  const pinPoints = useMemo(() => pins.map(([lat, lng]) => toVec3(lat, lng, RADIUS * 1.012)), [pins])

  // waypoint labels ride closer to the surface than pins: they annotate the
  // map rather than stand on it
  const waypointPoints = useMemo(
    () => waypoints.map(([lat, lng]) => toVec3(lat, lng, RADIUS * 1.004)),
    [waypoints]
  )

  useEffect(
    () => () => {
      coast.dispose()
      shell.dispose()
      sea.dispose()
      graticule.dispose()
      arcs?.dispose()
    },
    [coast, shell, sea, graticule, arcs]
  )

  const world = useMemo(() => new THREE.Vector3(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  const toCam = useMemo(() => new THREE.Vector3(), [])

  /* The rotation each pin needs in order to sit dead centre.
     Three.js rotates about Y as z' = -x sin(θ) + z cos(θ), which for a pin at
     angle a = atan2(z, x) and radius r is r * sin(a - θ). That is maximal when
     a - θ = π/2, so θ = a - π/2. Note the direction: the mirror of this,
     π/2 - a, swings the pin to the SIDE instead of the front, and then the
     latitude tilt below drives it to the bottom of the sphere — which looks
     exactly like a globe that turns but never presents anything. */
  const facingRotations = useMemo(
    () => pinPoints.map((p) => Math.atan2(p.z, p.x) - Math.PI / 2),
    [pinPoints]
  )

  /* And the lean. Spinning about Y alone cannot present a place that is not on
     the equator: a point at latitude L reaches at best cos(L - tiltX) toward the
     camera, so with a fixed 0.22 tilt the southern demo pin peaked at 0.29 and
     could never cross a front-on threshold at all. Tilting X to L puts any
     latitude square to the camera; PRESENT_BIAS is then subtracted so the
     place lands on the visible upper arc rather than at the disc centre the
     viewport has cropped away. Clamped (before the bias) so the poles never
     swing the whole sphere. */
  const facingTilts = useMemo(
    () =>
      pins.map(
        ([lat]) => THREE.MathUtils.clamp((lat * Math.PI) / 180, -0.62, 0.62) - PRESENT_BIAS
      ),
    [pins]
  )

  /* The direction a presented pin actually points: the camera direction lifted
     by PRESENT_BIAS about X. The manual-drag "which pin is being looked at"
     test measures against this rather than against the true camera direction,
     because with the sphere cut at the bottom the true front-on region is off
     screen — parking a pin there by hand would light up a card nobody can see. */
  const presentDir = useMemo(() => {
    const elevation = Math.atan2(0.3, 4.6) + PRESENT_BIAS // camera sits at [0, 0.3, 4.6]
    return new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation))
  }, [])

  /* The opening view: the frame-weighted centre of the archive. Most of the
     placed work sits on one side of the world (SE Asia, currently), and a
     sphere that wakes up facing anywhere else opens the page on empty ocean.
     The rotation faces the weighted centroid of every pin's equatorial
     direction; the first tour stop is the pin that scores best on
     weight × how near it stands to that centroid, so the clock starts on a
     heavy hand on the busy side — not on a 6-frame outlier round the back. */
  const opening = useMemo(() => {
    let cx = 0
    let cz = 0
    pinPoints.forEach((p, i) => {
      const w = weights?.[i] ?? 1
      cx += p.x * w
      cz += p.z * w
    })
    if (pinPoints.length === 0 || (cx === 0 && cz === 0)) {
      return { rotation: 0, index: 0 }
    }
    const centroid = Math.atan2(cz, cx)
    let index = 0
    let bestScore = -Infinity
    pinPoints.forEach((p, i) => {
      const a = Math.atan2(p.z, p.x)
      const away = Math.atan2(Math.sin(a - centroid), Math.cos(a - centroid))
      const score = (weights?.[i] ?? 1) * Math.cos(away)
      if (score > bestScore) {
        bestScore = score
        index = i
      }
    })
    // same θ - π/2 that facingRotations uses: centroid dead centre
    return { rotation: centroid - Math.PI / 2, index }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinPoints])

  const tour = useRef({ index: 0, hold: 0, target: 0, seeded: false, grace: 0, lastSelected: -1 })

  /* THE CAMERA MUST COME FROM useThree, NOT from useFrame's state.
     useFrame hands back the ROOT store's state, and `makeDefault` writes the
     root store — so with more than one View on the page the last one to mount
     wins the default and every other View projects through a camera that is
     not rendering it. Here that meant the hero plate's OrthographicCamera
     (left/right = ±0.5) projecting a point at radius 1 to NDC −2, which parked
     a pin roughly half a frame-width outside the globe with a facing value
     computed from the wrong eye position, so it never faded out either.
     useThree reads the nearest context, which inside a View portal is that
     View's own store. */
  const camera = useThree((s) => s.camera)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group || !camera) return

    const state_ = tour.current

    /* THE HAND COMES FIRST, and it is applied before the tour reads the
       rotation, so both are looking at the same numbers on the same frame.

       Two axes, because one was never enough: spinning about Y sweeps a single
       band of latitudes past the camera, so with horizontal drag alone the
       poles could not be reached at all and a third of the sphere was drawn but
       unviewable. X is clamped rather than free — see TILT_LIMIT. */
    let dragged = false
    if (spinRef.current !== 0) {
      group.rotation.y += spinRef.current
      dragged = true
    }
    if (tiltRef.current !== 0) {
      group.rotation.x = THREE.MathUtils.clamp(
        group.rotation.x + tiltRef.current,
        TILT_MIN,
        TILT_MAX
      )
      dragged = true
    }
    // damped here rather than in the handler, so a flick keeps coasting after
    // the pointer is up and comes to rest on its own
    const decay = 1 - Math.min(1, delta * 6)
    spinRef.current *= decay
    tiltRef.current *= decay
    if (Math.abs(spinRef.current) < 1e-5) spinRef.current = 0
    if (Math.abs(tiltRef.current) < 1e-5) tiltRef.current = 0

    if (dragged) {
      state_.grace = GRACE
      state_.hold = HOLD
      state_.target = group.rotation.y
      // grabbing the sphere cancels a tap-lock: the hand is the authority now,
      // and the panel goes back to following whatever is parked front-on
      if (state_.lastSelected >= 0) {
        selectedRef.current = -1
        state_.lastSelected = -1
      }
    } else {
      state_.grace = Math.max(0, state_.grace - delta)
    }

    /* A tap on a pickup. The DOM writes the index; the tour adopts it as its
       own next stop with a much longer hold, rather than running a separate
       "focus" mode — one state machine, one authority on the rotation. grace
       is zeroed because the tap is a command to the TOUR, and leaving the
       manual branch in charge would let the nearest-pin geometry re-decide
       what the visitor just decided by name. */
    if (selectedRef.current !== state_.lastSelected) {
      const sel = selectedRef.current
      state_.lastSelected = sel
      if (sel >= 0 && sel < pinPoints.length) {
        state_.index = sel
        state_.target = facingRotations[sel]
        state_.hold = SELECT_HOLD
        state_.seeded = true
        state_.grace = 0
      }
    }
    const manual = state_.grace > 0

    /* THE TOUR. Turning on its own is what keeps this out of the 2021 camera's
       territory: a visitor who never touches the globe is still shown every
       place the work came from.

       A constant spin was the obvious way to do that and it is the wrong one.
       Measured, an even 0.075 rad/s takes 84 seconds to come round once, and
       places cluster hard — three of four demo pins sit inside 20 degrees of
       longitude — so a visitor waits most of a minute between cues and may see
       none at all before scrolling. Instead the globe walks its own pins:
       swing the next one to the front, hold it while its card is open, move on.
       Every place gets presented, in a bounded time, without being asked.

       Suspended entirely while the visitor has hold of it. Easing rotation.x
       toward the next pin's latitude on every frame regardless is what made a
       hand-tilt snap straight back. */
    if (!reduced && pinPoints.length > 0 && !manual) {
      if (!state_.seeded) {
        /* wake facing the archive's weighted centre (see `opening`), then let
           the tour drift the short distance to its first stop — the heaviest
           hand on the busy side — rather than snapping to the array's head */
        state_.index = opening.index
        state_.target = facingRotations[opening.index]
        group.rotation.y = opening.rotation
        state_.hold = HOLD
        state_.seeded = true
      }

      // shortest way round, so the globe never takes the long way for 10 degrees
      let diff = state_.target - group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))

      group.rotation.x += (facingTilts[state_.index] - group.rotation.x) * Math.min(1, delta * 1.6)

      /* The clock stops while a viewer is up — the Lightbox, or a card popped
         out of a hand at viewer scale. The visitor opened a stack off this
         very sphere, and the tour advancing behind the overlay would collapse
         their fan. Holding the timer AT its floor (rather than merely not
         decrementing) means a close always buys at least one normal HOLD of
         looking at the fan before the tour moves on. getState, not a hook —
         this is a per-frame read and the canvas must not re-render on store
         changes. */
      const ui = useUI.getState()
      const overlayOpen = ui.lightbox !== null || ui.popOpen
      if (Math.abs(diff) < 0.012) {
        if (!overlayOpen) state_.hold -= delta
        else state_.hold = Math.max(state_.hold, HOLD)
        if (state_.hold <= 0) {
          // a selection expires the moment the tour moves on, and it is this
          // side that says so — the DOM only ever writes taps, never clears
          if (state_.lastSelected >= 0) {
            selectedRef.current = -1
            state_.lastSelected = -1
          }
          state_.index = (state_.index + 1) % pinPoints.length
          state_.target = facingRotations[state_.index]
          state_.hold = HOLD
        }
      } else {
        group.rotation.y += diff * Math.min(1, delta * 1.9)
      }

      /* The tour is the authority on which place is speaking, not a geometric
         threshold on how front-on it happens to be — the threshold was what
         locked the southern pin out. The card opens only once the swing has
         settled, so it never rides across the sphere mid-move. */
      activeRef.current = Math.abs(diff) < 0.06 && state_.hold < HOLD ? state_.index : -1
    } else if (!reduced && pinPoints.length === 0 && !manual) {
      group.rotation.y += delta * 0.075
    }

    group.updateMatrixWorld()

    let best = -1
    let bestFront = 0.88

    for (let i = 0; i < pinPoints.length; i++) {
      world.copy(pinPoints[i]).applyMatrix4(group.matrixWorld)

      // Facing is computed on the sphere's own normal, not from the projection.
      // A point behind the globe still projects to a perfectly plausible screen
      // position, so without this the far-side pins would sit on top of the
      // globe looking exactly like near-side ones.
      normal.copy(world).normalize()
      toCam.copy(camera.position).sub(world).normalize()
      const front = normal.dot(toCam)

      world.project(camera)
      projectionRef.current[i] = {
        x: (world.x + 1) / 2,
        y: (-world.y + 1) / 2,
        facing: front,
      }

      /* Under the hand the tour is not running, so it cannot say which place is
         being presented and the geometry has to answer instead: whichever pin
         sits most nearly on the PRESENTED direction (the lifted one — see
         presentDir), provided it is convincingly so. 0.88 is about 28 degrees
         off centre — tight enough that two clustered pins do not both claim
         the card, loose enough that you do not have to land one perfectly. */
      const present = normal.dot(presentDir)
      if (manual && present > bestFront) {
        bestFront = present
        best = i
      }
    }

    /* the waypoint labels want the same projection the pins get, and nothing
       else — no tour, no nearest-pin scoring, no pointer events */
    if (waypointProjectionRef) {
      for (let i = 0; i < waypointPoints.length; i++) {
        world.copy(waypointPoints[i]).applyMatrix4(group.matrixWorld)
        normal.copy(world).normalize()
        toCam.copy(camera.position).sub(world).normalize()
        const front = normal.dot(toCam)
        world.project(camera)
        waypointProjectionRef.current[i] = {
          x: (world.x + 1) / 2,
          y: (-world.y + 1) / 2,
          facing: front,
        }
      }
    }

    if (manual) {
      activeRef.current = best
      /* Hand the tour back where the visitor parked it, rather than at whatever
         index it was on when they grabbed it. Otherwise it resumes by counting
         down a hold on a place that may now be round the back, and the next
         stop it walks to is the one after a pin nobody was looking at. */
      if (best >= 0) state_.index = best
    }
  })

  return (
    <>
      {/* Distance is derived, not eyeballed. Visible height at the origin is
          2 * d * tan(fov/2); at fov 32 from z = 3.15 that is 1.81 against a
          sphere 2 across, so the globe was being cut off top and bottom by its
          own frustum. z = 4.6 gives 2.64, i.e. the sphere plus ~30% air for the
          pin cards to sit in. */}
      <PerspectiveCamera makeDefault position={[0, 0.3, 4.6]} fov={32} />
      <group ref={groupRef} rotation={[0.22, 0, 0.05]}>
        {/* The body. It exists to write depth, so that everything on the far
            side fails the depth test and disappears. Without it the shell is
            transparent and you read Africa through the Pacific, which was
            tolerable on a featureless dot sphere and is nonsense on one with
            coastlines. The fill is barely off the page colour: enough to give
            the planet mass against the background, not enough to become a
            shape competing with the dots. */}
        <mesh>
          <sphereGeometry args={[RADIUS * OCCLUDER, 96, 64]} />
          <meshBasicMaterial color="#17171b" />
        </mesh>

        {/* opacity nudged up for the planet-scale hero: at half-viewport size
            0.16 read as texture, at full height the ocean read as a void */}
        <points geometry={sea}>
          <pointsMaterial
            size={0.011}
            color="#9a9189"
            sizeAttenuation
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </points>
        {/* interior land: subordinate fill, so the shapes have body without
            every dot shouting at coastline volume */}
        <points geometry={shell}>
          <pointsMaterial
            size={0.012}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={0.62}
            depthWrite={false}
          />
        </points>
        {/* the coastlines: full-brightness dots one row deep along every
            land/sea boundary — the layer that makes the continents readable */}
        <points geometry={coast}>
          <pointsMaterial
            size={0.014}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
          />
        </points>
        <lineSegments geometry={graticule}>
          <lineBasicMaterial color="#f4efe9" transparent opacity={0.1} depthWrite={false} />
        </lineSegments>
        {arcs && (
          <lineSegments geometry={arcs}>
            <lineBasicMaterial color="#ff2d1a" transparent opacity={0.75} depthWrite={false} />
          </lineSegments>
        )}
      </group>
    </>
  )
}

export default Globe
