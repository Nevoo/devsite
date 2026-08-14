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
