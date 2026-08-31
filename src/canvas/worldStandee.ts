import * as THREE from 'three'

/**
 * Silhouette → standee: trace the outline of a sprite against its flat
 * background colour and extrude it into a thin acrylic-figure slab. This is
 * the whole "2.5D" of the world lab — no depth estimation, no gen-3D, just
 * the alpha silhouette given real thickness so it catches the world's spin.
 *
 * Marching squares over a downsampled mask, loops chained, simplified with
 * Douglas-Peucker, holes ignored on purpose: interior gaps (a lattice
 * tower's sky windows) keep their background pixels on the front face,
 * which melt into the page charcoal anyway. Pixel art is the best case
 * here — hard edges trace clean.
 */

interface TraceOptions {
  /** flat background to key the silhouette against */
  key: THREE.Color
  /** colour-distance below which a pixel counts as background */
  threshold: number
  /** working resolution cap for the mask (longest image side) */
  maxSize: number
}

const DEFAULTS: TraceOptions = {
  key: new THREE.Color('#101013'),
  threshold: 0.14,
  maxSize: 180,
}

/** shapes in x ∈ [0, aspect], y ∈ [0, 1] (y up), plus the traced aspect */
export interface Silhouette {
  shapes: THREE.Shape[]
  aspect: number
}

export function traceSilhouette(
  image: HTMLImageElement | ImageBitmap,
  options: Partial<TraceOptions> = {}
): Silhouette | null {
  const { key, threshold, maxSize } = { ...DEFAULTS, ...options }
  const iw = image.width
  const ih = image.height
  if (!iw || !ih) return null
  const scale = Math.min(1, maxSize / Math.max(iw, ih))
  const w = Math.max(2, Math.round(iw * scale))
  const h = Math.max(2, Math.round(ih * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data

  // mask over pixel corners, padded one cell so edge-touching sprites close
  const gw = w + 2
  const gh = h + 2
  const mask = new Uint8Array(gw * gh)
  const kr = key.r * 255
  const kg = key.g * 255
  const kb = key.b * 255
  const limit = threshold * 255 * Math.sqrt(3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const alpha = data[i + 3]
      const dr = data[i] - kr
      const dg = data[i + 1] - kg
      const db = data[i + 2] - kb
      const solid = alpha > 40 && Math.sqrt(dr * dr + dg * dg + db * db) > limit
      if (solid) mask[(y + 1) * gw + (x + 1)] = 1
    }
  }

  /* marching squares: emit one segment per boundary cell, keyed by start
     point so loops chain in O(n). Points live on cell-edge midpoints. */
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= gw || y >= gh ? 0 : mask[y * gw + x]
  const segments = new Map<string, [number, number, number, number]>()
  const putSeg = (x1: number, y1: number, x2: number, y2: number) => {
    segments.set(`${x1},${y1}`, [x1, y1, x2, y2])
  }
  for (let y = 0; y < gh - 1; y++) {
    for (let x = 0; x < gw - 1; x++) {
      const tl = at(x, y)
      const tr = at(x + 1, y)
      const bl = at(x, y + 1)
      const br = at(x + 1, y + 1)
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl
      if (code === 0 || code === 15) continue
      // edge midpoints of this cell, in grid units
      const top: [number, number] = [x + 0.5, y]
      const right: [number, number] = [x + 1, y + 0.5]
      const bottom: [number, number] = [x + 0.5, y + 1]
      const left: [number, number] = [x, y + 0.5]
      // segments oriented so solid stays on the LEFT of travel
      switch (code) {
        case 1: putSeg(...bottom, ...left); break
        case 2: putSeg(...right, ...bottom); break
        case 3: putSeg(...right, ...left); break
        case 4: putSeg(...top, ...right); break
        case 5: putSeg(...top, ...left); putSeg(...bottom, ...right); break
        case 6: putSeg(...top, ...bottom); break
        case 7: putSeg(...top, ...left); break
        case 8: putSeg(...left, ...top); break
        case 9: putSeg(...bottom, ...top); break
        case 10: putSeg(...left, ...bottom); putSeg(...right, ...top); break
        case 11: putSeg(...right, ...top); break
        case 12: putSeg(...left, ...right); break
        case 13: putSeg(...bottom, ...right); break
        case 14: putSeg(...left, ...bottom); break
      }
    }
  }

  const loops: [number, number][][] = []
  while (segments.size) {
    const first = segments.values().next().value as [number, number, number, number]
    const loop: [number, number][] = [[first[0], first[1]]]
    segments.delete(`${first[0]},${first[1]}`)
    let cursor: [number, number] = [first[2], first[3]]
    let guard = segments.size + 4
    while (guard-- > 0) {
      loop.push(cursor)
      const next = segments.get(`${cursor[0]},${cursor[1]}`)
      if (!next) break
      segments.delete(`${cursor[0]},${cursor[1]}`)
      cursor = [next[2], next[3]]
    }
    if (loop.length >= 8) loops.push(simplify(loop, 1.25))
  }
  if (!loops.length) return null

  /* outer loops only: drop any loop whose head sits inside a bigger one
     (holes), and dust-sized islands */
  const area = (pts: [number, number][]) => {
    let sum = 0
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      sum += x1 * y2 - x2 * y1
    }
    return Math.abs(sum) / 2
  }
  const sized = loops
    .map((pts) => ({ pts, area: area(pts) }))
    .filter((l) => l.area > (gw * gh) / 400)
    .sort((a, b) => b.area - a.area)
  const outers = sized.filter(
    (l, i) => !sized.some((big, j) => j < i && inside(l.pts[0], big.pts))
  )
  if (!outers.length) return null

  const aspect = w / h
  const shapes = outers.map(({ pts }) => {
    const shape = new THREE.Shape()
    pts.forEach(([x, y], i) => {
      // grid → normalized, y flipped to three's up; the pad cell comes off
      const nx = ((x - 1) / h) // divide by h so y spans 1 and x spans aspect
      const ny = 1 - (y - 1) / h
      if (i === 0) shape.moveTo(nx, ny)
      else shape.lineTo(nx, ny)
    })
    shape.closePath()
    return shape
  })
  return { shapes, aspect }
}

