import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { AudioFeatures } from '../audio/AudioEngine';
import type { VJState } from './StateManager';
import type { VJScene } from './Scene';

export class Loop {
  private raf: number | null = null;
  private running = false;

  private timer: THREE.Timer | null = null;

  private spectralFluxPeak = 1e-6;
  private lastSpectralPunchT = -Infinity;

  constructor(
    private readonly params: {
      scene: VJScene;
      audioEngine: AudioEngine;
      stateManager: { update: (features: any, dtSeconds: number) => VJState };
    },
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.timer?.dispose();
    this.timer = new THREE.Timer();
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  /**
   * Beat-drop feel: when normalized spectral flux spikes above a high bar,
   * punch the camera forward (Z dolly along view) via GSAP in Director.
   */
  private maybeSpectralFluxCameraPunch(features: AudioFeatures) {
    const flux = Math.max(0, features.spectralFlux);
    this.spectralFluxPeak = Math.max(this.spectralFluxPeak * 0.982, flux);
    const fluxN = flux / (this.spectralFluxPeak + 1e-9);
    const now = performance.now() * 0.001;
    const highBar = 0.88;
    const cooldown = 0.24;
    if (now - this.lastSpectralPunchT > cooldown && fluxN > highBar) {
      this.lastSpectralPunchT = now;
      this.params.scene.triggerCameraZDollyPunch();
    }
  }

  private tick = (time?: DOMHighResTimeStamp) => {
    if (!this.running || !this.timer) return;

    this.timer.update(time);
    const dtSeconds = this.timer.getDelta();
    const features = this.params.audioEngine.getFeatures();
    this.maybeSpectralFluxCameraPunch(features);

    const state = this.params.stateManager.update(features, dtSeconds);

    this.params.scene.update(dtSeconds, features, state);
    this.params.scene.render();

    this.raf = requestAnimationFrame(this.tick);
  };
}

