precision highp float;

uniform sampler2D tDiffuse;
uniform float u_bass; // splits RGB based on bass energy

varying vec2 vUv;

void main() {
  vec2 dir = vUv - vec2(0.5);
  float dist = length(dir);
  if (dist < 1e-5) {
    vec4 c = texture2D(tDiffuse, vUv);
    gl_FragColor = c;
    return;
  }

  // Amount is expected to be a small, normalized value from JS.
  vec2 off = normalize(dir) * dist * u_bass * 0.02;

  vec4 cR = texture2D(tDiffuse, vUv + off);
  vec4 cG = texture2D(tDiffuse, vUv);
  vec4 cB = texture2D(tDiffuse, vUv - off);

  vec3 col = vec3(cR.r, cG.g, cB.b);
  gl_FragColor = vec4(col, 1.0);
}

