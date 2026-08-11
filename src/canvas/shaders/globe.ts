/**
 * Shared globe shader state. Keeping the patch in this small module lets the
 * persistent canvas warm the exact program cache keys used by route-owned
 * globe materials without importing the Globe component into the canvas chunk.
 */

/** The occluding mass, as the dot shaders see it. */
export const OCC_RADIUS = { value: 0 }

/** View-space depth of the soft band behind the globe's limb. */
const OCC_SOFT = { value: 0.04 }

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
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      'attribute float aAlpha;\nvarying float vAlpha;\nuniform float uOccR;\nuniform float uOccSoft;\n#include <common>'
    )
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
vAlpha = aAlpha;
{
\tvec3 sphereC = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
\tvec3 rayDir = normalize(mvPosition.xyz);
\tfloat along = dot(sphereC, rayDir);
\tfloat miss2 = dot(sphereC, sphereC) - along * along;
\tfloat r2 = uOccR * uOccR;
\tif (uOccR > 0.0 && along > 0.0 && miss2 < r2) {
\t\tfloat entry = along - sqrt(r2 - miss2);
\t\tvAlpha *= 1.0 - smoothstep(0.0, uOccSoft, length(mvPosition.xyz) - entry);
\t}
}`
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', 'varying float vAlpha;\n#include <common>')
    .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.a *= vAlpha;')
}
