import { describe, expect, it } from 'vitest';
import { MoodAnalyzer, moodWeightSum, partitionMoodWeights } from './MoodAnalyzer';

const quietFeatures = {
  rms: 0.02,
  spectralFlux: 0.02,
  lowpass: 0,
  bass: 0.05,
  mid: 0.04,
  high: 0.03,
};

const quietState = {
  rave: 0.05,
  rmsAvg: 0.02,
  fluxAvg: 0.02,
  lightningFlash: 0,
};

describe('MoodAnalyzer', () => {
  it('partition of unity sums to ~1', () => {
    const w = partitionMoodWeights(2, 3, 5);
    expect(moodWeightSum(w)).toBeCloseTo(1, 6);
  });

  it('live update keeps calm+groove+intense ≈ 1 and does not snap in one frame', () => {
    const analyzer = new MoodAnalyzer();
    const first = analyzer.update(quietFeatures, quietState, 1 / 60);
    expect(moodWeightSum(first.moodWeights)).toBeCloseTo(1, 5);
    expect(first.moodWeights.calm).toBeGreaterThan(0.8);
    expect(first.moodWeights.intense).toBeLessThan(0.2);

    const loud = analyzer.update(
      { ...quietFeatures, rms: 0.9, spectralFlux: 0.9, bass: 0.8 },
      { rave: 1, rmsAvg: 0.9, fluxAvg: 0.9, lightningFlash: 1 },
      1 / 60,
    );
    expect(moodWeightSum(loud.moodWeights)).toBeCloseTo(1, 5);
    expect(loud.moodWeights.intense).toBeLessThan(0.95);
  });
});
