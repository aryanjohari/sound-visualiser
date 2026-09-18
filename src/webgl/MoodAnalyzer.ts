import type { AudioFeatures } from '../audio/AudioEngine';
import type { Mood, MoodWeights, VJState } from './StateManager';

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const DEFAULT_WEIGHTS: MoodWeights = { calm: 1, groove: 0, intense: 0 };

/** Partition of unity used by the live mood path. */
export function partitionMoodWeights(calm: number, groove: number, intense: number): MoodWeights {
  const sum = calm + groove + intense + 1e-9;
  return {
    calm: calm / sum,
    groove: groove / sum,
    intense: intense / sum,
  };
}

export function moodWeightSum(weights: MoodWeights) {
  return weights.calm + weights.groove + weights.intense;
}

export class MoodAnalyzer {
  private weights: MoodWeights = { ...DEFAULT_WEIGHTS };
  private rmsPeak = 1e-6;
  private fluxPeak = 1e-6;
  private fluxHistory: number[] = [];
  private readonly historySize = 30;
  private readonly moodAlpha = 0.06;
  private readonly peakDecay = 0.985;

  update(features: AudioFeatures, state: Pick<VJState, 'rave' | 'rmsAvg' | 'fluxAvg' | 'lightningFlash'>, dtSeconds: number) {
    this.rmsPeak = Math.max(this.rmsPeak * this.peakDecay, state.rmsAvg);
    this.fluxPeak = Math.max(this.fluxPeak * this.peakDecay, state.fluxAvg);

    const rmsN = state.rmsAvg / (this.rmsPeak + 1e-9);
    const fluxN = state.fluxAvg / (this.fluxPeak + 1e-9);

    this.fluxHistory.push(fluxN);
    if (this.fluxHistory.length > this.historySize) this.fluxHistory.shift();

    let fluxVar = 0;
    if (this.fluxHistory.length > 2) {
      const mean = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
      fluxVar = this.fluxHistory.reduce((a, v) => a + (v - mean) ** 2, 0) / this.fluxHistory.length;
      fluxVar = clamp01(fluxVar * 4);
    }

    const bass = Math.max(0, features.bass);
    const mid = Math.max(0, features.mid);
    void (mid / (bass + mid + 1e-9)); // vocalBias reserved for future tuning

    const calmRaw =
      (1 - state.rave) * (1 - 0.55 * fluxN) * (1 - 0.35 * rmsN) * (1 - 0.4 * state.lightningFlash);
    const grooveRaw =
      smoothstep(0.2, 0.7, rmsN) * (1 - clamp01(fluxVar * 2.5)) * (1 - Math.abs(state.rave - 0.48) * 1.8);
    const intenseRaw =
      state.rave * 0.42 + fluxN * 0.32 + state.lightningFlash * 0.18 + fluxVar * 0.28;

    const target = partitionMoodWeights(calmRaw, grooveRaw, intenseRaw);

    const alpha = 1 - Math.pow(1 - this.moodAlpha, Math.max(0.001, dtSeconds * 60));
    this.weights = {
      calm: this.weights.calm * (1 - alpha) + target.calm * alpha,
      groove: this.weights.groove * (1 - alpha) + target.groove * alpha,
      intense: this.weights.intense * (1 - alpha) + target.intense * alpha,
    };

    const moodWeights = partitionMoodWeights(
      this.weights.calm,
      this.weights.groove,
      this.weights.intense,
    );

    let mood: Mood = 'calm';
    if (moodWeights.groove >= moodWeights.calm && moodWeights.groove >= moodWeights.intense) {
      mood = 'groove';
    }
    if (moodWeights.intense >= moodWeights.calm && moodWeights.intense >= moodWeights.groove) {
      mood = 'intense';
    }

    return { mood, moodWeights };
  }
}
