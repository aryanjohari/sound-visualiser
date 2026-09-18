import { describe, expect, it } from 'vitest';
import { blendSync } from './blendSync';

describe('blendSync', () => {
  it('blends; it does not switch', () => {
    expect(blendSync(0.2, 0.8, 0)).toBe(0.2);
    expect(blendSync(0.2, 0.8, 1)).toBe(0.8);
    expect(blendSync(0.2, 0.8, 0.5)).toBeCloseTo(0.5);
  });

  it('fails a boolean-switch helper that ignores confidence', () => {
    const thresholdPop = (unsynced: number, beat: number, syncActive: boolean) =>
      syncActive ? beat : unsynced;
    expect(thresholdPop(0.2, 0.8, true)).toBe(0.8);
    expect(blendSync(0.2, 0.8, 0.45)).not.toBe(0.8);
    expect(blendSync(0.2, 0.8, 0.45)).toBeCloseTo(0.2 + (0.8 - 0.2) * 0.45);
  });
});
