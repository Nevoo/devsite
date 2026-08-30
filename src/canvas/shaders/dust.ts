/**
 * GPGPU darkroom dust — curl-noise particle simulation + fake-DoF point render.
 *
 * Two passes, no postprocessing. A float FBO holds particle positions; the sim
 * pass advects a fixed base sphere through fractal curl noise every frame
 * (stateless: position = f(base, time), so it can never drift or explode). The
 * render pass draws one point per texel and fakes depth of field by scaling
 * point size and alpha with distance from a focus plane — bokeh is just a big
 * soft low-alpha disc.
 *
 * Noise/curl bodies adapted from the pmndrs gpgpu-curl-noise-dof example
 * (ashima/webgl-noise + glsl-curl-noise2, both MIT).
 */

export const dustSimVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const dustSimFragment = /* glsl */ `
  uniform sampler2D positions;
  uniform float uTime;
  uniform float uCurlFreq;
  uniform float uCondense;
  uniform float uCondenseRadius;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  vec3 snoiseVec3(vec3 x) {
    float s = snoise(vec3(x));
    float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
    float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
    return vec3(s, s1, s2);
  }

  vec3 curl(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = snoiseVec3(p - dx);
    vec3 p_x1 = snoiseVec3(p + dx);
    vec3 p_y0 = snoiseVec3(p - dy);
    vec3 p_y1 = snoiseVec3(p + dy);
    vec3 p_z0 = snoiseVec3(p - dz);
    vec3 p_z1 = snoiseVec3(p + dz);

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / (2.0 * e);
    return normalize(vec3(x, y, z) * divisor);
  }

  void main() {
    float t = uTime * 0.015;
    vec3 base = texture2D(positions, vUv).rgb;

    // single-octave field vs a 5-octave fractal stack, blended by a slow
    // noise so the cloud breathes between calm and turbulent regions
    vec3 pos = curl(base * uCurlFreq + t);
    vec3 curlPos = curl(base * uCurlFreq + t);
    curlPos += curl(curlPos * uCurlFreq * 2.0) * 0.5;
    curlPos += curl(curlPos * uCurlFreq * 4.0) * 0.25;
    curlPos += curl(curlPos * uCurlFreq * 8.0) * 0.125;
    curlPos += curl(pos * uCurlFreq * 16.0) * 0.0625;
    vec3 swirled = mix(pos, curlPos, cnoise(base + t));

    // preview of the "condense into the globe" idea: pull the cloud toward
    // the base sphere (normalised to a scene-scale radius)
    vec3 settled = normalize(base) * uCondenseRadius;
    gl_FragColor = vec4(mix(swirled, settled, uCondense), 1.0);
  }
`

export const dustPointsVertex = /* glsl */ `
  uniform sampler2D positions;
  uniform float uFocus;
  uniform float uBlur;
  uniform float uSize;
  uniform float uDensity;
  uniform vec3 uPointerView;
  uniform float uForce;
  uniform float uPointerRadius;
  uniform float uBoundsMode;
  uniform vec3 uBoundsA;
  uniform vec3 uBoundsCenter;
  varying float vDistance;
  varying float vSeed;
  varying float vKick;

  void main() {
    // the FBO holds the canonical cloud (a blobby ball of radius ~2 around
    // the origin); the bounds shape it into the mounting view's space.
    // mode 0 ball: uniform scale (uBoundsA.x). radius 2 = identity = the lab.
    // mode 1 shell: radial remap into the [uBoundsA.x, uBoundsA.y] band.
    // mode 2 slab: canonical [-2,2] span squashed into half-extents uBoundsA.
    vec3 c = texture2D(positions, position.xy).xyz;
    vec3 pos;
    if (uBoundsMode < 0.5) {
      pos = c * uBoundsA.x;
    } else if (uBoundsMode < 1.5) {
      float len = max(length(c), 1e-4);
      float band = clamp(len * 0.5, 0.0, 1.0);
      pos = (c / len) * mix(uBoundsA.x, uBoundsA.y, band);
    } else {
      pos = c * uBoundsA * 0.5;
    }
    pos += uBoundsCenter;

    vSeed = fract(sin(dot(position.xy, vec2(127.1, 311.7))) * 43758.5453);
    vKick = 0.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // the parting: the dense ambience is far too saturated for individual
    // motes to read, so the cursor's job here is to carve a VISIBLE void.
    // Push dots radially clear of the camera→cursor ray at their own depth,
    // slightly wider than the rapier capsule, so the physical motes are seen
    // tumbling inside a channel the whole cloud opens up for them.
    float depthRatio = mvPosition.z / min(uPointerView.z, -0.001);
    vec2 rayXY = uPointerView.xy * depthRatio;
    vec2 dxy = mvPosition.xy - rayXY;
    float r = max(uPointerRadius * depthRatio, 0.001) * 1.6;
    float dist = length(dxy);
    float w = 1.0 - smoothstep(0.0, r, dist);
    w *= w;
    // dots dead on the ray get a stable per-seed direction instead of noise
    vec2 dir = dist > 0.02
      ? dxy / dist
      : vec2(cos(vSeed * 6.2832), sin(vSeed * 6.2832));
    mvPosition.xy += dir * w * uForce * r * (0.7 + 0.6 * vSeed);

    gl_Position = projectionMatrix * mvPosition;

    // random subset survives the density gate (uniform across the cloud,
    // unlike the original demo's contiguous-column cull)
    float show = step(1.0 - uDensity, fract(vSeed * 61.7));

    vDistance = abs(uFocus - -mvPosition.z);
    gl_PointSize = show * (uSize + vDistance * uBlur);
  }
`

/**
 * Vertex shader for the rapier-driven motes: positions arrive as a plain
 * attribute (written from the rigid bodies each frame), aKick carries the
 * body's speed so stirred motes glint. Same fragment shader as the ambience.
 */
export const dustBodyVertex = /* glsl */ `
  uniform float uFocus;
  uniform float uBlur;
  uniform float uSize;
  attribute float aSeed;
  attribute float aKick;
  varying float vDistance;
  varying float vSeed;
  varying float vKick;

  void main() {
    vSeed = aSeed;
    vKick = aKick;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vDistance = abs(uFocus - -mvPosition.z);
    gl_PointSize = uSize + vDistance * uBlur;
  }
`

export const dustPointsFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uAccentFrac;
  varying float vDistance;
  varying float vSeed;
  varying float vKick;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r2 = dot(cxy, cxy);
    if (r2 > 1.0) discard;
    // soft rim instead of a hard disc — bokeh, not confetti
    float edge = 1.0 - smoothstep(0.55, 1.0, r2);

    vec3 col = mix(uColor, uAccent, step(1.0 - uAccentFrac, vSeed));
    float alpha = (1.04 - clamp(vDistance * 1.5, 0.0, 1.0)) * edge * uOpacity;
    // stirred motes glint slightly, like dust turning through a beam
    alpha *= 1.0 + min(vKick * 0.5, 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`
