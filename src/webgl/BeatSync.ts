import type { AudioFeatures } from '../audio/AudioEngine';
import type { BeatState, SyncMode } from './StateManager';

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function fract(v: number) {
  return v - Math.floor(v);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// --- Tunable constants ---
export const CONFIDENCE_THRESHOLD = 0.45;
export const MIN_ONSETS = 4;
const ONSET_COOLDOWN_SEC = 0.22;
const ONSET_FLUX_BAR = 0.78;
const ONSET_BASS_BAR = 0.72;
export const BPM_MIN = 60;
export const BPM_MAX = 180;
const INTERVAL_BUFFER_SIZE = 12;
export const SILENCE_RMS_N = 0.08;
const WARMUP_SEC = 2.5;
const IOI_MIN = 60 / BPM_MAX; // 0.33s
const IOI_MAX = 60 / BPM_MIN; // 1.0s
const BPM_SMOOTH_ALPHA = 0.08;
const CONF_SMOOTH_ALPHA = 0.1;
const PLL_NUDGE = 0.35;

export type TempoVote = {
  bestBpm: number;
  bestScore: number;
  secondBpm: number;
  secondScore: number;
};

/** Score one integer BPM by IOI hits on period and double-period (12% window). */
export function scoreIoiVote(intervals: number[], bpm: number): number {
  if (intervals.length === 0) return 0;
  const period = 60 / bpm;
  let hits = 0;
  for (const ioi of intervals) {
    let matched = false;
    for (const k of [1, 2]) {
      const err = Math.abs(ioi - k * period) / period;
      if (err < 0.12) {
        matched = true;
        break;
      }
    }
    if (matched) hits += 1;
  }
  return hits / intervals.length;
}

/** Brute-force IOI vote over integer BPM 60–180, scoring period and double-period hits. */
export function voteTempo(intervals: number[], fallbackBpm = 120): TempoVote {
  let bestBpm = fallbackBpm;
  let bestScore = -1;
  let secondBpm = fallbackBpm;
  let secondScore = -1;

  if (intervals.length === 0) {
    return { bestBpm, bestScore, secondBpm, secondScore };
  }

  for (let b = BPM_MIN; b <= BPM_MAX; b += 1) {
    const score = scoreIoiVote(intervals, b);
    if (score > bestScore) {
      secondScore = bestScore;
      secondBpm = bestBpm;
      bestScore = score;
      bestBpm = b;
    } else if (score > secondScore) {
      secondScore = score;
      secondBpm = b;
    }
  }

  return { bestBpm, bestScore, secondBpm, secondScore };
}

/** When best/second BPM are ~2:1, prefer the period closer to the median IOI. */
export function octaveTiebreak(vote: TempoVote, intervals: number[]): number {
  let bestBpm = vote.bestBpm;
  const ratio = vote.bestBpm / (vote.secondBpm + 1e-9);
  if (vote.secondScore > 0 && (ratio > 1.8 || ratio < 0.55)) {
    const med = median(intervals);
    const errBest = Math.abs(60 / vote.bestBpm - med);
    const errSecond = Math.abs(60 / vote.secondBpm - med);
    if (errSecond < errBest) bestBpm = vote.secondBpm;
  }
  return bestBpm;
}

export function estimateBpmFromIntervals(intervals: number[], currentBpm: number): number | null {
  const vote = voteTempo(intervals, currentBpm);
  if (vote.bestScore > 0) return octaveTiebreak(vote, intervals);
  return null;
}

/** Product of onset-count × consistency × BPM stability × energy gate × warmup. */
export function productConfidence(
  nFactor: number,
  consistency: number,
  bpmStability: number,
  energyGate: number,
  warmup: number,
) {
  return nFactor * consistency * bpmStability * energyGate * warmup;
}

export function confidenceFromIntervals(opts: {
  intervalCount: number;
  intervals: number[];
  bpm: number;
  prevBpm: number;
  rmsN: number;
  elapsedSec: number;
}) {
  const nFactor = smoothstep(MIN_ONSETS, MIN_ONSETS + 4, opts.intervalCount);
  const period = 60 / opts.bpm;

  let totalErr = 0;
  for (const ioi of opts.intervals) {
    let minErr = Infinity;
    for (const k of [1, 2]) {
      minErr = Math.min(minErr, Math.abs(ioi - k * period) / period);
    }
    totalErr += minErr;
  }
  const meanErr = totalErr / Math.max(1, opts.intervals.length);
  const consistency = 1 - clamp01(meanErr / 0.15);
  const bpmStability = 1 - clamp01(Math.abs(opts.bpm - opts.prevBpm) / 8);
  const energyGate = smoothstep(SILENCE_RMS_N, 0.25, opts.rmsN);
  const warmup = clamp01(opts.elapsedSec / WARMUP_SEC);

  return productConfidence(nFactor, consistency, bpmStability, energyGate, warmup);
}

export function defaultBeatState(syncMode: SyncMode = 'auto'): BeatState {
  return {
    bpm: 120,
    confidence: 0,
    beatPhase: 0,
    barPhase: 0,
    beatIndex: 0,
    onBeat: false,
    onDownbeat: false,
    syncMode,
    syncActive: false,
  };
}

export class BeatSync {
  private fluxPeak = 1e-6;
  private bassPeak = 1e-6;
  private rmsPeak = 1e-6;
  private readonly peakDecay = 0.985;

  private lastOnsetT = -Infinity;
  private firstOnsetT = -Infinity;
  private onsetTimes: number[] = [];
  private intervals: number[] = [];

  private bpm = 120;
  private prevBpm = 120;
  private confidence = 0;
  private phaseOffset = 0;
  private beatIndex = 0;
  private prevBeatPhase = 0;

  private frozenBeatPhase = 0;
  private frozenBarPhase = 0;
  private frozenBeatIndex = 0;

  update(
    features: AudioFeatures,
    state: { rmsAvg: number },
    dtSeconds: number,
    syncMode: SyncMode,
  ): BeatState {
    const now = performance.now() * 0.001;

    if (syncMode === 'off') {
      return {
        bpm: this.bpm,
        confidence: this.confidence,
        beatPhase: this.frozenBeatPhase,
        barPhase: this.frozenBarPhase,
        beatIndex: this.frozenBeatIndex,
        onBeat: false,
        onDownbeat: false,
        syncMode,
        syncActive: false,
      };
    }

    const flux = Math.max(0, features.spectralFlux);
    const bass = Math.max(0, features.bass);

    this.fluxPeak = Math.max(this.fluxPeak * this.peakDecay, flux);
    this.bassPeak = Math.max(this.bassPeak * this.peakDecay, bass);
    this.rmsPeak = Math.max(this.rmsPeak * this.peakDecay, state.rmsAvg);

    const fluxN = flux / (this.fluxPeak + 1e-9);
    const bassN = bass / (this.bassPeak + 1e-9);
    const rmsN = state.rmsAvg / (this.rmsPeak + 1e-9);

    const onsetScore = Math.max(fluxN, bassN * 0.9);
    const bassOnset = bassN > ONSET_BASS_BAR && fluxN > 0.55;
    const canOnset = now - this.lastOnsetT > ONSET_COOLDOWN_SEC && rmsN > SILENCE_RMS_N;

    if (canOnset && (onsetScore > ONSET_FLUX_BAR || bassOnset)) {
      if (this.lastOnsetT > -Infinity) {
        const interval = now - this.lastOnsetT;
        if (interval >= IOI_MIN && interval <= IOI_MAX) {
          this.intervals.push(interval);
          if (this.intervals.length > INTERVAL_BUFFER_SIZE) this.intervals.shift();
        }
      }

      if (this.firstOnsetT < 0) this.firstOnsetT = now;

      const beatPeriod = 60 / this.bpm;
      if (this.lastOnsetT > -Infinity && beatPeriod > 0) {
        const predicted = fract((now - this.lastOnsetT - this.phaseOffset) / beatPeriod);
        this.phaseOffset += predicted * PLL_NUDGE;
      }

      this.lastOnsetT = now;
      this.onsetTimes.push(now);
      if (this.onsetTimes.length > 16) this.onsetTimes.shift();
    }

    if (rmsN < SILENCE_RMS_N) {
      this.confidence *= 0.9;
    } else if (this.intervals.length >= MIN_ONSETS - 1) {
      this.estimateBpm();
      this.updateConfidence(dtSeconds, rmsN);
    }

    const beatPeriod = 60 / Math.max(BPM_MIN, Math.min(BPM_MAX, this.bpm));
    let beatPhase = this.prevBeatPhase;
    let barPhase = 0;
    let onBeat = false;
    let onDownbeat = false;

    if (this.confidence > 0.15 && this.lastOnsetT > -Infinity) {
      beatPhase = fract((now - this.lastOnsetT - this.phaseOffset) / beatPeriod);
      this.beatIndex = Math.floor((now - this.firstOnsetT - this.phaseOffset) / beatPeriod);
      barPhase = fract(this.beatIndex / 4 + beatPhase / 4);

      onBeat = beatPhase < this.prevBeatPhase || beatPhase < dtSeconds / beatPeriod;
      onDownbeat = onBeat && this.beatIndex % 4 === 0;

      this.frozenBeatPhase = beatPhase;
      this.frozenBarPhase = barPhase;
      this.frozenBeatIndex = this.beatIndex;
    }

    this.prevBeatPhase = beatPhase;
    this.prevBpm = this.bpm;

    const syncActive = syncMode === 'auto' && this.confidence >= CONFIDENCE_THRESHOLD;

    return {
      bpm: this.bpm,
      confidence: this.confidence,
      beatPhase,
      barPhase,
      beatIndex: this.beatIndex,
      onBeat,
      onDownbeat,
      syncMode,
      syncActive,
    };
  }

  private estimateBpm() {
    const voted = estimateBpmFromIntervals(this.intervals, this.bpm);
    if (voted != null) {
      const alpha = BPM_SMOOTH_ALPHA;
      this.bpm = this.bpm * (1 - alpha) + voted * alpha;
      this.bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, this.bpm));
    }
  }

  private updateConfidence(dtSeconds: number, rmsN: number) {
    const elapsed =
      this.firstOnsetT > 0 ? performance.now() * 0.001 - this.firstOnsetT : 0;
    const raw = confidenceFromIntervals({
      intervalCount: this.intervals.length,
      intervals: this.intervals,
      bpm: this.bpm,
      prevBpm: this.prevBpm,
      rmsN,
      elapsedSec: elapsed,
    });
    const alpha = 1 - Math.pow(1 - CONF_SMOOTH_ALPHA, Math.max(0.001, dtSeconds * 60));
    this.confidence = this.confidence * (1 - alpha) + raw * alpha;
    this.confidence = clamp01(this.confidence);
  }

  reset() {
    this.lastOnsetT = -Infinity;
    this.firstOnsetT = -Infinity;
    this.onsetTimes = [];
    this.intervals = [];
    this.bpm = 120;
    this.prevBpm = 120;
    this.confidence = 0;
    this.phaseOffset = 0;
    this.beatIndex = 0;
    this.prevBeatPhase = 0;
  }
}
