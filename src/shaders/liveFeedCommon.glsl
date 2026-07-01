vec2 coverUv(vec2 uv) {
  vec2 outUv = uv;
  if (u_videoAspect > u_screenAspect) {
    float scale = u_screenAspect / u_videoAspect;
    outUv.x = (uv.x - 0.5) * scale + 0.5;
  } else {
    float scale = u_videoAspect / u_screenAspect;
    outUv.y = (uv.y - 0.5) * scale + 0.5;
  }
  return outUv;
}

vec2 zoomAround(vec2 uv, float zoom) {
  return (uv - 0.5) / zoom + 0.5;
}

vec3 sampleBlur(sampler2D tex, vec2 uv, vec2 texelSize) {
  vec3 col = vec3(0.0);
  col += texture2D(tex, uv + vec2(-texelSize.x, -texelSize.y)).rgb;
  col += texture2D(tex, uv + vec2(0.0, -texelSize.y)).rgb;
  col += texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).rgb;
  col += texture2D(tex, uv + vec2(-texelSize.x, 0.0)).rgb;
  col += texture2D(tex, uv).rgb;
  col += texture2D(tex, uv + vec2(texelSize.x, 0.0)).rgb;
  col += texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).rgb;
  col += texture2D(tex, uv + vec2(0.0, texelSize.y)).rgb;
  col += texture2D(tex, uv + vec2(texelSize.x, texelSize.y)).rgb;
  return col / 9.0;
}

float edgeFalloff(vec2 screenUv) {
  return 1.0 - smoothstep(0.25, 0.9, length((screenUv - 0.5) * 2.0));
}

vec2 kaleidoscopeUv(vec2 uv, float segments) {
  if (segments < 1.5) return uv;
  vec2 p = uv - 0.5;
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float segAngle = 6.2831853 / segments;
  angle = mod(angle, segAngle);
  if (mod(floor(atan(p.y, p.x) / segAngle + 1000.0), 2.0) > 0.5) {
    angle = segAngle - angle;
  }
  return vec2(cos(angle), sin(angle)) * radius + 0.5;
}

vec3 hueRotate(vec3 col, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat3 hueMat = mat3(
    0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
    0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
    0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s
  );
  return clamp(hueMat * col, 0.0, 1.0);
}

vec2 feedbackWarpUv(vec2 uv, float time, float bass) {
  vec2 p = uv - 0.5;
  float scale = 1.0 + bass * 0.02;
  p *= scale;
  float rot = time * 0.08;
  float c = cos(rot);
  float s = sin(rot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p += vec2(sin(time * 0.5) * 0.01, cos(time * 0.43) * 0.01);
  return clamp(p + 0.5, 0.0, 1.0);
}
