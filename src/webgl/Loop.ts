import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { AudioFeatures } from '../audio/AudioEngine';
import type { SyncMode, VJState } from './StateManager';
import { BeatSync } from './BeatSync';
import { MoodAnalyzer } from './MoodAnalyzer';
import type { VJScene } from './Scene';

export class Loop {
  private raf: number | null = null;
  private running = false;

  private timer: THREE.Timer | null = null;
  private readonly moodAnalyzer = new MoodAnalyzer();
  private readonly beatSync = new BeatSync();

  private syncMode: SyncMode = 'auto';
  private spectralFluxPeak = 1e-6;
  private lastSpectralPunchT = -Infinity;
  private lastDownbeatDollyT = -Infinity;

  private onStateUpdate: ((state: VJState) => void) | null = null;

  constructor(
    private readonly params: {
      scene: VJScene;
      audioEngine: AudioEngine;
      stateManager: { update: (features: AudioFeatures, dtSeconds: number) => Omit<VJState, 'mood' | 'moodWeights' | 'beat'> };
    },
  ) {}

  setOnStateUpdate(cb: (state: VJState) => void) {
    this.onStateUpdate = cb;
  }

  setSyncMode(mode: SyncMode) {
    this.syncMode = mode;
  }

  getSyncMode(): SyncMode {
    return this.syncMode;
  }

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
  private maybeSpectralFluxCameraPunch(features: AudioFeatures, beat: VJState['beat']) {
    const now = performance.now() * 0.001;

    if (beat.syncActive && beat.onDownbeat) {
      const beatPeriod = 60 / beat.bpm;
      const cooldown = beatPeriod * 0.5;
      if (now - this.lastDownbeatDollyT > cooldown) {
        this.lastDownbeatDollyT = now;
        this.params.scene.triggerCameraZDollyPunch();
        return;
      }
    }

    if (beat.syncActive) return;

    const flux = Math.max(0, features.spectralFlux);
    this.spectralFluxPeak = Math.max(this.spectralFluxPeak * 0.982, flux);
    const fluxN = flux / (this.spectralFluxPeak + 1e-9);
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

    const baseState = this.params.stateManager.update(features, dtSeconds);
    const { mood, moodWeights } = this.moodAnalyzer.update(features, baseState, dtSeconds);
    const beat = this.beatSync.update(features, baseState, dtSeconds, this.syncMode);
    const state: VJState = { ...baseState, mood, moodWeights, beat };

    this.maybeSpectralFluxCameraPunch(features, beat);

    this.onStateUpdate?.(state);

    this.params.scene.update(dtSeconds, features, state);
    this.params.scene.render();

    this.raf = requestAnimationFrame(this.tick);
  };
}

