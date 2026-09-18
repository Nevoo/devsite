import * as THREE from 'three'

import { COUNTRY_CURVATURE } from '../plate'

/**
 * Shared globe programs and mutable state. The persistent canvas can retain
 * these exact shader patches without importing the route-owned Globe.
 */
type GlobeShader = {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, { value: unknown }>
}

/** The occluding mass, as the dot shaders see it. */
export const OCC_RADIUS = { value: 0 }

/** Sphere (0) to the country surface (1), shared by every dot material. */
export const MORPH = { value: 0 }

/** Occlusion attenuation: full sphere occlusion at 1, none at 0. */
export const FLAT_OCC = { value: 1 }

/** Country detail joins the same approach; it has no spatial scan clock. */
export const DETAIL = { value: 0 }

/** Group-local normal of the destination tangent frame, set when it is seeded. */
export const PLATE_NORMAL = { value: new THREE.Vector3(0, 0, 1) }

/** Linear colors, converted once by Three rather than in every dot program. */
export const ACCENT = { value: new THREE.Color('#ff2d1a') }
const KEY_COLOR = { value: new THREE.Color('#fff3e4') }

/**
 * A broad studio key and a weaker scarlet side light, both in view space.
 * Normals pass through normalMatrix, so the moving camera, rotating world and
 * approaching terrain all see the same upper-left light in the composition.
 */
const KEY_DIRECTION = { value: new THREE.Vector3(-0.58, 0.66, 0.68).normalize() }
const SIDE_DIRECTION = { value: new THREE.Vector3(0.94, 0.12, 0.24).normalize() }

/** View-space depth of the soft band behind the globe's limb. */
const OCC_SOFT = { value: 0.04 }
const WASH_LIFT = 0.55

const LIGHT_GLSL = /* glsl */ `
uniform vec3 uGlobeKeyDirection;
uniform vec3 uGlobeSideDirection;
uniform vec3 uGlobeKeyColor;
uniform vec3 uAccent;

vec3 globeNormal(vec3 value) {
  return value / max(length(value), 0.00001);
}

float globeKey(vec3 normalView) {
  return smoothstep(-0.24, 0.96, dot(normalView, uGlobeKeyDirection));
}

vec3 globeLight(vec3 normalView) {
  float key = globeKey(normalView);
  float side = pow(max(dot(normalView, uGlobeSideDirection), 0.0), 2.0);
  return vec3(0.24)
    + uGlobeKeyColor * (0.88 * key)
    + uAccent * (0.065 * side * (1.0 - 0.65 * key));
}
`

function shareLighting(shader: GlobeShader) {
  shader.uniforms.uGlobeKeyDirection = KEY_DIRECTION
  shader.uniforms.uGlobeSideDirection = SIDE_DIRECTION
  shader.uniforms.uGlobeKeyColor = KEY_COLOR
  shader.uniforms.uAccent = ACCENT
}

/**
 * Development, sphere occlusion and shared surface lighting for stock points
 * and route lines. Lighting runs per vertex; point fragments only multiply
 * their existing color ladder. No scene lights or environment asset required.
 */
