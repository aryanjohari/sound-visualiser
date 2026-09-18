import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import { identityAxes, type LookAxes } from '../../look/types';
import { blendSync } from '../blendSync';
import type { VJState } from '../StateManager';

import liveFeedVert from '../../shaders/liveFeed.vert.glsl?raw';
import acidFeedHeader from '../../shaders/acidFeedHeader.frag.glsl?raw';
import liveFeedCommon from '../../shaders/liveFeedCommon.glsl?raw';
import acidFeedBody from '../../shaders/acidFeedBody.frag.glsl?raw';

const acidFeedFrag = acidFeedHeader + liveFeedCommon + acidFeedBody;

const blitVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const blitFrag = `
uniform sampler2D u_texture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(u_texture, vUv);
}
`;

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function blendMood(calm: number, groove: number, intense: number, w: VJState['moodWeights']) {
  return w.calm * calm + w.groove * groove + w.intense * intense;
}

// Beat-sync tuning (Phase 2b)
const BEAT_FB_DECAY = 0.12;
const BEAT_FB_PULSE = 0.06;
const BEAT_KALEIDO_STEP = 2;
const BEAT_HUE_STEP = Math.PI / 6;
const BEAT_GLITCH_WINDOW = 0.2;

export class AcidFeedLayer {
  private readonly processScene = new THREE.Scene();
  private readonly blitScene = new THREE.Scene();
  private readonly orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private processMaterial: THREE.ShaderMaterial | null = null;
  private blitMaterial: THREE.ShaderMaterial | null = null;
  private processMesh: THREE.Mesh | null = null;
  private blitMesh: THREE.Mesh | null = null;

  private fboA: THREE.WebGLRenderTarget | null = null;
  private fboB: THREE.WebGLRenderTarget | null = null;
  private readIndex = 0;

  private canvasWidth = 1;
  private canvasHeight = 1;
  private screenAspect = 1;
  private videoAspect = 16 / 9;

  private bassPeak = 1e-6;
  private midPeak = 1e-6;
  private highPeak = 1e-6;
  private fluxPeak = 1e-6;

  private glitchOffset = new THREE.Vector2(0, 0);
  private glitchFramesLeft = 0;
  private lastGlitchT = -Infinity;
  private huePhaseAccum = 0;

