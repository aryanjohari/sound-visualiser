precision highp float;

uniform sampler2D u_video;
uniform sampler2D u_feedback;
uniform float u_screenAspect;
uniform float u_videoAspect;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_lightningFlash;
uniform float u_rave;
uniform vec2 u_glitchOffset;
uniform float u_feedbackAmount;
uniform float u_kaleidoscopeSegments;
uniform float u_huePhase;
uniform float u_meltZoomScale;
uniform float u_glitchStrength;
uniform float u_feedbackDecay;
uniform float u_beatPhase;
uniform float u_beatSyncWeight;

varying vec2 vUv;
