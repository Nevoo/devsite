import * as THREE from 'three'

import { PLATE_SHADE_FLOOR } from '../plate'

/**
 * Shared globe shader state. Keeping the patch in this small module lets the
 * persistent canvas warm the exact program cache keys used by route-owned
 * globe materials without importing the Globe component into the canvas chunk.
 */

/** The occluding mass, as the dot shaders see it. */
export const OCC_RADIUS = { value: 0 }

/** Sphere (0) to projected plate (1), shared by every patched dot material. */
export const MORPH = { value: 0 }

/** Occlusion attenuation: full sphere occlusion at 1, none at 0. */
export const FLAT_OCC = { value: 1 }

/** The one brand accent, linearized once by Three before any dot program uses it. */
export const ACCENT = { value: new THREE.Color('#ff2d1a') }

/** View-space depth of the soft band behind the globe's limb. */
const OCC_SOFT = { value: 0.04 }

/**
 * How far a negative aTint lifts a dot's own value. Broad precision (country,
 * region) claims its ground with light rather than with the accent: scarlet
 * stays the size of a mark, and the wash reads as "known this far, no
 * further" instead of as an error state. Kept well under the coast class's
 * step so a claimed country never impersonates an outline.
 */
const WASH_LIFT = 0.55

/** Add per-vertex development alpha and live sphere occlusion to Three's stock
 * points/line shaders. The function source is also Three's default custom
 * program cache key, so warm-up and live materials must share this function. */
export const patchDotAlpha = (shader: {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, { value: unknown }>
}) => {
  shader.uniforms.uOccR = OCC_RADIUS
  shader.uniforms.uOccSoft = OCC_SOFT
  shader.uniforms.uMorph = MORPH
  shader.uniforms.uFlat = FLAT_OCC
  shader.uniforms.uAccent = ACCENT
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      'attribute float aAlpha;\nattribute vec3 aPlate;\nattribute float aTint;\nvarying float vAlpha;\nvarying float vTint;\nuniform float uOccR;\nuniform float uOccSoft;\nuniform float uMorph;\nuniform float uFlat;\n#include <common>'
    )
    .replace(
      '#include <begin_vertex>',
      'vec3 transformed = mix(position, aPlate, uMorph);'
    )
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
vAlpha = aAlpha;
vTint = aTint;
{
\tvec3 sphereC = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
\tvec3 rayDir = normalize(mvPosition.xyz);
\tfloat along = dot(sphereC, rayDir);
\tfloat miss2 = dot(sphereC, sphereC) - along * along;
\tfloat r2 = uOccR * uOccR;
\tif (uOccR > 0.0 && along > 0.0 && miss2 < r2) {
\t\tfloat entry = along - sqrt(r2 - miss2);
\t\tfloat occFactor = 1.0 - smoothstep(0.0, uOccSoft, length(mvPosition.xyz) - entry);
\t\tvAlpha *= mix(1.0, occFactor, uFlat);
\t}
}`
    )
  /* aTint carries two channels on one float. Positive is a scarlet MARK —
     venue point, town ring, tinted feature. Negative is a neutral LIFT, the
     wash a country or region claim lays over its own land. The lift is the
     last thing multiplied, after any shade term, so it stays flat: even and
     unlit, a claim rather than a hillside. */
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `varying float vAlpha;\nvarying float vTint;\nuniform vec3 uAccent;\n#define PLATE_WASH_LIFT ${WASH_LIFT.toFixed(2)}\n#include <common>`
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
\tfloat plateMark = clamp(vTint, 0.0, 1.0);
\tfloat plateLift = clamp(-vTint, 0.0, 1.0);
\tdiffuseColor.rgb = mix(diffuseColor.rgb, uAccent, plateMark);
\tdiffuseColor.rgb *= 1.0 + plateLift * PLATE_WASH_LIFT;
\tdiffuseColor.a *= vAlpha;`
    )
}

/** Plate-only extension: terrain classes vary point footprint and value while
 * keeping the shared morph/occlusion/tint program vocabulary above. World
 * layers and route lines never need these attributes, so their warmed shader
 * keys remain unchanged. */
export const patchPlateDots = (shader: {
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, { value: unknown }>
}) => {
  patchDotAlpha(shader)
  shader.vertexShader = shader.vertexShader
    .replace(
      'attribute float aAlpha;',
      'attribute float aPointScale;\nattribute float aShade;\nvarying float vShade;\nattribute float aAlpha;'
    )
    .replace(
      'vec3 transformed = mix(position, aPlate, uMorph);',
      'vShade = aShade;\nvec3 transformed = mix(position, aPlate, uMorph);'
    )
    .replace('gl_PointSize = size;', 'gl_PointSize = size * aPointScale;')
  /* Terrain value lands BEFORE the mark and the wash: relief shades the
     ground, marks sit on it, and the wash lifts whatever the ground came out
     at — the one order in which a claim never turns into a light source.

     aShade is the LAMP's term now (a lambert against a fixed raking light,
     baked at reseed), not an elevation ramp, and the mix is re-anchored on
     PLATE_SHADE_FLOOR so it has room to be seen. Spliced here rather than in
     patchDotAlpha because only the plate carries relief: the world sphere's
     dots keep the value ladder they shipped with, and their warmed program
     key with it. */
  shader.fragmentShader = shader.fragmentShader
    .replace(
      'varying float vAlpha;',
      `varying float vShade;\n#define PLATE_SHADE_FLOOR ${PLATE_SHADE_FLOOR.toFixed(2)}\nvarying float vAlpha;`
    )
    .replace(
      'float plateMark = clamp(vTint, 0.0, 1.0);',
      'diffuseColor.rgb *= mix(PLATE_SHADE_FLOOR, 1.0, clamp(vShade, 0.0, 1.0));\n\tfloat plateMark = clamp(vTint, 0.0, 1.0);'
    )
}
