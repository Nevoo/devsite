import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { isLand } from '@/content/land-mask'
import { useUI } from '@/stores/ui'
import { FLAT_OCC, MORPH, OCC_RADIUS, patchDotAlpha } from './shaders/globe'
import type { Vec3 } from './plate'
import type { Terrain } from '@/content/terrain'

/** live projected state of one pin, written every frame, read by the DOM half */
export interface PinProjection {
  /** 0..1 across the tracked frame */
  x: number
  y: number
  /** 1 = facing the camera, 0 = edge on, <0 = round the back */
  facing: number
  /**
   * 0→1 as THIS label's own patch of map lands, 1 forever after. Per pin, not
   * per globe: the entrance has no moment where "the labels come on", each one
   * simply surfaces behind the sweep that built the ground under it.
   */
  form: number
}

export type ScalePhase = 'world' | 'dive' | 'plate' | 'return'

/** The one mutable scale contract shared across the DOM/canvas boundary. */
export interface ScaleState {
  phase: ScalePhase
  cluster: number
  morph: number
}

/** Plain deployment data passed into the lazy globe chunk, never store state. */
export interface GlobeCluster {
  memberIndices: number[]
  centroid: Vec3
  centroidLatLng: readonly [number, number]
  totalFrameCount: number
  congestedSingleton: boolean
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
  /** static enterable clusters, in the same order as the DOM chips */
  clusters?: GlobeCluster[]
  /** canvas-written centroid projections for the world-scale chips */
  chipProjectionRef?: { current: PinProjection[] }
  /** canvas-owned phase/morph state; DOM reads it transiently */
  scaleRef: { current: ScaleState }
  /** DOM intent only: cluster index to enter, or -1 */
  enterRef: { current: number }
  /** DOM intent only: true requests the current plate exit */
  exitRef: { current: boolean }
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

/** S4 plate vocabulary. All timing is positional off one dive clock. */
const PLATE_POINTS = 24000
const PLATE_GRID_POINTS = 1800
const SPREAD = 2.2
const PLATE_EXTENT = 0.35
const EXAGGERATION = 8
const ELEVATION_UNIT = 0.012
const ENTER_DUR = 1.6
const STEER_DUR = 0.34
const DEVELOP_AT = 0.58
const RETURN_DUR = 1.1
const RETURN_FILL_DUR = 0.5
const RETURN_MORPH_DELAY = 0.12
const TABLE_TILT = (12 * Math.PI) / 180
const CAMERA_ELEVATION = Math.atan2(0.3, 4.6)
const FLARE_TAIL = 0.3
const DEVELOP_DUR = ENTER_DUR * (1 - DEVELOP_AT)
const CAP_PADDING = 0.065
const MIN_CAP_RADIUS = 0.12
const MAX_CAP_RADIUS = 0.24

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
 * The entrance. The page opens INSIDE a dust field: every one of the globe's
 * dots starts as a particle in a deep volume around the camera, drifting
 * slowly toward it — flying through space, parallaxing with the pointer.
 * That field is the loading state (the charcoal veil lifts onto it).
 *
 * On the reveal beat the cloud collapses WITH ANGULAR MOMENTUM. The whole
 * group is a flywheel: it spins through the entire gather and decelerates
 * (SPIN_ARC, ease-in-out), so every particle — still drifting, mid-flight,
 * or landed — shares one global rotation, and a dot's straight run at its
 * home becomes a curved intercept because the home itself is turning. The
 * already-formed map never sits frozen while stragglers rain in. Launch
 * order is a SWEEP, not noise: dots leave by longitude (the reseed pass
 * below), and the sweep OPENS on the face the camera ends on — the part of
 * the planet the visitor keeps is built first and never touched again.
 * Each dot rides at partial brightness as dust and DEVELOPS to full as it
 * lands (aAlpha).
 *
 * ONE WAVE, NOT FOUR ARRIVALS. Nothing in this entrance fades in on a clock
 * of its own. The land, the graticule, the route and the labels all order
 * themselves by `sweepAt` — angular distance from the face the camera ends on
 * — so they are not four layers that appear, they are one wave passing over
 * one object. The graticule is dots in the same buffer family as the land.
 * The route stays a stroke (it is the one continuous line in the composition,
 * deliberately) but it develops per VERTEX with the ground under it rather
 * than walking a draw range on a timer; its longitude sets the wave and its
 * chronological index breaks ties inside a band, so the trip still establishes
 * itself in the order it was flown. Each label waits LABEL_LAG behind its own
 * ground and then develops. There is no beat at which "the planet shows up",
 * because at no instant is the planet a thing that is absent.
 *
 * Occlusion is GEOMETRY, not choreography. One invisible sphere at the
 * group origin occludes every dot, every frame, in the vertex shader (see
 * patchDotAlpha): each dot tests its own camera ray against the sphere and
 * fades over a small soft band behind the limb. The entrance owns exactly
 * ONE scalar of it — the radius, which grows from 0 to the occluder's size
 * during the gather (GROW beat). Dust in front stays; a dot whose path
 * carries it behind the mass slides out of sight the way things pass behind
 * solid bodies; far-side dots land into hiddenness. Because the test is
 * evaluated live against the real camera and rotation, it is correct at
 * every instant for ANY opening view, ANY camera move, ANY interruption —
 * nothing is baked, so there is no seam to tune and re-tune. The body mesh
 * gets no entrance of its own: its near-background tint creeps in from the
 * gather's first frame, glacially, and it takes over depth duty only when
 * fully opaque — a handoff the shader test makes pixel-equivalent by
 * construction, and one that now costs nothing because only `depthWrite`
 * moves. `transparent` must NOT be flipped: it feeds the `opaque` program
 * parameter (WebGLPrograms), so changing it compiles a whole second shader
 * on the main thread mid-gather. For the same reason the mesh is visible
 * from frame one at zero opacity — projectObject skips invisible objects
 * outright, so its program was not compiled until it appeared, which put a
 * GLSL compile and link exactly on the beat the dots start flying. Two
 * stalls, both inside the entrance, both invisible in the source.
 *
 * The handoff is momentum, not a cue: the flywheel parks SPIN_RESIDUAL
 * short of the first stop's facing rotation, and the gather has already
 * leaned the planet to that stop's presentation tilt — so the tour inherits
 * a sphere still creeping in its own spin direction, already posed, and
 * simply carries the motion to rest. No beat starts from stillness and no
 * beat ends in a stop.
 *
 * Continuity is structural: one particle buffer from the first frame to the
 * last, one wave ordering every layer, no crossfades between systems and no
 * layer that is absent and then present. Any input once the gather is running
 * skips to the end (never during the field — that IS the loading state).
 * Plays once per page load: internal navigation back mounts the globe formed.
 */
/** field half-extent in x/y, group-local units — wide enough to fill the far frustum */
const FIELD_SPREAD = 2.6
/** field depth: from just in front of the camera (z 4.6) back past the origin */
const FIELD_Z_NEAR = 4.3
const FIELD_Z_FAR = -4
/** units/s the dust drifts toward the camera — the flying-through feel */
const FIELD_DRIFT = 0.35
/**
 * Seconds the field keeps streaming after the veil starts lifting. The veil
 * fades over 0.4s (LoadingScreen), so this has to clear it by a real margin
 * or the dust is glimpsed mid-fade and the collapse reads as a cut to a
 * different picture rather than as the same dots moving. At 0.45 it did
 * exactly that: fifty milliseconds of visible field.
 */
const FIELD_HOLD = 0.85
/**
 * ONE clock. Everything below is expressed in master progress p = t /
 * GATHER_DUR, and p is deliberately NOT clamped — the labels' development
 * runs past the last dot's landing, which is the only thing that happens
 * after p = 1. Occlusion is per-dot alpha for the whole gather (see
 * patchDotAlpha), so a mid-flight dot is never eaten in transit and no frame
 * ever deletes a particle the visitor was looking at.
 */
/** seconds the dot flights span (sweep onsets + one flight) — p = 1 lands here */
const GATHER_DUR = 1.9
/** seconds: the occluding mass starts growing / has grown — the entrance's ONE
    occlusion scalar. Leads the landing tail so late dots land into hiddenness.
    Invisible in itself (it is a radius, not an opacity), so it costs no onset. */
const GROW_DELAY = 0.35
const GROW_DUR = 1.15
/** the body's tint, in master progress: no delay, because an onset the eye can
    catch is exactly what this entrance is trying not to have. Full by the time
    the last dot lands, which is when it inherits depth duty. */
const BODY_FULL = 1
/** master progress a label waits after its own ground has landed, then develops
    over. The lag keeps a name from surfacing onto dots that are still arriving;
    the ramp is shared with the route, so cartography and annotation are one
    gesture at two removes rather than two events. */
const LABEL_LAG = 0.1
const LABEL_RAMP = 0.28
/** 2.62s — the last label finishing IS the end of the entrance now. With the
    veil fade and the field hold, still inside a 3.5s opening. */
const GATHER_TOTAL = GATHER_DUR * (1 + LABEL_LAG + LABEL_RAMP)
/** radians the flywheel turns through the gather, ease-in-out, decelerating home */
const SPIN_ARC = 1.15
/** radians short of the first stop the flywheel parks — the tour finishes the motion */
const SPIN_RESIDUAL = 0.12
/** seconds the tour takes to reach full steering speed after the entrance */
const WAKE = 1.2

let entranceDone = false

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/* framerate-independent smoothing: damp converges identically at 30 and 144
   fps, where the old hand-rolled `x += (target - x) * min(1, delta * k)`
   factors drifted with the frame rate and clamped at low fps */
const { damp } = THREE.MathUtils
/** cubic ease-in-out — a real S-curve; smoothstep read as barely-not-linear */
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * THE WAVE. Where a point on the sphere falls in the longitude sweep: 0 on
 * the face the camera ends on, 1 round the back. Every layer of the entrance
 * orders itself by this one function — land dots, graticule dots, route
 * vertices, pin labels, waypoint labels — which is the whole reason none of
 * them needs a clock of its own, and why re-aiming the opening view re-aims
 * all five with no retuning. `front` is the group-space angle presented at
 * the end (see the seed pass).
 */
const sweepAt = (x: number, z: number, front: number) => {
  const a = Math.atan2(z, x) - front
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / Math.PI
}

/**
 * Master progress at which a thing carrying this seed has finished landing —
 * the inverse of formLayer's per-dot window, and the anchor everything that
 * follows the ground (route, labels) hangs off. Keep the two in step.
 */
const landedAt = (seed: number) => seed * 0.55 + 0.45

/** Label development without allocating a closure in the render loop. */
const labelFormAt = (seed: number, progress: number) =>
  ease(clamp01((progress - landedAt(seed) - LABEL_LAG) / LABEL_RAMP))

/** seed = mostly the wave, plus a little of whatever breaks ties inside a band */
const seedFrom = (sweep: number, tiebreak: number) => clamp01(0.78 * sweep + 0.22 * tiebreak)

/** one dot field: its geometry plus the arrays the entrance animates */
interface DotLayer {
  geometry: THREE.BufferGeometry
  home: Float32Array
  /** the aPlate attribute's array — pre-allocated now, reseeded by S4 later */
  plate: Float32Array
  scatter: Float32Array
  /** per-dot launch fraction, 0..1 — REWRITTEN by the sweep pass to follow longitude */
  seeds: Float32Array
  /** the aAlpha attribute's array — development brightness only; occlusion is the shader's */
  alpha: Float32Array
  /** angular distance from the active plate centroid, seeded once per enter */
  plateDistance: Float32Array
}

interface PlateLayer extends DotLayer {
  /** projected ground before relief is added */
  flat: Float32Array
  /** normalized terrain height, or zero for graticule samples */
  elevation: Float32Array
  /** 0 terrain fill, 1 local graticule */
  kind: Uint8Array
  /** active plate normal, rewritten once per enter */
  normal: Float32Array
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

/** An ~8% settle overshoot, used on relief lift only. */
const easeOutBack = (x: number) => {
  const c1 = 1.6
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

const angularDistance = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
  Math.acos(THREE.MathUtils.clamp(ax * bx + ay * by + az * bz, -1, 1))

/** No closures or allocations: the same typed buffers are rewritten in place. */
function formPlateLayer(layer: PlateLayer, develop: number, returning: boolean) {
  const posAttr = layer.geometry.getAttribute('position') as THREE.BufferAttribute
  const alphaAttr = layer.geometry.getAttribute('aAlpha') as THREE.BufferAttribute
  const pos = posAttr.array as Float32Array
  const { flat, scatter, seeds, alpha, elevation, kind, normal } = layer
  const returnFront = returning ? develop : 0

  for (let i = 0; i < seeds.length; i++) {
    const lag = kind[i] === 1 ? LABEL_LAG : 0
    const arrive = clamp01((develop - seeds[i] * 0.62 - lag) / 0.38)
    const leave = returning
      ? clamp01((returnFront - (1 - seeds[i]) * 0.62 - lag) / 0.38)
      : 0
    const local = returning ? 1 - ease(leave) : easeOutCubic(arrive)
    const lift = returning ? local : easeOutBack(arrive)
    const j = i * 3
    pos[j] = scatter[j] + (flat[j] - scatter[j]) * local
    pos[j + 1] = scatter[j + 1] + (flat[j + 1] - scatter[j + 1]) * local
    pos[j + 2] = scatter[j + 2] + (flat[j + 2] - scatter[j + 2]) * local

    const elevationLift = elevation[i] * ELEVATION_UNIT * EXAGGERATION * lift
    pos[j] += normal[0] * elevationLift
    pos[j + 1] += normal[1] * elevationLift
    pos[j + 2] += normal[2] * elevationLift

    const sinceFront = develop - seeds[i] * 0.62
    const flare = returning || kind[i] === 1 || sinceFront < 0
      ? 0
      : clamp01(1 - sinceFront / Math.max(0.001, FLARE_TAIL / DEVELOP_DUR))
    const settled = kind[i] === 1 ? 0.22 : 0.7 + elevation[i] * 0.3
    alpha[i] = clamp01(local * (settled + flare * 0.65))
  }
  posAttr.needsUpdate = true
  alphaAttr.needsUpdate = true
}

function formWorldPlate(layers: readonly DotLayer[], morph: number) {
  const fade = ease(clamp01((morph - 0.08) / 0.5))
  for (const layer of layers) {
    const { alpha, plateDistance } = layer
    for (let i = 0; i < alpha.length; i++) {
      const outside = smoothstep(PLATE_EXTENT, PLATE_EXTENT + 0.12, plateDistance[i])
      alpha[i] = 1 - outside * fade
    }
    layer.geometry.getAttribute('aAlpha').needsUpdate = true
  }
}

/**
 * One entrance frame for a layer: positions at master progress p, and the
 * per-dot alpha. Each dot streams home over its own window of the master —
 * the window ORDER is the longitude sweep written into `seeds` — easing OUT:
 * a launch that spends most of its flight decelerating onto the surface.
 * (The group is rotating underneath the whole time, so this straight run in
 * group space is a curved intercept on screen; a small unwinding lead in the
 * spin direction bends it a touch further.) Brightness is development, not a
 * fade: dust rides dim and a dot reaches full weight as it lands. That is
 * ALL this alpha carries — being hidden behind the mass is the shader's
 * per-frame geometric test (patchDotAlpha), never CPU state.
 */
function formLayer(layer: DotLayer, p: number) {
  const posAttr = layer.geometry.attributes.position as THREE.BufferAttribute
  const alphaAttr = layer.geometry.getAttribute('aAlpha') as THREE.BufferAttribute
  const pos = posAttr.array as Float32Array
  const { home, scatter, seeds, alpha } = layer
  for (let i = 0; i < seeds.length; i++) {
    const x = clamp01((p - seeds[i] * 0.55) / 0.45)
    const s = 1 - (1 - x) * (1 - x) * (1 - x)
    const j = i * 3
    // lead angle is negative and unwinds to zero: the target runs AHEAD in
    // the flywheel's own direction, so path curvature and spin agree
    const th = (s - 1) * (0.35 + 0.45 * ((seeds[i] * 17) % 1))
    const c = Math.cos(th)
    const n = Math.sin(th)
    const hx = c * home[j] + n * home[j + 2]
    const hz = c * home[j + 2] - n * home[j]
    pos[j] = scatter[j] + (hx - scatter[j]) * s
    pos[j + 1] = scatter[j + 1] + (home[j + 1] - scatter[j + 1]) * s
    pos[j + 2] = scatter[j + 2] + (hz - scatter[j + 2]) * s
    alpha[i] = 0.45 + 0.55 * s
  }
  posAttr.needsUpdate = true
  alphaAttr.needsUpdate = true
}

/**
 * advance the dust: drift every not-yet-gathered particle toward the camera,
 * wrapping at the near plane so the field never empties however long the
 * load takes. Mutates the scatter array only — formLayer owns the buffer.
 */
function driftLayer(layer: DotLayer, dz: number) {
  const { scatter, seeds } = layer
  const span = FIELD_Z_NEAR - FIELD_Z_FAR
  for (let i = 0; i < seeds.length; i++) {
    const j = i * 3 + 2
    scatter[j] += dz
    if (scatter[j] > FIELD_Z_NEAR) scatter[j] -= span
  }
}

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
 * The graticule, as sample points: equator plus two tropics, three meridians.
 * Enough to read as a globe and to make the rotation legible, few enough to
 * stay a drawing.
 *
 * DOTS, not lineSegments, and that is the point. As lines it was a fourth
 * system with a fourth clock — invisible through the whole gather, then an
 * opacity ramp on the carto beat, arriving alongside the route and the labels
 * as one obvious curtain-up. As points it goes through the same `build` as the
 * land, rides the same wave, and inherits the same shader occlusion, so it is
 * simply part of what the sweep assembles. Spacing is coarser than the land
 * (~0.035 against ~0.019 at 36k samples), which is what keeps a ring reading
 * as a ruled line rather than as terrain.
 */
function graticulePoints() {
  const STEPS = 180
  const points: number[] = []
  const ring = (fn: (t: number) => THREE.Vector3) => {
    for (let i = 0; i < STEPS; i++) {
      const p = fn((i / STEPS) * Math.PI * 2)
      points.push(p.x, p.y, p.z)
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
    ring(
      (t) =>
        new THREE.Vector3(Math.cos(t) * r * Math.cos(a), Math.sin(t) * r, Math.cos(t) * r * Math.sin(a))
    )
  }
  return points
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
  clusters = [],
  chipProjectionRef,
  scaleRef,
  enterRef,
  exitRef,
}: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const reduced = useMemo(() => prefersReducedMotion(), [])

  /* whether THIS mount plays the entrance — decided once, so the geometry
     memo below can seed its position buffers on the matching side */
  const intro = useRef({
    phase: (entranceDone || reduced ? 'done' : 'field') as 'field' | 'gather' | 'done',
    t: 0,
    hold: FIELD_HOLD,
    skip: false,
    /** seconds since the entrance finished — the tour's wake clock */
    wake: 0,
    /* where the field left the sphere. The gather drives tilt and parallax
       POSITIONALLY from here, on the same eased curve as the yaw, so the two
       axes start from rest together instead of one of them lurching. */
    tilt0: 0.22,
    pos0: new THREE.Vector3(),
  })
  /** pointer in [-1, 1] both axes — the dust field parallaxes toward it */
  const pointer = useRef({ x: 0, y: 0 })

  /* Three fields off one distribution, and the split is what makes the map
     legible. A uniform halftone gives every land dot equal weight, so at
     planet scale the continents read as one smear with no edges — the
     coastline only existed as "where the dots stop", and the sea field blurred
     even that. So each land dot asks the mask whether any of its neighbours is
     water: the ones on the boundary become the COAST layer, drawn brighter and
     a touch larger, which traces actual continent outlines; the interior fill
     drops back; the sea keeps the sphere's mass at a fraction of either. Still
     a drawing — the hierarchy is dots, never a texture. */
  const [coast, shell, sea, grid] = useMemo(() => {
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
    const entering = intro.current.phase !== 'done'
    const build = (values: number[]): DotLayer => {
      const home = new Float32Array(values)
      const n = home.length / 3
      const scatter = new Float32Array(home.length)
      const seeds = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const seed = Math.random()
        seeds[i] = seed
        /* the dust: every dot starts somewhere in a deep box around and in
           front of the camera — no relation to its map position yet, that
           is the whole point. driftLayer streams the box toward the camera
           while the site loads; formLayer flies each dot home from wherever
           it happens to be when the gather starts. */
        const j = i * 3
        scatter[j] = (Math.random() - 0.5) * 2 * FIELD_SPREAD
        scatter[j + 1] = (Math.random() - 0.5) * 2 * FIELD_SPREAD
        scatter[j + 2] = FIELD_Z_FAR + Math.random() * (FIELD_Z_NEAR - FIELD_Z_FAR)
      }
      const g = new THREE.BufferGeometry()
      // the buffer gets its own copy: home/scatter stay pristine lerp sources
      g.setAttribute('position', new THREE.BufferAttribute((entering ? scatter : home).slice(), 3))
      // dust rides dim (see formLayer's development) — a formed mount is full
      const alpha = new Float32Array(n).fill(entering ? 0.45 : 1)
      g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
      // Both future plate channels exist before the first compile. Starting
      // aPlate as an exact copy makes uMorph = 0 and 1 identical until seeded.
      const plate = home.slice()
      g.setAttribute('aPlate', new THREE.BufferAttribute(plate, 3))
      g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1))
      return {
        geometry: g,
        home,
        plate,
        scatter,
        seeds,
        alpha,
        plateDistance: new Float32Array(n),
      }
    }
    return [build(edge), build(fill), build(water), build(graticulePoints())]
  }, [])
  const layers = useMemo(() => [coast, shell, sea, grid] as const, [coast, shell, sea, grid])

