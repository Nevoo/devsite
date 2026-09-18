export const imagePlaneVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const imagePlaneFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uPlaneSize;
  uniform vec2 uImageSize;
  uniform vec3 uBg;         // page background, linear (THREE.Color handles conversion)
  uniform float uReveal;    // 0 → hidden, 1 → fully revealed
  uniform float uHover;     // damped 0..1
  uniform float uVelocity;  // signed scroll velocity
  uniform float uTime;
  uniform float uEdgeFade;  // fraction of plane height that dissolves at the bottom (0 = off)
  uniform float uDissolve;  // scroll progress 0..1 — sweeps the dissolve front up the plane
  uniform float uDevelop;   // 0 = blank paper, 1 = fully developed print (default 1)
  uniform vec3 uAccent;     // safelight orange, linear
  uniform vec2 uFocus;      // art-directed crop centre, 0.5,0.5 = centred
  uniform float uParallax;  // -1..1 travel through the viewport
  uniform float uParallaxAmp; // uv-space amplitude of the inner drift (0 = off)
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    return vnoise(p) * 0.62 + vnoise(p * 2.7) * 0.26 + vnoise(p * 6.1) * 0.12;
  }

  // Rec.709 → S-Gamut3.Cine, derived from both sets of primaries at D65 (columns)
  const mat3 REC709_TO_SGAMUT3C = mat3(
    0.645679, 0.087530, 0.036957,
    0.259115, 0.759700, 0.129281,
    0.095206, 0.152770, 0.833762
  );

  // Sony S-Log3: x = reflectance (0.18 = mid grey), returns the 10-bit code / 1023
  vec3 sLog3(vec3 x) {
    vec3 lin = (x * (171.2102946929 - 95.0) / 0.01125 + 95.0) / 1023.0;
    vec3 curve = (420.0 + log2((x + 0.01) / 0.19) * 0.30103 * 261.5) / 1023.0;
    return mix(lin, curve, step(vec3(0.01125), x));
  }

  // display code → linear, so colorspace_fragment re-encodes it to the same code
  vec3 srgbToLinear(vec3 c) {
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(lo, hi, step(vec3(0.04045), c));
  }

  // object-fit: cover, with object-position. The pan is clamped to the range the
  // crop actually has slack in, so a focus point can never expose empty edges.
  //
  // uParallaxAmp buys that slack rather than assuming it: a 4:5 cover in a 4:5
  // frame has none, so the crop is tightened by 2x the amplitude first. That is
  // what lets the PICTURE drift inside a frame that stays welded to the grid —
  // translating the frame itself is what used to knock every caption and index
  // number out of alignment on scroll.
  vec2 coverUv(vec2 uv) {
    float planeRatio = uPlaneSize.x / uPlaneSize.y;
    float imageRatio = uImageSize.x / uImageSize.y;
    vec2 scale = planeRatio < imageRatio
      ? vec2(planeRatio / imageRatio, 1.0)
      : vec2(1.0, imageRatio / planeRatio);
    scale *= 1.0 - 2.0 * uParallaxAmp;
    vec2 maxOff = (1.0 - scale) * 0.5;
    vec2 off = clamp(uFocus - 0.5, -maxOff, maxOff);
    off.y = clamp(off.y + uParallax * uParallaxAmp, -maxOff.y, maxOff.y);
    return (uv - 0.5) * scale + 0.5 + off;
  }

  void main() {
    vec2 uv = vUv;

    // jelly stretch from scroll velocity
    float v = clamp(uVelocity, -25.0, 25.0) * 0.0045;
    uv.y += sin(uv.x * 3.14159265) * v;

    // zoomed-in on reveal start, slight zoom on hover
    float zoom = mix(1.25, 1.0, uReveal) + uHover * 0.08;
    uv = (uv - 0.5) / zoom + 0.5;

    vec2 cuv = coverUv(uv);

    // subtle chromatic shift while moving or hovered
    float shift = uHover * 0.0035 + abs(v) * 0.02;
    float r = texture2D(uMap, cuv + vec2(shift, 0.0)).r;
    float g = texture2D(uMap, cuv).g;
    float b = texture2D(uMap, cuv - vec2(shift, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // saturation lift on hover — the print "comes alive"
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.0 + uHover * 0.18);

    // reveal: a soft wipe that sweeps bottom → top, like a print developing
    float sweep = smoothstep(vUv.y - 0.18, vUv.y + 0.02, uReveal * 1.2);
    color = mix(uBg, color, sweep);

    // ---- the grade: the transform, run over the frame in front of you ----
    //
    // Nothing comes off a camera looking like anything. Log is not a look, it
    // is storage — lifted blacks, rolled-off highlights, desaturated, slightly
    // green — shaped to keep information rather than to be looked at. Somebody
    // then writes a look and runs it over every frame of the sequence. Writing
    // a transform and running it over your material is the same job twice, in
    // two crafts, which is the whole idea the site is built on. So the hero
    // performs it instead of claiming it.
    //
    // The gesture is a colourist's split-screen wipe, which is a real tool and
    // not a metaphor for one: log to the right of the line, graded to the left,
    // an accent hairline travelling between them.
    //
    // Two properties matter, and the mosaic decode this replaces had neither.
    // BOTH sides are a finished, legible photograph at every instant — no frame
    // is ever in a half-built state, so no frame can read as broken, which is
    // what "buggy" actually meant. And the payoff is the picture you were
    // already looking at, so there is nothing to land on and nothing to pop.
    if (uDevelop < 0.999) {
      float d = uDevelop;

      // the front overshoots both edges, so the entrance neither begins nor
      // ends with a bright bar parked on frame
      float head = d * 1.22 - 0.11;
      // 1 = graded (behind the front), 0 = still log (ahead of it)
      float graded = 1.0 - smoothstep(head - 0.07, head + 0.05, vUv.x);

      // The log side is the real inverse of the slate's transform: Rec.709 →
      // S-Gamut3.Cine, then the S-Log3 curve, displayed as code values.
      vec3 sg = REC709_TO_SGAMUT3C * color;
      vec3 code = sLog3(sg);
      // sensor noise lives in the code values, not in linear light
      float g = hash(vUv * uPlaneSize + fract(uTime) * 91.7) - 0.5;
      code += g * 0.014;
      vec3 logc = srgbToLinear(code);

      color = mix(logc, color, graded);

      // The hairline. A gaussian rather than a hard step, so it reads as a lit
      // edge on a monitor instead of a 1px div sliding across a photograph, and
      // it pushes a short bloom ahead of itself the way a wipe handle does when
      // you drag one. "alive" fades it in off the left edge and out past the
      // right so it is never seen starting or stopping.
      float dx = vUv.x - head;
      float line = exp(-dx * dx * 62500.0);                    // ~4px core
      float bloom = exp(-dx * dx * 900.0) * step(0.0, dx) * 0.32;
      float alive = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.92, 1.0, d));
      color += uAccent * (line * 1.15 + bloom) * alive;
    }

    // scroll dissolve, pixel-dither style: the plane disintegrates into a
    // stable grid of ~6px cells that switch off in randomized order as the
    // front sweeps up (crisp screen-space dither, no soft noise smear).
    // A macro noise shapes the front so it stays ragged at large scale.
    // At rest (uDissolve 0) the front sits at the bottom edge — untouched.
    float alpha = 1.0;
    if (uEdgeFade > 0.001) {
      float front = mix(0.0, 1.0 + uEdgeFade, uDissolve);
      float e = clamp((front - vUv.y) / uEdgeFade, 0.0, 1.0);
      vec2 cell = floor(vUv * uPlaneSize / 6.0);
      float r = hash(cell);
      float macro = fbm(vec2(vUv.x * 4.0, vUv.y * 9.0));
      float threshold = clamp(r * 0.55 + macro * 0.45, 0.02, 0.98);
      // each cell dies with a quick fade instead of a one-frame pop
      alpha = 1.0 - smoothstep(threshold - 0.06, threshold, e);
    }

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`
