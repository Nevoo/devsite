export type Vec3 = readonly [number, number, number]
export type LatLng = readonly [number, number]

export interface AngularCapBounds {
  minLat: number
  maxLat: number
  /**
   * A wrapped interval deliberately keeps minLng greater than maxLng. Callers
   * can iterate `lngRanges` without teaching every sampler about the date line.
   */
  minLng: number
  maxLng: number
  wrapsAntimeridian: boolean
  lngRanges: readonly (readonly [number, number])[]
}

const DEG = Math.PI / 180
const EPSILON = 1e-12

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2])

const normalize = (v: Vec3): Vec3 => {
  const magnitude = length(v)
  if (magnitude <= EPSILON) return [0, 0, 0]
  return [v[0] / magnitude, v[1] / magnitude, v[2] / magnitude]
}

const wrapLng = (lng: number) => {
  const wrapped = ((lng + 180) % 360 + 360) % 360 - 180
  return Object.is(wrapped, -0) ? 0 : wrapped
}

/**
 * The globe's one coordinate convention. Keeping this free of Three.js lets
 * build-time gates and the render path ask exactly the same geometric question.
 */
export function latLngToVec3([lat, lng]: LatLng, radius = 1): Vec3 {
  const phi = (90 - lat) * DEG
  const theta = (lng + 180) * DEG
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

/** inverse of `latLngToVec3`, with longitude normalized to [-180, 180) */
export function vec3ToLatLng(direction: Vec3): LatLng {
  const unit = normalize(direction)
  if (length(unit) <= EPSILON) throw new RangeError('cannot locate a zero-length vector')
  const lat = Math.asin(clamp(unit[1], -1, 1)) / DEG
  const lng = wrapLng(Math.atan2(unit[2], -unit[0]) / DEG - 180)
  return [lat, lng]
}

/** great-circle angular distance in radians */
export function greatCircleDistance(a: LatLng, b: LatLng): number {
  return angularDistanceVec3(latLngToVec3(a), latLngToVec3(b))
}

/** great-circle angular distance in radians for unit directions */
export function angularDistanceVec3(a: Vec3, b: Vec3): number {
  const aUnit = normalize(a)
  const bUnit = normalize(b)
  if (length(aUnit) <= EPSILON || length(bUnit) <= EPSILON) {
    throw new RangeError('angular distance requires non-zero vectors')
  }
  return Math.acos(clamp(dot(aUnit, bUnit), -1, 1))
}

/**
 * Azimuthal equidistant projection about `centroid` on a unit sphere.
 * `spread` changes presentation scale without changing the inverse geometry.
 */
export function plateProject(direction: Vec3, centroid: Vec3, spread: number): Vec3 {
  if (!(spread > 0)) throw new RangeError('plate spread must be positive')

  const d = normalize(direction)
  const c = normalize(centroid)
  if (length(d) <= EPSILON || length(c) <= EPSILON) {
    throw new RangeError('plate projection requires non-zero vectors')
  }

  const alignment = clamp(dot(d, c), -1, 1)
  const alpha = Math.acos(alignment)

  // At the centre the tangent has no direction, and none is needed: every
  // possible tangent multiplied by zero lands on the same point.
  if (alpha <= EPSILON) return c

  const tangent = normalize([
    d[0] - c[0] * alignment,
    d[1] - c[1] * alignment,
    d[2] - c[2] * alignment,
  ])

  if (length(tangent) <= EPSILON) {
    // The antipode has the opposite ambiguity. Any stable tangent traces a
    // geodesic to the same endpoint, so choose the axis least parallel to c.
    const axis: Vec3 = Math.abs(c[0]) < Math.abs(c[1])
      ? Math.abs(c[0]) < Math.abs(c[2]) ? [1, 0, 0] : [0, 0, 1]
      : Math.abs(c[1]) < Math.abs(c[2]) ? [0, 1, 0] : [0, 0, 1]
    const stableTangent = normalize([
      c[1] * axis[2] - c[2] * axis[1],
      c[2] * axis[0] - c[0] * axis[2],
      c[0] * axis[1] - c[1] * axis[0],
    ])
    return [
      c[0] + stableTangent[0] * alpha * spread,
      c[1] + stableTangent[1] * alpha * spread,
      c[2] + stableTangent[2] * alpha * spread,
    ]
  }

  return [
    c[0] + tangent[0] * alpha * spread,
    c[1] + tangent[1] * alpha * spread,
    c[2] + tangent[2] * alpha * spread,
  ]
}

/** exact inverse of `plateProject` for a positive spread */
export function plateUnproject(point: Vec3, centroid: Vec3, spread: number): Vec3 {
  if (!(spread > 0)) throw new RangeError('plate spread must be positive')

  const c = normalize(centroid)
  if (length(c) <= EPSILON) throw new RangeError('plate projection requires a non-zero centroid')

  const offset: Vec3 = [point[0] - c[0], point[1] - c[1], point[2] - c[2]]
  const offsetLength = length(offset)

  // The projected centre contains no tangent information, but alpha is zero,
  // so the inverse is unambiguously the centroid itself.
  if (offsetLength <= EPSILON) return c

  const alpha = offsetLength / spread
  const tangent: Vec3 = [
    offset[0] / offsetLength,
    offset[1] / offsetLength,
    offset[2] / offsetLength,
  ]
  const cosAlpha = Math.cos(alpha)
  const sinAlpha = Math.sin(alpha)
  return normalize([
    c[0] * cosAlpha + tangent[0] * sinAlpha,
    c[1] * cosAlpha + tangent[1] * sinAlpha,
    c[2] * cosAlpha + tangent[2] * sinAlpha,
  ])
}

/**
 * Bounding window for an angular cap. A cap that reaches either pole spans
 * every longitude; otherwise a date-line crossing is split into two ranges.
 */
export function angularCapBounds([lat, lng]: LatLng, angularRadius: number): AngularCapBounds {
  if (angularRadius < 0 || angularRadius > Math.PI) {
    throw new RangeError('angular cap radius must be between 0 and PI')
  }

  const radiusDegrees = angularRadius / DEG
  const minLat = Math.max(-90, lat - radiusDegrees)
  const maxLat = Math.min(90, lat + radiusDegrees)
  if (angularRadius === Math.PI || minLat <= -90 || maxLat >= 90) {
    return {
      minLat,
      maxLat,
      minLng: -180,
      maxLng: 180,
      wrapsAntimeridian: false,
      lngRanges: [[-180, 180]],
    }
  }

  const latitude = clamp(lat, -90, 90) * DEG
  const centreLng = wrapLng(lng)
  const lngRadius = Math.asin(clamp(Math.sin(angularRadius) / Math.cos(latitude), -1, 1)) / DEG
  const minLngUnwrapped = centreLng - lngRadius
  const maxLngUnwrapped = centreLng + lngRadius
  const minLng = wrapLng(minLngUnwrapped)
  const maxLng = wrapLng(maxLngUnwrapped)
  const wrapsAntimeridian = minLngUnwrapped < -180 || maxLngUnwrapped >= 180
  const lngRanges: readonly (readonly [number, number])[] = wrapsAntimeridian
    ? [[minLng, 180], [-180, maxLng]]
    : [[minLng, maxLng]]

  return { minLat, maxLat, minLng, maxLng, wrapsAntimeridian, lngRanges }
}

/**
 * Fit-to-content framing (CONCEPT-COUNTRY-ZOOM-V2 §6). The landing frame is
 * the padded bounding box of the members and their precision geometry, not a
 * cap centred on the cluster's mean — a centred cap frames the average of the
 * places, which is nowhere in particular, and leaves the composition's weight
 * wherever the arithmetic happened to put it.
 *
 * Every number the fit uses lives here rather than in Globe.tsx so the pure
 * gate measures the values that actually ship.
 */

/** S4's scale remains the floor: no plate gets smaller than the shipped peel. */
export const MIN_SPREAD = 2.2
/** The landed radius the v1 cap was scaled to. Only the degenerate path still
 * uses it — see LEGACY_SPREAD_MAX. */
export const TARGET_PLATE_RADIUS = 1.25
/**
 * The density-bounded zoom ceiling. The fit may zoom this far in because the
 * sampler now spends its whole budget on the visible window rather than on a
 * disc, so a deep zoom no longer thins the dot field; past this the ground
 * under a cluster stops being a map and starts being a street plan.
 */
export const SPREAD_MAX = 25
/**
 * The v1 ceiling, kept for one job: a cluster with no extent of its own (a
 * singleton, or members inside one venue) has no box to fit, so it lands at
 * exactly the scale v1 landed it at rather than at whatever the ceiling says.
 */
export const LEGACY_SPREAD_MAX = 12.5
/** Below this the content box has no scale to speak of — 30km is one town and
 * its approaches, and everything tighter is the same landing. */
export const DEGENERATE_BOX_SPAN = 30 / 6371
/** Pickup anchors need this much table between them before cards can read apart. */
export const MIN_PIN_SEPARATION = 0.11
/** Terrain sampled a little beyond the content, so the box never sits on a rim. */
export const CAP_PADDING = 0.065
/** A cap this small already reads as one town's surroundings (degenerate path). */
export const MIN_CAP_RADIUS = 0.12
/** Beyond this the degenerate path is drawing a region nobody claimed. */
export const MAX_CAP_RADIUS = 0.24
/**
 * How far past the visible window the sampler keeps seeding, as a fraction of
 * the window's half-extents. The margin is what the dots fade out across, so
 * the field ends in a falloff instead of at a rectangle.
 */
export const PLATE_SAMPLE_MARGIN = 0.15
/**
 * Accepted plate dots per square table unit. Measured off the v1 landing —
 * ~12k dots across the 4.9 unit² landing disc — because that pitch is the one
 * the NZ coastline read as a figure at (§2.1, P1).
 */
export const PLATE_LANDED_DENSITY = 2450

/** Padding around the content box, as a fraction of its long axis (§6.1). */
export const BOX_PADDING = 0.12
/** How much of the binding USABLE axis the padded box fills once landed (§6.2). */
export const BOX_FILL_TARGET = 0.72
/** 250km on a 6371km sphere: tighter than this and the table loses authority.
 * Nothing measures a cluster against it — SPREAD_MAX is what enforces it, and
 * the gate checks the two constants still agree. */
export const ZOOM_FLOOR_SPAN = 250 / 6371

/* The usable rect. Anchors are not points on screen: each one carries a print
   stack and a caption, and the top of the frame carries the title, the meta
   line and the `← world` control. The fit therefore composes into a sub-rect
   of the visible window, and the DOM's own extents are what size it. */

/** Title + meta line + `← world`, as a fraction of the window's height. */
export const TITLE_BAND_FRACTION = 0.28
/** Half a print (~16.5vh wide) or half its ~200px nowrap caption, whichever is
 * wider, as a fraction of the window's width. */
export const PRINT_MARGIN_FRACTION = 0.08
/** Print height plus its caption line, as a fraction of the window's height. */
export const CAPTION_MARGIN_FRACTION = 0.15
/** The clear third the open contact sheet lands in (§5, §6.4). Reserved only
 * when the caller asks: until a sheet actually opens there, reserving it just
 * pushes every landing into the other two thirds. */
export const SHEET_CLEAR_FRACTION = 1 / 3

/* ---------- the landed pose, in one home ----------

   The frame the fit composes into is not an assumed rectangle: it is whatever
   the shipped camera sees of the shipped table, so every number the render
   path uses to build that pose lives here and Globe.tsx imports it. A guessed
   frame is how v1's fit put four New Zealand pins in the bottom-right corner. */

/** Globe's `<PerspectiveCamera position={…}>`. */
export const PLATE_CAMERA_POSITION: Vec3 = [0, 0.3, 4.6]
/** …and its vertical field of view, in degrees, as the JSX takes it. */
export const PLATE_CAMERA_FOV_DEGREES = 32
/** The camera looks down −Z from an elevated seat; this is how far above the
 * origin's horizon that seat sits, and the table's rake is measured off it. */
export const PLATE_CAMERA_ELEVATION = Math.atan2(
  PLATE_CAMERA_POSITION[1],
  PLATE_CAMERA_POSITION[2]
)
/** The table rake. §6's stage-A tunable, and the gradient the raking light has
 * to out-shout — one knob, read by the fit and by Globe's pose alike. */
export const PLATE_TABLE_TILT = (36 * Math.PI) / 180
/** A little yaw off dead-on, so the table is a table and not a diagram. */
export const PLATE_TABLE_YAW = (12 * Math.PI) / 180
/** The standing pan the landing arrives with: it lifts the table's far edge and
 * opens the title band before the visitor has touched anything. The rake the
 * composition is actually seen at is TABLE_TILT minus this. */
export const PLATE_LANDED_PAN_TILT = 0.14
/** The globe group's standing roll (Globe's `<group rotation={[…]}>`). Small,
 * and large enough to shear the plate's screen axes if the fit ignores it. */
export const PLATE_GROUP_ROLL = 0.05

/* ---------- the visible window ----------

   The canvas the plate renders into is `.hero-globe` in site.css: a SQUARE,
   deliberately larger than the viewport, centred horizontally and hung off the
   bottom edge so the world globe reads as a horizon. The visitor therefore
   sees a crop of that square, off-centre in it, and the composition has to be
   authored against the crop. Composing against the square instead is what
   pushed v1's landings below the fold. */

/** `.hero-globe`: `--globe-size: min(165svh, 150vw)`. */
export const HERO_GLOBE_HEIGHT_FRACTION = 1.65
export const HERO_GLOBE_WIDTH_FRACTION = 1.5
/** …`transform: translate(-50%, 36%)` against `bottom: 0`. */
export const HERO_GLOBE_DROP = 0.36
/** The desktop window the landing is composed and gated against. */
export const REFERENCE_WINDOW_WIDTH = 1600
export const REFERENCE_WINDOW_HEIGHT = 1000

/** The render surface, in CSS pixels: the View's own box in window coordinates
 * plus the window that crops it. Globe measures this; the gate assumes the
 * reference desktop. */
export interface PlateViewport {
  viewWidth: number
  viewHeight: number
  viewLeft: number
  viewTop: number
  windowWidth: number
  windowHeight: number
}

/**
 * The viewport `.hero-globe`'s CSS produces at a given window size. Globe
 * passes the View's measured box when it has one; this is the fallback, and
 * the gate's default. If that rule in site.css moves, this moves with it.
 */
export function heroGlobeViewport(
  windowWidth: number,
  windowHeight: number
): PlateViewport {
  const size = Math.min(
    HERO_GLOBE_HEIGHT_FRACTION * windowHeight,
    HERO_GLOBE_WIDTH_FRACTION * windowWidth
  )
  return {
    viewWidth: size,
    viewHeight: size,
    viewLeft: (windowWidth - size) / 2,
    viewTop: windowHeight - size + HERO_GLOBE_DROP * size,
    windowWidth,
    windowHeight,
  }
}

export const DEFAULT_PLATE_VIEWPORT = heroGlobeViewport(
  REFERENCE_WINDOW_WIDTH,
  REFERENCE_WINDOW_HEIGHT
)

/** Eight kilometres is a town-sized claim, small enough to remain an outline. */
export const TOWN_RING_RADIUS = 8 / 6371
/** Islands keep a broader soft footprint because their declared object is area. */
export const ISLAND_REACH = 0.045
/** Fiords stay tighter so the tint follows their own coastal land, not the region. */
export const FIORD_REACH = 0.03

/** Mirrors `PlacePrecision` in content: the words are editorial, the reach is
 * geometry, and this module owns the geometry. */
export type PlatePrecision = 'venue' | 'town' | 'island' | 'fiord' | 'country' | 'region'

/**
 * How far a member's declared precision reaches, in radians. A venue, country
 * or region contributes its anchor alone: the first is a point, and the last
 * two are washes whose extent is the feature's own land, which the box has no
 * business guessing at.
 */
export function precisionReach(precision: PlatePrecision): number {
  switch (precision) {
    case 'town': return TOWN_RING_RADIUS
    case 'island': return ISLAND_REACH
    case 'fiord': return FIORD_REACH
    default: return 0
  }
}

/** Screen-aligned tangent frame at `centroid`: east is right, north is up. */
export interface PlateBasis {
  east: Vec3
  north: Vec3
}

export function plateBasis(centroid: Vec3): PlateBasis {
  const c = normalize(centroid)
  if (length(c) <= EPSILON) throw new RangeError('plate basis requires a non-zero centroid')

  // At a pole every meridian is north; the prime meridian is the honest pick.
  const up: Vec3 = Math.abs(c[1]) > 1 - 1e-9 ? [0, 0, 1] : [0, 1, 0]
  const alignment = dot(c, up)
  const north = normalize([
    up[0] - c[0] * alignment,
    up[1] - c[1] * alignment,
    up[2] - c[2] * alignment,
  ])
  const east = normalize([
    north[1] * c[2] - north[2] * c[1],
    north[2] * c[0] - north[0] * c[2],
    north[0] * c[1] - north[1] * c[0],
  ])
  return { east, north }
}

/**
 * `plateProject` in the tangent plane's own two numbers: east and north
 * offsets in radians, before any spread. Multiply by spread for plate units.
 */
export function plateLocal(
  direction: Vec3,
  centroid: Vec3,
  basis: PlateBasis = plateBasis(centroid)
): readonly [number, number] {
  const c = normalize(centroid)
  const d = normalize(direction)
  if (length(c) <= EPSILON || length(d) <= EPSILON) {
    throw new RangeError('plate projection requires non-zero vectors')
  }

  const alignment = clamp(dot(d, c), -1, 1)
  const alpha = Math.acos(alignment)
  if (alpha <= EPSILON) return [0, 0]

  const tangent = normalize([
    d[0] - c[0] * alignment,
    d[1] - c[1] * alignment,
    d[2] - c[2] * alignment,
  ])
  return [alpha * dot(tangent, basis.east), alpha * dot(tangent, basis.north)]
}

/** exact inverse of `plateLocal` */
export function plateFromLocal(
  [east, north]: readonly [number, number],
  centroid: Vec3,
  basis: PlateBasis = plateBasis(centroid)
): Vec3 {
  const c = normalize(centroid)
  if (length(c) <= EPSILON) throw new RangeError('plate projection requires a non-zero centroid')

  const alpha = Math.hypot(east, north)
  if (alpha <= EPSILON) return c

  const ex = east / alpha
  const nx = north / alpha
  const tangent: Vec3 = [
    basis.east[0] * ex + basis.north[0] * nx,
    basis.east[1] * ex + basis.north[1] * nx,
    basis.east[2] * ex + basis.north[2] * nx,
  ]
  const cosAlpha = Math.cos(alpha)
  const sinAlpha = Math.sin(alpha)
  return normalize([
    c[0] * cosAlpha + tangent[0] * sinAlpha,
    c[1] * cosAlpha + tangent[1] * sinAlpha,
    c[2] * cosAlpha + tangent[2] * sinAlpha,
  ])
}

/** What the visitor can actually see of the landed table, in TABLE units
 * (radians × spread), measured through the shipped camera and pose. */
export interface PlateViewFrame {
  /** the visible window's width and height on the table's own plane, measured
   * per axis. The rake and the roll shear the table's axes, so these are the
   * honest answer to "how much east fits" and not the corners' answer — the
   * usable rect's margins are what absorbs the difference. */
  frameWidth: number
  frameHeight: number
  /** where the window's centre sits relative to the plate's centre. Rarely
   * zero: the square view hangs off the bottom of the page, and the rake puts
   * the plate's centre below the camera's axis. */
  centerEast: number
  centerNorth: number
  /** screen pixels per table unit along each axis, as rendered */
  pixelsPerEast: number
  pixelsPerNorth: number
  /**
   * The exact map from table offsets (east, north in TABLE units, measured
   * from the plate's centre) to the visible window in halves: ±1 is the
   * window's edge, +y is up. `[east, north, 1] · screenX` and the same for
   * screenY. Shear and all, so the sampler and the gate can ask precisely
   * "would the visitor see this" instead of approximately.
   */
  screenX: readonly [number, number, number]
  screenY: readonly [number, number, number]
  /** area of the visible window on the table's plane, in square table units */
  windowArea: number
}

/**
 * Where the table's own east/north axes land on screen, and therefore how much
 * of the table the visitor sees and where its centre is.
 *
 * This walks the same arithmetic the render path does — the landed Euler pose,
 * the perspective camera, the View's box, the window's crop — rather than
 * assuming a rectangle, because every assumed number in this file's first
 * draft was wrong by a factor of two in one direction or the other. Two probe
 * offsets give the 2×2 screen Jacobian; its columns are the per-axis scales
 * and its inverse carries the window's centre back onto the table.
 */
export function plateViewFrame(
  center: Vec3,
  viewport: PlateViewport = DEFAULT_PLATE_VIEWPORT
): PlateViewFrame {
  const c = normalize(center)
  if (length(c) <= EPSILON) throw new RangeError('a view frame needs a non-zero centre')

  /* The pose Globe builds for the landing, from the same constants. */
  const latitude = Math.asin(clamp(c[1], -1, 1))
  const yaw = Math.atan2(c[2], c[0]) - Math.PI / 2 + PLATE_TABLE_YAW
  const tilt = latitude - PLATE_CAMERA_ELEVATION - PLATE_TABLE_TILT + PLATE_LANDED_PAN_TILT
  const cx = Math.cos(tilt)
  const sx = Math.sin(tilt)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cz = Math.cos(PLATE_GROUP_ROLL)
  const sz = Math.sin(PLATE_GROUP_ROLL)
  /* three.js composes an Euler in 'XYZ' order as Rx·Ry·Rz. */
  const m00 = cy * cz
  const m01 = -cy * sz
  const m02 = sy
  const m10 = cx * sz + sx * sy * cz
  const m11 = cx * cz - sx * sy * sz
  const m12 = -sx * cy
  const m20 = sx * sz - cx * sy * cz
  const m21 = sx * cz + cx * sy * sz
  const m22 = cx * cy

  const tanHalfFov = Math.tan((PLATE_CAMERA_FOV_DEGREES * DEG) / 2)
  const aspect = viewport.viewWidth / Math.max(EPSILON, viewport.viewHeight)
  const toScreen = (point: Vec3): readonly [number, number] => {
    const x = m00 * point[0] + m01 * point[1] + m02 * point[2] - PLATE_CAMERA_POSITION[0]
    const y = m10 * point[0] + m11 * point[1] + m12 * point[2] - PLATE_CAMERA_POSITION[1]
    const z = m20 * point[0] + m21 * point[1] + m22 * point[2] - PLATE_CAMERA_POSITION[2]
    const depth = Math.max(1e-3, -z)
    const ndcX = x / depth / (tanHalfFov * aspect)
    const ndcY = y / depth / tanHalfFov
    return [
      viewport.viewLeft + ((ndcX + 1) / 2) * viewport.viewWidth,
      viewport.viewTop + ((1 - ndcY) / 2) * viewport.viewHeight,
    ]
  }

  /* A finite difference rather than a derivative: the probe offset is the
     scale the composition works at, so any perspective curvature across the
     plate is averaged in exactly where it is felt. */
  const basis = plateBasis(c)
  const probe = 0.25
  const [px, py] = toScreen(c)
  const [ex, ey] = toScreen([
    c[0] + basis.east[0] * probe,
    c[1] + basis.east[1] * probe,
    c[2] + basis.east[2] * probe,
  ])
  const [nx, ny] = toScreen([
    c[0] + basis.north[0] * probe,
    c[1] + basis.north[1] * probe,
    c[2] + basis.north[2] * probe,
  ])
  const jxe = (ex - px) / probe
  const jye = (ey - py) / probe
  const jxn = (nx - px) / probe
  const jyn = (ny - py) / probe

  /* Column norms, not axis components: the roll and the table yaw shear the
     axes, and a unit of north costs its full screen length whichever way it
     leans. Slightly conservative, which is the right direction for a frame. */
  const pixelsPerEast = Math.max(1e-3, Math.hypot(jxe, jye))
  const pixelsPerNorth = Math.max(1e-3, Math.hypot(jxn, jyn))

  const left = Math.max(viewport.viewLeft, 0)
  const right = Math.min(viewport.viewLeft + viewport.viewWidth, viewport.windowWidth)
  const top = Math.max(viewport.viewTop, 0)
  const bottom = Math.min(viewport.viewTop + viewport.viewHeight, viewport.windowHeight)
  const visibleWidth = Math.max(1, right - left)
  const visibleHeight = Math.max(1, bottom - top)

  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2
  const halfWidthPx = visibleWidth / 2
  const halfHeightPx = visibleHeight / 2
  const dx = centerX - px
  const dy = centerY - py
  const determinant = jxe * jyn - jxn * jye
  const safe = Math.abs(determinant) > 1e-6 ? determinant : 1e-6

  /* Screen y counts downward and the frame's y counts up, which is the whole
     reason for the minus signs and worth one line rather than one bug. */
  const screenX: readonly [number, number, number] = [
    jxe / halfWidthPx,
    jxn / halfWidthPx,
    -dx / halfWidthPx,
  ]
  const screenY: readonly [number, number, number] = [
    -jye / halfHeightPx,
    -jyn / halfHeightPx,
    dy / halfHeightPx,
  ]
  const screenDeterminant = Math.abs(screenX[0] * screenY[1] - screenX[1] * screenY[0])

  return {
    frameWidth: visibleWidth / pixelsPerEast,
    frameHeight: visibleHeight / pixelsPerNorth,
    centerEast: (jyn * dx - jxn * dy) / safe,
    centerNorth: (-jye * dx + jxe * dy) / safe,
    pixelsPerEast,
    pixelsPerNorth,
    screenX,
    screenY,
    windowArea: 4 / Math.max(1e-9, screenDeterminant),
  }
}

/** one member of a cluster, as the framing sees it: an anchor and its reach */
export interface PlateFrameMember {
  direction: Vec3
  /** angular reach of this member's precision geometry, in radians */
  reach: number
}


export interface PlateFrameOptions {
  /** the render surface the landing is composed against */
  viewport: PlateViewport
  /** fraction of the binding USABLE axis the padded box should fill */
  fill: number
  /**
   * Hold the sheet's clear third out of the usable rect. Off until a sheet
   * actually opens there (stage D): reserving space for an object that does
   * not exist yet only pushes every landing into the remaining two thirds,
   * which is precisely what cornered v1's.
   */
  reserveSheetSpace: boolean
}

/**
 * The part of the visible window a content anchor may land in, in frame
 * halves: ±1 is the window's own edge. Anchors are not points — each carries a
 * print stack and a caption line, and the top band carries the title, the meta
 * line and `← world` — so the composition happens in here, not in the frame.
 */
export interface PlateUsableRect {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Constant in frame halves, because every margin is a fraction of the frame. */
export function plateUsableRect(reserveSheetSpace = false): PlateUsableRect {
  const sheet = reserveSheetSpace ? SHEET_CLEAR_FRACTION : 0
  return {
    minX: -1 + 2 * (PRINT_MARGIN_FRACTION + sheet),
    maxX: 1 - 2 * PRINT_MARGIN_FRACTION,
    minY: -1 + 2 * CAPTION_MARGIN_FRACTION,
    maxY: 1 - 2 * TITLE_BAND_FRACTION,
  }
}

export interface PlateFrame {
  /** the direction the plate projects about — the frame's centre, not the mean */
  center: Vec3
  centerLatLng: LatLng
  spread: number
  capRadius: number
  /** padded content box, in radians, about the box's own centre */
  boxWidth: number
  boxHeight: number
  /** how much of the binding VISIBLE-window axis the landed box covers */
  boxFill: number
  /** how much of the binding USABLE axis it covers — what the fit aimed at */
  usableFill: number
  /** ground the visible window's long axis spans once landed, in radians */
  groundSpan: number
  /** which rule set the final spread; 'fit' means the content chose it */
  spreadLimit: 'fit' | 'min' | 'max' | 'separation' | 'degenerate'
  /** the content box had no extent worth fitting, so the landing is v1's. Kept
   * apart from `spreadLimit` because the separation floor can still speak last */
  degenerate: boolean
  /** true when the sheet's third was held clear of the usable rect */
  sheetReserved: boolean
  /** furthest member anchor plus its reach, measured from `center` */
  memberReach: number
  /** the sampled cap had to grow past MAX_CAP_RADIUS to cover the window */
  capExceedsMax: boolean
  /** the visible window, in table units (`view.frameWidth`, kept flat too) */
  frameWidth: number
  frameHeight: number
  view: PlateViewFrame
  usable: PlateUsableRect
  /** area of the seeded window (visible window plus its fade margin), in
   * square table units — what the dot budget is spent across */
  sampleArea: number
}

/** how many times the box is re-measured about its own centre; two is plenty
 * at cap scale, where the projection is near-affine */
const FIT_ITERATIONS = 3
/**
 * How many times the composition re-solves. The frame the camera sees depends
 * on where the plate is centred, and where the plate is centred depends on the
 * frame, so this is a fixed point rather than a formula. It converges in two.
 */
const COMPOSE_PASSES = 3
/** The sampled cap covers the seeded window with this much to spare, so no
 * rejection ever happens at the cap's arc where the eye could read it. */
const CAP_WINDOW_SLACK = 1.02

/**
 * Choose the plate's centre and spread from what the cluster actually
 * contains. The box is measured in the tangent plane, the spread is whatever
 * makes it fill `fill` of the usable rect's binding axis, and the centre is
 * then moved so the box sits in the middle of that rect — below the title
 * band, inside the print margins, and clear of the sheet's third when one is
 * reserved. Pin separation is a floor on the spread, never a target.
 */
export function fitPlateFrame(
  members: readonly PlateFrameMember[],
  options: Partial<PlateFrameOptions> = {}
): PlateFrame {
  if (members.length === 0) throw new RangeError('a plate frame needs at least one member')
  const viewport = options.viewport ?? DEFAULT_PLATE_VIEWPORT
  const fill = options.fill ?? BOX_FILL_TARGET
  const reserveSheetSpace = options.reserveSheetSpace ?? false
  const usable = plateUsableRect(reserveSheetSpace)

  const directions = members.map((member) => normalize(member.direction))
  const sum = directions.reduce<[number, number, number]>(
    (acc, d) => [acc[0] + d[0], acc[1] + d[1], acc[2] + d[2]],
    [0, 0, 0]
  )
  // An exactly antipodal set has no spherical mean; a cap can never hold one,
  // and the first member is the honest seed if that ever changes.
  let boxCenter: Vec3 = length(sum) > EPSILON ? normalize(sum) : directions[0]

  let boxWidth = 0
  let boxHeight = 0
  for (let iteration = 0; iteration < FIT_ITERATIONS; iteration++) {
    const basis = plateBasis(boxCenter)
    let minEast = Infinity
    let maxEast = -Infinity
    let minNorth = Infinity
    let maxNorth = -Infinity
    for (let i = 0; i < directions.length; i++) {
      const [east, north] = plateLocal(directions[i], boxCenter, basis)
      const reach = Math.max(0, members[i].reach)
      minEast = Math.min(minEast, east - reach)
      maxEast = Math.max(maxEast, east + reach)
      minNorth = Math.min(minNorth, north - reach)
      maxNorth = Math.max(maxNorth, north + reach)
    }
    const pad = Math.max(maxEast - minEast, maxNorth - minNorth) * BOX_PADDING * 0.5
    boxWidth = maxEast - minEast + pad * 2
    boxHeight = maxNorth - minNorth + pad * 2
    boxCenter = plateFromLocal(
      [(minEast + maxEast) / 2, (minNorth + maxNorth) / 2],
      boxCenter,
      basis
    )
  }

  /* A cluster with no extent of its own — a singleton, or members inside one
     venue — has no box to fit, and fitting one anyway would zoom to whatever
     the ceiling allows and land the table at street scale. It keeps v1's
     landing instead: the cap it would have sampled, scaled to the plate radius
     v1 scaled it to, under v1's ceiling. */
  const degenerate = Math.max(boxWidth, boxHeight) < DEGENERATE_BOX_SPAN
  let boxReach = 0
  for (let i = 0; i < directions.length; i++) {
    boxReach = Math.max(
      boxReach,
      angularDistanceVec3(directions[i], boxCenter) + Math.max(0, members[i].reach)
    )
  }
  const legacySpread = clamp(
    TARGET_PLATE_RADIUS / clamp(boxReach + CAP_PADDING, MIN_CAP_RADIUS, MAX_CAP_RADIUS),
    MIN_SPREAD,
    LEGACY_SPREAD_MAX
  )

  let minPairwise = Infinity
  for (let a = 0; a < directions.length; a++) {
    for (let b = a + 1; b < directions.length; b++) {
      minPairwise = Math.min(minPairwise, angularDistanceVec3(directions[a], directions[b]))
    }
  }

  let center = boxCenter
  let view = plateViewFrame(boxCenter, viewport)
  let spread = MIN_SPREAD
  let spreadLimit: PlateFrame['spreadLimit'] = 'fit'
  for (let pass = 0; pass < COMPOSE_PASSES; pass++) {
    view = plateViewFrame(center, viewport)
    const usableWidth = ((usable.maxX - usable.minX) / 2) * view.frameWidth
    const usableHeight = ((usable.maxY - usable.minY) / 2) * view.frameHeight

    if (degenerate) {
      spread = legacySpread
      spreadLimit = 'degenerate'
    } else {
      spread = Math.min(
        boxWidth > EPSILON ? (fill * usableWidth) / boxWidth : SPREAD_MAX,
        boxHeight > EPSILON ? (fill * usableHeight) / boxHeight : SPREAD_MAX
      )
      spreadLimit = 'fit'
      if (spread > SPREAD_MAX) {
        spread = SPREAD_MAX
        spreadLimit = 'max'
      } else if (spread < MIN_SPREAD) {
        spread = MIN_SPREAD
        spreadLimit = 'min'
      }
    }

    /* Two anchors closer together than the pickup cards are wide read as one
       place. The floor pushes them apart even when the box is happy. */
    if (minPairwise < Infinity && minPairwise * spread < MIN_PIN_SEPARATION) {
      const separationSpread = minPairwise > 1e-6
        ? Math.min(SPREAD_MAX, MIN_PIN_SEPARATION / minPairwise)
        : SPREAD_MAX
      if (separationSpread > spread) {
        spread = separationSpread
        spreadLimit = 'separation'
      }
    }

    /* Where the box has to sit relative to the PLATE's centre for it to land
       in the middle of the usable rect: the window's own offset from the plate
       centre, plus the usable rect's offset inside the window. Moving the
       projection centre the other way is the same composition and costs the
       projection nothing. */
    const east = view.centerEast + ((usable.minX + usable.maxX) / 4) * view.frameWidth
    const north = view.centerNorth + ((usable.minY + usable.maxY) / 4) * view.frameHeight
    center = plateFromLocal(
      [-east / spread, -north / spread],
      boxCenter,
      plateBasis(boxCenter)
    )
  }

  /* Report the frame the landing actually gets, measured at the centre it
     actually lands on, so a gate assertion about it can fail. */
  view = plateViewFrame(center, viewport)
  const usableWidth = ((usable.maxX - usable.minX) / 2) * view.frameWidth
  const usableHeight = ((usable.maxY - usable.minY) / 2) * view.frameHeight

  let memberReach = 0
  for (let i = 0; i < directions.length; i++) {
    memberReach = Math.max(
      memberReach,
      angularDistanceVec3(directions[i], center) + Math.max(0, members[i].reach)
    )
  }

  /* The cap is what the sampler walks, so it has two jobs: cover the content,
     and cover the window the dots are seeded into. Covering the content wins
     outright — an anchor off the table is a lie about where a photograph was
     taken — and covering the window is what keeps terrain from stopping in
     mid-viewport. MIN_CAP_RADIUS is not a floor here: it would only widen the
     rejection sampler's search past the window at deep zooms, for ground the
     camera cannot see. */
  const edge = 1 + PLATE_SAMPLE_MARGIN
  let windowReach = 0
  for (const [hx, hy] of [[-edge, -edge], [edge, -edge], [-edge, edge], [edge, edge]]) {
    const [east, north] = plateFrameOffset(view, hx, hy)
    windowReach = Math.max(windowReach, Math.hypot(east, north))
  }
  const capRadius = Math.max(
    memberReach + CAP_PADDING,
    (windowReach / spread) * CAP_WINDOW_SLACK
  )

  return {
    center,
    centerLatLng: vec3ToLatLng(center),
    spread,
    capRadius,
    boxWidth,
    boxHeight,
    boxFill: Math.max(
      (boxWidth * spread) / view.frameWidth,
      (boxHeight * spread) / view.frameHeight
    ),
    usableFill: Math.max(
      usableWidth > EPSILON ? (boxWidth * spread) / usableWidth : Infinity,
      usableHeight > EPSILON ? (boxHeight * spread) / usableHeight : Infinity
    ),
    groundSpan: view.frameWidth / spread,
    spreadLimit,
    degenerate,
    sheetReserved: reserveSheetSpace,
    memberReach,
    capExceedsMax: capRadius > MAX_CAP_RADIUS,
    frameWidth: view.frameWidth,
    frameHeight: view.frameHeight,
    view,
    usable,
    sampleArea: view.windowArea * edge * edge,
  }
}

/**
 * The inverse of the view's screen map: where a point in the window (in frame
 * halves) sits on the table, in table units from the plate's centre.
 */
export function plateFrameOffset(
  view: PlateViewFrame,
  x: number,
  y: number
): readonly [number, number] {
  const [a11, a12, b1] = view.screenX
  const [a21, a22, b2] = view.screenY
  const determinant = a11 * a22 - a12 * a21
  const safe = Math.abs(determinant) > 1e-9 ? determinant : 1e-9
  const dx = x - b1
  const dy = y - b2
  return [(a22 * dx - a12 * dy) / safe, (-a21 * dx + a11 * dy) / safe]
}

/**
 * Where a direction lands in the visible window, in frame halves: ±1 is the
 * window's edge, and `frame.usable` is the box inside it the composition is
 * responsible for. One implementation, so the gate and the render path cannot
 * disagree about what "on screen" means.
 */
export function plateFramePosition(
  direction: Vec3,
  frame: PlateFrame,
  basis: PlateBasis = plateBasis(frame.center)
): readonly [number, number] {
  const [east, north] = plateLocal(direction, frame.center, basis)
  const e = east * frame.spread
  const n = north * frame.spread
  const [a11, a12, b1] = frame.view.screenX
  const [a21, a22, b2] = frame.view.screenY
  return [a11 * e + a12 * n + b1, a21 * e + a22 * n + b2]
}

/* ---------- the dot budget ----------

   The plate's resident buffer, split between terrain and graticule. It lives
   here rather than in Globe because the landed PITCH is a framing decision:
   the budget is spent across the seeded window, and this file is what knows
   how big that window is. */

/** terrain marks the buffer can hold */
export const PLATE_TERRAIN_CAPACITY = 22200
/** graticule marks the buffer can hold */
export const PLATE_GRID_CAPACITY = 1800
/** Minimum accepted terrain marks needed for a 8–14px landed land-fill pitch. */
export const MIN_PLATE_TERRAIN_POINTS = 12000
export const MIN_PLATE_GRID_POINTS = 720

/**
 * How many terrain marks to seed for a given seeded-window area. v1 scaled
 * this by the cap's area, which asked the wrong question: every cap lands at
 * roughly the same size on screen, so the budget that matters is per square
 * table unit of window, not per steradian of ground.
 */
export function plateTerrainBudget(sampleArea: number): number {
  return Math.round(
    clamp(PLATE_LANDED_DENSITY * sampleArea, MIN_PLATE_TERRAIN_POINTS, PLATE_TERRAIN_CAPACITY)
  )
}

/** The graticule rides the same ratio, so a sparse plate is sparse in both. */
export function plateGridBudget(terrainBudget: number): number {
  return Math.round(
    clamp(
      (PLATE_GRID_CAPACITY * terrainBudget) / PLATE_TERRAIN_CAPACITY,
      MIN_PLATE_GRID_POINTS,
      PLATE_GRID_CAPACITY
    )
  )
}
