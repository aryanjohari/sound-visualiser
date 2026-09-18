import { describe, expect, it } from 'vitest';
import { pickKeepMimeType } from './KeepCapture';

describe('Keep mime pick', () => {
  it('prefers WebM VP9+Opus then VP8+Opus before MP4', () => {
    const supported = new Set(['video/mp4', 'video/webm;codecs=vp8,opus']);
    expect(pickKeepMimeType((m) => supported.has(m))).toBe('video/webm;codecs=vp8,opus');
  });

  it('falls back to MP4 only when no WebM type is supported', () => {
    const supported = new Set(['video/mp4']);
    expect(pickKeepMimeType((m) => supported.has(m))).toBe('video/mp4');
  });

  it('returns null when nothing is supported', () => {
    expect(pickKeepMimeType(() => false)).toBeNull();
  });
});
