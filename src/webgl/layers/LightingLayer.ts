import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

/** Max intensity for the center white flash (0–1 `lightningFlash` → Three.js units). */
const CENTER_FLASH_INTENSITY_MAX = 22;

export class LightingLayer {
  private dir: THREE.DirectionalLight;
  private p1: THREE.PointLight;
  private p2: THREE.PointLight;
  /** White point at world origin: hi-hat / thresholded high physically lifts the particle knot. */
  private centerFlash: THREE.PointLight;

  private fluxPeak = 1e-6;

  constructor() {
    this.dir = new THREE.DirectionalLight(0x6aa4ff, 1.0);
    this.dir.position.set(-2.5, 3.8, 2.0);

    this.p1 = new THREE.PointLight(0xff4fc8, 0.9, 100, 2.0);
    this.p1.position.set(3.0, -1.2, 2.5);

    this.p2 = new THREE.PointLight(0x3cffea, 0.6, 100, 2.0);
    this.p2.position.set(-3.2, 2.0, -2.2);

    this.centerFlash = new THREE.PointLight(0xffffff, 0, 100, 2);
    this.centerFlash.position.set(0, 0, 0);
  }

  init(threeScene: THREE.Scene) {
    threeScene.add(this.dir);
    threeScene.add(this.p1);
    threeScene.add(this.p2);
    threeScene.add(this.centerFlash);
  }

  update(_dtSeconds: number, features: AudioFeatures, state: VJState) {
    const flux = Math.max(0, features.spectralFlux);
    this.fluxPeak = Math.max(this.fluxPeak * 0.985, flux);

    const fluxN = flux / (this.fluxPeak + 1e-9);
    const fluxBoost = Math.min(1.5, fluxN) * (0.45 + 0.85 * state.rave);

    this.dir.intensity = 0.2 + 2.5 * fluxBoost;

    this.p1.intensity = 0.1 + 1.3 * fluxBoost;
    this.p1.color.setHSL(0.9 + 0.12 * fluxN, 0.9, 0.6);

    this.p2.intensity = 0.08 + 0.95 * fluxBoost;
    this.p2.color.setHSL(0.48 + 0.1 * fluxN, 0.95, 0.55);

    this.centerFlash.intensity = state.lightningFlash * CENTER_FLASH_INTENSITY_MAX;
  }
}

