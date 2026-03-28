precision highp float;

uniform float u_mid;
uniform float u_high;

varying float v_noise;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float r = length(centered);

  float alpha = smoothstep(0.5, 0.12, r);
  if (alpha < 0.02) discard;

  float n = v_noise * 0.5 + 0.5;
  float mid = clamp(u_mid, 0.0, 1.4);
  float high = clamp(u_high, 0.0, 1.6);
  float hat = 0.55 + 0.85 * high;

  vec3 col = vec3(1.0);
  col *= 0.5 + 0.25 * n;

  float intensity = alpha * (0.9 + 2.0 * mid) * hat;
  float opacity = alpha * (1.0 + 5.0 * mid) * hat;
  gl_FragColor = vec4(col * intensity, opacity);
}

