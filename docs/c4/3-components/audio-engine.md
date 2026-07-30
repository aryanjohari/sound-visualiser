# C3 — audio-engine

Zoom of container `audio-engine` (`src/audio/AudioEngine.ts`).

## Components

| Id | Role | Evidence |
| --- | --- | --- |
| Microphone / element sources | Mutually exclusive source modes | `startMicrophone`, `startUrl`, `startFile` |
| AudioContext lifecycle | Create, resume, suspend; stop tracks; revoke blob URLs | `teardown` |
| Meyda analyzer | `rms` + `powerSpectrum` only | `createAnalyzerAndStart` — `bufferSize` 512, `hopSize` 256 |
| Spectral flux | Positive bin deltas + `log10(1 + sum)` | Callback; Meyda’s own `spectralFlux` skipped (crashes in this web build) |
| Band energies | lowpass 0–220, bass 20–140, mid 200–2000, high 4–12 kHz Hz | `bandEnergy` + `hzPerBin = sampleRate / bufferSize` |
| Latest AudioFeatures | Overwrite-only publish | `this.latest` / `getFeatures()` |

## Boundaries

- Upstream: glass UI starts mic / file / demo; bundled demo is `/freetibet.mp3`.
- Downstream: `render-loop` reads the snapshot each frame and feeds `interpretation`.

File playback also connects the element source to `audioContext.destination` so the operator
hears the track; the mic path analyses only (no destination connect).

Diagram: [`audio-engine.mmd`](./audio-engine.mmd).