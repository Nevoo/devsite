/**
 * Tunables for the darkroom dust. Lives in its own three-free module so a
 * page chunk can import the defaults without pulling the WebGL chunk in.
 *
 * DustPreset is the production surface — everything the shipped <Dust>
 * layer reads. DustSettings extends it with the rapier-layer tunables that
 * only exist in the /lab/particles sandbox (plan stage D4, deferred).
 */
export interface DustPreset {
  /** sim time multiplier — how fast the field evolves */
  speed: number
  /** curl noise base frequency — low = broad slow eddies, high = fizz */
  curl: number
  /** distance of the focus plane from the camera */
  focus: number
  /** how hard defocus blows the points up — the aperture, effectively */
  blur: number
  /** base point size so in-focus motes stay visible as crisp specks */
  size: number
  /** fraction of the particle field that renders at all */
  density: number
  /** master alpha */
  opacity: number
  /** 0 = free curl cloud, 1 = fully condensed onto the base sphere */
  condense: number
  /** fraction of motes tinted scarlet instead of paper-white */
  accent: number
  /** radius of the parting channel, in scene units at the cloud's depth */
  pointerRadius: number
  /** additive blending — dust catching light vs dust in shadow */
  additive: boolean
}

export interface DustSettings extends DustPreset {
  /** rapier layer: number of physical motes (each is a real rigid body) */
  bodies: number
  /** impulse gain pulling each mote back to its home position */
  attract: number
  /** linear damping on the bodies — lower = drifty, higher = viscous */
  damping: number
  /** collider radius per mote — their "personal space", larger = bumpier crowd */
  moteRadius: number
}

/**
 * Where the cloud lives, in the mounting view's scene units. The sim always
 * computes the same canonical cloud (a blobby ball of radius ~2 around the
 * origin); the bounds are a shaping transform applied at render time:
 *
 *  - ball: the lab's showpiece — radius 2 at the origin reproduces the
 *    canonical cloud exactly.
 *  - shell: radial remap into an [inner, outer] band — the hero's air
 *    around the planet.
 *  - slab: the canonical span squashed into a box — table-depth air over
 *    the plate.
 */
export type DustBounds =
  | { kind: 'ball'; radius: number; center?: [number, number, number] }
  | { kind: 'shell'; inner: number; outer: number; center?: [number, number, number] }
  | { kind: 'slab'; extents: [number, number, number]; center?: [number, number, number] }

// Rouven's tuned preset, 2026-08-29: near-still field, high curl, additive.
// speed re-tuned after the slider floor dropped: the fractal octave stack
// amplifies tiny time steps, so calm lives well below the old minimum of 1
export const DUST_DEFAULTS: DustSettings = {
  speed: 0.3,
  curl: 0.45,
  focus: 4.93,
  blur: 34,
  size: 1.4,
  density: 0.35,
  opacity: 0.82,
  condense: 0.06,
  accent: 0.08,
  bodies: 400,
  attract: 0.2,
  damping: 4,
  moteRadius: 0.08,
  pointerRadius: 0.3,
  additive: true,
}

/**
 * The hero's air (plan stage D2): sparse room-atmosphere around the horizon
 * planet, an order of magnitude under the lab's showpiece ball — ~600 drawn
 * sprites against the lab's ~5700. Normal blending as the starting stance
 * (additive glow competes with the scarlet accents; the taste gate compares
 * both). Focus sits at the planet's depth from the plate camera (4.6), so
 * the air is crisp beside the sphere and melts to bokeh toward the lens.
 */
export const DUST_HERO: DustPreset = {
  speed: 0.3,
  curl: 0.45,
  focus: 4.6,
  blur: 18,
  size: 1.3,
  density: 0.15,
  opacity: 0.55,
  condense: 0,
  accent: 0.05,
  pointerRadius: 0.35,
  additive: false,
}

/** texture is N×N → N² particles; sandbox lets you feel the density cost */
export const DUST_SIZES = [64, 128, 256, 512] as const

/**
 * Production ceiling per view (plan stage D1): the lab proved 128² but the
 * hero shares a frame budget with the globe. 64² = 4096 particles.
 */
export const DUST_PROD_MAX_SIZE = 64

/** the lab's camera pose — the rapier pointer's unprojection depends on it */
export const DUST_CAMERA_Z = 6
export const DUST_CAMERA_FOV = 25
/** visible half-height at the z=0 plane */
export const DUST_HALF_H =
  Math.tan((DUST_CAMERA_FOV / 2) * (Math.PI / 180)) * DUST_CAMERA_Z