export const patchDotAlpha = (shader: GlobeShader) => {
  shareLighting(shader)
  shader.uniforms.uOccR = OCC_RADIUS
  shader.uniforms.uOccSoft = OCC_SOFT
  shader.uniforms.uMorph = MORPH
  shader.uniforms.uFlat = FLAT_OCC
  shader.uniforms.uPlateNormal = PLATE_NORMAL
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
attribute float aAlpha;
attribute vec3 aPlate;
attribute float aTint;
varying float vAlpha;
varying float vTint;
varying vec3 vGlobeLight;
uniform float uOccR;
uniform float uOccSoft;
uniform float uMorph;
uniform float uFlat;
uniform vec3 uPlateNormal;
#define COUNTRY_CURVATURE ${COUNTRY_CURVATURE.toFixed(4)}
${LIGHT_GLSL}`
    )
    .replace(
      '#include <begin_vertex>',
      'vec3 transformed = mix(position, aPlate, uMorph);'
    )
    .replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
vAlpha = aAlpha;
vTint = aTint;
vec3 surfaceNormal = globeNormal(mix(globeNormal(position), mix(uPlateNormal, globeNormal(position), COUNTRY_CURVATURE), uMorph));
// Field particles stay unlit until the growing sphere gives them a surface.
float surfaceLight = smoothstep(0.05, 0.85, max(uOccR, uMorph));
vGlobeLight = mix(vec3(1.0), globeLight(globeNormal(normalMatrix * surfaceNormal)), surfaceLight);
{
  vec3 sphereC = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 rayDir = globeNormal(mvPosition.xyz);
  float along = dot(sphereC, rayDir);
  float miss2 = dot(sphereC, sphereC) - along * along;
  float r2 = uOccR * uOccR;
  if (uOccR > 0.0 && along > 0.0 && miss2 < r2) {
    float entry = along - sqrt(max(0.0, r2 - miss2));
    float occFactor = 1.0 - smoothstep(0.0, uOccSoft, length(mvPosition.xyz) - entry);
    vAlpha *= mix(1.0, occFactor, uFlat);
  }
}`
    )

  // Positive tint is a precision mark; negative tint lifts a broad claim.
  // Both sit on the lit ground. World visited-country tint releases with
  // world occlusion; the country shader keeps its own precision marks.
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
varying float vAlpha;
varying float vTint;
varying vec3 vGlobeLight;
uniform vec3 uAccent;
uniform float uFlat;
#define PLATE_WASH_LIFT ${WASH_LIFT.toFixed(2)}`
    )
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
float plateMark = clamp(vTint, 0.0, 1.0) * uFlat;
float plateLift = clamp(-vTint, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, plateMark);
diffuseColor.rgb *= vGlobeLight * (1.0 + plateLift * PLATE_WASH_LIFT);
diffuseColor.a *= vAlpha;`
    )
}

/**
 * Dense terrain carries its original sphere normal and its destination
 * terrain normal in group-local coordinates. The same MORPH that moves each
 * position blends its normal, so relief never changes lamps during arrival.
 * aShade may remain on geometry for existing CPU value classification, but
 * it is no longer a second, baked light in the fragment shader.
 */
export const patchPlateDots = (shader: GlobeShader) => {
  patchDotAlpha(shader)
  shader.uniforms.uDetail = DETAIL
  shader.vertexShader = shader.vertexShader
    .replace(
      'attribute float aAlpha;',
      /* glsl */ `attribute float aPointScale;
attribute vec3 aSphereNormal;
attribute vec3 aTerrainNormal;
uniform float uDetail;
attribute float aAlpha;`
    )
    .replace('vAlpha = aAlpha;', 'vAlpha = aAlpha * uDetail;')
    .replace(
      'vec3 surfaceNormal = globeNormal(mix(globeNormal(position), mix(uPlateNormal, globeNormal(position), COUNTRY_CURVATURE), uMorph));',
      /* glsl */ `// Coarse-first detail can render before terrain normals finish seeding.
vec3 countryNormal = mix(
  mix(uPlateNormal, aSphereNormal, COUNTRY_CURVATURE),
  aTerrainNormal,
  step(0.00001, dot(aTerrainNormal, aTerrainNormal))
);
vec3 surfaceNormal = globeNormal(mix(aSphereNormal, countryNormal, uMorph));`
    )
    .replace('gl_PointSize = size;', 'gl_PointSize = size * aPointScale;')
  shader.fragmentShader = shader.fragmentShader.replace(
    'float plateMark = clamp(vTint, 0.0, 1.0) * uFlat;',
    'float plateMark = clamp(vTint, 0.0, 1.0);'
  )
}

/**
 * Authored satin-charcoal surface under the dots. MeshBasicMaterial retains
 * the existing opacity/depth-write entrance contract while this patch supplies
 * broad diffuse light and a soft dielectric highlight. Its grazing haze is
 * evaluated on the sphere itself: no detached shell, bloom or neon outline.
 */
export const patchGlobeSurface = (shader: GlobeShader) => {
  shareLighting(shader)
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
varying vec3 vSurfaceNormal;
varying vec3 vSurfaceView;`
    )
    .replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
vSurfaceNormal = normalMatrix * normal;
vSurfaceView = -mvPosition.xyz;`
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
varying vec3 vSurfaceNormal;
varying vec3 vSurfaceView;
${LIGHT_GLSL}`
    )
    .replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
vec3 surfaceNormal = globeNormal(vSurfaceNormal);
vec3 surfaceView = globeNormal(vSurfaceView);
vec3 halfDirection = globeNormal(uGlobeKeyDirection + surfaceView);
float key = globeKey(surfaceNormal);
float halfDot = max(dot(surfaceNormal, halfDirection), 0.0);
// A wide low-energy highlight gives the charcoal weight without chrome.
float satin = (0.011 * pow(halfDot, 14.0) + 0.005 * pow(halfDot, 3.0)) * key;
float grazing = pow(1.0 - clamp(dot(surfaceNormal, surfaceView), 0.0, 1.0), 3.0);
float haze = 0.0022 * grazing * key;
float side = pow(max(dot(surfaceNormal, uGlobeSideDirection), 0.0), 3.0);
diffuseColor.rgb *= globeLight(surfaceNormal);
diffuseColor.rgb += uGlobeKeyColor * (satin + haze);
diffuseColor.rgb += uAccent * (0.0018 * side * (1.0 - 0.7 * key));`
    )
}
