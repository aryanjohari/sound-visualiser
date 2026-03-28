import type { AudioFeatures } from '../audio/AudioEngine';

export type VJState = {
  rave: number; // 0=cinematic, 1=rave
  cinematic: number; // 1-rave (kept explicit for shader uniforms)
  rmsAvg: number;
  fluxAvg: number;
  /** Instantaneous 0–1 thresholded high (same as fluid lightning `u_high`). */
  thresholdedHigh: number;
  /**
   * Exponential lerp toward `thresholdedHigh` — drives center PointLight + particle flash
   * so hi-hat spikes hit hard then decay quickly.
   */
  lightningFlash: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Simple rolling-average state manager that interpolates between:
 * - "Cinematic": low RMS / slower energy
 * - "Rave": high RMS + spectralFlux spikes (drops)
 */
export class StateManager {
  private rmsAvg = 0;
  private fluxAvg = 0;

  private rmsPeak = 1e-6;
  private fluxPeak = 1e-6;
  private highPeak = 1e-6;

  private rave = 0; // smoothed
  private lightningFlashSmooth = 0;

  private readonly avgAlpha: number;
  private readonly transitionAlpha: number;
  private readonly peakDecay: number;
  /** Per-second rate for center flash / point light tracking thresholded high (higher = snappier). */
  private readonly lightningFlashResponse: number;

  constructor(opts?: {
    avgAlpha?: number;
    transitionAlpha?: number;
    peakDecay?: number;
    lightningFlashResponse?: number;
  }) {
    this.avgAlpha = opts?.avgAlpha ?? 0.08;
    this.transitionAlpha = opts?.transitionAlpha ?? 0.12;
    this.peakDecay = opts?.peakDecay ?? 0.985;
    this.lightningFlashResponse = opts?.lightningFlashResponse ?? 38;
  }

  update(features: AudioFeatures, dtSeconds: number) {
    // Exponential moving averages for rolling RMS/Flux
    const a = 1 - Math.pow(1 - this.avgAlpha, Math.max(0.001, dtSeconds * 60));
    this.rmsAvg = this.rmsAvg * (1 - a) + features.rms * a;
    this.fluxAvg = this.fluxAvg * (1 - a) + features.spectralFlux * a;

    // Track rolling peak to normalize ranges without hard-coding audio ceilings.
    this.rmsPeak = Math.max(this.rmsPeak * this.peakDecay, this.rmsAvg);
    this.fluxPeak = Math.max(this.fluxPeak * this.peakDecay, this.fluxAvg);

    const rmsN = this.rmsAvg / (this.rmsPeak + 1e-9);
    const fluxN = this.fluxAvg / (this.fluxPeak + 1e-9);

    // Rave targets kicks/drops: both energy and flux spikes matter.
    const raveTarget = smoothstep(0.35, 1.0, 0.55 * rmsN + 0.65 * fluxN);

    // Smooth state transitions so camera + uniforms feel cinematic, not jittery.
    const ta = 1 - Math.pow(1 - this.transitionAlpha, Math.max(0.001, dtSeconds * 60));
    this.rave = this.rave * (1 - ta) + raveTarget * ta;

    const high = Math.max(0, features.high);
    this.highPeak = Math.max(this.highPeak * this.peakDecay, high);
    const highN = high / (this.highPeak + 1e-9);
    const thresholdedHigh = Math.min(
      1.0,
      Math.min(1.2, highN) * smoothstep(0.4, 0.9, highN),
    );

    const flashAlpha = 1 - Math.exp(-dtSeconds * this.lightningFlashResponse);
    this.lightningFlashSmooth += (thresholdedHigh - this.lightningFlashSmooth) * flashAlpha;

    return {
      rave: this.rave,
      cinematic: 1 - this.rave,
      rmsAvg: this.rmsAvg,
      fluxAvg: this.fluxAvg,
      thresholdedHigh,
      lightningFlash: this.lightningFlashSmooth,
    } satisfies VJState;
  }
}

