import { describe, expect, it } from 'vitest';
import {
  BPM_MAX,
  BPM_MIN,
  confidenceFromIntervals,
  estimateBpmFromIntervals,
  octaveTiebreak,
  productConfidence,
  scoreIoiVote,
  voteTempo,
} from './BeatSync';

describe('BeatSync helpers', () => {
  it('scores 0.5s IOIs in the 120 BPM band (60–180 vote)', () => {
    const intervals = Array.from({ length: 12 }, () => 0.5);
    const vote = voteTempo(intervals);
    expect(vote.bestBpm).toBeGreaterThanOrEqual(BPM_MIN);
    expect(vote.bestBpm).toBeLessThanOrEqual(BPM_MAX);
    expect(scoreIoiVote(intervals, 120)).toBe(1);
    expect(vote.bestScore).toBe(1);
    expect(scoreIoiVote(intervals, 30)).toBe(0);
    expect(vote.bestBpm).toBeGreaterThanOrEqual(BPM_MIN);
    expect(vote.bestBpm).toBeLessThanOrEqual(BPM_MAX);
  });

  it('does not invent a lock from an empty interval buffer', () => {
    const vote = voteTempo([]);
    expect(vote.bestScore).toBeLessThanOrEqual(0);
    expect(estimateBpmFromIntervals([], 120)).toBeNull();
  });

  it('octave-tiebreaks 1.0s IOIs toward 60 rather than 120', () => {
    const intervals = Array.from({ length: 12 }, () => 1.0);
    const vote = voteTempo(intervals);
    const bpm = octaveTiebreak(vote, intervals);
    expect(bpm).toBeGreaterThanOrEqual(58);
    expect(bpm).toBeLessThanOrEqual(62);
  });

  it('keeps product confidence at 0 for silence / empty intervals', () => {
    expect(productConfidence(0, 1, 1, 1, 1)).toBe(0);
    const silent = confidenceFromIntervals({
      intervalCount: 0,
      intervals: [],
      bpm: 120,
      prevBpm: 120,
      rmsN: 0,
      elapsedSec: 0,
    });
    expect(silent).toBe(0);
  });
});
