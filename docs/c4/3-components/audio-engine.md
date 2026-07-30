# C3 — audio-engine

Zoom of container `audio-engine` (`src/audio/AudioEngine.ts`).

## What it does

Owns the `AudioContext` and source lifecycle: microphone via `MediaStreamAudioSourceNode`,
or an `<audio>` element via `MediaElementAudioSourceNode` (local file blob URL or demo
path). Attaches Meyda with `bufferSize` 512 and `hopSize` 256, extractors `rms` and
`powerSpectrum`.

On each analysis callback it:

1. Computes **spectral flux** from consecutive spectra (positive per-bin deltas only —
   Meyda’s own `spectralFlux` is avoided because it crashes in this web build).
2. Sums **band energies** (lowpass 0–220 Hz, bass 20–140, mid 200–2000, high 4–12 kHz) and
   log-compresses them.
3. **Overwrites** a latest-features struct. Nothing is queued; the render loop pulls
   whatever is there.

## Boundaries

- Upstream: glass UI starts mic / file / demo; bundled demo is `/freetibet.mp3`.
- Downstream: `render-loop` reads the snapshot each frame and feeds `interpretation`.

Diagram: [`audio-engine.mmd`](./audio-engine.mmd).