  init(renderer: THREE.WebGLRenderer) {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.processMaterial = new THREE.ShaderMaterial({
      vertexShader: liveFeedVert,
      fragmentShader: acidFeedFrag,
      uniforms: {
        u_video: { value: null },
        u_feedback: { value: null },
        u_screenAspect: { value: 1 },
        u_videoAspect: { value: 16 / 9 },
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_high: { value: 0 },
        u_lightningFlash: { value: 0 },
        u_rave: { value: 0 },
        u_glitchOffset: { value: new THREE.Vector2(0, 0) },
        u_feedbackAmount: { value: 0.45 },
        u_kaleidoscopeSegments: { value: 1 },
        u_huePhase: { value: 0 },
        u_meltZoomScale: { value: 1 },
        u_glitchStrength: { value: 1 },
        u_feedbackDecay: { value: 0.98 },
        u_beatPhase: { value: 0 },
        u_beatSyncWeight: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.blitMaterial = new THREE.ShaderMaterial({
      vertexShader: blitVert,
      fragmentShader: blitFrag,
      uniforms: {
        u_texture: { value: null },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.processMesh = new THREE.Mesh(geometry, this.processMaterial);
    this.blitMesh = new THREE.Mesh(geometry.clone(), this.blitMaterial);
    this.processScene.add(this.processMesh);
    this.blitScene.add(this.blitMesh);

    this.ensureFbos(renderer, this.canvasWidth, this.canvasHeight);
  }

  private fboScale() {
    return isCoarsePointer() ? 0.5 : 1;
  }

  private ensureFbos(renderer: THREE.WebGLRenderer, width: number, height: number) {
    const scale = this.fboScale();
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));

    const disposeFbo = (fbo: THREE.WebGLRenderTarget | null) => {
      fbo?.dispose();
    };

    if (this.fboA && this.fboA.width === w && this.fboA.height === h) return;

    disposeFbo(this.fboA);
    disposeFbo(this.fboB);

    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.fboA = new THREE.WebGLRenderTarget(w, h, opts);
    this.fboB = new THREE.WebGLRenderTarget(w, h, opts);
    this.readIndex = 0;
    this.clearFeedbackBuffers(renderer);
  }

  private getReadFbo() {
    return this.readIndex === 0 ? this.fboA : this.fboB;
  }

  private getWriteFbo() {
    return this.readIndex === 0 ? this.fboB : this.fboA;
  }

  private swapFbos() {
    this.readIndex = 1 - this.readIndex;
  }

  clearFeedbackBuffers(renderer: THREE.WebGLRenderer) {
    if (!this.fboA || !this.fboB) return;
    const prevTarget = renderer.getRenderTarget();
    const clearColor = new THREE.Color(0, 0, 0);
    for (const fbo of [this.fboA, this.fboB]) {
      renderer.setRenderTarget(fbo);
      renderer.setClearColor(clearColor, 1);
      renderer.clear();
    }
    renderer.setRenderTarget(prevTarget);
  }

  setVideoTexture(texture: THREE.VideoTexture | null) {
    if (!this.processMaterial) return;
    this.processMaterial.uniforms.u_video.value = texture;
    this.updateVideoAspect(texture);
  }

  private updateVideoAspect(texture: THREE.VideoTexture | null) {
    if (!this.processMaterial || !texture) return;
    const video = texture.image as HTMLVideoElement | undefined;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      this.videoAspect = video.videoWidth / video.videoHeight;
      this.processMaterial.uniforms.u_videoAspect.value = this.videoAspect;
    }
  }

  isReady() {
    return this.processMaterial?.uniforms.u_video.value != null;
  }

  resize(width: number, height: number, renderer: THREE.WebGLRenderer) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.screenAspect = width / Math.max(1, height);
    if (this.processMaterial) {
      this.processMaterial.uniforms.u_screenAspect.value = this.screenAspect;
    }
    this.ensureFbos(renderer, width, height);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState, axes: LookAxes = identityAxes()) {
    if (!this.processMaterial) return;

    const texture = this.processMaterial.uniforms.u_video.value as THREE.VideoTexture | null;
    if (texture) {
      texture.needsUpdate = true;
      this.updateVideoAspect(texture);
    }

    const bass = Math.max(0, features.bass);
    const mid = Math.max(0, features.mid);
    const high = Math.max(0, features.high);
    const flux = Math.max(0, features.spectralFlux);

    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    this.midPeak = Math.max(this.midPeak * 0.985, mid);
    this.highPeak = Math.max(this.highPeak * 0.985, high);
    this.fluxPeak = Math.max(this.fluxPeak * 0.985, flux);

    const bassN = bass / (this.bassPeak + 1e-9);
    const midN = mid / (this.midPeak + 1e-9);
    const highN = high / (this.highPeak + 1e-9);
    const fluxN = flux / (this.fluxPeak + 1e-9);

    const w = state.moodWeights;
    const beat = state.beat;
    const syncWeight = beat.syncActive ? beat.confidence : 0;

    const baseFeedback = blendMood(0.15, 0.32, 0.52, w) * axes.feedback;
    const phase2aFeedback = clamp01(baseFeedback + bassN * 0.04 + state.rave * 0.02 * axes.intensity);

    let beatFeedback = phase2aFeedback + BEAT_FB_DECAY * Math.exp(-beat.beatPhase * 4);
    if (beat.onBeat) beatFeedback += BEAT_FB_PULSE;
    const feedbackAmount = blendSync(phase2aFeedback, beatFeedback, syncWeight);

    const kaleidoBase = blendMood(1, 3.5, 6.5, w) * axes.fold;
    const phase2aKaleido = Math.min(8, Math.max(1, Math.round(kaleidoBase)));
    const barStep = Math.floor(beat.barPhase * 4) / 3;
    const beatKaleido = Math.min(
      8,
      Math.max(1, Math.round(kaleidoBase + BEAT_KALEIDO_STEP * barStep)),
    );
    const kaleidoscopeSegments = Math.round(
      blendSync(phase2aKaleido, beatKaleido, syncWeight),
    );

    const hueBase = blendMood(0.02, 0.12, 0.35, w) * axes.hue;
    const hueCycleSpeed = hueBase * (1 + highN * 0.25);
    this.huePhaseAccum += dtSeconds * hueCycleSpeed;
    const beatHue = beat.beatIndex * BEAT_HUE_STEP;
    const huePhase = blendSync(this.huePhaseAccum, beatHue, syncWeight);

    const meltZoomScale = (blendMood(1, 1, 1.22, w) + bassN * 0.04) * axes.melt;
    const glitchStrength = blendMood(0.55, 1.0, 1.0, w) * axes.glitch;

    this.processMaterial.uniforms.u_time.value += dtSeconds;
    this.processMaterial.uniforms.u_bass.value = Math.min(1.4, bassN);
    this.processMaterial.uniforms.u_mid.value = Math.min(1.4, midN);
    this.processMaterial.uniforms.u_high.value = Math.min(1.5, highN);
    this.processMaterial.uniforms.u_lightningFlash.value = state.lightningFlash;
    this.processMaterial.uniforms.u_rave.value = state.rave * axes.intensity;
    this.processMaterial.uniforms.u_feedbackAmount.value = Math.min(0.62, feedbackAmount);
    this.processMaterial.uniforms.u_kaleidoscopeSegments.value = kaleidoscopeSegments;
    this.processMaterial.uniforms.u_huePhase.value = huePhase;
    this.processMaterial.uniforms.u_meltZoomScale.value = meltZoomScale;
    this.processMaterial.uniforms.u_glitchStrength.value = glitchStrength;
    this.processMaterial.uniforms.u_beatPhase.value = beat.beatPhase;
    this.processMaterial.uniforms.u_beatSyncWeight.value = syncWeight;

    this.maybeTriggerGlitch(fluxN, glitchStrength, beat);
  }

  private maybeTriggerGlitch(
    fluxN: number,
    glitchStrength: number,
    beat: VJState['beat'],
  ) {
    if (!this.processMaterial) return;

    const now = performance.now() * 0.001;
    const cooldown = 0.18;
    const highBar = 0.85;

    const inBeatWindow =
      !beat.syncActive ||
      beat.beatPhase < BEAT_GLITCH_WINDOW ||
      beat.onBeat;

    if (
      this.glitchFramesLeft <= 0 &&
      now - this.lastGlitchT > cooldown &&
      fluxN > highBar &&
      inBeatWindow
    ) {
      this.lastGlitchT = now;
      this.glitchFramesLeft = 3;
      this.glitchOffset.set(
        (Math.random() - 0.5) * 0.04 * glitchStrength,
        (Math.random() - 0.5) * 0.03 * glitchStrength,
      );
    }

    if (this.glitchFramesLeft > 0) {
      this.processMaterial.uniforms.u_glitchOffset.value.copy(this.glitchOffset);
      this.glitchFramesLeft -= 1;
      if (this.glitchFramesLeft <= 0) {
        this.glitchOffset.set(0, 0);
        this.processMaterial.uniforms.u_glitchOffset.value.set(0, 0);
      }
    } else {
      this.processMaterial.uniforms.u_glitchOffset.value.set(0, 0);
    }
  }

  render(renderer: THREE.WebGLRenderer) {
    if (!this.isReady() || !this.processMaterial || !this.blitMaterial || !this.fboA || !this.fboB) {
      return;
    }

    const readFbo = this.getReadFbo()!;
    const writeFbo = this.getWriteFbo()!;

    this.processMaterial.uniforms.u_feedback.value = readFbo.texture;

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(writeFbo);
    renderer.render(this.processScene, this.orthoCamera);

    renderer.setRenderTarget(null);
    this.blitMaterial.uniforms.u_texture.value = writeFbo.texture;
    renderer.render(this.blitScene, this.orthoCamera);

    renderer.setRenderTarget(prevTarget);
    this.swapFbos();
  }

  dispose() {
    this.fboA?.dispose();
    this.fboB?.dispose();
    this.fboA = null;
    this.fboB = null;
    this.processMaterial?.dispose();
    this.blitMaterial?.dispose();
    this.processMesh?.geometry.dispose();
    this.blitMesh?.geometry.dispose();
  }
}
