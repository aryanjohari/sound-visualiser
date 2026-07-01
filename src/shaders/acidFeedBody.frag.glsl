void main() {
  vec2 baseUv = coverUv(vUv);
  vec2 texelSize = vec2(0.0025, 0.0025);

  float energy = u_bass + u_mid + u_high;
  float intensity = 1.0 + u_rave * 0.25;
  float edge = edgeFalloff(vUv);

  vec2 bgUv = zoomAround(baseUv, 1.06);
  bgUv = clamp(bgUv, 0.0, 1.0);
  vec3 bgCol = sampleBlur(u_video, bgUv, texelSize) * 0.35;

  vec2 fgUv = kaleidoscopeUv(baseUv, u_kaleidoscopeSegments);

  if (energy < 0.05) {
    float idle = 0.0025 * edge;
    fgUv.x += sin(u_time * 0.4 + vUv.y * 3.0) * idle;
    fgUv.y += cos(u_time * 0.35 + vUv.x * 2.5) * idle;
  }

  float beatWobble = sin(u_beatPhase * 6.28318530718);
  float timeWobble = sin(u_time * 2.0);
  float wobble = mix(timeWobble, beatWobble, clamp(u_beatSyncWeight, 0.0, 1.0));
  float zoom = 1.0 + u_bass * wobble * 0.04 * intensity * u_meltZoomScale;
  fgUv = zoomAround(fgUv, zoom);

  float melt = u_mid * 0.028 * intensity * edge * u_meltZoomScale;
  fgUv.x += sin(fgUv.y * 12.0 + u_time * 1.5) * melt;
  fgUv.y += cos(fgUv.x * 10.0 + u_time * 1.2) * melt * 0.8;

  fgUv += u_glitchOffset * edge * u_glitchStrength;
  fgUv = clamp(fgUv, 0.0, 1.0);

  vec2 dir = vUv - vec2(0.5);
  float dist = length(dir);
  vec3 fgCol = texture2D(u_video, fgUv).rgb;

  float splitAmt = (u_high * 0.015 + u_lightningFlash * 0.03) * intensity * 0.6;

  if (splitAmt > 1e-6) {
    vec3 edgeCol = fgCol;
    if (dist >= 1e-5) {
      vec2 off = normalize(dir) * dist * splitAmt * 0.07;
      edgeCol = vec3(
        texture2D(u_video, clamp(fgUv + off, 0.0, 1.0)).r,
        texture2D(u_video, fgUv).g,
        texture2D(u_video, clamp(fgUv - off, 0.0, 1.0)).b
      );
    }

    vec2 hOff = vec2(splitAmt * 0.6, 0.0);
    vec3 horizCol = vec3(
      texture2D(u_video, clamp(fgUv + hOff, 0.0, 1.0)).r,
      texture2D(u_video, fgUv).g,
      texture2D(u_video, clamp(fgUv - hOff, 0.0, 1.0)).b
    );

    float horizMix = clamp(splitAmt * 18.0, 0.0, 0.26);
    fgCol = mix(edgeCol, horizCol, horizMix);
  }

  fgCol = mix(fgCol, hueRotate(fgCol, u_huePhase), 0.15);

  float fgMix = mix(0.52, 1.0, edge);
  vec3 col = mix(bgCol, fgCol, fgMix);

  float vignette = 1.0 - smoothstep(0.55, 1.15, length((vUv - 0.5) * 2.0)) * 0.15;
  col *= vignette;

  col *= 1.0 + u_lightningFlash * 0.42;

  if (u_lightningFlash > 0.45) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float satBoost = (u_lightningFlash - 0.45) * 0.18;
    col = mix(vec3(luma), col, 1.0 + satBoost);
  }

  vec2 fbUv = feedbackWarpUv(fgUv, u_time, u_bass);
  vec3 feedbackCol = hueRotate(texture2D(u_feedback, fbUv).rgb * u_feedbackDecay, u_huePhase * 0.5);
  col = mix(col, feedbackCol, clamp(u_feedbackAmount, 0.0, 0.62));

  gl_FragColor = vec4(col, 1.0);
}
