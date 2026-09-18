/** Project the actual country silhouettes through the landed camera.
 * Run with: node scripts/country-frame-check.mjs */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { decodeCountries } from '../src/canvas/countries.ts'
import { clusters } from '../src/content/clusters.ts'
import {
  countryCameraZoom, countryFrameLayout, countrySurfacePointInto, fitPlateFrame,
  heroGlobeViewport, latLngToVec3, plateProject, angularDistanceVec3,
  PLATE_CAMERA_POSITION, PLATE_CAMERA_FOV_DEGREES, PLATE_CAMERA_ELEVATION,
  PLATE_TABLE_TILT, PLATE_TABLE_YAW, PLATE_LANDED_PAN_TILT, PLATE_GROUP_ROLL,
} from '../src/canvas/plate.ts'

const bytes = readFileSync(new URL('../public/countries.bin', import.meta.url))
const atlas = decodeCountries(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
let count = 0
for (const [width, height] of [[1600, 1000], [1280, 720], [393, 852]]) {
  const viewport = heroGlobeViewport(width, height)
  const layout = countryFrameLayout(viewport)
  for (const cluster of clusters) {
    const members = []
    for (const ring of atlas.outlines.get(cluster.countryCode) ?? []) {
      for (let i = 0; i < ring.length; i += 2) {
        const direction = latLngToVec3([ring[i] * 180 / Math.PI, ring[i + 1] * 180 / Math.PI])
        if (direction.reduce((sum, value, axis) => sum + value * cluster.centroid[axis], 0) > 0.65) {
          members.push({ direction, reach: 0 })
        }
      }
    }
    assert.ok(members.length, `${cluster.countryCode}: missing silhouette`)
    const frame = fitPlateFrame(members, layout.frameOptions)
    assert.ok(frame.capRadius < Math.PI, `${cluster.countryCode}: sampling cap exceeds the sphere`)
    const group = new THREE.Group()
    group.rotation.set(
      frame.centerLatLng[0] * Math.PI / 180 - PLATE_CAMERA_ELEVATION - PLATE_TABLE_TILT + PLATE_LANDED_PAN_TILT,
      Math.atan2(frame.center[2], frame.center[0]) - Math.PI / 2 + PLATE_TABLE_YAW,
      PLATE_GROUP_ROLL
    )
    group.updateMatrixWorld()
    const center = new THREE.Vector3(...frame.center).applyMatrix4(group.matrixWorld)
    const camera = new THREE.PerspectiveCamera(PLATE_CAMERA_FOV_DEGREES, 1, 0.01, 100)
    camera.position.set(...PLATE_CAMERA_POSITION).sub(center).multiplyScalar(1 / countryCameraZoom(frame.spread)).add(center)
    camera.updateMatrixWorld()
    const projected = center.clone().project(camera)
    camera.setViewOffset(
      viewport.viewWidth, viewport.viewHeight,
      (projected.x * 0.5 + 0.5) * viewport.viewWidth - width * layout.focusX + viewport.viewLeft,
      (0.5 - projected.y * 0.5) * viewport.viewHeight - height * layout.focusY + viewport.viewTop,
      viewport.viewWidth, viewport.viewHeight
    )
    const points = members.map(({ direction }) => {
      const point = Float64Array.from(plateProject(direction, frame.center, frame.spread))
      countrySurfacePointInto(point, 0, frame.center, frame.spread, angularDistanceVec3(direction, frame.center))
      const ndc = new THREE.Vector3(...point).applyMatrix4(group.matrixWorld).project(camera)
      return [viewport.viewLeft + (ndc.x * 0.5 + 0.5) * viewport.viewWidth,
        viewport.viewTop + (0.5 - ndc.y * 0.5) * viewport.viewHeight]
    })
    const bounds = [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
      Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))]
    assert.ok(bounds.every(Number.isFinite), `${cluster.countryCode}: invalid projection`)
    assert.ok(bounds[0] >= 0 && bounds[1] <= width && bounds[2] >= 0 && bounds[3] <= height,
      `${cluster.countryCode} ${width}×${height}: clipped silhouette ${bounds.map(Math.round)}`)
    if (width > 700) assert.ok(bounds[1] < width * 0.44,
      `${cluster.countryCode}: silhouette enters the photo column`)
    count++
  }
}
console.log(`PASS ${count} country silhouettes: finite, inside the viewport, clear of the desktop photo column`)
