import { describe, expect, it } from 'vitest';
import {
  identityLookDocument,
  mergePatch,
  parseLookDocument,
  parseLookJson,
  serializeLookDocument,
  LookDocumentError,
} from './index';

const identity = identityLookDocument();

describe('look document', () => {
  it('round-trips identity JSON as shipped v1', () => {
    const json = serializeLookDocument(identity);
    const parsed = parseLookJson(json);
    expect(parsed).toEqual(identity);
    expect(JSON.parse(json)).toEqual(identity);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.lookId).toBe('cinematic');
    expect(parsed.syncPolicy).toBe('auto');
    expect(parsed.axes).toEqual({
      intensity: 1,
      feedback: 1,
      fold: 1,
      hue: 1,
      glitch: 1,
      melt: 1,
    });
  });

  it('fills missing axes with identity 1', () => {
    const parsed = parseLookDocument({
      schemaVersion: 1,
      lookId: 'acid',
      syncPolicy: 'off',
      axes: { intensity: 1.5 },
    });
    expect(parsed.axes.feedback).toBe(1);
    expect(parsed.axes.fold).toBe(1);
    expect(parsed.axes.intensity).toBe(1.5);
  });

  it('stores inert axes so look-id switches round-trip', () => {
    const doc = parseLookDocument({
      schemaVersion: 1,
      lookId: 'cinematic',
      syncPolicy: 'auto',
      axes: { feedback: 1.4, melt: 0.2 },
    });
    expect(parseLookJson(serializeLookDocument(doc))).toEqual(doc);
  });

  it('rejects extra top-level keys', () => {
    expect(() =>
      parseLookDocument({
        ...identity,
        extra: true,
      }),
    ).toThrow(LookDocumentError);
  });

  it('rejects powerSpectrum and other FFT-shaped fields', () => {
    expect(() =>
      parseLookDocument({
        ...identity,
        powerSpectrum: [0, 1, 2],
      }),
    ).toThrow(LookDocumentError);
    expect(() =>
      parseLookDocument({
        schemaVersion: 1,
        lookId: 'live',
        syncPolicy: 'auto',
        axes: { intensity: 1, powerSpectrum: 1 },
      }),
    ).toThrow(LookDocumentError);
  });

  it('rejects unknown lookId, syncPolicy, schemaVersion, and out-of-range axes', () => {
    expect(() => parseLookDocument({ ...identity, lookId: 'Acid' })).toThrow(LookDocumentError);
    expect(() => parseLookDocument({ ...identity, lookId: 'void' })).toThrow(LookDocumentError);
    expect(() => parseLookDocument({ ...identity, syncPolicy: 'tap' })).toThrow(LookDocumentError);
    expect(() => parseLookDocument({ ...identity, schemaVersion: 2 })).toThrow(LookDocumentError);
    expect(() =>
      parseLookDocument({
        ...identity,
        axes: { ...identity.axes, intensity: 2.1 },
      }),
    ).toThrow(LookDocumentError);
    expect(() =>
      parseLookDocument({
        ...identity,
        axes: { ...identity.axes, glitch: Number.NaN },
      }),
    ).toThrow(LookDocumentError);
  });

  it('merges absolute patches then validates', () => {
    const next = mergePatch(identity, { lookId: 'live', axes: { glitch: 1.25 } });
    expect(next.lookId).toBe('live');
    expect(next.axes.glitch).toBe(1.25);
    expect(next.axes.intensity).toBe(1);
  });
});
