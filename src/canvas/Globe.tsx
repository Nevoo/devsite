import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { prefersReducedMotion } from '@/motion/gsap'
import { isLand } from '@/content/land-mask'
import { useUI } from '@/stores/ui'
import { DETAIL, FLAT_OCC, MORPH, OCC_RADIUS, PLATE_NORMAL, patchDotAlpha, patchPlateDots } from './shaders/globe'
import { loadBorders } from './borders'
import GlobeSurface from './GlobeSurface'
import { heroVisibility } from './heroVisibility'
import type { BorderPolyline } from './borders'
import { loadCountries } from './countries'
import type { CountryAtlas } from './countries'
import {
  BORDER_POINT_BUDGET,
  COUNTRY_CURVATURE,
  PLATE_RELIEF_EXAGGERATION,
  countryCameraZoom,
  countryFrameLayout,
  countrySurfacePointInto,
  FIORD_REACH,
  ISLAND_REACH,
  MIN_CAP_RADIUS,
  MIN_SPREAD,
  PLATE_CAMERA_ELEVATION,
  PLATE_CAMERA_FOV_DEGREES,
  PLATE_CAMERA_POSITION,
  PLATE_GRID_CAPACITY,
  PLATE_GROUP_ROLL,
  PLATE_LANDED_PAN_TILT,
  PLATE_SAMPLE_MARGIN,
  PLATE_TABLE_TILT,
  PLATE_TABLE_YAW,
  PLATE_TERRAIN_CAPACITY,
  REFERENCE_WINDOW_HEIGHT,
  REFERENCE_WINDOW_WIDTH,
  TERRAIN_ELEVATION_CEILING_M,
  TOWN_RING_RADIUS,
  fitPlateFrame,
  heroGlobeViewport,
  latLngToVec3,
  plateBasis,
  plateBorderSpacing,
  plateFrameLight,
  plateGridBudget,
  plateHillshade,
  plateTerrainBudget,
  plateTerrainSlopeInto,
  precisionReach,
} from './plate'
import type { PlateFrameMember, PlateLight, PlateViewport, Vec3 } from './plate'
import type { Terrain } from '@/content/terrain'
import type { PlacePrecision } from '@/content/places'

/** live projected state of one pin, written every frame, read by the DOM half */
export interface PinProjection {
  /** 0..1 across the tracked frame */
  x: number
  y: number
  /** 1 = facing the camera, 0 = edge on, <0 = round the back */
  facing: number
  /** Intro formation; selected geographic anchors stay present during approach. */
  form: number
}

export type ScalePhase = 'world' | 'dive' | 'plate' | 'return'

/** The one mutable scale contract shared across the DOM/canvas boundary. */
export interface ScaleState {
  phase: ScalePhase
  cluster: number
  morph: number
  /** 0 at world, 1 at the landed table; every DOM transition reads this. */
  presence: number
  /** Compatibility alias for presence; country detail has no scan clock. */
  scan: number
}

/** Plain deployment data passed into the lazy globe chunk, never store state. */
export interface GlobeCluster {
  /** ISO-3166 alpha-2 — a cluster IS a country (v3), and the world-scale
   *  pointer resolves against this through the country atlas */
  countryCode: string
  memberIndices: number[]
  centroid: Vec3
  centroidLatLng: readonly [number, number]
  totalFrameCount: number
  congestedSingleton: boolean
}

/** The DOM's pointer over the globe frame, in frame-relative 0..1. */
export interface GlobePointer {
  x: number
  y: number
  active: boolean
}

interface GlobeProps {
  /** [lat, lng] per pin, in the same order as the DOM labels */
  pins: [number, number][]
  /** declared spatial authority per pin; the plate renders exactly this, never more */
  precisions: PlacePrecision[]
  /**
   * frames placed at each pin. Not drawn — this is the opening-view weighting:
   * the sphere wakes facing the side of the world that actually holds the
   * archive, instead of whichever place happens to be first in the array.
   */
  weights?: number[]
  /** DOM-selected representatives: one visible photographic stop per country. */
  worldTour?: readonly number[]
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
  /** pointer-drag angular velocity about Y, radians/second */
  spinRef: { current: number }
  /** pointer-drag angular velocity about X, radians/second */
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
  /** DOM-written pointer over the frame; the canvas resolves it to a country */
  pointerRef?: { current: GlobePointer }
  /** canvas-written: cluster index of the visited country under the pointer,
   *  or -1. The DOM reads it for the cursor and for click-anywhere-to-dive. */
  hoverCountryRef?: { current: number }
  /** Called after the camera and every geographic projection are current. */
  onProjectRef?: { current: ((delta: number) => void) | null }
  viewportRef?: { current: { rect: DOMRect | null; scrollY: number } }
}

const RADIUS = 1
/* stable identities for omitted list props — fresh literals would bust memos */
const NO_LEGS: [[number, number], [number, number]][] = []
const NO_WAYPOINTS: [number, number][] = []
const NO_CLUSTERS: GlobeCluster[] = []
const COARSE_TERRAIN: Terrain = {
  width: 360, height: 180, data: new Uint8Array(0),
  landAt: isLand, elevationAt: () => 0,
}

/* countryFrameLayout branches on window width alone; only its focus fields are
   safe to read from this cache, since frameOptions.viewport goes stale */
let frameLayoutCache: { width: number; layout: ReturnType<typeof countryFrameLayout> } | null = null
const cachedCountryFrameLayout = (viewport: PlateViewport) => {
  if (!frameLayoutCache || frameLayoutCache.width !== viewport.windowWidth) {
    frameLayoutCache = { width: viewport.windowWidth, layout: countryFrameLayout(viewport) }
  }
  return frameLayoutCache.layout
}

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
const PLATE_POINTS = PLATE_TERRAIN_CAPACITY + PLATE_GRID_CAPACITY
/* The framing vocabulary — spread bounds, cap bounds, the landed pose, the
   visible window, box fill, the usable rect's margins, the dot budget and
   precision reach — lives in plate.ts beside the fit that consumes it, so
   `scripts/plate-gate.mjs` measures the numbers that actually ship instead of
   a copy of them. Anything here that the camera or the table's rake depends on
   is imported, never redeclared: two homes for the tilt is how the gate ended
   up measuring a rake the render path was not using. */
/**
 * The GEOMETRIC lift: how far a dot rises off the plate for its elevation
 * (`ELEVATION_UNIT` per unit, exaggerated). Kept exactly as it shipped — it is
 * the subtle 3D of a relief model, and it is not the channel stage C replaces.
 * The lamp's own gain is PLATE_RELIEF_EXAGGERATION in plate.ts, which tilts
 * NORMALS rather than lifting dots; two different jobs, two numbers.
 */
const EXAGGERATION = 10
const ELEVATION_UNIT = 0.012
const ENTER_DUR = 1.6
const STEER_DUR = 0.34
const RETURN_DUR = 1.1
/** Camera, surface, detail and captions evaluate this one reversible path. */
const SURFACE_START = 0.42
const SURFACE_END = 0.96
const journeyMorph = (progress: number) =>
  ease(clamp01((progress - SURFACE_START) / (SURFACE_END - SURFACE_START)))
const journeyDolly = (progress: number) => ease(clamp01((progress - 0.1) / 0.9))
const journeyDetail = (progress: number) => smoothstep(0.48, 0.98, progress)
/**
 * How much of the morph keeps the sphere's own occlusion. The old release was
 * linear in morph, which uncovered the far side while the globe still read as
 * a globe. Holding occlusion until the unfold is well underway means back-side
 * dots emerge only once they are already flying outward past the limb — the
 * fly-past parallax of a camera moving INTO the planet, not a shell going
 * transparent.
 */
const OCC_HOLD = 0.45
const flatOccFor = (morph: number) =>
  1 - ease(clamp01((morph - OCC_HOLD) / (1 - OCC_HOLD)))
const PAN_MARGIN = 0.06
const SEA_SAMPLE_RATE = 0.18

/** One rendered dot across keeps the town mark a ring instead of a filled disc. */
const TOWN_RING_HALF_WIDTH = 0.006
/** Venue authority earns a tight knot, dense enough to exist despite random fill. */
const VENUE_POINT_COUNT = 24
/** About eight kilometres of jitter makes a visible knot without implying a district. */
const VENUE_JITTER = 0.0012
/** Natural terrain inside this short reach joins the seeded venue knot. */
const VENUE_REACH = 0.0024
/**
 * The sign convention on aTint, in one number. Positive is a scarlet mark;
 * NEGATIVE is a neutral brightness lift, which is what a country or region
 * claim gets: broad precision is a claim about knowledge, and painting a whole
 * country in the accent said "error" (§9.4). The magnitude is the wash's
 * strength against WASH_LIFT in the fragment.
 */
const BROAD_PRECISION_LIFT = -0.35
/**
 * Rest-state tint on a visited country's land dots — the world scale showing
 * "where I've been" at a glance. This shipped as a neutral brightness lift
 * (the §9.4 "scarlet reads error" ruling), and Rouven overruled it on the
 * stills (2026-08-21): the visited countries should carry the accent so the
 * important ground is legible instantly. POSITIVE aTint is the mark channel —
 * the fragment mixes the dot toward uAccent by this fraction, so the land
 * reads warm ember, not error-red paint. Written once when the country atlas
 * arrives, never per frame — world aTint has no other writer. 0.55 read
 * correct up close but shy at the full horizon view; 0.7 is the first value
 * where the visited ground registers at a glance. The knob is one number.
 */
const WORLD_VISITED_TINT = 0.7
/* ---------- the hover stroke ----------
   A visited country under the pointer draws its admin-0 outline as a run of
   dots — the same plotted-stroke DNA as the plate's figure, at world scale.
   Rings come from countries.bin; the buffer is fixed and refilled per hover. */
const COUNTRY_STROKE_POINTS = 2048
/** radians of arc between stroke dots — finer than the 1.07° land pitch */
const COUNTRY_STROKE_PITCH = 0.008
/** a hair above the dot shell so the stroke never z-mingles with the coast */
const COUNTRY_STROKE_RADIUS = 1.004
/** seconds the draw front takes to run the full outline in */
const COUNTRY_STROKE_DRAW = 0.45
/** each dot's own arrival window, as a fraction of the whole draw */
const COUNTRY_STROKE_RAMP = 0.25
const COUNTRY_STROKE_ALPHA = 0.85
/* ---------- the rest-state outlines (v4) ----------
   "Where I've been" must be legible BEFORE any pointer arrives: every visited
   country wears its outline at rest, quiet, one register under the hover
   stroke that brightens over it. One fixed buffer for all countries, filled
   once when the atlas lands; the pitch stretches to fit the budget, so the
   set of visited countries can grow without the buffer chasing it. */
const REST_STROKE_POINTS = 8192
/** ambient state, not a claim being presented — well under the hover stroke */
const REST_STROKE_ALPHA = 0.32
/** a hair under the hover stroke's radius, so the two never z-fight */
const REST_STROKE_RADIUS = 1.003
/** Reseeding yields before it can monopolise a frame under CPU throttling. */
const RESEED_SLICE_MS = 6

const PRECISION_VENUE = 1
const PRECISION_TOWN = 2
const PRECISION_ISLAND = 3
const PRECISION_FIORD = 4
const PRECISION_COUNTRY = 5
const PRECISION_REGION = 6

const PLATE_FILL = 1
const PLATE_COAST = 2
const PLATE_SEA = 3
const PLATE_GRID = 4
/** the plotted outline: border and coastline as one stroke, drawn by the front */
const PLATE_BORDER = 5
/**
 * The top of the terrain ladder, and the whole reason it has a top: the stroke
 * settles at 1.0 and has to be the brightest thing on the table (§6, figure
 * layer 1). Without a ceiling the single highest relief dot in an alpine cap
 * settles at 1.0 too and ties the outline it is supposed to sit under.
 */
/**
 * Terrain-derived coast dots keep existing — they are dense shore texture, and
 * on a coastal cap they are where the land actually stops — but they stop
 * claiming to BE the edge. borders.bin draws the edge now, one dot wide; two
 * bright shorelines on top of each other is a double-drawn stroke, so this
 * demotes the terrain one toward the fill ladder and leaves the plotted stroke
 * alone at the top. Judged on stills; the other half of the knob is
 * BORDER_SETTLED_ALPHA.
 */
const PLATE_COAST_SETTLED_ALPHA = 0.75
/** The stroke's settled alpha. Full value, full shade, no tint: bone. */
const BORDER_SETTLED_ALPHA = 1
/** One dot wide. The stroke is the finest mark on the plate, never a fattened one. */
const BORDER_POINT_SCALE = 1

/* ---------- the footprint ladder ----------

   Size is no longer the relief channel (§2.4). Perspective already owns size —
   the 36° rake varies every dot's footprint across the table by more than
   elevation ever did — so relief moved onto brightness (the lamp, in the
   'relief' stage below) and each ground class now has ONE fixed footprint.

   The ceiling is the stroke's. Stage B left fill dots peaking at 1.71 while the
   outline they are supposed to sit under drew at 1.0: the figure was the
   thinnest thing on the table. Every class below is clamped against
   BORDER_POINT_SCALE rather than merely written under it, so the invariant
   "the stroke is the brightest and the joint-largest family" cannot be broken
   by editing a literal. */
