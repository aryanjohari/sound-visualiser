precision highp float;

varying vec3 vWorldPos;

uniform float u_time;
uniform float u_bass;
uniform float u_high;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash22(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.04 + vec3(17.1, 23.7, 31.9);
    a *= 0.5;
  }
  return v;
}

vec2 sphereUv(vec3 n) {
  float phi = atan(n.y, n.x);
  float th = acos(clamp(n.z, -1.0, 1.0));
  return vec2(phi, th) * vec2(0.42, 1.05);
}

/** Animated cellular warp (Worley-style feature direction). */
vec2 cellularVoronoiWarp(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  vec2 mr = vec2(0.0);
  float md = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      o = 0.5 + 0.47 * sin(u_time * 0.065 + 6.2831 * o) - 0.5;
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        mr = r;
      }
    }
  }

  return mr;
}

/** Cell border strength: high on Voronoi edges (lightning runs along seams). */
float cellularEdgeMask(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      o = 0.5 + 0.47 * sin(u_time * 0.065 + 6.2831 * o) - 0.5;
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }

  d1 = sqrt(d1);
  d2 = sqrt(d2);
  float edge = (d2 - d1) / max(d2, 1e-4);
  return smoothstep(0.02, 0.28, edge);
}

void main() {
  vec3 n = normalize(vWorldPos);
  vec2 uv = sphereUv(n);

  float bass = clamp(u_bass, 0.0, 1.0);
  float high = clamp(u_high, 0.0, 1.0);
  float t = u_time * (0.045 + bass * 0.09);

  vec2 c1 = cellularVoronoiWarp(uv * (7.5 + bass * 6.0) + vec2(t * 0.07, -t * 0.06));
  vec2 c2 = cellularVoronoiWarp(uv * (14.0 + bass * 9.0) * 1.73 + vec2(-t * 0.05, t * 0.04));
  vec2 cellVec = c1 * 1.15 + c2 * 0.55;
  float cellMag = length(cellVec);

  float kickWarp = bass * (0.38 + 0.62 * smoothstep(0.08, 0.95, bass));
  vec2 uvWarp = uv + cellVec * kickWarp * 0.22 + normalize(cellVec + vec2(1e-4)) * cellMag * kickWarp * 0.08;

  float cellBorder = cellularEdgeMask(uv * (9.0 + bass * 5.0) + vec2(t * 0.06, -t * 0.05));

  vec3 pFluid = vec3(uvWarp * 3.2, t * 0.31);
  vec3 flow = vec3(
    fbm3(pFluid + vec3(0.0, 11.0, 0.0)),
    fbm3(pFluid + vec3(19.0, 0.0, 7.0)),
    fbm3(pFluid + vec3(5.0, 23.0, 0.0))
  );

  vec3 warp = (flow - 0.5) * 2.0;
  float f0 = fbm3(vec3(uvWarp * 2.4, 0.0) + warp * 0.55 + t * vec3(0.11, 0.09, 0.13));
  float f1 = fbm3(vec3(uvWarp.yx * 2.1, 0.4) - warp * 0.45 + t * vec3(-0.08, 0.12, 0.07));
  float f2 = fbm3(vec3(uvWarp * 1.7 + vec2(0.6, -0.3), 0.8) + t * 0.05);

  float fluidPat = clamp(0.5 * f0 + 0.35 * f1 + 0.25 * f2, 0.0, 1.0);

  // Sharp ridges from fBM (zero-crossing emphasis via 1 - |centered|).
  float r0 = 1.0 - abs(f0 * 2.0 - 1.0);
  float r1 = 1.0 - abs(f1 * 2.0 - 1.0);
  float r2 = 1.0 - abs(f2 * 2.0 - 1.0);
  float fbmRidge = pow(max(r0 * r1, 0.0), 2.2) + pow(max(r1 * r2, 0.0), 2.8) * 0.55;

  float seam = smoothstep(0.0, 0.18, abs(f0 - f1));
  float ridgeField = clamp(fbmRidge * (0.45 + 0.55 * cellBorder) * (0.35 + 0.65 * seam), 0.0, 1.0);

  float lightning = ridgeField * high;
  lightning = pow(lightning, 1.85);

  // Pitch-black cavern + deep crimson fluid (kicks swell the red through bass-driven warp).
  vec3 crimson = vec3(0.52, 0.02, 0.07);
  vec3 deepBlack = vec3(0.0);
  float redVeil = smoothstep(0.18, 0.94, fluidPat) * (0.06 + 0.94 * bass);
  redVeil *= pow(fluidPat, 0.85);
  vec3 col = mix(deepBlack, crimson, redVeil);

  // Hi-hats: blinding white only on noise / cellular seams.
  col += vec3(1.0) * lightning;

  gl_FragColor = vec4(col, 1.0);
}
