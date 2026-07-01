import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

import liveFeedVert from '../../shaders/liveFeed.vert.glsl?raw';
import liveFeedFrag from '../../shaders/liveFeed.frag.glsl?raw';

function blendSync(phase2a: number, beat: number, syncWeight: number) {
  return phase2a + (beat - phase2a) * syncWeight;
}

export class LiveFeedLayer {
  private readonly liveScene = new THREE.Scene();
  private readonly orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;

  private screenAspect = 1;
  private videoAspect = 16 / 9;

  private bassPeak = 1e-6;
  private midPeak = 1e-6;
  private highPeak = 1e-6;
  private fluxPeak = 1e-6;

  private glitchOffset = new THREE.Vector2(0, 0);
  private glitchFramesLeft = 0;
  private lastGlitchT = -Infinity;

  init(_renderer: THREE.WebGLRenderer) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: liveFeedVert,
      fragmentShader: liveFeedFrag,
      uniforms: {
        u_video: { value: null },
        u_screenAspect: { value: 1 },
        u_videoAspect: { value: 16 / 9 },
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_high: { value: 0 },
        u_lightningFlash: { value: 0 },
        u_rave: { value: 0 },
        u_glitchOffset: { value: new THREE.Vector2(0, 0) },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.liveScene.add(this.mesh);
  }

  setVideoTexture(texture: THREE.VideoTexture | null) {
    if (!this.material) return;
    this.material.uniforms.u_video.value = texture;
    this.updateVideoAspect(texture);
  }

  private updateVideoAspect(texture: THREE.VideoTexture | null) {
    if (!this.material || !texture) return;
    const video = texture.image as HTMLVideoElement | undefined;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      this.videoAspect = video.videoWidth / video.videoHeight;
      this.material.uniforms.u_videoAspect.value = this.videoAspect;
    }
  }

  isReady() {
    return this.material?.uniforms.u_video.value != null;
  }

  resize(width: number, height: number) {
    this.screenAspect = width / Math.max(1, height);
    if (this.material) {
      this.material.uniforms.u_screenAspect.value = this.screenAspect;
    }
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState) {
    if (!this.material) return;

    const texture = this.material.uniforms.u_video.value as THREE.VideoTexture | null;
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

    const beat = state.beat;
    const syncWeight = beat.syncActive ? beat.confidence : 0;
    let bassOut = Math.min(1.4, bassN);
    if (syncWeight > 0) {
      const pulse = 0.85 + 0.15 * Math.sin(beat.beatPhase * Math.PI * 2);
      bassOut = blendSync(bassOut, bassOut * pulse, syncWeight);
    }

    this.material.uniforms.u_time.value += dtSeconds;
    this.material.uniforms.u_bass.value = bassOut;
    this.material.uniforms.u_mid.value = Math.min(1.4, midN);
    this.material.uniforms.u_high.value = Math.min(1.5, highN);
    this.material.uniforms.u_lightningFlash.value = state.lightningFlash;
    this.material.uniforms.u_rave.value = state.rave;

    this.maybeTriggerGlitch(fluxN, state.beat);
  }

  private maybeTriggerGlitch(fluxN: number, beat: VJState['beat']) {
    if (!this.material) return;

    const now = performance.now() * 0.001;
    const cooldown = 0.18;
    const highBar = 0.85;
    const beatGlitchWindow = 0.2;

    const inBeatWindow =
      !beat.syncActive ||
      beat.beatPhase < beatGlitchWindow ||
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
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.03,
      );
    }

    if (this.glitchFramesLeft > 0) {
      this.material.uniforms.u_glitchOffset.value.copy(this.glitchOffset);
      this.glitchFramesLeft -= 1;
      if (this.glitchFramesLeft <= 0) {
        this.glitchOffset.set(0, 0);
        this.material.uniforms.u_glitchOffset.value.set(0, 0);
      }
    } else {
      this.material.uniforms.u_glitchOffset.value.set(0, 0);
    }
  }

  render(renderer: THREE.WebGLRenderer) {
    if (!this.isReady()) return;
    renderer.render(this.liveScene, this.orthoCamera);
  }
}
