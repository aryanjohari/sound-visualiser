import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { VJState } from './StateManager';
import type { VJScene } from './Scene';

export class Loop {
  private raf: number | null = null;
  private running = false;

  private readonly clock = new THREE.Clock();

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
    this.clock.start();
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private tick = () => {
    if (!this.running) return;

    const dtSeconds = this.clock.getDelta();
    const features = this.params.audioEngine.getFeatures();
    const state = this.params.stateManager.update(features, dtSeconds);

    this.params.scene.update(dtSeconds, features, state);
    this.params.scene.render();

    this.raf = requestAnimationFrame(this.tick);
  };
}

