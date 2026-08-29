/**
 * Tunables for the darkroom-dust sandbox (/lab/particles, dev only).
 * Lives in its own three-free module so the page chunk can import the
 * defaults without pulling the WebGL chunk in with them.
 */
export interface DustSettings {
  /** sim time multiplier — how fast the field evolves */
  speed: number
  /** curl noise base frequency — low = broad slow eddies, high = fizz */
  curl: number
  /** distance of the focus plane from the camera (camera sits at z=6) */
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
  /** rapier layer: number of physical motes (each is a real rigid body) */
  bodies: number
  /** impulse gain pulling each mote back to its home position */
  attract: number
  /** linear damping on the bodies — lower = drifty, higher = viscous */
  damping: number
  /** collider radius per mote — their "personal space", larger = bumpier crowd */
  moteRadius: number
  /** radius of the kinematic pointer ball that plows through them */
  pointerRadius: number
  /** additive blending — dust catching light vs dust in shadow */
  additive: boolean
}

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

/** texture is N×N → N² particles; sandbox lets you feel the density cost */
export const DUST_SIZES = [64, 128, 256, 512] as const

/** shared camera pose — the analytic unprojection depends on these */
export const DUST_CAMERA_Z = 6
export const DUST_CAMERA_FOV = 25
/** visible half-height at the z=0 plane */
export const DUST_HALF_H =
  Math.tan((DUST_CAMERA_FOV / 2) * (Math.PI / 180)) * DUST_CAMERA_Z
