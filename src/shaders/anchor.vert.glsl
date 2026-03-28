precision highp float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;

attribute float a_seed;

varying float v_noise;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

// 3D simplex noise (Stefan Gustavson-style)
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

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
  vec4 p =
      permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
                       i.y +
                       vec4(0.0, i1.y, i2.y, 1.0)) +
              i.x +
              vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

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

  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 *
         dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 noiseField(vec3 p, float t) {
  return vec3(
    snoise(p + vec3(31.4, 7.9, t * 0.17)),
    snoise(p.yzx + vec3(-12.1, 19.7, t * 0.13)),
    snoise(p.zxy + vec3(4.6, -27.3, t * 0.19))
  );
}

vec3 curlNoise(vec3 p, float t) {
  float e = 0.08;

  vec3 px0 = noiseField(p - vec3(e, 0.0, 0.0), t);
  vec3 px1 = noiseField(p + vec3(e, 0.0, 0.0), t);
  vec3 py0 = noiseField(p - vec3(0.0, e, 0.0), t);
  vec3 py1 = noiseField(p + vec3(0.0, e, 0.0), t);
  vec3 pz0 = noiseField(p - vec3(0.0, 0.0, e), t);
  vec3 pz1 = noiseField(p + vec3(0.0, 0.0, e), t);

  float dFz_dy = (py1.z - py0.z) / (2.0 * e);
  float dFy_dz = (pz1.y - pz0.y) / (2.0 * e);
  float dFx_dz = (pz1.x - pz0.x) / (2.0 * e);
  float dFz_dx = (px1.z - px0.z) / (2.0 * e);
  float dFy_dx = (px1.y - px0.y) / (2.0 * e);
  float dFx_dy = (py1.x - py0.x) / (2.0 * e);

  return vec3(
    dFz_dy - dFy_dz,
    dFx_dz - dFz_dx,
    dFy_dx - dFx_dy
  );
}

void main() {
  float t = u_time;
  float bass = max(u_bass, 0.001);
  vec3 base = position * bass;

  float mid = clamp(u_mid, 0.0, 1.4);
  float midAmt = smoothstep(0.001, 1.0, mid);

  vec3 seedOffset = vec3(a_seed * 9.13, a_seed * 5.37, a_seed * 7.91);
  vec3 domain = base * 0.62 + seedOffset;
  float flowTime = t * 0.14;

  vec3 warp = vec3(
    snoise(domain * 0.85 + vec3(flowTime * 0.21, -flowTime * 0.17, flowTime * 0.13)),
    snoise(domain.yzx * 0.78 + vec3(-flowTime * 0.15, flowTime * 0.19, flowTime * 0.11)),
    snoise(domain.zxy * 0.91 + vec3(flowTime * 0.12, flowTime * 0.16, -flowTime * 0.2))
  );

  vec3 flowA = curlNoise(domain + warp * 0.55, flowTime);
  vec3 flowB = curlNoise(domain * 1.35 + warp * 0.35 + vec3(11.7, -8.4, 6.2), flowTime * 1.32);
  vec3 curl = normalize(flowA + 0.7 * flowB + 1e-4);

  float curlMag = 0.22;
  vec3 p = base + curl * curlMag * midAmt;

  float n = snoise(base * 1.25 + vec3(a_seed, t * 0.16, -t * 0.12));
  n += 0.5 * snoise(base * 2.1 + vec3(0.0, t * 0.28 + a_seed, 0.0));

  vec4 worldPos4 = modelMatrix * vec4(p, 1.0);
  vWorldPos = worldPos4.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = 1.7;

  v_noise = n;
}