const PLATE_FILL_POINT_SCALE = Math.min(1, BORDER_POINT_SCALE)
/** Shore texture sits with the fill; the plotted stroke is the shoreline now. */
const PLATE_COAST_POINT_SCALE = Math.min(1, BORDER_POINT_SCALE)
/** Sea is near-absent by §6, in footprint as well as in value. */
const PLATE_SEA_POINT_SCALE = Math.min(0.58, BORDER_POINT_SCALE)
/** The graticule stays instrument-quiet: present, never competing. */
const PLATE_GRID_POINT_SCALE = Math.min(0.66, BORDER_POINT_SCALE)
/* The stroke's grain — BORDER_SPACING_PITCHES and plateBorderSpacing — lives
   in plate.ts beside the dot budget, for the reason every other density number
   does: the gate prices the stroke against the same buffer the landing spends,
   and one home is what keeps those two numbers the same number. */
/** Along-track only, as a fraction of the spacing: a hand-plotted stroke, not a scatter. */
const BORDER_JITTER_PITCHES = 0.18
/**
 * How far ahead of the terrain at the same radius the stroke develops, in
 * develop units (the front crosses the whole plate in 0.62 of them, and one
 * dot's arrival ramp is 0.38). At 0.2 the outline is a third of a plate ahead
 * of the ground: the scan front leaves the figure behind it and the terrain
 * fills in a beat later, which is the 0.8s/1.2s reading of §5. Applied as a
 * NEGATIVE lag, so the return wave inherits it and the outline unplots one
 * beat ahead of the ground it drew.
 */

/**
 * How long the outline stage holds the reseed waiting for borders.bin before
 * it lands the ground without a figure, in milliseconds.
 *
 * The peel is pinned at zero until the cursor finishes, so this wait costs the
 * visitor a held sphere, not a broken landing — and a 50KB asset that was
 * prefetched at idle only ever misses this window on a cold cache. Past the
 * bound the ground lands anyway (a stalled dive is worse than a late figure)
 * and the stroke is retrofitted into its reserved slots when the asset
 * arrives, so no branch here can end with a landed plate that has no outline.
 */

/** seconds a place stays front-and-centre with its card open before the next */
const HOLD = 4.6

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
let terrainPrefetchScheduled = false

/** Warm the lazy terrain module and its memoized fetch after the globe exists,
 *  and the borders asset beside it. The real dive awaits the same two
 *  promises, so this never touches plate state and cannot start a second
 *  request. borders.bin is ~50KB against terrain.bin's 3.6MB, so in practice
 *  the stroke's asset is resident long before the ground it is drawn on —
 *  which is what lets the reseed treat it as optional rather than await it. */
const schedulePlateAssetPrefetch = () => {
  if (terrainPrefetchScheduled) return
  terrainPrefetchScheduled = true
  const warm = () => {
    void import('@/content/terrain')
      .then((terrainModule) => terrainModule.loadTerrain())
      .catch(() => { })
    void loadBorders().catch(() => { })
    void loadCountries().catch(() => { })
  }
  if (window.requestIdleCallback) {
    window.requestIdleCallback(warm, { timeout: 2000 })
  } else {
    globalThis.setTimeout(warm, 2000)
  }
}

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
  /** [lat, lng] degrees per dot for country-bearing layers, else null. The
   *  generation loop has these in hand and used to throw them away (v3 §2). */
  homeLatLng: Float32Array | null
  /** admin-0 mask id per dot, filled once when the country atlas arrives */
  countryId: Uint8Array | null
}

interface PlateLayer extends DotLayer {
  /** projected ground before relief is added */
  flat: Float32Array
  /** normalized terrain height, or zero for graticule samples */
  elevation: Float32Array
  /** plate fill/coast/sea/grid classification */
  kind: Uint8Array
  /** shader-side footprint and tonal hierarchy, fixed for one reseed */
  pointScale: Float32Array
  shade: Float32Array
  /** soft cap-edge envelope; the zero rim is deliberately beyond the viewport */
  edgeAlpha: Float32Array
  /** precision authority decided once per dive, before the live develop mirror */
  targetTint: Float32Array
  /** the aTint attribute's live array, rewritten beside aAlpha and nothing else */
  tint: Float32Array
  /** active plate normal, rewritten once per enter */
  normal: Float32Array
  sphereNormal: Float32Array
  terrainNormal: Float32Array
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0))
  return x * x * (3 - 2 * x)
}

const angularDistance = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
  Math.acos(THREE.MathUtils.clamp(ax * bx + ay * by + az * bz, -1, 1))

type MutableNumericArray = Float32Array | Float64Array

/** Allocation-free mirror of plateProject for the sliced reseed hot path. */
const plateProjectInto = (
  dx: number,
  dy: number,
  dz: number,
  centroid: Vec3,
  spread: number,
  target: MutableNumericArray,
  offset: number
) => {
  const directionLength = Math.hypot(dx, dy, dz) || 1
  dx /= directionLength
  dy /= directionLength
  dz /= directionLength
  const centroidLength = Math.hypot(centroid[0], centroid[1], centroid[2]) || 1
  const cx = centroid[0] / centroidLength
  const cy = centroid[1] / centroidLength
  const cz = centroid[2] / centroidLength
  const alignment = THREE.MathUtils.clamp(dx * cx + dy * cy + dz * cz, -1, 1)
  const alpha = Math.acos(alignment)
  if (alpha <= 1e-12) {
    target[offset] = cx
    target[offset + 1] = cy
    target[offset + 2] = cz
    return
  }

  let tx = dx - cx * alignment
  let ty = dy - cy * alignment
  let tz = dz - cz * alignment
  let tangentLength = Math.hypot(tx, ty, tz)
  if (tangentLength <= 1e-12) {
    let ax = 0
    let ay = 0
    let az = 0
    if (Math.abs(cx) < Math.abs(cy)) {
      if (Math.abs(cx) < Math.abs(cz)) ax = 1
      else az = 1
    } else if (Math.abs(cy) < Math.abs(cz)) ay = 1
    else az = 1
    tx = cy * az - cz * ay
    ty = cz * ax - cx * az
    tz = cx * ay - cy * ax
    tangentLength = Math.hypot(tx, ty, tz) || 1
  }
  const scale = (alpha * spread) / tangentLength
  target[offset] = cx + tx * scale
  target[offset + 1] = cy + ty * scale
  target[offset + 2] = cz + tz * scale
  countrySurfacePointInto(target, offset, centroid, spread, alpha)
}

const latLngToDirectionInto = (
  lat: number,
  lng: number,
  target: MutableNumericArray,
  offset: number
) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  target[offset] = -Math.sin(phi) * Math.cos(theta)
  target[offset + 1] = Math.cos(phi)
  target[offset + 2] = Math.sin(phi) * Math.sin(theta)
}

/**
 * One Liang-Barsky edge test against a parametric range held in `range` as
 * [t0, t1], narrowed in place. Returns false when the segment is wholly
 * outside this edge, which is the answer the outline sampler actually wants:
 * "is there any of this line on the table at all".
 */
const clipRange = (p: number, q: number, range: Float64Array) => {
  if (p === 0) return q >= 0
  const t = q / p
  if (p < 0) {
    if (t > range[1]) return false
    if (t > range[0]) range[0] = t
  } else {
    if (t < range[0]) return false
    if (t < range[1]) range[1] = t
  }
  return true
}

/** The same direction, from RADIANS — what borders.bin decodes to. */
const latLonRadToDirectionInto = (
  lat: number,
  lon: number,
  target: MutableNumericArray,
  offset: number
) => {
  const phi = Math.PI / 2 - lat
  const theta = lon + Math.PI
  target[offset] = -Math.sin(phi) * Math.cos(theta)
  target[offset + 1] = Math.cos(phi)
  target[offset + 2] = Math.sin(phi) * Math.sin(theta)
}

const wrapLongitude = (lng: number) => {
  const wrapped = ((lng + 180) % 360 + 360) % 360 - 180
  return Object.is(wrapped, -0) ? 0 : wrapped
}

const precisionCode = (precision: PlacePrecision) => {
  switch (precision) {
    case 'venue': return PRECISION_VENUE
    case 'town': return PRECISION_TOWN
    case 'island': return PRECISION_ISLAND
    case 'fiord': return PRECISION_FIORD
    case 'country': return PRECISION_COUNTRY
    case 'region': return PRECISION_REGION
  }
  return 0
}

interface RandomCursor {
  randomState: number
}

const nextReseedRandom = (cursor: RandomCursor) => {
  let state = cursor.randomState
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  cursor.randomState = state >>> 0
  return cursor.randomState / 0x1_0000_0000
}

/** Geometry is prepared once; every dot rides the common surface in GLSL. */
function formPlateLayer(_layer: PlateLayer, detail: number) {
  DETAIL.value = detail
}

/** Bake immutable endpoints and settled tone when a reseed/relief update lands. */
function settlePlateLayer(layer: PlateLayer, zoom: number) {
  const position = layer.geometry.getAttribute('position').array as Float32Array
  for (let i = 0; i < layer.alpha.length; i++) {
    const j = i * 3
    const relief = layer.elevation[i] * ELEVATION_UNIT * EXAGGERATION / zoom
    for (let axis = 0; axis < 3; axis++) {
      position[j + axis] = layer.scatter[j + axis]
      layer.sphereNormal[j + axis] = layer.scatter[j + axis] / 1.001
      layer.plate[j + axis] = layer.flat[j + axis] + layer.normal[axis] * relief
    }
    const kind = layer.kind[i]
    if (kind === PLATE_BORDER || kind === PLATE_SEA || kind === PLATE_GRID) {
      for (let axis = 0; axis < 3; axis++) {
        layer.terrainNormal[j + axis] = layer.normal[axis] * (1 - COUNTRY_CURVATURE) +
          layer.sphereNormal[j + axis] * COUNTRY_CURVATURE
      }
    }
    const settled = kind === PLATE_BORDER ? BORDER_SETTLED_ALPHA
      : kind === PLATE_COAST ? PLATE_COAST_SETTLED_ALPHA
      : kind === PLATE_FILL ? 0.52
      : kind === PLATE_SEA ? 0.18 : kind === PLATE_GRID ? 0.2 : 0
    layer.alpha[i] = settled * layer.edgeAlpha[i]
    layer.tint[i] = layer.targetTint[i]
  }
  for (const attribute of Object.values(layer.geometry.attributes)) attribute.needsUpdate = true
}

/** Sparse cartography gives way to dense marks on the identical surface.
 * Only alpha changes while the shared vertex shader owns all position motion. */
