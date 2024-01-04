const fragmentShader = `

// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20201014 (stegu)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
  }

  uniform sampler2D uTexture;
  // uniform sampler2D uHovermap;
  uniform float time;
  uniform float uAlpha;
  uniform vec2 uResolution;
  uniform vec2 uTextureSize;
  uniform vec2 uHoverratio;
  uniform vec2 uMouse;
  uniform float uProgressHover;
  uniform float uProgressClick;
  varying vec2 vUv;
  varying vec2 vSize;

  float circle(in vec2 _st, in float _radius, in float blurriness){
        vec2 dist = _st;
        return 1. - smoothstep(_radius-(_radius*blurriness), _radius+(_radius*blurriness), dot(dist,dist)*4.0);
  }
  
  vec2 getUV(vec2 uv, vec2 textureSize, vec2 quadSize) {
      vec2 tempUV = uv - vec2(0.5);
      float quadAspect = quadSize.x/quadSize.y;
      float textureAspect = textureSize.x/textureSize.y;
      if (quadAspect < textureAspect) {
            tempUV = tempUV * vec2(quadAspect / textureAspect, 1.0);
      } else {
            tempUV = tempUV * vec2(1.0, textureAspect / quadAspect);
      }
      
      tempUV += vec2(0.5);
      return tempUV;
  }
  
void main() {
  vec2 resolution = uTextureSize * PR;
  vec2 correctUV = getUV(vUv, uTextureSize, vSize);
  float newTime = time;
  float progress = uProgressClick;
  float progressHover = uProgressHover;
  vec2 st = gl_FragCoord.xy / resolution.xy - vec2(.5);
  st.y *= resolution.y / resolution.x;
  vec2 mouse = vec2((uMouse.x / uTextureSize.x) * 2. - 1., -(uMouse.y / uTextureSize.y) * 2. + 1.) * -.5;
  mouse.y *= resolution.y / resolution.x;
  float shape = (correctUV.x + correctUV.y - 2. + uProgressHover * 2.7 + progress * 2.7) * 2.;
  float offX = correctUV.x + correctUV.y;
  float offY = correctUV.y - correctUV.x;
  float n = snoise(vec3(offX, offY, newTime) * 8.) * .5;
  float grd = 0.1 * uProgressHover;
  float sqr = 100. * ((smoothstep(0., grd, correctUV.x) - smoothstep(1. - grd, 1., correctUV.x)) * (smoothstep(0., grd, correctUV.y) - smoothstep(1. - grd, 1., correctUV.y))) - 10.;
  correctUV -= vec2(0.5);
  correctUV *= 1. - uProgressHover * 0.1;
  correctUV += vec2(0.5);
  vec2 cpos = st + mouse;
  // float c = circle(cpos, .02 * uProgressHover + progress * 0.8, 2.);
  float c = circle(cpos, .04 * progressHover + progress * 0.8, 2.) * 10.;
  vec4 image = texture2D(uTexture, correctUV);
  float pct = smoothstep(.99, 10., n + shape);
  float finalMask = smoothstep(.0, .1, sqr - c);
  vec4 finalImage = mix(image, image, pct);
  gl_FragColor = vec4(finalImage.rgb, uAlpha * finalMask);
}

`;

export default fragmentShader;
