import type { AudioFeatures } from '../audio/AudioEngine';

export type VJState = {
  rave: number; // 0=cinematic, 1=rave
  cinematic: number; // 1-rave (kept explicit for shader uniforms)
  rmsAvg: number;
  fluxAvg: number;
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

  private rave = 0; // smoothed

  private readonly avgAlpha: number;
  private readonly transitionAlpha: number;
  private readonly peakDecay: number;

  constructor(opts?: { avgAlpha?: number; transitionAlpha?: number; peakDecay?: number }) {
    this.avgAlpha = opts?.avgAlpha ?? 0.08;
    this.transitionAlpha = opts?.transitionAlpha ?? 0.12;
    this.peakDecay = opts?.peakDecay ?? 0.985;
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

    return {
      rave: this.rave,
      cinematic: 1 - this.rave,
      rmsAvg: this.rmsAvg,
      fluxAvg: this.fluxAvg,
    } satisfies VJState;
  }
}