function inside(point: [number, number], polygon: [number, number][]) {
  let odd = false
  const [px, py] = point
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      odd = !odd
    }
  }
  return odd
}

/** Douglas-Peucker on a closed loop (endpoints pinned per half) */
function simplify(points: [number, number][], epsilon: number) {
  if (points.length < 6) return points
  const mid = Math.floor(points.length / 2)
  return [
    ...rdp(points.slice(0, mid + 1), epsilon).slice(0, -1),
    ...rdp(points.slice(mid), epsilon).slice(0, -1),
  ]
}

function rdp(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  let maxDist = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]
    const dist = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
    if (dist > maxDist) {
      maxDist = dist
      index = i
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  return [
    ...rdp(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...rdp(points.slice(index), epsilon),
  ]
}

/** the standee slab: unit height, bottom-centred pivot, depth along ±z */
export function buildStandeeGeometry(silhouette: Silhouette, depth: number) {
  const geometry = new THREE.ExtrudeGeometry(silhouette.shapes, {
    depth,
    bevelEnabled: false,
  })
  geometry.translate(-silhouette.aspect / 2, 0, -depth / 2)

  // front/back faces (material group 0) get bbox UVs so the sprite maps 1:1;
  // the side walls (group 1) are flat colour and never read theirs
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  if (uv) {
    for (const group of geometry.groups) {
      if (group.materialIndex !== 0) continue
      for (let i = group.start; i < group.start + group.count; i++) {
        uv.setXY(
          i,
          (position.getX(i) + silhouette.aspect / 2) / silhouette.aspect,
          position.getY(i)
        )
      }
    }
    uv.needsUpdate = true
  }
  return geometry
}