  /* One dense layer, compiled and resident from mount. At world scale every
     aAlpha is zero, so it costs one invisible draw but never a first-dive
     shader compile. Position and aPlate deliberately share one array: S4's
     CPU wave owns the per-dot surface→relief schedule, while the shared morph
     shader still sees the attribute shape every other globe material uses. */
  const plateLayer = useMemo<PlateLayer>(() => {
    const home = new Float32Array(PLATE_POINTS * 3)
    const position = new Float32Array(PLATE_POINTS * 3)
    const alpha = new Float32Array(PLATE_POINTS)
    const geometry = new THREE.BufferGeometry()
    const positionAttribute = new THREE.BufferAttribute(position, 3)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    geometry.setAttribute('aPlate', positionAttribute)
    geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(PLATE_POINTS), 1))
    return {
      geometry,
      home,
      plate: position,
      scatter: new Float32Array(PLATE_POINTS * 3),
      seeds: new Float32Array(PLATE_POINTS),
      alpha,
      plateDistance: new Float32Array(PLATE_POINTS),
      flat: new Float32Array(PLATE_POINTS * 3),
      elevation: new Float32Array(PLATE_POINTS),
      kind: new Uint8Array(PLATE_POINTS),
      normal: new Float32Array(3),
    }
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
    /* The route develops PER VERTEX, off the same wave as everything else —
       no draw range, no clock. It used to walk setDrawRange up over its own
       0.7s window starting at 1.9s, which is what made it one of three layers
       that all appeared at once; the route arriving was most of what read as
       "the planet showed up". The alpha here is the same attribute the dots
       carry, consumed by the same shader patch, so the arcs also gain the
       live ray-test occlusion they never had — which is the actual reason the
       old code had to delay them until the body wrote depth. */
    const n = points.length / 3
    const alpha = new Float32Array(n).fill(intro.current.phase === 'done' ? 1 : 0)
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    g.setAttribute('aPlate', new THREE.Float32BufferAttribute(points, 3))
    g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1))
    return { geometry: g, seeds: new Float32Array(n), alpha }
  }, [legs])

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

  const chipPoints = useMemo(
    () => clusters.map((cluster) => new THREE.Vector3(...cluster.centroid).multiplyScalar(RADIUS * 1.012)),
    [clusters]
  )
  const chipSeeds = useMemo(() => new Float32Array(chipPoints.length), [chipPoints])

  /* CPU mirror destinations for the existing DOM pin nodes. They are filled
     once when a cluster is accepted, then read without allocation in the
     projection loop. */
  const pinPlate = useMemo(() => new Float32Array(pinPoints.length * 3), [pinPoints])
  const pinPlateSeeds = useMemo(() => new Float32Array(pinPoints.length), [pinPoints])
  const activeMembers = useMemo(() => new Uint8Array(pinPoints.length), [pinPoints])

  useEffect(
    () => () => {
      coast.geometry.dispose()
      shell.geometry.dispose()
      sea.geometry.dispose()
      grid.geometry.dispose()
      plateLayer.geometry.dispose()
      arcs?.geometry.dispose()
    },
    [coast, shell, sea, grid, plateLayer, arcs]
  )

  /* the entrance's one hand on the body: its tint. The mesh is visible and
     depth-silent from the first frame — visible so its program compiles at
     mount rather than mid-gather, depth-silent so no naked black sphere ever
     sits in front of the dust. Only `depthWrite` moves at the seam. */
  const occluderMatRef = useRef<THREE.MeshBasicMaterial>(null)

  /* the entrance's senses: pointer position while the dust streams, and the
     skip that any committed input fires once the gather is running. Never
     during the field — the field IS the loading state, there is nothing to
     skip to yet — and never on pointermove, which is how the field is
     played with, not a decision. */
  useEffect(() => {
    if (intro.current.phase === 'done') return
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const skip = () => {
      if (intro.current.phase === 'gather') intro.current.skip = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    window.addEventListener('wheel', skip)
    window.addEventListener('touchstart', skip)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
    }
  }, [])

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

  /* Where the entrance ENDS: the first stop's presentation pose, minus the
     residual the tour is left to carry. The flywheel decelerates INTO this —
     forming the planet already leaned and aimed at its first place is what
     lets the whole sequence run dust → planet → card without an intermediate
     "now swing to the first pin" move ever happening. */
  const entranceEnd = useMemo(
    () =>
      pinPoints.length === 0
        ? { yaw: opening.rotation, tilt: 0.22 }
        : {
            yaw: facingRotations[opening.index] - SPIN_RESIDUAL,
            tilt: facingTilts[opening.index],
          },
    [pinPoints, facingRotations, facingTilts, opening]
  )

  /* where each label sits in the wave — same units as a dot's seed, so the
     one that fires last fires with the ground it stands on */
  const pinSeeds = useMemo(() => new Float32Array(pinPoints.length), [pinPoints])
  const waypointSeeds = useMemo(() => new Float32Array(waypointPoints.length), [waypointPoints])

  /* THE SEED PASS: order only — occlusion is never seeded, it is the shader's
     live geometry. A thing's start time is its angular distance from the face
     the camera ends on (`sweepAt`), and the sweep OPENS there: the face the
     visitor keeps is built first and stays; the further round the back it
     sits, the later it leaves — and the growing mass has usually hidden the
     far side by then, so the tail of the sweep lands out of sight. Derived
     entirely from `entranceEnd`, so changing the opening view re-aims the
     whole entrance with zero retuning.

     This is now the ONLY place the entrance is sequenced. Five things pass
     through it — land, graticule, route, pins, waypoints — and each gets a
     position in one wave rather than a window on its own timeline. That is
     what removed the "and now the cartography" beat: there is no beat, there
     is a front moving across a sphere and things becoming visible behind it.

     The tiebreak term is what keeps the front ragged enough to stay organic
     (without any ordering at all, uniform random starts read as static
     congealing rather than a wave). It is random for the fields, where
     nothing distinguishes neighbouring dots — and CHRONOLOGICAL for the
     route, which is the one layer that has a second story to tell: inside a
     longitude band, the earlier flight draws first, so the trip still
     establishes itself in the order it was flown. */
  useMemo(() => {
    if (intro.current.phase === 'done') return
    const front = entranceEnd.yaw + Math.PI / 2 // group-space angle presented at the end
    for (const layer of layers) {
      const { home, seeds } = layer
      for (let i = 0; i < seeds.length; i++) {
        seeds[i] = seedFrom(sweepAt(home[i * 3], home[i * 3 + 2], front), Math.random())
      }
    }
    if (arcs) {
      const pos = arcs.geometry.attributes.position.array as Float32Array
      const n = arcs.seeds.length
      for (let i = 0; i < n; i++) {
        arcs.seeds[i] = seedFrom(sweepAt(pos[i * 3], pos[i * 3 + 2], front), i / n)
      }
    }
    for (let i = 0; i < pinPoints.length; i++) {
      pinSeeds[i] = seedFrom(sweepAt(pinPoints[i].x, pinPoints[i].z, front), Math.random())
    }
    for (let i = 0; i < waypointPoints.length; i++) {
      waypointSeeds[i] = seedFrom(
        sweepAt(waypointPoints[i].x, waypointPoints[i].z, front),
        Math.random()
      )
    }
  }, [
    layers,
    arcs,
    entranceEnd,
    pinPoints,
    waypointPoints,
    pinSeeds,
    waypointSeeds,
  ])

  /* Clusters arrive through their own dynamic chunk after WorldGlobe mounts.
     Seed only these late projections here: changing chipPoints must never
     reroll the already-established land/route entrance wave above. */
  useMemo(() => {
    if (intro.current.phase === 'done') return
    const front = entranceEnd.yaw + Math.PI / 2
    for (let i = 0; i < chipPoints.length; i++) {
      chipSeeds[i] = seedFrom(sweepAt(chipPoints[i].x, chipPoints[i].z, front), Math.random())
    }
  }, [chipPoints, chipSeeds, entranceEnd])

  const tour = useRef({ index: 0, hold: 0, target: 0, seeded: false, grace: 0, lastSelected: -1 })

  type PlateModule = typeof import('./plate')
  const dive = useRef({
    clock: 0,
    returnClock: 0,
    loadId: 0,
    loading: false,
    seeded: false,
    interrupted: false,
    terrain: null as Terrain | null,
    plateModule: null as PlateModule | null,
    startYaw: 0,
    startTilt: 0,
    sphereYaw: 0,
    sphereTilt: 0,
    plateTilt: 0,
    capRadius: MIN_CAP_RADIUS,
    panYaw: 0,
    panTilt: 0,
    returnFromMorph: 1,
    returnStartYaw: 0,
    returnStartTilt: 0,
    returnYaw: 0,
    returnTilt: 0,
    nextIndex: 0,
  })
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      MORPH.value = 0
      FLAT_OCC.value = 1
    }
  }, [])

  /* Any committed input during the positional transition resolves to the
     nearest stable end. Escape is also an explicit exit intent on the DOM
     side, so the frame loop gives that intent priority over this flag. */
  useEffect(() => {
    const interrupt = () => {
      if (scaleRef.current.phase === 'dive') dive.current.interrupted = true
    }
    window.addEventListener('pointerdown', interrupt)
    window.addEventListener('keydown', interrupt)
    window.addEventListener('wheel', interrupt, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', interrupt)
      window.removeEventListener('keydown', interrupt)
      window.removeEventListener('wheel', interrupt)
    }
  }, [scaleRef])

  /** Reseed work is allowed to be synchronous and allocation-bearing once per
      enter. The animation frames that follow only rewrite these typed arrays. */
  const reseedPlate = (clusterIndex: number, terrain: Terrain, plateModule: PlateModule) => {
    const cluster = clusters[clusterIndex]
    if (!cluster) return false
    const c = cluster.centroid
    let capRadius = MIN_CAP_RADIUS
    for (let i = 0; i < cluster.memberIndices.length; i++) {
      const point = pinPoints[cluster.memberIndices[i]]
      capRadius = Math.max(
        capRadius,
        angularDistance(point.x, point.y, point.z, c[0], c[1], c[2]) + CAP_PADDING
      )
    }
    capRadius = THREE.MathUtils.clamp(capRadius, MIN_CAP_RADIUS, MAX_CAP_RADIUS)
    dive.current.capRadius = capRadius
    plateLayer.normal[0] = c[0]
    plateLayer.normal[1] = c[1]
    plateLayer.normal[2] = c[2]

    for (const layer of layers) {
      const { home, plate, plateDistance } = layer
      for (let i = 0; i < plateDistance.length; i++) {
        const j = i * 3
        const projected = plateModule.plateProject(
          [home[j], home[j + 1], home[j + 2]],
          c,
          SPREAD
        )
        plate[j] = projected[0]
        plate[j + 1] = projected[1]
        plate[j + 2] = projected[2]
        const length = Math.hypot(home[j], home[j + 1], home[j + 2]) || 1
        plateDistance[i] = angularDistance(
          home[j] / length,
          home[j + 1] / length,
          home[j + 2] / length,
          c[0],
          c[1],
          c[2]
        )
      }
      layer.geometry.getAttribute('aPlate').needsUpdate = true
    }

    activeMembers.fill(0)
    pinPlate.fill(0)
    pinPlateSeeds.fill(0)
    for (let i = 0; i < cluster.memberIndices.length; i++) {
      const memberIndex = cluster.memberIndices[i]
      const point = pinPoints[memberIndex]
      const projected = plateModule.plateProject([point.x, point.y, point.z], c, SPREAD)
      const j = memberIndex * 3
      pinPlate[j] = projected[0] + c[0] * 0.012
      pinPlate[j + 1] = projected[1] + c[1] * 0.012
      pinPlate[j + 2] = projected[2] + c[2] * 0.012
      pinPlateSeeds[memberIndex] = clamp01(
        angularDistance(point.x, point.y, point.z, c[0], c[1], c[2]) / capRadius
      )
      activeMembers[memberIndex] = 1
    }

    const bounds = plateModule.angularCapBounds(cluster.centroidLatLng, capRadius)
    let randomState = (0x5eed1234 ^ ((clusterIndex + 1) * 0x9e3779b9)) >>> 0
    const random = () => {
      randomState ^= randomState << 13
      randomState ^= randomState >>> 17
      randomState ^= randomState << 5
      return (randomState >>> 0) / 0x1_0000_0000
    }
    const fillCount = PLATE_POINTS - PLATE_GRID_POINTS
    const capDegrees = (capRadius * 180) / Math.PI
    const gridStep = Math.max(1, capDegrees / 3)

    for (let i = 0; i < PLATE_POINTS; ) {
      const gridPoint = i >= fillCount
      let lat = bounds.minLat + random() * (bounds.maxLat - bounds.minLat)
      const range = bounds.lngRanges[Math.min(bounds.lngRanges.length - 1, Math.floor(random() * bounds.lngRanges.length))]
      let lng = range[0] + random() * (range[1] - range[0])
      if (gridPoint) {
        if (i % 2 === 0) lat = Math.round(lat / gridStep) * gridStep
        else lng = Math.round(lng / gridStep) * gridStep
      }
      const direction = plateModule.latLngToVec3([lat, lng])
      const distance = angularDistance(
        direction[0],
        direction[1],
        direction[2],
        c[0],
        c[1],
        c[2]
      )
      if (distance > capRadius || (!gridPoint && !terrain.landAt(lat, lng))) continue

      const projected = plateModule.plateProject(direction, c, SPREAD)
      const j = i * 3
      plateLayer.scatter[j] = direction[0] * 1.001
      plateLayer.scatter[j + 1] = direction[1] * 1.001
      plateLayer.scatter[j + 2] = direction[2] * 1.001
      const gridSink = gridPoint ? -0.004 : 0
      plateLayer.flat[j] = projected[0] + c[0] * gridSink
      plateLayer.flat[j + 1] = projected[1] + c[1] * gridSink
      plateLayer.flat[j + 2] = projected[2] + c[2] * gridSink
      plateLayer.home[j] = plateLayer.flat[j]
      plateLayer.home[j + 1] = plateLayer.flat[j + 1]
      plateLayer.home[j + 2] = plateLayer.flat[j + 2]
      plateLayer.plate[j] = plateLayer.scatter[j]
      plateLayer.plate[j + 1] = plateLayer.scatter[j + 1]
      plateLayer.plate[j + 2] = plateLayer.scatter[j + 2]
      plateLayer.seeds[i] = clamp01(distance / capRadius)
      plateLayer.plateDistance[i] = distance
      plateLayer.elevation[i] = gridPoint ? 0 : terrain.elevationAt(lat, lng)
      plateLayer.kind[i] = gridPoint ? 1 : 0
      plateLayer.alpha[i] = 0
      i++
    }
    plateLayer.geometry.getAttribute('position').needsUpdate = true
    plateLayer.geometry.getAttribute('aAlpha').needsUpdate = true
    return true
  }

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

    /* THE ENTRANCE, while it plays, owns the transform and the clock: the
       tour is gated off below and every label is held back by its own place
       in the wave (see labelP), but the projection loops further down keep
       running so each one is already standing in the right place the moment
       its ground lands under it. */
    const introPhase = intro.current.phase
    if (introPhase === 'field') {
      const s = intro.current
      s.t += delta
      /* flying through the dust: every particle streams toward the camera
         (wrapping, so the field survives any load time) and the whole field
         parallaxes gently toward the pointer. Rotation is parked exactly one
         SPIN_ARC before the entrance's end pose — the dust cloud has no
         visible orientation, so this is free, and it means the flywheel
         starts turning from here with zero discontinuity. */
      group.rotation.y = entranceEnd.yaw - SPIN_ARC
      group.rotation.x = damp(group.rotation.x, 0.22 + pointer.current.y * 0.06, 3, delta)
      group.position.x = damp(group.position.x, pointer.current.x * 0.14, 3, delta)
      group.position.y = damp(group.position.y, pointer.current.y * -0.1, 3, delta)
      for (const layer of layers) {
        driftLayer(layer, delta * FIELD_DRIFT)
        formLayer(layer, 0)
      }
      OCC_RADIUS.value = 0 // no mass yet — the field is dust all the way through
      activeRef.current = -1
      /* the gather waits for the site's reveal beat, then one more beat so
         the field is SEEN streaming rather than glimpsed mid-fade */
      if (useUI.getState().revealed && (s.hold -= delta) <= 0) {
        s.phase = 'gather'
        s.t = 0
        // the gather's curves start from exactly where the field left the
        // sphere, so neither axis has to catch up to anything
        s.tilt0 = group.rotation.x
        s.pos0.copy(group.position)
      }
    } else if (introPhase === 'gather') {
      const s = intro.current
      s.t = s.skip ? GATHER_TOTAL : s.t + delta
      /* master progress. NOT clamped: formLayer clamps per dot, and the
         labels' development deliberately runs past p = 1 (see LABEL_LAG). */
      const p = s.t / GATHER_DUR
      const u = clamp01(s.t / GATHER_TOTAL)
      const e = ease(u)

      /* THE FLYWHEEL. The one transform every particle shares: the group
         spins up and decelerates through the whole gather, easing in from
         the field's rest and out into the end pose. All three channels are
         driven POSITIONALLY off the same curve, so a skip lands exactly and
         the curve is the choreography.

         The tilt used to be damped toward the end pose instead, and an
         exponential approach has its maximum velocity on frame one — so the
         sphere lurched into its lean the instant the gather began, from a
         standstill, while the yaw beside it eased in properly. That was the
         same bug the tour fixes with WAKE further down, and it was the one
         piece of the entrance where a beat started from a stop. */
      group.rotation.y = entranceEnd.yaw - SPIN_ARC * (1 - e)
      group.rotation.x = s.tilt0 + (entranceEnd.tilt - s.tilt0) * e
      group.position.copy(s.pos0).multiplyScalar(1 - e)

      // dots that have not launched yet keep living as dust rather than
      // freezing mid-air; the drift dies out as the map takes over
      const dz = delta * FIELD_DRIFT * (1 - clamp01(p))
      if (dz > 0) for (const layer of layers) driftLayer(layer, dz)

      /* the GROW beat — the entrance's one occlusion scalar. The invisible
         mass swells inside the cloud and everything behind it slides out of
         sight, evaluated per dot per frame in the shader. */
      OCC_RADIUS.value = RADIUS * OCCLUDER * ease(clamp01((s.t - GROW_DELAY) / GROW_DUR))

      /* the body's tint: no delay and no onset, creeping in from the gather's
         first frame so slowly it cannot be caught arriving, and full by the
         time the last dot lands. Only `depthWrite` moves at that point —
         flipping `transparent` too (as this used to) changes the `opaque`
         program parameter and compiles a second shader on the main thread,
         mid-entrance, for a handoff the shader's ray test has already made
         invisible. The mesh itself is visible from frame one at zero opacity
         so its program is compiled at mount, under the veil, instead of on
         the beat it first appeared. */
      if (occluderMatRef.current) {
        const bodyFade = ease(clamp01(p / BODY_FULL))
        occluderMatRef.current.opacity = bodyFade
        occluderMatRef.current.depthWrite = bodyFade >= 1
      }

      for (const layer of layers) formLayer(layer, p)

      /* THE ROUTE, per vertex, off the same wave — no draw range, no clock.
         A vertex develops once the ground under it has landed, so the line
         is never drawn over dots that are still in flight, and the scarlet
         reaches a stretch of coast at the moment that coast exists. Inside a
         longitude band the seed's tiebreak is chronological (see the seed
         pass), so the trip still establishes itself in the order it was
         flown. Alpha is interpolated along each segment, which means the
         sweep front crosses a leg smoothly instead of snapping vertex to
         vertex the way a draw range does. */
      if (arcs) {
        const { seeds, alpha } = arcs
        for (let i = 0; i < seeds.length; i++) {
          alpha[i] = clamp01((p - landedAt(seeds[i])) / LABEL_RAMP)
        }
        arcs.geometry.getAttribute('aAlpha').needsUpdate = true
      }
      activeRef.current = -1

      if (s.t >= GATHER_TOTAL) {
        /* no occlusion seam here — the shader's ray test has been the sole
           authority all along and simply keeps running at full radius. No
           transform seam either: with tilt and parallax driven positionally
           off ease(u), u is exactly 1 here and both channels have already
           landed on their end values, so this block does not have to snap
           anything home the way it did when the tilt was damped. It is only
           the end of the clocks: hand the tour its momentum. */
        /* the momentum handoff: seed the tour ON the first stop, aimed the
           SPIN_RESIDUAL further the flywheel deliberately left undone. The
           tour's damped steering carries the sphere's dying spin the last
           few degrees in the same direction — the entrance never stops and
           the tour never starts; authority just changes hands mid-motion. */
        if (pinPoints.length > 0) {
          state_.index = opening.index
          state_.target = facingRotations[opening.index]
          state_.hold = HOLD
          state_.seeded = true
        }
        s.phase = 'done'
        entranceDone = true
      }
    } else {
      // the wake clock only runs once the planet exists — see WAKE
      intro.current.wake += delta
      // formed forever after, including remounts and reduced-motion mounts
      OCC_RADIUS.value = RADIUS * OCCLUDER
    }

    const scale = scaleRef.current
    const d = dive.current

    /* Consume exactly one DOM intent. The fetch starts here, never at module
       evaluation or mount, which keeps terrain.bin and terrain.ts off the
       initial path. The steer can spend its first beat while the asset lands;
       the peel clock holds at STEER_DUR until reseeding is complete. */
    if (introPhase === 'done' && scale.phase === 'world' && enterRef.current >= 0) {
      const clusterIndex = enterRef.current
      enterRef.current = -1
      const cluster = clusters[clusterIndex]
      if (cluster) {
        scale.phase = 'dive'
        scale.cluster = clusterIndex
        scale.morph = 0
        d.clock = 0
        d.returnClock = 0
        d.loading = true
        d.seeded = false
        d.interrupted = false
        d.terrain = null
        d.plateModule = null
        d.startYaw = group.rotation.y
        d.startTilt = group.rotation.x
        const rawYaw = Math.atan2(cluster.centroid[2], cluster.centroid[0]) - Math.PI / 2
        const yawDiff = Math.atan2(
          Math.sin(rawYaw - group.rotation.y),
          Math.cos(rawYaw - group.rotation.y)
        )
        d.sphereYaw = group.rotation.y + yawDiff
        const latitude = (cluster.centroidLatLng[0] * Math.PI) / 180
        d.sphereTilt = THREE.MathUtils.clamp(latitude, -0.62, 0.62) - PRESENT_BIAS
        d.plateTilt = latitude - CAMERA_ELEVATION - TABLE_TILT
        d.panYaw = 0
        d.panTilt = 0
        activeRef.current = -1
        if (!cluster.congestedSingleton) selectedRef.current = -1

        const loadId = ++d.loadId
        void Promise.all([import('./plate'), import('@/content/terrain')])
          .then(async ([plateModule, terrainModule]) => {
            const terrain = await terrainModule.loadTerrain()
            if (!alive.current || loadId !== dive.current.loadId) return
            dive.current.plateModule = plateModule
            dive.current.terrain = terrain
          })
          .catch(() => {
            if (!alive.current || loadId !== dive.current.loadId) return
            dive.current.loading = false
            exitRef.current = true
          })
      }
    } else if (scale.phase !== 'world' && enterRef.current >= 0) {
      enterRef.current = -1
    }

    if (scale.phase === 'dive' && !d.seeded && d.terrain && d.plateModule) {
      d.seeded = reseedPlate(scale.cluster, d.terrain, d.plateModule)
      d.loading = false
    }

    const beginReturn = exitRef.current && scale.phase !== 'world' && scale.phase !== 'return'
    exitRef.current = false
    if (beginReturn) {
      if (!d.seeded || scale.morph <= 0.0001) {
        scale.phase = 'world'
        scale.cluster = -1
        scale.morph = 0
        MORPH.value = 0
        FLAT_OCC.value = 1
      } else {
        scale.phase = 'return'
        d.returnClock = 0
        d.returnFromMorph = scale.morph
        d.returnStartYaw = group.rotation.y
        d.returnStartTilt = group.rotation.x
        d.nextIndex = pinPoints.length > 0 ? (state_.index + 1) % pinPoints.length : 0
        const targetYaw = pinPoints.length > 0
          ? facingRotations[d.nextIndex]
          : group.rotation.y + SPIN_RESIDUAL
        const diff = Math.atan2(
          Math.sin(targetYaw - group.rotation.y),
          Math.cos(targetYaw - group.rotation.y)
        )
        const direction = diff === 0 ? 1 : Math.sign(diff)
        d.returnYaw = group.rotation.y + diff - direction * SPIN_RESIDUAL
        d.returnTilt = pinPoints.length > 0 ? facingTilts[d.nextIndex] : group.rotation.x
        selectedRef.current = -1
        state_.lastSelected = -1
      }
    }

    if (scale.phase === 'dive') {
      if (d.interrupted) {
        d.interrupted = false
        if (scale.morph < 0.5) {
          scale.phase = 'world'
          scale.cluster = -1
          scale.morph = 0
          MORPH.value = 0
          FLAT_OCC.value = 1
          formWorldPlate(layers, 0)
          if (arcs) {
            arcs.alpha.fill(1)
            arcs.geometry.getAttribute('aAlpha').needsUpdate = true
          }
          plateLayer.alpha.fill(0)
          plateLayer.geometry.getAttribute('aAlpha').needsUpdate = true
        } else {
          scale.phase = 'plate'
          scale.morph = 1
          MORPH.value = 1
          FLAT_OCC.value = 0
          group.rotation.y = d.sphereYaw
          group.rotation.x = d.plateTilt
          formWorldPlate(layers, 1)
          formPlateLayer(plateLayer, 1, false)
        }
      } else {
        d.clock = d.seeded ? d.clock + delta : Math.min(STEER_DUR, d.clock + delta)
        const steer = ease(clamp01(d.clock / STEER_DUR))
        const morph = d.seeded
          ? ease(clamp01((d.clock - STEER_DUR) / (ENTER_DUR - STEER_DUR)))
          : 0
        scale.morph = morph
        MORPH.value = morph
        FLAT_OCC.value = 1 - morph
        group.rotation.y = d.startYaw + (d.sphereYaw - d.startYaw) * steer
        group.rotation.x =
          d.startTilt + (d.sphereTilt - d.startTilt) * steer +
          (d.plateTilt - d.sphereTilt) * ease(morph)
        if (d.seeded) {
          formWorldPlate(layers, morph)
          const develop = clamp01((morph - DEVELOP_AT) / (1 - DEVELOP_AT))
          formPlateLayer(plateLayer, develop, false)
          if (arcs) {
            const route = 1 - ease(clamp01(morph / 0.3))
            arcs.alpha.fill(route)
            arcs.geometry.getAttribute('aAlpha').needsUpdate = true
          }
        }
        if (morph >= 1) scale.phase = 'plate'
      }
      spinRef.current = 0
      tiltRef.current = 0
      activeRef.current = -1
    } else if (scale.phase === 'plate') {
      scale.morph = 1
      MORPH.value = 1
      FLAT_OCC.value = 0
      d.panYaw += spinRef.current
      d.panTilt += tiltRef.current
      const panDistance = Math.hypot(d.panYaw, d.panTilt)
      if (panDistance > d.capRadius) {
        const clampScale = d.capRadius / panDistance
        d.panYaw *= clampScale
        d.panTilt *= clampScale
      }
      spinRef.current = 0
      tiltRef.current = 0
      group.rotation.y = d.sphereYaw + d.panYaw
      group.rotation.x = d.plateTilt + d.panTilt
      activeRef.current = -1
    } else if (scale.phase === 'return') {
      d.returnClock += delta
      const progress = clamp01(d.returnClock / RETURN_DUR)
      const morphProgress = ease(
        clamp01((d.returnClock - RETURN_MORPH_DELAY) / (RETURN_DUR - RETURN_MORPH_DELAY))
      )
      const morph = d.returnFromMorph * (1 - morphProgress)
      const pose = ease(progress)
      scale.morph = morph
      MORPH.value = morph
      FLAT_OCC.value = 1 - morph
      group.rotation.y = d.returnStartYaw + (d.returnYaw - d.returnStartYaw) * pose
      group.rotation.x = d.returnStartTilt + (d.returnTilt - d.returnStartTilt) * pose
      formWorldPlate(layers, morph)
      formPlateLayer(plateLayer, clamp01(d.returnClock / RETURN_FILL_DUR), true)
      if (arcs) {
        const route = 1 - ease(clamp01(morph / 0.3))
        arcs.alpha.fill(route)
        arcs.geometry.getAttribute('aAlpha').needsUpdate = true
      }
      spinRef.current = 0
      tiltRef.current = 0
      activeRef.current = -1
      if (progress >= 1) {
        scale.phase = 'world'
        scale.cluster = -1
        scale.morph = 0
        MORPH.value = 0
        FLAT_OCC.value = 1
        if (pinPoints.length > 0) {
          state_.index = d.nextIndex
          state_.target = facingRotations[d.nextIndex]
          state_.hold = HOLD
          state_.seeded = true
          state_.grace = 0
        }
      }
    } else {
      MORPH.value = 0
      FLAT_OCC.value = 1
    }

    /* Binding S3-gate fix: the compiled-from-mount body film stands down with
       uFlat. `transparent` and `visible` never move; depth writing returns
       only at the fully wrapped stable end. */
    if (occluderMatRef.current && introPhase === 'done') {
      occluderMatRef.current.opacity = 1 - scale.morph
      occluderMatRef.current.depthWrite = scale.phase === 'world' && scale.morph <= 0.0001
    }

    /* THE HAND COMES FIRST, and it is applied before the tour reads the
       rotation, so both are looking at the same numbers on the same frame.

       Two axes, because one was never enough: spinning about Y sweeps a single
       band of latitudes past the camera, so with horizontal drag alone the
       poles could not be reached at all and a third of the sphere was drawn but
       unviewable. X is clamped rather than free — see TILT_LIMIT. */
    const worldScale = scale.phase === 'world'
    let dragged = false
    if (worldScale && spinRef.current !== 0) {
      group.rotation.y += spinRef.current
      dragged = true
    }
    if (worldScale && tiltRef.current !== 0) {
      group.rotation.x = THREE.MathUtils.clamp(
        group.rotation.x + tiltRef.current,
        TILT_MIN,
        TILT_MAX
      )
      dragged = true
    }
    // damped here rather than in the handler, so a flick keeps coasting after
    // the pointer is up and comes to rest on its own. Exponential, not the
    // linear 1 − 6Δt, which hit zero outright on a slow frame.
    const decay = Math.exp(-6 * delta)
    if (worldScale) {
      spinRef.current *= decay
      tiltRef.current *= decay
    }
    if (Math.abs(spinRef.current) < 1e-5) spinRef.current = 0
    if (Math.abs(tiltRef.current) < 1e-5) tiltRef.current = 0

    if (worldScale && dragged) {
      state_.grace = GRACE
      state_.hold = HOLD
      state_.target = group.rotation.y
      // grabbing the sphere cancels a tap-lock: the hand is the authority now,
      // and the panel goes back to following whatever is parked front-on
      if (state_.lastSelected >= 0) {
        selectedRef.current = -1
        state_.lastSelected = -1
      }
    } else if (worldScale) {
      state_.grace = Math.max(0, state_.grace - delta)
    }

    /* A tap on a pickup. The DOM writes the index; the tour adopts it as its
       own next stop with a much longer hold, rather than running a separate
       "focus" mode — one state machine, one authority on the rotation. grace
       is zeroed because the tap is a command to the TOUR, and leaving the
       manual branch in charge would let the nearest-pin geometry re-decide
       what the visitor just decided by name. */
    if (worldScale && selectedRef.current !== state_.lastSelected) {
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
    const manual = worldScale && state_.grace > 0

    /* The tour wakes, it does not lunge. An exponential approach has its
       maximum angular velocity on frame one, so the instant the route
       finished drawing the sphere used to snap into its first swing-and-lean
       — the last seam left in the entrance. Scaling the steering up from
       zero over WAKE seconds gives the formed planet a breath of stillness
       and then a lean that visibly accelerates from rest. Saturates at 1 and
       stays there for the life of the mount. */
    const wake = ease(clamp01(intro.current.wake / WAKE))

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
    if (worldScale && !reduced && pinPoints.length > 0 && !manual && introPhase === 'done') {
      if (!state_.seeded) {
        /* REMOUNTS ONLY — a fresh entrance seeds itself at the seam, mid-
           motion. Internal navigation back mounts the globe formed, waking
           on the archive's weighted centre (see `opening`) and drifting the
           short distance to its first stop. */
        state_.index = opening.index
        state_.target = facingRotations[opening.index]
        group.rotation.y = opening.rotation
        state_.hold = HOLD
        state_.seeded = true
      }

      // shortest way round, so the globe never takes the long way for 10 degrees
      let diff = state_.target - group.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))

      group.rotation.x = damp(group.rotation.x, facingTilts[state_.index], 1.6 * wake, delta)

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
        // damp() on the raw angles would take the long way round the wrap, so
        // the shortest-path diff keeps its form with damp's exact factor
        group.rotation.y += diff * (1 - Math.exp(-1.9 * wake * delta))
      }

      /* The tour is the authority on which place is speaking, not a geometric
         threshold on how front-on it happens to be — the threshold was what
         locked the southern pin out. The card opens only once the swing has
         settled, so it never rides across the sphere mid-move. */
      activeRef.current = Math.abs(diff) < 0.06 && state_.hold < HOLD ? state_.index : -1
    } else if (
      worldScale &&
      !reduced &&
      pinPoints.length === 0 &&
      !manual &&
      introPhase === 'done'
    ) {
      group.rotation.y += delta * 0.075 * wake
    }

    group.updateMatrixWorld()

    let best = -1
    let bestFront = 0.88

    /* Master progress as the LABELS read it, and the reason there is no
       "and now the labels" moment left: each one develops behind its own
       patch of ground rather than on a shared carto clock. The two infinities
       are not a trick — they are the honest values. In the dust nothing has
       landed, so every label is infinitely early; once formed everything has,
       so every label is infinitely late. Both saturate through clamp01 with
       no branch inside the loop. */
    const labelP =
      introPhase === 'done' ? Infinity : introPhase === 'gather' ? intro.current.t / GATHER_DUR : -Infinity
    for (let i = 0; i < pinPoints.length; i++) {
      let plateForm = 0
      const onActivePlate = scale.phase !== 'world' && activeMembers[i] === 1
      if (onActivePlate) {
        if (scale.phase === 'plate') plateForm = 1
        else if (scale.phase === 'dive') {
          const develop = clamp01((scale.morph - DEVELOP_AT) / (1 - DEVELOP_AT))
          plateForm = ease(
            clamp01((develop - pinPlateSeeds[i] * 0.62 - LABEL_LAG) / 0.38)
          )
        } else {
          plateForm = ease(clamp01(scale.morph))
        }
        const cluster = clusters[scale.cluster]
        if (cluster) {
          const c = cluster.centroid
          const j = i * 3
          world.set(
            c[0] * 1.012 + (pinPlate[j] - c[0] * 1.012) * plateForm,
            c[1] * 1.012 + (pinPlate[j + 1] - c[1] * 1.012) * plateForm,
            c[2] * 1.012 + (pinPlate[j + 2] - c[2] * 1.012) * plateForm
          )
        } else {
          world.copy(pinPoints[i])
        }
      } else {
        world.copy(pinPoints[i])
      }
      world.applyMatrix4(group.matrixWorld)

      // Facing is computed on the sphere's own normal, not from the projection.
      // A point behind the globe still projects to a perfectly plausible screen
      // position, so without this the far-side pins would sit on top of the
      // globe looking exactly like near-side ones.
      normal.copy(world).normalize()
      toCam.copy(camera.position).sub(world).normalize()
      const front = onActivePlate ? 1 : normal.dot(toCam)

      world.project(camera)
      const projection = projectionRef.current[i] ?? { x: 0, y: 0, facing: 0, form: 0 }
      projection.x = (world.x + 1) / 2
      projection.y = (-world.y + 1) / 2
      projection.facing = front
      projection.form = scale.phase === 'world'
        ? labelFormAt(pinSeeds[i], labelP)
        : onActivePlate ? plateForm : 0
      projectionRef.current[i] = projection

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
        const projection = waypointProjectionRef.current[i] ?? {
          x: 0,
          y: 0,
          facing: 0,
          form: 0,
        }
        projection.x = (world.x + 1) / 2
        projection.y = (-world.y + 1) / 2
        projection.facing = front
        projection.form = labelFormAt(waypointSeeds[i], labelP)
        waypointProjectionRef.current[i] = projection
      }
    }

    if (chipProjectionRef) {
      for (let i = 0; i < chipPoints.length; i++) {
        world.copy(chipPoints[i]).applyMatrix4(group.matrixWorld)
        normal.copy(world).normalize()
        toCam.copy(camera.position).sub(world).normalize()
        const front = normal.dot(toCam)
        world.project(camera)
        const projection = chipProjectionRef.current[i] ?? {
          x: 0,
          y: 0,
          facing: 0,
          form: 0,
        }
        projection.x = (world.x + 1) / 2
        projection.y = (-world.y + 1) / 2
        projection.facing = front
        projection.form = scale.phase === 'world'
          ? labelFormAt(chipSeeds[i], labelP)
          : i === scale.cluster ? 1 - ease(clamp01(scale.morph / 0.3)) : 0
        chipProjectionRef.current[i] = projection
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
        {/* during the entrance this mesh is NOT what occludes the dots — the
            shader's growing ray-test sphere is (see patchDotAlpha), and this
            mesh's radius is simply that sphere's final size. It fades in as
            a depth-silent film carrying only its near-background tint, then
            takes over depth duty once fully opaque — by which point the
            shader already hides exactly what the depth buffer will. */}
        {/* ALWAYS visible, ALWAYS transparent, and both are load-bearing.
            projectObject early-returns on invisible objects, so a mesh that
            appears mid-entrance has its shader compiled and linked mid-
            entrance; and `transparent` feeds the `opaque` program parameter,
            so flipping it later compiles a second one. Both stalls sat inside
            the gather. Nothing here needs either: opacity 0 renders as
            nothing, and the only state that has to move at the seam is
            depthWrite, which is plain GL state and free. */}
        {/* renderOrder -1: every layer here sits at the same distance (the
            group origin), so the transparent sort falls through to object id
            — which put the film OVER the dots, dimming the whole near
            hemisphere with it. The film must draw first: back dots fade by
            their own alpha, front dots stay lit on top of it. */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[RADIUS * OCCLUDER, 96, 64]} />
          <meshBasicMaterial
            ref={occluderMatRef}
            color="#17171b"
            transparent
            opacity={intro.current.phase === 'done' ? 1 : 0}
            depthWrite={intro.current.phase === 'done'}
          />
        </mesh>

        {/* Dense country-scale relief. It is mounted and compiled from frame
            one with zero aAlpha, then the S4 CPU wave condenses the same
            position/aPlate buffer outward from the chosen centroid. */}
        <points geometry={plateLayer.geometry} renderOrder={1}>
          <pointsMaterial
            size={0.009}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={0.86}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>

        {/* the graticule — dots now, in the same buffer family as the land and
            riding the same wave, so it is part of what the sweep assembles
            rather than a line layer that fades up on a clock of its own. Dimmer
            and smaller than the sea: it is a ruler laid over the drawing. */}
        <points geometry={grid.geometry}>
          <pointsMaterial
            size={0.008}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={0.3}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>

        {/* opacity nudged up for the planet-scale hero: at half-viewport size
            0.16 read as texture, at full height the ocean read as a void */}
        <points geometry={sea.geometry}>
          <pointsMaterial
            size={0.011}
            color="#9a9189"
            sizeAttenuation
            transparent
            opacity={0.18}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>
        {/* interior land: subordinate fill, so the shapes have body without
            every dot shouting at coastline volume */}
        <points geometry={shell.geometry}>
          <pointsMaterial
            size={0.012}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={0.62}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>
        {/* the coastlines: full-brightness dots one row deep along every
            land/sea boundary — the layer that makes the continents readable */}
        <points geometry={coast.geometry}>
          <pointsMaterial
            size={0.014}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>
        {/* The route: the one continuous line in a composition made of dots,
            and kept that way on purpose. LineBasicMaterial resolves to the
            `basic` shader, which carries the same <common> and <project_vertex>
            and <color_fragment> hooks the points shader does — so the exact
            same patch gives the arcs per-vertex development AND the live
            ray-test occlusion they never had. That second half is what let the
            route stop waiting for the body to write depth, which is what let it
            stop being a separate beat. */}
        {arcs && (
          <lineSegments geometry={arcs.geometry}>
            <lineBasicMaterial
              color="#ff2d1a"
              transparent
              opacity={0.75}
              depthWrite={false}
              onBeforeCompile={patchDotAlpha}
            />
          </lineSegments>
        )}
      </group>
    </>
  )
}

export default Globe
