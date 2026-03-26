precision highp float;

uniform float u_high;
uniform float u_bass;

varying float v_noise;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float r = length(centered);

  // Soft disc shape for points.
  float alpha = smoothstep(0.5, 0.18, r);
  if (alpha < 0.02) discard;

  float glow = clamp(u_high, 0.0, 1.0);
  float n = v_noise * 0.5 + 0.5;

  vec3 cinematic = vec3(0.1, 0.65, 1.0);
  vec3 raveCol = vec3(1.0, 0.16, 0.8);

  // High frequencies drive hue + brightness.
  vec3 col = mix(cinematic, raveCol, smoothstep(0.05, 0.95, glow));
  col *= 0.65 + 1.25 * n;

  // Bass subtly lifts contrast.
  col *= 0.85 + 0.35 * clamp(u_bass, 0.0, 1.0);

  float intensity = (0.35 + 0.75 * glow) * alpha;
  gl_FragColor = vec4(col * intensity, alpha * (0.55 + 0.75 * glow));
}

