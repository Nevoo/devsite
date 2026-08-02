export const backgroundVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const backgroundFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y);

    // gallery base — matches --bg (neutral charcoal, no brown cast)
    vec3 col = vec3(0.063, 0.063, 0.075);

    // slow scarlet ember, top-left — the accent's presence in the air,
    // kept faint enough to read as atmosphere rather than a light source
    vec2 c1 = vec2(aspect * (0.22 + 0.06 * sin(uTime * 0.11)), 0.78 + 0.05 * cos(uTime * 0.09));
    col += vec3(0.062, 0.018, 0.014) * exp(-2.4 * length(p - c1));

    // deep cool counterweight, bottom-right
    vec2 c2 = vec2(aspect * (0.80 + 0.05 * cos(uTime * 0.07)), 0.16 + 0.05 * sin(uTime * 0.13));
    col += vec3(0.022, 0.026, 0.050) * exp(-2.6 * length(p - c2));

    // No pointer-following accent glow here. It was the only element on the
    // page not fixed to the layout, so it read as a stray orange blob drifting
    // over the composition rather than as light. The accent is spent where it
    // means something (cursor, index numbers, ticker stars, transition panel).

    // vignette
    float d = length((vUv - 0.5) * vec2(aspect, 1.0));
    col *= mix(1.0, 0.78, smoothstep(0.45, 1.05, d));

    // dither so the dark gradients never band
    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 128.0;

    // constants above are authored as final sRGB values and no texture is
    // sampled, so output directly — re-encoding would double-brighten them
    gl_FragColor = vec4(col, 1.0);
  }
`
