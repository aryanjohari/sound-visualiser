precision highp float;

uniform sampler2D u_video;
uniform float u_screenAspect;
uniform float u_videoAspect;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_lightningFlash;
uniform float u_rave;
uniform vec2 u_glitchOffset;

varying vec2 vUv;

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

// Scale UV around center — values > 1 zoom in (crop edges), < 1 zoom out
vec2 zoomAround(vec2 uv, float zoom) {
  return (uv - 0.5) / zoom + 0.5;
}

// Cheap 9-tap box blur in UV space
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

// Stronger near center, weaker near screen edges
float edgeFalloff(vec2 screenUv) {
  return 1.0 - smoothstep(0.25, 0.9, length((screenUv - 0.5) * 2.0));
}

void main() {
  vec2 baseUv = coverUv(vUv);
  vec2 texelSize = vec2(0.0025, 0.0025);

  float energy = u_bass + u_mid + u_high;
  float intensity = 1.0 + u_rave * 0.25;
  float edge = edgeFalloff(vUv);

  // —— Background plate: zoomed-in, blurred, darkened depth layer ——
  vec2 bgUv = zoomAround(baseUv, 1.06);
  bgUv = clamp(bgUv, 0.0, 1.0);
  vec3 bgCol = sampleBlur(u_video, bgUv, texelSize) * 0.35;

  // —— Foreground: warped sharp feed ——
  vec2 fgUv = baseUv;

  // Idle: subtle ambient drift when audio is quiet
  if (energy < 0.05) {
    float idle = 0.0025 * edge;
    fgUv.x += sin(u_time * 0.4 + vUv.y * 3.0) * idle;
    fgUv.y += cos(u_time * 0.35 + vUv.x * 2.5) * idle;
  }

  // Bass: breathing zoom pulse around center (stays in bounds)
  float zoom = 1.0 + u_bass * sin(u_time * 2.0) * 0.04 * intensity;
  fgUv = zoomAround(fgUv, zoom);

  // Mid: melt wobble — reduced near edges
  float melt = u_mid * 0.028 * intensity * edge;
  fgUv.x += sin(fgUv.y * 12.0 + u_time * 1.5) * melt;
  fgUv.y += cos(fgUv.x * 10.0 + u_time * 1.2) * melt * 0.8;

  // Glitch: flux burst — scaled by edge so corners don't tear as hard
  fgUv += u_glitchOffset * edge;

  // Clamp instead of painting black voids
  fgUv = clamp(fgUv, 0.0, 1.0);

  // High + lightningFlash: edge-weighted split + whole-frame horizontal color layer
  vec2 dir = vUv - vec2(0.5);
  float dist = length(dir);
  vec3 fgCol = texture2D(u_video, fgUv).rgb;

  float splitAmt = (u_high * 0.015 + u_lightningFlash * 0.03) * intensity;

  if (splitAmt > 1e-6) {
    vec3 edgeCol = fgCol;
    if (dist >= 1e-5) {
      vec2 off = normalize(dir) * dist * splitAmt * 0.10;

      edgeCol = vec3(
        texture2D(u_video, clamp(fgUv + off, 0.0, 1.0)).r,
        texture2D(u_video, fgUv).g,
        texture2D(u_video, clamp(fgUv - off, 0.0, 1.0)).b
      );
    }

    // Horizontal RGB across full frame — no center origin
    vec2 hOff = vec2(splitAmt * 0.6, 0.0);
    vec3 horizCol = vec3(
      texture2D(u_video, clamp(fgUv + hOff, 0.0, 1.0)).r,
      texture2D(u_video, fgUv).g,
      texture2D(u_video, clamp(fgUv - hOff, 0.0, 1.0)).b
    );

    float horizMix = clamp(splitAmt * 30.0, 0.0, 0.45);
    fgCol = mix(edgeCol, horizCol, horizMix);
  }

  // Sharp foreground over blurred background — edges blend toward bg for depth
  float fgMix = mix(0.52, 1.0, edge);
  vec3 col = mix(bgCol, fgCol, fgMix);

  // Mild vignette — softens remaining edge artifacts
  float vignette = 1.0 - smoothstep(0.55, 1.15, length((vUv - 0.5) * 2.0)) * 0.15;
  col *= vignette;

  // Lightning flash brightness boost on final composite
  col *= 1.0 + u_lightningFlash * 0.65;

  // Mild saturation lift on strong flash hits
  if (u_lightningFlash > 0.3) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float satBoost = (u_lightningFlash - 0.3) * 0.35;
    col = mix(vec3(luma), col, 1.0 + satBoost);
  }

  gl_FragColor = vec4(col, 1.0);
}
