let cached: boolean | null = null

export function webglAvailable(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    cached = false
  }
  return cached
}

/**
 * Renderer strings that mean "there is no GPU behind this context". ANGLE
 * reports its backend in the same string, so a SwiftShader context under ANGLE
 * reads as `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …))` — the plain
 * `swiftshader` term catches it, and the ANGLE-specific alternative is kept for
 * the shapes that spell the backend differently.
 */
const SOFTWARE_RENDERER = /swiftshader|software|llvmpipe|angle.*swiftshader/i

let softwareCached: boolean | null = null

/**
 * True when this browser is rasterising WebGL on the CPU — a VM, a
 * blocklisted GPU, a headless audit target. Nothing on the site is turned off
 * by this; it is a budget signal (see CanvasRoot's note on MSAA), because the
 * per-frame costs a software renderer pays are nothing like a real GPU's.
 *
 * DEFAULTS TO HARDWARE. `WEBGL_debug_renderer_info` is not guaranteed — it is
 * absent behind some privacy settings and in some embedded browsers — and the
 * conservative answer there is "assume a GPU and keep the visuals", not
 * "downgrade everyone whose browser declines to identify itself".
 */
export function softwareGL(): boolean {
  if (softwareCached !== null) return softwareCached
  softwareCached = false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return softwareCached
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    if (info) {
      const renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '')
      softwareCached = SOFTWARE_RENDERER.test(renderer)
    }
    // the probe context has done its one job; a browser only keeps so many
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    softwareCached = false
  }
  return softwareCached
}