let worldPlateFadeWritten = -1
function formWorldPlate(layers: readonly DotLayer[], progress: number) {
  const fade = progress > 0 ? DETAIL.value : 0
  if (fade === worldPlateFadeWritten) return
  worldPlateFadeWritten = fade
  for (const layer of layers) {
    const { alpha } = layer
    for (let i = 0; i < alpha.length; i++) {
      alpha[i] = 1 - fade
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
  precisions,
  weights,
  worldTour,
  legs = NO_LEGS,
  waypoints = NO_WAYPOINTS,
  waypointProjectionRef,
  projectionRef,
  activeRef,
  selectedRef,
  spinRef,
  tiltRef,
  clusters = NO_CLUSTERS,
  chipProjectionRef,
  scaleRef,
  enterRef,
  exitRef,
  pointerRef,
  hoverCountryRef,
  onProjectRef,
  viewportRef,
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
    const edgeLL: number[] = []
    const fillLL: number[] = []
    for (let i = 0; i < SHELL_POINTS; i++) {
      const p = fibonacci(i, SHELL_POINTS)
      if (p.lat < ANTARCTIC) continue
      if (!isLand(p.lat, p.lng)) continue
      const coastDot = isCoast(p.lat, p.lng)
        ; (coastDot ? edge : fill).push(p.x * RADIUS, p.y * RADIUS, p.z * RADIUS)
        ; (coastDot ? edgeLL : fillLL).push(p.lat, p.lng)
    }
    const water: number[] = []
    for (let i = 0; i < SEA_POINTS; i++) {
      const p = fibonacci(i, SEA_POINTS)
      if (!isLand(p.lat, p.lng)) water.push(p.x * RADIUS, p.y * RADIUS, p.z * RADIUS)
    }
    const entering = intro.current.phase !== 'done'
    const build = (values: number[], latLng: number[] | null = null): DotLayer => {
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
        homeLatLng: latLng ? new Float32Array(latLng) : null,
        countryId: latLng ? new Uint8Array(n) : null,
      }
    }
    return [build(edge, edgeLL), build(fill, fillLL), build(water), build(graticulePoints())]
  }, [])
  const layers = useMemo(() => [coast, shell, sea, grid] as const, [coast, shell, sea, grid])

  /* One resident dense layer: immutable sphere/patch endpoints, shader-owned
     interpolation and one shared detail uniform. No per-frame vertex uploads. */
  const plateLayer = useMemo<PlateLayer>(() => {
    const home = new Float32Array(PLATE_POINTS * 3)
    const position = new Float32Array(PLATE_POINTS * 3)
    const plate = new Float32Array(PLATE_POINTS * 3)
    const sphereNormal = new Float32Array(PLATE_POINTS * 3)
    const terrainNormal = new Float32Array(PLATE_POINTS * 3)
    const alpha = new Float32Array(PLATE_POINTS)
    const tint = new Float32Array(PLATE_POINTS)
    const pointScale = new Float32Array(PLATE_POINTS)
    const shade = new Float32Array(PLATE_POINTS)
    const geometry = new THREE.BufferGeometry()
    const positionAttribute = new THREE.BufferAttribute(position, 3)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    geometry.setAttribute('aPlate', new THREE.BufferAttribute(plate, 3))
    geometry.setAttribute('aSphereNormal', new THREE.BufferAttribute(sphereNormal, 3))
    geometry.setAttribute('aTerrainNormal', new THREE.BufferAttribute(terrainNormal, 3))
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
    geometry.setAttribute('aPointScale', new THREE.BufferAttribute(pointScale, 1))
    geometry.setAttribute('aShade', new THREE.BufferAttribute(shade, 1))
    return {
      geometry,
      home,
      plate,
      sphereNormal,
      terrainNormal,
      scatter: new Float32Array(PLATE_POINTS * 3),
      seeds: new Float32Array(PLATE_POINTS),
      alpha,
      plateDistance: new Float32Array(PLATE_POINTS),
      flat: new Float32Array(PLATE_POINTS * 3),
      elevation: new Float32Array(PLATE_POINTS),
      kind: new Uint8Array(PLATE_POINTS),
      pointScale,
      shade,
      edgeAlpha: new Float32Array(PLATE_POINTS),
      targetTint: new Float32Array(PLATE_POINTS),
      tint,
      normal: new Float32Array(3),
      homeLatLng: null,
      countryId: null,
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

  /* ---------- the country atlas (v3 phase 2) ----------
     One fetched asset gives the world scale its three country behaviours:
     per-dot visited lift, pointer→country resolution, and the hover stroke's
     rings. The atlas ref is filled by the effect below; everything else reads
     it transiently and stays inert until it exists. */
  const countryAtlasRef = useRef<CountryAtlas | null>(null)
  const clusterIndexByCode = useMemo(
    () => new Map(clusters.map((cluster, index) => [cluster.countryCode, index])),
    [clusters]
  )

  /** fixed hover-stroke buffer; refilled per hovered country, drawn by range */
  const countryStroke = useMemo(() => {
    const position = new Float32Array(COUNTRY_STROKE_POINTS * 3)
    const alpha = new Float32Array(COUNTRY_STROKE_POINTS)
    const geometry = new THREE.BufferGeometry()
    const positionAttribute = new THREE.BufferAttribute(position, 3)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    /* aPlate shares the position array, so the shared uMorph uniform is a
       no-op for the stroke — same trick as plateLayer's attribute shape. */
    geometry.setAttribute('aPlate', positionAttribute)
    geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(COUNTRY_STROKE_POINTS), 1))
    geometry.setDrawRange(0, 0)
    return { geometry, position, alpha, seeds: new Float32Array(COUNTRY_STROKE_POINTS) }
  }, [])
  /** hover choreography state — cluster under pointer, draw clock, fade */
  const hoverStroke = useRef({ cluster: -1, count: 0, clock: 0, fade: 0, lit: false })

  /** the rest-state outlines: every visited country's rings, in one buffer */
  const restStroke = useMemo(() => {
    const position = new Float32Array(REST_STROKE_POINTS * 3)
    const alpha = new Float32Array(REST_STROKE_POINTS)
    const geometry = new THREE.BufferGeometry()
    const positionAttribute = new THREE.BufferAttribute(position, 3)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    /* aPlate shares the position array — uMorph is a no-op, like the hover
       stroke; the dive hides this layer with alpha, not with the morph */
    geometry.setAttribute('aPlate', positionAttribute)
    geometry.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(REST_STROKE_POINTS), 1))
    geometry.setDrawRange(0, 0)
    return { geometry, position, alpha }
  }, [])
  /** written dots, and the one damped presence the frame loop drives */
  const restStrokeState = useRef({ count: 0, fade: 0, written: -1 })

  /* stroke-walk scratch — both fillers are synchronous, so one set serves both */
  const strokeScratch = useMemo(
    () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] as const,
    []
  )

  /** all visited countries' rings at an adaptive pitch; runs once per atlas */
  const fillRestStrokes = () => {
    const atlas = countryAtlasRef.current
    if (!atlas) return
    const [a, b, p] = strokeScratch
    const deg = 180 / Math.PI
    /* first pass: the total arc of every visited outline, so the pitch can
       stretch to make the whole set fit the fixed budget */
    let totalArc = 0
    for (const cluster of clusters) {
      const rings = atlas.outlines.get(cluster.countryCode)
      if (!rings) continue
      for (const ring of rings) {
        for (let v = 0; v + 3 < ring.length; v += 2) {
          a.copy(toVec3(ring[v] * deg, ring[v + 1] * deg, 1))
          b.copy(toVec3(ring[v + 2] * deg, ring[v + 3] * deg, 1))
          totalArc += Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
        }
      }
    }
    if (!(totalArc > 0)) return
    const pitch = Math.max(COUNTRY_STROKE_PITCH, totalArc / (REST_STROKE_POINTS - 1))
    const { position } = restStroke
    let n = 0
    for (const cluster of clusters) {
      const rings = atlas.outlines.get(cluster.countryCode)
      if (!rings) continue
      for (const ring of rings) {
        for (let v = 0; v + 3 < ring.length; v += 2) {
          a.copy(toVec3(ring[v] * deg, ring[v + 1] * deg, 1))
          b.copy(toVec3(ring[v + 2] * deg, ring[v + 3] * deg, 1))
          const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
          if (omega < 1e-5) continue
          const steps = Math.max(1, Math.round(omega / pitch))
          for (let s = 0; s < steps && n < REST_STROKE_POINTS; s++) {
            p.copy(a).lerp(b, s / steps).setLength(RADIUS * REST_STROKE_RADIUS)
            const j = n * 3
            position[j] = p.x
            position[j + 1] = p.y
            position[j + 2] = p.z
            n++
          }
        }
      }
    }
    restStrokeState.current.count = n
    restStrokeState.current.written = -1
    restStroke.geometry.setDrawRange(0, n)
      ; (restStroke.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }
  /* pointer-resolution temps, allocated once — the frame loop stays clean */
  const [hoverRaycaster, hoverNdc, hoverSphere, hoverHit, hoverLatLng] = useMemo(
    () =>
      [
        new THREE.Raycaster(),
        new THREE.Vector2(),
        new THREE.Sphere(new THREE.Vector3(), RADIUS),
        new THREE.Vector3(),
        new Float64Array(2),
      ] as const,
    []
  )

  /** walk a country's rings at the stroke pitch; returns dots written */
  const fillCountryStroke = (code: string) => {
    const atlas = countryAtlasRef.current
    const rings = atlas?.outlines.get(code)
    if (!rings) return 0
    const { position, seeds } = countryStroke
    const [a, b, p] = strokeScratch
    const deg = 180 / Math.PI
    let n = 0
    let arc = 0
    for (const ring of rings) {
      for (let v = 0; v + 3 < ring.length; v += 2) {
        a.copy(toVec3(ring[v] * deg, ring[v + 1] * deg, 1))
        b.copy(toVec3(ring[v + 2] * deg, ring[v + 3] * deg, 1))
        const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
        if (omega < 1e-5) continue
        const steps = Math.max(1, Math.round(omega / COUNTRY_STROKE_PITCH))
        for (let s = 0; s < steps && n < COUNTRY_STROKE_POINTS; s++) {
          const t = s / steps
          // segments are a fraction of a degree post-decimation: lerp+normalize
          // is indistinguishable from slerp at this pitch
          p.copy(a).lerp(b, t).setLength(RADIUS * COUNTRY_STROKE_RADIUS)
          const j = n * 3
          position[j] = p.x
          position[j + 1] = p.y
          position[j + 2] = p.z
          seeds[n] = arc + omega * t
          n++
        }
        arc += omega
      }
    }
    if (arc > 0) for (let i = 0; i < n; i++) seeds[i] /= arc
    countryStroke.geometry.setDrawRange(0, n)
      ; (countryStroke.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    return n
  }

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
  /* Scratch is sized once with the deployment data and reused by every slice;
     neither a rejected terrain candidate nor a resumed frame allocates. */
  const reseedMemberDirections = useMemo(
    () => new Float32Array(pinPoints.length * 3),
    [pinPoints]
  )
  const reseedMemberPrecisions = useMemo(() => new Uint8Array(pinPoints.length), [pinPoints])
  const reseedVenueMembers = useMemo(() => new Int16Array(pinPoints.length), [pinPoints])
  const reseedDirection = useMemo(() => new Float64Array(3), [])
  const reseedLngRanges = useMemo(() => new Float64Array(4), [])
  /* The outline's scratch: the window probe (x, y, angular distance) for the
     candidate and for a segment's two ends, and one direction to project. */
  const reseedWindow = useMemo(() => new Float64Array(3), [])
  const borderWindowA = useMemo(() => new Float64Array(3), [])
  const borderWindowB = useMemo(() => new Float64Array(3), [])
  /** a segment's two endpoint directions, back to back */
  const borderEnds = useMemo(() => new Float64Array(6), [])
  /** the clipped [t0, t1] of the segment under the cursor */
  const borderRange = useMemo(() => new Float64Array(2), [])
  /* The lamp's scratch. Where each accepted ground dot was SAMPLED, kept so the
     'relief' stage can ask the elevation grid for that dot's neighbourhood a
     slice later: the hillshade needs the four cells around a dot, and a dot's
     projected position on the table cannot be inverted back to a grid cell
     cheaply enough to do it per dot. Two floats per dot buys the whole lamp. */
  const reliefSampleLat = useMemo(() => new Float32Array(PLATE_POINTS), [])
  const reliefSampleLng = useMemo(() => new Float32Array(PLATE_POINTS), [])
  /** one dot's [∂z/∂east, ∂z/∂north], rewritten in place per dot */
  const reliefSlope = useMemo(() => new Float64Array(2), [])

  useEffect(
    () => () => {
      coast.geometry.dispose()
      shell.geometry.dispose()
      sea.geometry.dispose()
      grid.geometry.dispose()
      plateLayer.geometry.dispose()
      arcs?.geometry.dispose()
      countryStroke.geometry.dispose()
      restStroke.geometry.dispose()
    },
    [coast, shell, sea, grid, plateLayer, arcs, countryStroke, restStroke]
  )

  /* the entrance's one hand on the body: its tint. The mesh is visible and
     depth-silent from the first frame — visible so its program compiles at
     mount rather than mid-gather, depth-silent so no naked black sphere ever
     sits in front of the dust. Only `depthWrite` moves at the seam. */
  const occluderMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const plateMaterialRef = useRef<THREE.PointsMaterial>(null)
  const cameraCenter = useMemo(() => new THREE.Vector3(), [])
  const worldCameraPosition = useMemo(() => new THREE.Vector3(...PLATE_CAMERA_POSITION), [])

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
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    window.addEventListener('wheel', skip, { passive: true })
    window.addEventListener('touchstart', skip, { passive: true })
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

  const tourStops = useMemo(() => worldTour?.length
    ? worldTour : pinPoints.map((_, index) => index), [worldTour, pinPoints])
  const tourStopSet = useMemo(() => new Set(tourStops), [tourStops])

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
    let index = tourStops[0] ?? 0
    let bestScore = -Infinity
    pinPoints.forEach((p, i) => {
      if (!tourStopSet.has(i)) return
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
  }, [pinPoints, weights, tourStops, tourStopSet])

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

  type ReseedStage =
    | 'idle'
    | 'clear'
    | 'world'
    | 'pins'
    /** the plotted outline — seeded BEFORE terrain, and it sets terrain's budget */
    | 'outline'
    | 'terrain'
    | 'relief'
    | 'finalize'
    | 'done'
  const dive = useRef({
    clock: 0,
    returnClock: 0,
    /** One reversible path coordinate, independent of optional assets. */
    progress: 0,
    returnFromProgress: 0,
    entryIndex: 0,
    cameraZoom: 1,
    detail: 0,
    reliefUpgradePending: false,
    loadId: 0,
    loading: false,
    seeded: false,
    /** clear/world/pins are staged (pure CPU, no assets) — the peel may run */
    baseSeeded: false,
    /** the wave has lit at least one plate dot; the return must unplot it */
    plateDrawn: false,
    interrupted: false,
    terrain: null as Terrain | null,
    /** decoded once per session and kept: an optional input, never awaited */
    borders: null as BorderPolyline[] | null,
    reseedStage: 'idle' as ReseedStage,
    worldLayerIndex: 0,
    worldPointIndex: 0,
    pinMemberIndex: 0,
    clearPointIndex: 0,
    /* The outline cursor. It checkpoints per SEGMENT, so a 6ms slice can end
       in the middle of a polyline and the next frame picks the same polyline
       up at the same vertex with the same dash phase in hand. */
    borderPolylineIndex: 0,
    borderVertexIndex: 0,
    /** table units still to run before the next dot — the dash phase, carried
     *  across vertices so a stroke does not restack its dots at every corner */
    borderCarry: 0,
    /** dot spacing along the stroke, in table units */
    borderSpacing: 0,
    /** how many marks the stroke has actually spent, out of BORDER_POINT_BUDGET */
    borderPointCount: 0,
    /** this reseed landed without a figure and owes itself one */
    borderRetrofitPending: false,
    /** a retrofit pass is running now, over an already-seeded plate */
    borderRetrofit: false,
    terrainPointIndex: 0,
    reliefPointIndex: 0,
    /* The lamp, in the table's own east/north/up, baked when the frame is
       chosen and held for the whole reseed. Its azimuth is fixed in FRAME
       space (upper left of the window), so this vector changes with the cap
       and never with the clock: zero per-frame cost, and no chance of relief
       that swims when the visitor pans. */
    light: { east: 0, north: 0, up: 1 } as PlateLight,
    activeTerrainCount: 0,
    activeGridCount: 0,
    activePointCount: 0,
    randomState: 0,
    memberCount: 0,
    venueMemberCount: 0,
    venuePointBudget: 0,
    broadPrecision: false,
    boundsMinLat: 0,
    boundsMaxLat: 0,
    lngRangeCount: 0,
    gridStep: 1,
    startYaw: 0,
    startTilt: 0,
    sphereYaw: 0,
    sphereTilt: 0,
    plateYaw: 0,
    plateTilt: 0,
    capRadius: MIN_CAP_RADIUS,
    spread: MIN_SPREAD,
    /** the fitted frame centre: what the plate projects about and the camera
     * aims at. Not the cluster's mean, which is nowhere in particular. */
    center: [0, 0, 1] as [number, number, number],
    centerLat: 0,
    centerLng: 0,
    /* The visible window, as the fit measured it, carried into the sampler:
       the table's own east/north axes at the frame centre, and the affine map
       from a tangent offset in radians to the window in halves (±1 is the edge
       the visitor sees). The reseed spends its whole budget inside that
       rectangle instead of across a disc the camera mostly cannot see. */
    plateEast: [1, 0, 0] as [number, number, number],
    plateNorth: [0, 1, 0] as [number, number, number],
    windowX: [1, 0, 0] as [number, number, number],
    windowY: [0, 1, 0] as [number, number, number],
    sampleArea: 1,
    panYaw: 0,
    panTilt: 0,
    panTargetYaw: 0,
    panTargetTilt: 0,
  })
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      MORPH.value = 0
      DETAIL.value = 0
      FLAT_OCC.value = 1
    }
  }, [])

  /* The atlas arrives, the rest state appears: every land dot learns its
     country once, and dots in visited countries take the accent tint (the
     shader fades it out with uFlat as a dive unfolds, so the table never
     inherits it). One write, one flush — world aTint has no per-frame
     writer to fight. */
  useEffect(() => {
    void loadCountries()
      .then((atlas) => {
        if (!alive.current) return
        countryAtlasRef.current = atlas
        /* the rest-state outlines stand up with the same asset — the frame
           loop only ever fades what this wrote */
        fillRestStrokes()
        const visitedIds = new Set<number>()
        const idByCode = new Map<string, number>()
        for (let i = 0; i < atlas.codes.length; i++) idByCode.set(atlas.codes[i], i + 1)
        for (const cluster of clusters) {
          const id = idByCode.get(cluster.countryCode) ?? 0
          if (id > 0) visitedIds.add(id)
        }
        for (const layer of layers) {
          const { homeLatLng, countryId } = layer
          if (!homeLatLng || !countryId) continue
          const tintAttribute = layer.geometry.getAttribute('aTint') as THREE.BufferAttribute
          const tint = tintAttribute.array as Float32Array
          for (let i = 0; i < countryId.length; i++) {
            const id = atlas.idAt(homeLatLng[i * 2], homeLatLng[i * 2 + 1])
            countryId[i] = id
            tint[i] = visitedIds.has(id) ? WORLD_VISITED_TINT : 0
          }
          tintAttribute.needsUpdate = true
        }
      })
      .catch(() => { })
    // layers/clusters are mount-stable deployment data
  }, [clusters, layers])

  /* DEV-only probe surface, registered here rather than in WorldGlobe because
     this is where the buffer lives: the counts are read off the SHIPPED
     attribute arrays, not off bookkeeping, so a probe asserting on them is
     asserting about what the GPU was handed. Read-only, and gone in a
     production build (and from the DOM half's contract entirely). */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const devWindow = window as typeof window & { __plateStats?: () => unknown }
    devWindow.__plateStats = () => {
      const d = dive.current
      let borderDots = 0
      let borderLit = 0
      let fillDots = 0
      let coastDots = 0
      let seaDots = 0
      let gridDots = 0
      for (let i = 0; i < plateLayer.kind.length; i++) {
        const kind = plateLayer.kind[i]
        if (kind === PLATE_BORDER) {
          borderDots++
          if (plateLayer.alpha[i] >= 0.5) borderLit++
        } else if (kind === PLATE_FILL) fillDots++
        else if (kind === PLATE_COAST) coastDots++
        else if (kind === PLATE_SEA) seaDots++
        else if (kind === PLATE_GRID) gridDots++
      }
      return {
        phase: scaleRef.current.phase,
        cluster: scaleRef.current.cluster,
        seeded: d.seeded,
        reseedStage: d.reseedStage,
        bordersLoaded: d.borders !== null,
        borderRetrofitPending: d.borderRetrofitPending,
        borderRetrofit: d.borderRetrofit,
        borderDots,
        /** border marks actually carrying settled alpha, not merely seeded */
        borderLit,
        borderBudget: BORDER_POINT_BUDGET,
        borderSpacing: d.borderSpacing,
        terrainDots: fillDots + coastDots,
        fillDots,
        coastDots,
        seaDots,
        gridDots,
        terrainBudget: d.activeTerrainCount,
        center: [d.centerLat, d.centerLng],
        spread: d.spread,
        detail: d.detail,
      }
    }
    return () => {
      delete devWindow.__plateStats
    }
  }, [plateLayer, scaleRef])

  /* Any committed input during the positional transition resolves to the
     nearest stable end. Escape is also an explicit exit intent on the DOM
     side, so the frame loop gives that intent priority over this flag. */
  useEffect(() => {
    const interrupt = () => {
      if (scaleRef.current.phase === 'dive') dive.current.interrupted = true
    }
    const interruptKey = (event: KeyboardEvent) => {
      // A key held before the dive can keep emitting repeat keydowns after it
      // starts; that is not a newly committed input against the transition.
      if (event.repeat) return
      interrupt()
    }
    window.addEventListener('pointerdown', interrupt)
    window.addEventListener('keydown', interruptKey)
    window.addEventListener('wheel', interrupt, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', interrupt)
      window.removeEventListener('keydown', interruptKey)
      window.removeEventListener('wheel', interrupt)
    }
  }, [scaleRef])
  /**
   * The render surface the composition is solved against: the View's own box,
   * in window coordinates, and the window that crops it. The plate's canvas is
   * a square that hangs off the bottom of the page on purpose (see
   * `.hero-globe`), so what the visitor sees is a crop, off-centre in it — and
   * a fit that composes against the square instead lands its content below the
   * fold. drei writes the tracked element's rect into the portal's `size`;
   * when it has not measured yet, the CSS rule's own arithmetic stands in.
   */
  const surface = useThree((s) => s.size)
  const plateViewport = (): PlateViewport => {
    const windowWidth = typeof window === 'undefined' ? REFERENCE_WINDOW_WIDTH : window.innerWidth
    const windowHeight = typeof window === 'undefined'
      ? REFERENCE_WINDOW_HEIGHT
      : window.innerHeight
    const fallback = heroGlobeViewport(windowWidth, windowHeight)
    const measured = viewportRef?.current
    if (measured?.rect) {
      return {
        viewWidth: measured.rect.width,
        viewHeight: measured.rect.height,
        viewLeft: measured.rect.left,
        viewTop: measured.rect.top - (window.scrollY - measured.scrollY),
        windowWidth,
        windowHeight,
      }
    }
    const { width, height, left, top } = surface as {
      width: number
      height: number
      left?: number
      top?: number
    }
    if (!(width > 0) || !(height > 0)) return fallback
    return {
      viewWidth: width,
      viewHeight: height,
      viewLeft: Number.isFinite(left) ? (left as number) : fallback.viewLeft,
      viewTop: Number.isFinite(top) ? (top as number) : fallback.viewTop,
      windowWidth,
      windowHeight,
    }
  }

  /**
   * Fit the landing frame to what this cluster actually contains — anchors
   * plus their precision geometry, padded, composed into the usable part of
   * the window the visitor can actually see (plate.ts owns the math and the
   * numbers).
   *
   * Member-bounded and deterministic, so the enter branch can call it to aim
   * the camera at the FRAME's centre before terrain has even loaded, and the
   * reseed cursor can call it again and get the same table.
   */
  const applyPlateFrame = (clusterIndex: number) => {
    const d = dive.current
    const cluster = clusters[clusterIndex]
    if (!cluster) return false
    const members: PlateFrameMember[] = cluster.memberIndices.map((memberIndex) => ({
      direction: latLngToVec3(pins[memberIndex]),
      reach: precisionReach(precisions[memberIndex]),
    }))
    // Include the country's silhouette, not just the distance between visits.
    // Sydney and Brisbane alone used to frame a cropped east-coast rectangle.
    const outlines = countryAtlasRef.current?.outlines.get(cluster.countryCode)
    if (outlines) {
      for (const ring of outlines) {
        for (let i = 0; i < ring.length; i += 2) {
          const direction = latLngToVec3([ring[i] * 180 / Math.PI, ring[i + 1] * 180 / Math.PI])
          const alignment = direction[0] * cluster.centroid[0] + direction[1] * cluster.centroid[1] + direction[2] * cluster.centroid[2]
          // Keep overseas dependencies from pulling the map away from the journey.
          if (alignment > 0.65) members.push({ direction, reach: 0 })
        }
      }
    }
    const viewport = plateViewport()
    const layout = countryFrameLayout(viewport)
    const frame = fitPlateFrame(members, layout.frameOptions)
    d.center[0] = frame.center[0]
    d.center[1] = frame.center[1]
    d.center[2] = frame.center[2]
    d.centerLat = frame.centerLatLng[0]
    d.centerLng = frame.centerLatLng[1]
    d.spread = frame.spread
    d.cameraZoom = countryCameraZoom(frame.spread)
    if (plateMaterialRef.current) plateMaterialRef.current.size = 0.012 / d.cameraZoom
    d.capRadius = frame.capRadius
    const basis = plateBasis(frame.center)
    d.plateEast[0] = basis.east[0]
    d.plateEast[1] = basis.east[1]
    d.plateEast[2] = basis.east[2]
    d.plateNorth[0] = basis.north[0]
    d.plateNorth[1] = basis.north[1]
    d.plateNorth[2] = basis.north[2]
    /* Fold the spread into the map once, here, so the sampler's inner loop
       multiplies radians straight into window halves. */
    d.windowX[0] = frame.view.screenX[0] * frame.spread
    d.windowX[1] = frame.view.screenX[1] * frame.spread
    d.windowX[2] = layout.focusX * 2 - 1
    d.windowY[0] = frame.view.screenY[0] * frame.spread
    d.windowY[1] = frame.view.screenY[1] * frame.spread
    d.windowY[2] = 1 - layout.focusY * 2
    /* Light the table from the upper left of the WINDOW, through the same
       screen map the sampler frames against: the rake and the table yaw shear
       the plate's axes, so a lamp fixed to north would swing around the frame
       from cap to cap and relief would invert on half of them (§2.4). */
    d.light = plateFrameLight(frame.view)
    d.sampleArea = frame.sampleArea
    return true
  }

  /**
   * Split the resident buffer between the three fields that share it. The
   * outline is seeded first and from the TOP of the buffer down, so what it
   * spent is a reservation the terrain field never gets to see: terrain runs
   * from index 0 up, the graticule follows it, and the two ends cannot meet
   * because the reservation is subtracted from terrain's ceiling.
   */
  const applyTerrainBudget = (reservedPoints: number) => {
    const d = dive.current
    d.activeTerrainCount = plateTerrainBudget(d.sampleArea, reservedPoints)
    d.activeGridCount = plateGridBudget(d.activeTerrainCount)
    d.activePointCount = d.activeTerrainCount + d.activeGridCount
    d.venuePointBudget = Math.min(
      d.activeTerrainCount,
      d.venueMemberCount * VENUE_POINT_COUNT
    )
  }

  /**
   * Where a direction lands in the visible window, in frame halves, plus the
   * angular distance it got there by: `[x, y, distance]`.
   *
   * The tangent offset's DIRECTION is the candidate's east/north components
   * (the centre's own are zero by construction) and its LENGTH is the angular
   * distance, so the whole map costs two dot products, a hypot and the affine
   * — the sampler runs tens of thousands of these inside a 6ms slice. ONE
   * implementation, because the terrain field and the outline stroke have to
   * agree to the pixel about where the table stops.
   */
  const probeWindow = (dx: number, dy: number, dz: number, out: Float64Array) => {
    const d = dive.current
    const c = d.center
    const distance = angularDistance(dx, dy, dz, c[0], c[1], c[2])
    const east = dx * d.plateEast[0] + dy * d.plateEast[1] + dz * d.plateEast[2]
    const north = dx * d.plateNorth[0] + dy * d.plateNorth[1] + dz * d.plateNorth[2]
    const lateral = Math.hypot(east, north)
    const tangentScale = lateral > 1e-9 ? distance / lateral : 0
    const tangentEast = east * tangentScale
    const tangentNorth = north * tangentScale
    out[0] = d.windowX[0] * tangentEast + d.windowX[1] * tangentNorth + d.windowX[2]
    out[1] = d.windowY[0] * tangentEast + d.windowY[1] * tangentNorth + d.windowY[2]
    out[2] = distance
  }

  /**
   * Prepare the resumable cursor. This work is bounded by place/member counts;
   * the large world projection and rejection sampler live in advancePlateReseed
   * and yield against a per-frame deadline.
   */
  const preparePlateReseed = (clusterIndex: number) => {
    const d = dive.current
    const cluster = clusters[clusterIndex]
    if (!cluster) return false
    const c = d.center
    const capRadius = d.capRadius
    plateLayer.normal[0] = c[0]
    plateLayer.normal[1] = c[1]
    plateLayer.normal[2] = c[2]
    PLATE_NORMAL.value.set(c[0], c[1], c[2])

    activeMembers.fill(0)
    pinPlate.fill(0)
    pinPlateSeeds.fill(0)
    // Member count is small: prepare anchors before the sliced world pass so
    // the chosen photograph remains attached from the very first approach frame.
    for (const memberIndex of cluster.memberIndices) {
      activeMembers[memberIndex] = 1
      const point = pinPoints[memberIndex]
      const j = memberIndex * 3
      plateProjectInto(point.x, point.y, point.z, c, d.spread, pinPlate, j)
      for (let axis = 0; axis < 3; axis++) pinPlate[j + axis] += c[axis] * 0.012 / d.cameraZoom
    }
    d.memberCount = cluster.memberIndices.length
    d.venueMemberCount = 0
    d.broadPrecision = false
    for (let i = 0; i < d.memberCount; i++) {
      const memberIndex = cluster.memberIndices[i]
      const coordinate = pins[memberIndex]
      const j = i * 3
      latLngToDirectionInto(
        coordinate[0],
        coordinate[1],
        reseedMemberDirections,
        j
      )
      const code = precisionCode(precisions[memberIndex])
      reseedMemberPrecisions[i] = code
      if (code === PRECISION_VENUE) {
        reseedVenueMembers[d.venueMemberCount++] = i
      } else if (code === PRECISION_COUNTRY || code === PRECISION_REGION) {
        d.broadPrecision = true
      }
    }

    const capDegrees = capRadius * (180 / Math.PI)
    d.gridStep = Math.max(1, capDegrees / 3)
    d.boundsMinLat = Math.max(-90, d.centerLat - capDegrees)
    d.boundsMaxLat = Math.min(90, d.centerLat + capDegrees)
    if (d.boundsMinLat <= -90 || d.boundsMaxLat >= 90) {
      d.lngRangeCount = 1
      reseedLngRanges[0] = -180
      reseedLngRanges[1] = 180
    } else {
      const latitude = THREE.MathUtils.clamp(d.centerLat, -90, 90)
        * (Math.PI / 180)
      const lngRadius = Math.asin(
        THREE.MathUtils.clamp(Math.sin(capRadius) / Math.cos(latitude), -1, 1)
      ) * (180 / Math.PI)
      const centreLng = wrapLongitude(d.centerLng)
      const minLngUnwrapped = centreLng - lngRadius
      const maxLngUnwrapped = centreLng + lngRadius
      const minLng = wrapLongitude(minLngUnwrapped)
      const maxLng = wrapLongitude(maxLngUnwrapped)
      if (minLngUnwrapped < -180 || maxLngUnwrapped >= 180) {
        d.lngRangeCount = 2
        reseedLngRanges[0] = minLng
        reseedLngRanges[1] = 180
        reseedLngRanges[2] = -180
        reseedLngRanges[3] = maxLng
      } else {
        d.lngRangeCount = 1
        reseedLngRanges[0] = minLng
        reseedLngRanges[1] = maxLng
      }
    }

    /* The budget follows the WINDOW, not the cap. Scaling by the cap's area
       asked how much ground was sampled; what sets the landed pitch is how
       much TABLE the visitor sees, and that is near enough the same rectangle
       at every zoom. Every accepted mark now lands inside it, so the pitch is
       the budget divided by an area the camera actually looks at. */
    applyTerrainBudget(0)
    /* The stroke's grain, from the same window the budget came out of. */
    d.borderSpacing = plateBorderSpacing(d.sampleArea)
    d.randomState = (0x5eed1234 ^ ((clusterIndex + 1) * 0x9e3779b9)) >>> 0
    d.worldLayerIndex = 0
    d.worldPointIndex = 0
    d.pinMemberIndex = 0
    d.clearPointIndex = 0
    d.borderPolylineIndex = 0
    d.borderVertexIndex = 0
    d.borderCarry = 0
    d.borderPointCount = 0
    d.borderRetrofitPending = false
    d.borderRetrofit = false
    d.terrainPointIndex = 0
    d.reliefPointIndex = 0
    d.baseSeeded = false
    d.plateDrawn = false
    d.reseedStage = 'clear'
    return true
  }

  /**
   * Advance candidates until this frame's budget is spent. The deadline is
   * checked after every candidate—including land/cap rejections—so a run of
   * bad samples cannot turn back into the long task this cursor replaces.
   */
  const advancePlateReseed = () => {
    const d = dive.current
    const cluster = clusters[scaleRef.current.cluster]
    /* Terrain is required only from its own stage onward: clear/world/pins and
       the outline are pure CPU over already-loaded data, so they run during
       the steer while terrain.bin is still in flight. The terrain stage below
       holds its cursor until the asset lands. */
    const terrain = d.terrain ?? COARSE_TERRAIN
    const { landAt, elevationAt } = terrain
    if (!cluster || d.reseedStage === 'idle') return false
    const c = d.center
    const deadline = performance.now() + RESEED_SLICE_MS
    /* The elevation grid's own step, in degrees: the coast test and the lamp's
       central differences both walk cells, and neither may invent a finer one. */
    const reliefLatCell = 180 / terrain.height
    const reliefLngCell = 360 / terrain.width
    /* One closure per slice, not per dot. terrain.ts hands back the stored 0..1
       range on purpose; metres are what a slope is measured in. Only the
       terrain/relief stages call it, and they are gated on `terrain` above
       being present — the non-null assertion states that, not a hope. */
    const sampleElevationMetres = (lat: number, lng: number) =>
      elevationAt(lat, lng) * TERRAIN_ELEVATION_CEILING_M

    while (true) {
      if (d.reseedStage === 'clear') {
        if (d.clearPointIndex >= PLATE_POINTS) {
          d.reseedStage = 'world'
          continue
        }
        const i = d.clearPointIndex++
        plateLayer.alpha[i] = 0
        plateLayer.tint[i] = 0
        plateLayer.targetTint[i] = 0
        plateLayer.pointScale[i] = 0
        plateLayer.shade[i] = 0
        plateLayer.edgeAlpha[i] = 0
        plateLayer.elevation[i] = 0
        plateLayer.kind[i] = 0
        if (performance.now() >= deadline) return false
        continue
      }

      if (d.reseedStage === 'world') {
        if (d.worldLayerIndex >= layers.length) {
          d.reseedStage = 'pins'
          continue
        }
        const layer = layers[d.worldLayerIndex]
        if (d.worldPointIndex >= layer.plateDistance.length) {
          d.worldLayerIndex++
          d.worldPointIndex = 0
          continue
        }
        const i = d.worldPointIndex++
        const j = i * 3
        const hx = layer.home[j]
        const hy = layer.home[j + 1]
        const hz = layer.home[j + 2]
        plateProjectInto(hx, hy, hz, c, d.spread, layer.plate, j)
        const length = Math.hypot(hx, hy, hz) || 1
        layer.plateDistance[i] = angularDistance(
          hx / length,
          hy / length,
          hz / length,
          c[0],
          c[1],
          c[2]
        )
        if (performance.now() >= deadline) return false
        continue
      }

      if (d.reseedStage === 'pins') {
        if (d.pinMemberIndex >= cluster.memberIndices.length) {
          /* Everything the peel itself needs — aPlate projections, plate
             distances, pin anchors — is staged. The morph may run; only the
             wave still waits on the asset-fed stages. The aPlate flush has to
             happen HERE, not only in finalize: the peel starts on baseSeeded,
             and on a cold terrain cache finalize is still seconds away — the
             morph would fly every dot toward the PREVIOUS dive's projections. */
          for (const layer of layers) {
            layer.geometry.getAttribute('aPlate').needsUpdate = true
          }
          d.baseSeeded = true
          d.reseedStage = 'outline'
          continue
        }
        const memberIndex = cluster.memberIndices[d.pinMemberIndex++]
        const point = pinPoints[memberIndex]
        const j = memberIndex * 3
        plateProjectInto(point.x, point.y, point.z, c, d.spread, pinPlate, j)
        pinPlate[j] += c[0] * 0.012 / d.cameraZoom
        pinPlate[j + 1] += c[1] * 0.012 / d.cameraZoom
        pinPlate[j + 2] += c[2] * 0.012 / d.cameraZoom
        const pointLength = point.length() || 1
        pinPlateSeeds[memberIndex] = clamp01(
          angularDistance(
            point.x / pointLength,
            point.y / pointLength,
            point.z / pointLength,
            c[0],
            c[1],
            c[2]
          ) / d.capRadius
        )
        activeMembers[memberIndex] = 1
        if (performance.now() >= deadline) return false
        continue
      }

      /* THE PLOTTED OUTLINE (§6, figure layer 1). Border and coastline as one
         bright dotted stroke, seeded before any terrain so the scan front
         leaves the figure behind it and develops the ground inside it. It is
         also what gives a landlocked cap the edge a coastal one gets free
         from the sea, which is the whole reason the stage exists.

         One segment per iteration, so the 6ms slice can stop in the middle of
         a polyline: the cursor carries the polyline, the vertex AND the dash
         phase, and the next frame resumes the same stroke rather than
         restarting it with a fresh rhythm. */
      if (d.reseedStage === 'outline') {
        const borders = d.borders
        if (!borders) {
          // Reserve border slots and keep moving with bundled coarse ground.
          d.borderRetrofitPending = true
          applyTerrainBudget(BORDER_POINT_BUDGET)
          d.reseedStage = 'terrain'
          continue
        }
        if (
          d.borderPolylineIndex >= borders.length ||
          d.borderPointCount >= BORDER_POINT_BUDGET
        ) {
          if (d.borderRetrofit) {
            /* A retrofit only redraws the stroke. Terrain and the graticule
               are already seeded and already budgeted against the full
               reserve, so the budget is left exactly where it stands and the
               cursor goes straight to the attribute flush. */
            d.borderRetrofit = false
            d.reseedStage = 'finalize'
            continue
          }
          applyTerrainBudget(d.borderPointCount)
          d.reseedStage = 'terrain'
          continue
        }

        const points = borders[d.borderPolylineIndex].points
        const vertexCount = points.length / 2
        if (d.borderVertexIndex + 1 >= vertexCount) {
          d.borderPolylineIndex++
          d.borderVertexIndex = 0
          /* Each polyline starts its own dash phase at its own first vertex;
             carrying it BETWEEN strokes would only tie two unrelated lines
             together. Within a stroke the phase is carried, below. */
          d.borderCarry = 0
          continue
        }

        const v = d.borderVertexIndex++
        const lat0 = points[v * 2]
        const lon0 = points[v * 2 + 1]
        const lat1 = points[v * 2 + 2]
        const lon1 = points[v * 2 + 3]
        const deltaLat = lat1 - lat0
        const deltaLon = lon1 - lon0
        /* A step of more than half the world in longitude is the antimeridian
           seam, not a segment: interpolating it would drag a stroke across the
           whole globe. build-borders.mjs already splits its runs there, so this
           is the second lock on the same door, not the first. */
        if (Math.abs(deltaLon) > Math.PI) {
          if (performance.now() >= deadline) return false
          continue
        }

        latLonRadToDirectionInto(lat0, lon0, borderEnds, 0)
        latLonRadToDirectionInto(lat1, lon1, borderEnds, 3)
        probeWindow(borderEnds[0], borderEnds[1], borderEnds[2], borderWindowA)
        probeWindow(borderEnds[3], borderEnds[4], borderEnds[5], borderWindowB)
        const segmentLength = angularDistance(
          borderEnds[0],
          borderEnds[1],
          borderEnds[2],
          borderEnds[3],
          borderEnds[4],
          borderEnds[5]
        ) * d.spread
        const spacing = d.borderSpacing
        if (!(segmentLength > 1e-9) || !(spacing > 1e-9)) {
          if (performance.now() >= deadline) return false
          continue
        }

        /* Clip the segment against the visible window before sampling it, in
           the same frame halves the terrain sampler rejects against. This is a
           bound on WORK, not the accept test — every dot is re-tested exactly
           where it lands — which is what keeps a border running clean across
           the pacific from costing a hundred thousand samples. */
        const limit = 1 + PLATE_SAMPLE_MARGIN
        const ax = borderWindowA[0]
        const ay = borderWindowA[1]
        const sx = borderWindowB[0] - ax
        const sy = borderWindowB[1] - ay
        borderRange[0] = 0
        borderRange[1] = 1
        const visible =
          clipRange(-sx, ax + limit, borderRange) &&
          clipRange(sx, limit - ax, borderRange) &&
          clipRange(-sy, ay + limit, borderRange) &&
          clipRange(sy, limit - ay, borderRange)

        if (visible) {
          /* One spacing of slack at each end: the window map is a tangent
             projection, so a long segment's straight line in frame halves is
             a hair off the curve the samples actually follow. */
          const startAt = Math.max(0, borderRange[0] * segmentLength - spacing)
          const endAt = Math.min(segmentLength, borderRange[1] * segmentLength + spacing)
          const firstStep = Math.max(0, Math.ceil((startAt - d.borderCarry) / spacing))
          for (
            let along = d.borderCarry + firstStep * spacing;
            along <= endAt && d.borderPointCount < BORDER_POINT_BUDGET;
            along += spacing
          ) {
            /* Along-track only, and small: a plotted stroke has a hand in it,
               but a stroke that wanders off its own line is a scatter. */
            const jittered = along +
              (nextReseedRandom(d) * 2 - 1) * BORDER_JITTER_PITCHES * spacing
            const t = clamp01(jittered / segmentLength)
            const lat = lat0 + deltaLat * t
            const lon = lon0 + deltaLon * t
            latLonRadToDirectionInto(lat, lon, reseedDirection, 0)
            const bx = reseedDirection[0]
            const by = reseedDirection[1]
            const bz = reseedDirection[2]
            probeWindow(bx, by, bz, reseedWindow)
            const windowDistance = Math.max(
              Math.abs(reseedWindow[0]),
              Math.abs(reseedWindow[1])
            )
            const distance = reseedWindow[2]
            if (windowDistance > limit || distance > d.capRadius) continue

            const i = PLATE_POINTS - 1 - d.borderPointCount++
            const j = i * 3
            plateProjectInto(bx, by, bz, c, d.spread, plateLayer.flat, j)
            plateLayer.scatter[j] = bx * 1.001
            plateLayer.scatter[j + 1] = by * 1.001
            plateLayer.scatter[j + 2] = bz * 1.001
            plateLayer.home[j] = plateLayer.flat[j]
            plateLayer.home[j + 1] = plateLayer.flat[j + 1]
            plateLayer.home[j + 2] = plateLayer.flat[j + 2]
            plateLayer.plate[j] = plateLayer.scatter[j]
            plateLayer.plate[j + 1] = plateLayer.scatter[j + 1]
            plateLayer.plate[j + 2] = plateLayer.scatter[j + 2]
            plateLayer.seeds[i] = clamp01(distance / d.capRadius)
            plateLayer.plateDistance[i] = distance
            /* The stroke lies ON the table, unlifted: it is a drawing of where
               the ground stops, not a piece of the ground. Relief rises out of
               it, which is exactly the light-table reading. */
            plateLayer.elevation[i] = 0
            plateLayer.kind[i] = PLATE_BORDER
            plateLayer.pointScale[i] = BORDER_POINT_SCALE
            plateLayer.shade[i] = 1
            plateLayer.edgeAlpha[i] =
              1 - smoothstep(1, 1 + PLATE_SAMPLE_MARGIN, windowDistance)
            const borderCountry = countryAtlasRef.current?.codeAt(lat * 180 / Math.PI, lon * 180 / Math.PI)
            if (borderCountry && borderCountry !== cluster.countryCode) plateLayer.edgeAlpha[i] *= 0.12
            plateLayer.alpha[i] = 0
            /* Bone, always. Zero on both channels of aTint: no scarlet mark,
               no neutral wash. A scarlet national border reads political. */
            plateLayer.targetTint[i] = 0
            plateLayer.tint[i] = 0
          }
        }

        /* The dash phase advances over the WHOLE segment whether or not any of
           it was drawn, so a stroke that leaves the window and comes back
           returns on the same rhythm it left with. */
        if (d.borderCarry > segmentLength) {
          d.borderCarry -= segmentLength
        } else {
          const steps = Math.floor((segmentLength - d.borderCarry) / spacing)
          d.borderCarry = spacing - (segmentLength - (d.borderCarry + steps * spacing))
        }

        if (performance.now() >= deadline) return false
        continue
      }

      if (d.reseedStage === 'terrain') {
        /* The bundled land mask provides coarse geometry immediately. The
           terrain asset refines height/normals later at these same coordinates. */
        if (d.terrainPointIndex >= d.activePointCount) {
          d.reseedStage = 'relief'
          continue
        }

        const i = d.terrainPointIndex
        const fillCount = d.activeTerrainCount
        const gridPoint = i >= fillCount
        const venuePoint = !gridPoint && i < d.venuePointBudget
        let lat: number
        let lng: number
        if (venuePoint) {
          const venueSlot = reseedVenueMembers[Math.floor(i / VENUE_POINT_COUNT)]
          const memberIndex = cluster.memberIndices[venueSlot]
          const coordinate = pins[memberIndex]
          const pointInKnot = i % VENUE_POINT_COUNT
          const radius = pointInKnot === 0
            ? 0
            : VENUE_JITTER * Math.sqrt(nextReseedRandom(d))
          const angle = nextReseedRandom(d) * Math.PI * 2
          lat = coordinate[0] + radius * Math.cos(angle) * (180 / Math.PI)
          lng = coordinate[1] +
            radius * Math.sin(angle) * (180 / Math.PI) /
            Math.max(0.2, Math.cos(coordinate[0] * (Math.PI / 180)))
        } else {
          lat = d.boundsMinLat + nextReseedRandom(d) * (d.boundsMaxLat - d.boundsMinLat)
          const rangeIndex = Math.min(
            d.lngRangeCount - 1,
            Math.floor(nextReseedRandom(d) * d.lngRangeCount)
          )
          const rangeOffset = rangeIndex * 2
          lng = reseedLngRanges[rangeOffset] +
            nextReseedRandom(d) *
            (reseedLngRanges[rangeOffset + 1] - reseedLngRanges[rangeOffset])
        }
        if (gridPoint) {
          if (i % 2 === 0) lat = Math.round(lat / d.gridStep) * d.gridStep
          else lng = Math.round(lng / d.gridStep) * d.gridStep
        }

        latLngToDirectionInto(lat, lng, reseedDirection, 0)
        const dx = reseedDirection[0]
        const dy = reseedDirection[1]
        const dz = reseedDirection[2]
        /* Where this candidate would land in the visible window, in window
           halves, and how far off centre it got there — probeWindow is the one
           implementation of that map, shared with the outline stroke so the
           field and the figure agree about where the table stops. */
        probeWindow(dx, dy, dz, reseedWindow)
        const distance = reseedWindow[2]
        const insideCap = distance <= d.capRadius
        const windowDistance = Math.max(
          Math.abs(reseedWindow[0]),
          Math.abs(reseedWindow[1])
        )
        /* A venue knot is a mark we promised to draw, not sampled ground: it
           is inside the usable rect by construction, and exempting it means a
           degenerate case can never spin the cursor looking for a slot. */
        const insideWindow = venuePoint || windowDistance <= 1 + PLATE_SAMPLE_MARGIN

        const landSample = insideCap && insideWindow && !gridPoint && landAt(lat, lng)
        const accepted = insideCap && insideWindow && (
          gridPoint ||
          venuePoint ||
          landSample ||
          nextReseedRandom(d) < SEA_SAMPLE_RATE
        )

        if (accepted) {
          const j = i * 3
          plateProjectInto(dx, dy, dz, c, d.spread, plateLayer.flat, j)
          plateLayer.scatter[j] = dx * 1.001
          plateLayer.scatter[j + 1] = dy * 1.001
          plateLayer.scatter[j + 2] = dz * 1.001
          const gridSink = gridPoint ? -0.004 / d.cameraZoom : 0
          plateLayer.flat[j] += c[0] * gridSink
          plateLayer.flat[j + 1] += c[1] * gridSink
          plateLayer.flat[j + 2] += c[2] * gridSink
          plateLayer.home[j] = plateLayer.flat[j]
          plateLayer.home[j + 1] = plateLayer.flat[j + 1]
          plateLayer.home[j + 2] = plateLayer.flat[j + 2]
          plateLayer.plate[j] = plateLayer.scatter[j]
          plateLayer.plate[j + 1] = plateLayer.scatter[j + 1]
          plateLayer.plate[j + 2] = plateLayer.scatter[j + 2]
          const radialSeed = clamp01(distance / d.capRadius)
          plateLayer.seeds[i] = radialSeed
          plateLayer.plateDistance[i] = distance
          const elevation = landSample ? elevationAt(lat, lng) : 0
          plateLayer.elevation[i] = elevation
          /* Where this dot read the grid, kept for the lamp: the 'relief'
             stage needs this dot's neighbouring CELLS, and only the sampler
             knows where on the grid the dot came from. */
          reliefSampleLat[i] = lat
          reliefSampleLng[i] = lng
          let plateKind = PLATE_SEA
          if (gridPoint) {
            plateKind = PLATE_GRID
          } else if (landSample || venuePoint) {
            const coastSample = landSample && (
              !landAt(lat + reliefLatCell, lng) ||
              !landAt(lat - reliefLatCell, lng) ||
              !landAt(lat, lng + reliefLngCell) ||
              !landAt(lat, lng - reliefLngCell)
            )
            plateKind = coastSample ? PLATE_COAST : PLATE_FILL
          }
          plateLayer.kind[i] = plateKind
          /* One footprint per class, and the ground's value is left for the
             lamp: fill and coast are lit in the 'relief' stage below, sea and
             the graticule are unlit constants because neither has terrain to
             be lit BY. Sea near-black, graticule quiet (§6). */
          if (plateKind === PLATE_COAST) {
            plateLayer.pointScale[i] = PLATE_COAST_POINT_SCALE
            plateLayer.shade[i] = 0
          } else if (plateKind === PLATE_FILL) {
            plateLayer.pointScale[i] = PLATE_FILL_POINT_SCALE
            plateLayer.shade[i] = 0
          } else if (plateKind === PLATE_SEA) {
            plateLayer.pointScale[i] = PLATE_SEA_POINT_SCALE
            plateLayer.shade[i] = 0.22
          } else {
            plateLayer.pointScale[i] = PLATE_GRID_POINT_SCALE
            plateLayer.shade[i] = 0.34
          }
          /* The field now ENDS at the window, so it has to end softly or the
             seeded rectangle becomes a visible one. Full alpha everywhere the
             visitor can see, falling to nothing across the sampling margin
             just outside it — the same falloff the cap's rim used to carry,
             moved onto the edge that now exists. */
          plateLayer.edgeAlpha[i] = 1 - smoothstep(1, 1 + PLATE_SAMPLE_MARGIN, windowDistance)
          const sampleCountry = countryAtlasRef.current?.codeAt(lat, lng)
          if (sampleCountry && sampleCountry !== cluster.countryCode) plateLayer.edgeAlpha[i] *= 0.12
          plateLayer.alpha[i] = 0

          /* Two channels, one attribute. A dot either carries a scarlet mark
             (a point, a ring, a tinted feature) or the neutral wash of a broad
             claim; a mark always wins the dot it lands on, so the wash is only
             read where nothing sharper was declared. */
          const washLift = landSample && d.broadPrecision ? BROAD_PRECISION_LIFT : 0
          let markTint = 0
          if (!gridPoint) {
            for (let member = 0; member < d.memberCount; member++) {
              const memberOffset = member * 3
              const memberDistance = angularDistance(
                dx,
                dy,
                dz,
                reseedMemberDirections[memberOffset],
                reseedMemberDirections[memberOffset + 1],
                reseedMemberDirections[memberOffset + 2]
              )
              const code = reseedMemberPrecisions[member]
              let featureTint = 0
              if (code === PRECISION_VENUE && memberDistance <= VENUE_REACH) {
                featureTint = 1
              } else if (code === PRECISION_TOWN) {
                const ringDistance = Math.abs(memberDistance - TOWN_RING_RADIUS) * d.spread
                featureTint = 1 - smoothstep(0, TOWN_RING_HALF_WIDTH, ringDistance)
              } else if (
                landSample &&
                (code === PRECISION_ISLAND || code === PRECISION_FIORD)
              ) {
                const reach = code === PRECISION_ISLAND ? ISLAND_REACH : FIORD_REACH
                featureTint = 1 - smoothstep(0, reach, memberDistance)
              }
              markTint = Math.max(markTint, featureTint)
            }
          }
          plateLayer.targetTint[i] = markTint > 0 ? markTint : washLift
          plateLayer.tint[i] = 0
          d.terrainPointIndex++
        }

        if (performance.now() >= deadline) return false
        continue
      }

      if (d.reseedStage === 'relief') {
        if (d.reliefPointIndex >= d.activePointCount) {
          d.reseedStage = 'finalize'
          continue
        }
        const i = d.reliefPointIndex++
        const reliefKind = plateLayer.kind[i]
        const j = i * 3
        const c = d.center
        // The patch retains shallow spherical curvature beneath terrain relief.
        for (let axis = 0; axis < 3; axis++) {
          plateLayer.terrainNormal[j + axis] = c[axis] * (1 - COUNTRY_CURVATURE) +
            (plateLayer.scatter[j + axis] / 1.001) * COUNTRY_CURVATURE
        }
        if (reliefKind === PLATE_FILL || reliefKind === PLATE_COAST) {
          /* THE LAMP. Not "how high is this dot" — how is the ground under it
             TURNED relative to a fixed raking light at the upper left of the
             window (§2.4, R1). Elevation normalized against a cap's own extrema
             was a size and brightness ramp that made the Alps a rumour and every
             flat cap a starfield; a lambert term makes slopes read as slopes and
             leaves flat land honestly even.
             Central differences on the grid's own cells, no interpolation: at
             15km a smoothed sample is an invented landform, and the plain's 50m
             quantization would be the first thing it amplified. */
          plateTerrainSlopeInto(
            reliefSampleLat[i],
            reliefSampleLng[i],
            reliefLatCell,
            reliefLngCell,
            sampleElevationMetres,
            reliefSlope
          )
          plateLayer.elevation[i] = elevationAt(reliefSampleLat[i], reliefSampleLng[i])
          plateLayer.shade[i] = plateHillshade(reliefSlope[0], reliefSlope[1], d.light)
          for (let axis = 0; axis < 3; axis++) {
            plateLayer.terrainNormal[j + axis] -= PLATE_RELIEF_EXAGGERATION * (
              d.plateEast[axis] * reliefSlope[0] + d.plateNorth[axis] * reliefSlope[1]
            )
          }
        }
        if (performance.now() >= deadline) return false
        continue
      }

      if (d.reseedStage === 'finalize') {
        settlePlateLayer(plateLayer, d.cameraZoom)
        for (const layer of layers) {
          layer.geometry.getAttribute('aPlate').needsUpdate = true
        }
        plateLayer.geometry.getAttribute('position').needsUpdate = true
        plateLayer.geometry.getAttribute('aAlpha').needsUpdate = true
        plateLayer.geometry.getAttribute('aTint').needsUpdate = true
        plateLayer.geometry.getAttribute('aPointScale').needsUpdate = true
        plateLayer.geometry.getAttribute('aShade').needsUpdate = true
        d.reseedStage = 'done'
        d.seeded = true
        d.loading = false
        return true
      }

      return d.reseedStage === 'done'
    }
  }

  /** Cancel an unfinished cursor and invalidate any terrain continuation. */
  const abandonPartialReseed = () => {
    const d = dive.current
    d.loadId++
    d.loading = false
    d.seeded = false
    d.baseSeeded = false
    d.plateDrawn = false
    d.interrupted = false
    d.terrain = null
    d.reseedStage = 'idle'
    d.worldLayerIndex = 0
    d.worldPointIndex = 0
    d.pinMemberIndex = 0
    /* The decoded polylines survive — they are a static asset, not dive state
       — but the cursor into them does not. */
    d.borderPolylineIndex = 0
    d.borderVertexIndex = 0
    d.borderCarry = 0
    d.borderPointCount = 0
    d.borderRetrofitPending = false
    d.borderRetrofit = false
    d.terrainPointIndex = 0
    activeMembers.fill(0)
    plateLayer.alpha.fill(0)
    plateLayer.tint.fill(0)
    plateLayer.geometry.getAttribute('aAlpha').needsUpdate = true
    plateLayer.geometry.getAttribute('aTint').needsUpdate = true
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
    if (!group || !camera || !heroVisibility.current) return
    delta = Math.min(delta, 0.05)
    const dragStep = (1 - Math.exp(-6 * delta)) / 6

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

    // Globe only mounts inside WorldGlobe's live-canvas branch. Scheduling
    // here after the handoff keeps reduced-motion/static paths entirely cold.
    if (intro.current.phase === 'done') schedulePlateAssetPrefetch()

    const scale = scaleRef.current
    const d = dive.current

    /* One country owns the path until it returns. Assets refine its fixed
       coordinates; they never replace a moving destination or hold arrival. */
    if (
      intro.current.phase === 'done' &&
      scale.phase === 'world' &&
      enterRef.current >= 0
    ) {
      const clusterIndex = enterRef.current
      enterRef.current = -1
      const cluster = clusters[clusterIndex]
      if (cluster) {
        scale.phase = 'dive'
        scale.cluster = clusterIndex
        scale.morph = 0
        scale.presence = 0
        scale.scan = 0
        d.clock = 0
        d.returnClock = 0
        d.progress = 0
        d.detail = 0
        d.entryIndex = state_.index
        d.reliefUpgradePending = false
        DETAIL.value = 0
        d.loading = true
        d.seeded = false
        d.baseSeeded = false
        d.plateDrawn = false
        d.interrupted = false
        d.terrain = null
        d.reseedStage = 'idle'
        d.worldLayerIndex = 0
        d.worldPointIndex = 0
        d.pinMemberIndex = 0
        d.borderPolylineIndex = 0
        d.borderVertexIndex = 0
        d.borderCarry = 0
        d.borderPointCount = 0
            d.borderRetrofitPending = false
        d.borderRetrofit = false
        d.terrainPointIndex = 0
        worldPlateFadeWritten = -1
        d.startYaw = group.rotation.y
        d.startTilt = group.rotation.x
        /* The steer and the table both aim at the fitted frame centre, so the
           composition the fit solved for is the one that arrives on screen. */
        applyPlateFrame(clusterIndex)
        const rawYaw = Math.atan2(d.center[2], d.center[0]) - Math.PI / 2
        const yawDiff = Math.atan2(
          Math.sin(rawYaw - group.rotation.y),
          Math.cos(rawYaw - group.rotation.y)
        )
        d.sphereYaw = group.rotation.y + yawDiff
        const latitude = (d.centerLat * Math.PI) / 180
        d.sphereTilt = THREE.MathUtils.clamp(latitude, -0.62, 0.62) - PRESENT_BIAS
        d.plateYaw = d.sphereYaw + PLATE_TABLE_YAW
        d.plateTilt = latitude - PLATE_CAMERA_ELEVATION - PLATE_TABLE_TILT
        d.panYaw = 0
        d.panTilt = PLATE_LANDED_PAN_TILT
        d.panTargetYaw = 0
        d.panTargetTilt = PLATE_LANDED_PAN_TILT
        activeRef.current = -1
        if (!cluster.congestedSingleton) selectedRef.current = -1

        const loadId = ++d.loadId
        /* Optional outlines join the same coordinates whenever available. */
        void loadBorders()
          .then((borders) => {
            if (!alive.current || loadId !== dive.current.loadId) return
            dive.current.borders = borders
          })
          .catch(() => { })
        void import('@/content/terrain')
          .then((terrainModule) => terrainModule.loadTerrain())
          .then((terrain) => {
            if (!alive.current || loadId !== dive.current.loadId) return
            dive.current.terrain = terrain
            dive.current.reliefUpgradePending = true
          })
          .catch(() => {
            if (!alive.current || loadId !== dive.current.loadId) return
            dive.current.loading = false
            // Coarse cartography and photographs remain usable on failure.
          })
      }
    } else if (scale.phase !== 'world' && enterRef.current >= 0) {
      enterRef.current = -1
    }

    if (
      (scale.phase === 'dive' || scale.phase === 'plate') &&
      !d.seeded &&
      !d.interrupted &&
      !exitRef.current
    ) {
      if (d.reseedStage === 'idle' && !preparePlateReseed(scale.cluster)) {
        d.loading = false
        exitRef.current = true
      }
      if (d.reseedStage !== 'idle') advancePlateReseed()
    }

    /* THE STROKE, RETROFITTED. A dive that outran borders.bin landed its ground
       against the full reserve and left those slots empty; this fills them the
       moment the asset arrives, on the same sliced cursor. `borderRetrofitPending`
       is set inside one reseed and cleared by prepare/abandon/enter, so it is
       its own same-cluster guard: a new dive can never inherit an older cap's
       debt. Nothing about the wave is restarted — the front is long gone, and
       the marks arrive settled. */
    if (
      d.borderRetrofitPending &&
      d.borders &&
      d.seeded &&
      d.reseedStage === 'done' &&
      (scale.phase === 'dive' || scale.phase === 'plate') &&
      !d.interrupted &&
      !exitRef.current
    ) {
      d.borderRetrofitPending = false
      d.borderRetrofit = true
      d.borderPolylineIndex = 0
      d.borderVertexIndex = 0
      d.borderCarry = 0
      d.borderPointCount = 0
      d.reseedStage = 'outline'
    }
    if (d.borderRetrofit) {
      if (scale.phase !== 'dive' && scale.phase !== 'plate') {
        /* The table left underneath the retrofit (exit, interruption). Drop it
           where it stands: the marks already written unplot with everything
           else, and the next dive's clear stage owns the buffer. */
        d.borderRetrofit = false
        d.reseedStage = 'done'
      } else {
        advancePlateReseed()
        /* The landed table does not run the develop loop — it settled once when
           morph hit 1 — so a retrofit that finishes there needs exactly one
           settle pass to give its new marks their positions and alphas.
           Mid-dive the per-frame pass below already does it. */
        if (!d.borderRetrofit && scale.phase === 'plate') {
          formPlateLayer(plateLayer, 1)
        }
      }
    }

    if (d.reliefUpgradePending && d.seeded && d.reseedStage === 'done' &&
      (scale.phase === 'dive' || scale.phase === 'plate')) {
      d.reliefUpgradePending = false
      d.reliefPointIndex = 0
      d.reseedStage = 'relief'
    }
    if (d.seeded && d.reseedStage === 'relief' && !d.borderRetrofit) advancePlateReseed()

    const beginReturn = (exitRef.current || d.interrupted) && scale.phase !== 'world' && scale.phase !== 'return'
    exitRef.current = false
    if (beginReturn) {
      // Reverse from the current path coordinate, including interrupted acquisition.
      d.interrupted = false
      scale.phase = 'return'
      d.returnClock = 0
      d.returnFromProgress = d.progress
      state_.lastSelected = -1
    }

    if (scale.phase === 'dive') {
      // Only the bounded coordinate preparation can delay deformation; assets cannot.
      d.clock = d.baseSeeded ? d.clock + delta : Math.min(STEER_DUR, d.clock + delta)
      d.progress = reduced ? 1 : clamp01(d.clock / ENTER_DUR)
      if (d.progress >= 1) scale.phase = 'plate'
    } else if (scale.phase === 'return') {
      d.returnClock += delta
      const duration = RETURN_DUR * Math.max(0.2, d.returnFromProgress)
      const returned = reduced ? 1 : clamp01(d.returnClock / duration)
      d.progress = d.returnFromProgress * (1 - ease(returned))
      if (returned >= 1) {
        scale.phase = 'world'
        scale.cluster = -1
        d.progress = 0
        DETAIL.value = 0
        selectedRef.current = -1
        state_.index = d.entryIndex
        state_.target = facingRotations[d.entryIndex] ?? d.startYaw
        state_.hold = HOLD
        state_.seeded = true
        state_.grace = GRACE
        group.rotation.y = d.startYaw
        group.rotation.x = d.startTilt
        if (!d.seeded) abandonPartialReseed()
      }
    }

    if (scale.phase !== 'world') {
      const p = d.progress
      if (plateMaterialRef.current) plateMaterialRef.current.size = 0.012 / d.cameraZoom
      const acquire = ease(clamp01(p / 0.54))
      const settle = ease(clamp01((p - 0.28) / 0.72))
      const pathYaw = d.startYaw + (d.sphereYaw - d.startYaw) * acquire +
        (d.plateYaw - d.sphereYaw) * settle
      const pathTilt = d.startTilt + (d.sphereTilt - d.startTilt) * acquire +
        (d.plateTilt + PLATE_LANDED_PAN_TILT - d.sphereTilt) * settle
      if (scale.phase === 'plate') {
        d.panTargetYaw += spinRef.current * dragStep
        d.panTargetTilt += tiltRef.current * dragStep
        const panDistance = Math.hypot(d.panTargetYaw, d.panTargetTilt - PLATE_LANDED_PAN_TILT)
        const panLimit = Math.min(0.2, d.capRadius + PAN_MARGIN)
        if (panDistance > panLimit) {
          const ratio = panLimit / panDistance
          d.panTargetYaw *= ratio
          d.panTargetTilt = PLATE_LANDED_PAN_TILT +
            (d.panTargetTilt - PLATE_LANDED_PAN_TILT) * ratio
        }
        d.panYaw = damp(d.panYaw, d.panTargetYaw, 8, delta)
        d.panTilt = damp(d.panTilt, d.panTargetTilt, 8, delta)
        group.rotation.y = pathYaw + d.panYaw
        group.rotation.x = pathTilt + d.panTilt - PLATE_LANDED_PAN_TILT
      } else {
        const panRelease = scale.phase === 'return'
          ? clamp01(d.progress / Math.max(0.001, d.returnFromProgress)) : 0
        group.rotation.y = pathYaw + d.panYaw * panRelease
        group.rotation.x = pathTilt + (d.panTilt - PLATE_LANDED_PAN_TILT) * panRelease
      }
      scale.morph = journeyMorph(p)
      scale.presence = ease(p)
      scale.scan = scale.presence
      MORPH.value = scale.morph
      FLAT_OCC.value = flatOccFor(scale.morph)
      // Late geometry approaches the current detail level gradually instead
      // of exposing the entire dense buffer in its first ready frame.
      d.detail = damp(d.detail, d.seeded ? journeyDetail(p) : 0, 6, delta)
      formPlateLayer(plateLayer, d.detail)
      formWorldPlate(layers, p)
      d.plateDrawn ||= DETAIL.value > 0
      if (scale.phase !== 'plate') {
        spinRef.current = 0
        tiltRef.current = 0
      }
      activeRef.current = -1
    } else {
      scale.morph = 0
      scale.presence = 0
      scale.scan = 0
      MORPH.value = 0
      DETAIL.value = 0
      FLAT_OCC.value = 1
      if (introPhase === 'done') formWorldPlate(layers, 0)
    }
    if (arcs && introPhase === 'done') {
      const route = 1 - smoothstep(0.08, 0.48, d.progress)
      if (arcs.alpha[0] !== route) {
        arcs.alpha.fill(route)
        arcs.geometry.getAttribute('aAlpha').needsUpdate = true
      }
    }

    /* Binding S3-gate fix: the compiled-from-mount body film stands down with
       uFlat. `transparent` and `visible` never move; depth writing returns
       only at the fully wrapped stable end. */
    if (occluderMatRef.current && introPhase === 'done') {
      /* The body's mass leaves on the same late release as the dot occlusion
         (flatOccFor), not linearly — while dots are still streaming outward
         past the limb the planet must still BE there behind them. */
      occluderMatRef.current.opacity = flatOccFor(scale.morph)
      occluderMatRef.current.depthWrite = scale.phase === 'world' && scale.morph <= 0.0001
    }

    /* THE HAND COMES FIRST, and it is applied before the tour reads the
       rotation, so both are looking at the same numbers on the same frame.

       Two axes, because one was never enough: spinning about Y sweeps a single
       band of latitudes past the camera, so with horizontal drag alone the
       poles could not be reached at all and a third of the sphere was drawn but
       unviewable. X is clamped rather than free — see TILT_LIMIT. */
    const worldScale = scale.phase === 'world'

    /* ---------- pointer → country (v3 phase 2) ----------
       The pointer resolves through the same geometry the dots were placed by:
       ray to the shell sphere, hit into group-local, lat/lng into the atlas
       mask. The near intersection is by construction the visible side, so
       occlusion costs nothing. Everything here is inert until the atlas and
       the intro are both in. */
    let hoveredCluster = -1
    const atlas = countryAtlasRef.current
    const pointerState = pointerRef?.current
    if (
      worldScale &&
      intro.current.phase === 'done' &&
      atlas &&
      pointerState?.active
    ) {
      hoverNdc.set(pointerState.x * 2 - 1, -(pointerState.y * 2 - 1))
      hoverRaycaster.setFromCamera(hoverNdc, camera)
      hoverSphere.center.setFromMatrixPosition(group.matrixWorld)
      if (hoverRaycaster.ray.intersectSphere(hoverSphere, hoverHit)) {
        group.worldToLocal(hoverHit).normalize()
        // exact inverse of toVec3, same as fibonacci's derivation
        hoverLatLng[0] = Math.asin(THREE.MathUtils.clamp(hoverHit.y, -1, 1)) * (180 / Math.PI)
        const lng = Math.atan2(hoverHit.z, -hoverHit.x) * (180 / Math.PI) - 180
        hoverLatLng[1] = lng < -180 ? lng + 360 : lng
        const code = atlas.codeAt(hoverLatLng[0], hoverLatLng[1])
        if (code) hoveredCluster = clusterIndexByCode.get(code) ?? -1
      }
    }
    if (hoverCountryRef) hoverCountryRef.current = hoveredCluster

    /* the stroke: refill on target change, draw in along the rings, fade as
       one on leave — and never visible off the world scale */
    const stroke = hoverStroke.current
    if (hoveredCluster !== stroke.cluster) {
      stroke.cluster = hoveredCluster
      if (hoveredCluster >= 0) {
        stroke.count = fillCountryStroke(clusters[hoveredCluster].countryCode)
        stroke.clock = 0
      }
    }
    if (stroke.cluster >= 0 && worldScale) {
      stroke.clock += delta
      stroke.fade = damp(stroke.fade, 1, 12, delta)
    } else {
      stroke.fade = damp(stroke.fade, 0, 12, delta)
    }
    if (stroke.count > 0 && (stroke.fade > 0.001 || stroke.lit)) {
      const { alpha, seeds, geometry } = countryStroke
      const front = stroke.clock / COUNTRY_STROKE_DRAW
      for (let i = 0; i < stroke.count; i++) {
        alpha[i] =
          clamp01((front - seeds[i]) / COUNTRY_STROKE_RAMP) *
          stroke.fade *
          COUNTRY_STROKE_ALPHA
      }
      ; (geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
      stroke.lit = stroke.fade > 0.001
    }

    /* the rest-state outlines: present whenever the world is, gone with the
       dive. One damped scalar, and the buffer is rewritten only while that
       scalar is actually moving — a resting frame writes nothing. */
    const rest = restStrokeState.current
    if (rest.count > 0) {
      const restTarget = worldScale && intro.current.phase === 'done' ? 1 : 0
      rest.fade = damp(rest.fade, restTarget, 8, delta)
      if (rest.fade < 0.001 && restTarget === 0) rest.fade = 0
      const level = rest.fade * REST_STROKE_ALPHA
      if (Math.abs(level - rest.written) > 0.002) {
        rest.written = level
        restStroke.alpha.fill(level, 0, rest.count)
          ; (restStroke.geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true
      }
    }

    let dragged = false
    if (worldScale && spinRef.current !== 0) {
      group.rotation.y += spinRef.current * dragStep
      dragged = true
    }
    if (worldScale && tiltRef.current !== 0) {
      group.rotation.x = THREE.MathUtils.clamp(
        group.rotation.x + tiltRef.current * dragStep,
        TILT_MIN,
        TILT_MAX
      )
      dragged = true
    }
    // damped here rather than in the handler, so a flick keeps coasting after
    // the pointer is up and comes to rest on its own. Exponential, not the
    // linear 1 − 6Δt, which hit zero outright on a slow frame.
    const decay = Math.exp(-6 * delta)
    if (worldScale || scale.phase === 'plate') {
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
          const stop = tourStops.indexOf(state_.index)
          state_.index = tourStops[(stop + 1) % tourStops.length] ?? 0
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

    // A similarity about the moving geographic centre preserves the fit's
    // reference frustum. The camera physically approaches the natural-scale
    // country; its final position is also used for this frame's DOM projections.
    if (camera.view?.enabled) camera.clearViewOffset()
    if (scale.phase === 'world') camera.position.copy(worldCameraPosition)
    else {
      cameraCenter.fromArray(d.center).applyMatrix4(group.matrixWorld)
      const zoom = Math.pow(d.cameraZoom, journeyDolly(d.progress))
      camera.position.copy(worldCameraPosition).sub(cameraCenter)
        .multiplyScalar(1 / zoom).add(cameraCenter)
    }
    camera.updateMatrixWorld()

    if (scale.phase !== 'world') {
      // Compose with the lens, keeping Australia's geographic centre in
      // Australia. Moving the tangent origin to reserve UI space distorted
      // wide countries and pushed their curved surface outside the frame.
      const viewport = plateViewport()
      const layout = cachedCountryFrameLayout(viewport)
      const targetX = viewport.windowWidth * layout.focusX
      const targetY = viewport.windowHeight * layout.focusY
      cameraCenter.fromArray(d.center).applyMatrix4(group.matrixWorld).project(camera)
      const currentX = (cameraCenter.x * 0.5 + 0.5) * viewport.viewWidth
      const currentY = (0.5 - cameraCenter.y * 0.5) * viewport.viewHeight
      const composition = journeyDolly(d.progress)
      camera.setViewOffset(
        viewport.viewWidth, viewport.viewHeight,
        (currentX - targetX + viewport.viewLeft) * composition,
        (currentY - targetY + viewport.viewTop) * composition,
        viewport.viewWidth, viewport.viewHeight
      )
    }

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
    const returnWorldForm = scale.phase === 'return'
      ? 1 - smoothstep(0.05, 0.38, d.progress) : 0
    const activePlateCluster = clusters[scale.cluster]
    for (let i = 0; i < pinPoints.length; i++) {
      const onActivePlate = scale.phase !== 'world' && activeMembers[i] === 1
      const plateForm = onActivePlate ? 1 : 0
      world.copy(pinPoints[i])
      if (onActivePlate) {
        const j = i * 3
        world.set(
          world.x + (pinPlate[j] - world.x) * scale.morph,
          world.y + (pinPlate[j + 1] - world.y) * scale.morph,
          world.z + (pinPlate[j + 2] - world.z) * scale.morph
        )
      }
      world.applyMatrix4(group.matrixWorld)

      // Facing is computed on the sphere's own normal, not from the projection.
      // A point behind the globe still projects to a perfectly plausible screen
      // position, so without this the far-side pins would sit on top of the
      // globe looking exactly like near-side ones.
      normal.copy(world).normalize()
      toCam.copy(camera.position).sub(world).normalize()
      const front = onActivePlate ? THREE.MathUtils.lerp(normal.dot(toCam), 1, scale.presence) : normal.dot(toCam)

      world.project(camera)
      const projection = projectionRef.current[i] ?? { x: 0, y: 0, facing: 0, form: 0 }
      projection.x = (world.x + 1) / 2
      projection.y = (-world.y + 1) / 2
      projection.facing = front
      projection.form = scale.phase === 'world'
        ? labelFormAt(pinSeeds[i], labelP)
        : onActivePlate
          ? scale.phase === 'return' && activePlateCluster?.congestedSingleton
            ? Math.max(plateForm, returnWorldForm)
            : plateForm
          : scale.phase === 'return'
            ? returnWorldForm
            : 0
      projectionRef.current[i] = projection

      /* Under the hand the tour is not running, so it cannot say which place is
         being presented and the geometry has to answer instead: whichever pin
         sits most nearly on the PRESENTED direction (the lifted one — see
         presentDir), provided it is convincingly so. 0.88 is about 28 degrees
         off centre — tight enough that two clustered pins do not both claim
         the card, loose enough that you do not have to land one perfectly. */
      const present = normal.dot(presentDir)
      if (manual && tourStopSet.has(i) && present > bestFront) {
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
        const worldForm = labelFormAt(chipSeeds[i], labelP)
        projection.form = scale.phase === 'world'
          ? worldForm
          : scale.phase === 'dive'
            ? worldForm * (1 - ease(clamp01(scale.presence / 0.28)))
            : scale.phase === 'return'
              ? worldForm * returnWorldForm
              : 0
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
    onProjectRef?.current?.(delta)
  })

  return (
    <>
      {/* Distance is derived, not eyeballed. Visible height at the origin is
          2 * d * tan(fov/2); at fov 32 from z = 3.15 that is 1.81 against a
          sphere 2 across, so the globe was being cut off top and bottom by its
          own frustum. z = 4.6 gives 2.64, i.e. the sphere plus ~30% air for the
          pin cards to sit in. */}
      {/* Position and fov come from plate.ts, which is also where the fit reads
          them: the landing frame IS this frustum seen through this pose, and a
          camera that disagrees with the fit by a millimetre is a composition
          that disagrees with it by a third of a screen. */}
      <PerspectiveCamera
        makeDefault
        position={[...PLATE_CAMERA_POSITION]}
        fov={PLATE_CAMERA_FOV_DEGREES}
        near={0.01}
        far={100}
      />
      <group ref={groupRef} rotation={[0.22, 0, PLATE_GROUP_ROLL]}>
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
        <GlobeSurface
          radius={RADIUS * OCCLUDER}
          materialRef={occluderMatRef}
          opacity={intro.current.phase === 'done' ? 1 : 0}
          depthWrite={intro.current.phase === 'done'}
        />

        {/* Dense relief shares the world surface and resolves with camera scale. */}
        <points geometry={plateLayer.geometry} renderOrder={1} frustumCulled={false}>
          <pointsMaterial
            ref={plateMaterialRef}
            size={0.012}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={0.86}
            depthWrite={false}
            onBeforeCompile={patchPlateDots}
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
        {/* the rest-state outlines: every visited country wears its admin-0
            outline at rest (v4) — the world scale says "where I've been"
            before any pointer arrives. Alpha-driven; fades out with the dive. */}
        <points geometry={restStroke.geometry}>
          <pointsMaterial
            size={0.012}
            color="#f4efe9"
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            onBeforeCompile={patchDotAlpha}
          />
        </points>
        {/* the hover stroke: a visited country's admin-0 outline, drawn in as
            a run of dots when the pointer rests on it (v3 phase 2) */}
        <points geometry={countryStroke.geometry}>
          <pointsMaterial
            size={0.013}
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
