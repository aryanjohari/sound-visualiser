# Sound Visualiser

A browser-only audio-reactive WebGL visualiser. Feed it a microphone, a local audio file,
or the bundled demo track, optionally add your webcam, and it renders a full-screen
reactive scene at display refresh rate.

Built with TypeScript, Three.js, custom GLSL, Meyda, and GSAP. No backend — all capture,
analysis, and rendering happen client-side, and nothing is uploaded.

The design goal is to feel *musical* rather than merely reactive. Raw audio features are
interpreted into an energy state, a mood, and a beat grid before anything touches a shader.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for why that matters and how it works.

Live: <https://music.arkhives.nz>

## Features

- **Three audio sources** — microphone, local file upload (`audio/*`), and a bundled demo
  track.
- **Three visual modes** — Cinematic (3D fluid sphere, torus-knot particle cloud, reactive
  lighting, roaming camera, chromatic aberration), Live (sharp audio-reactive webcam feed),
  and Acid (webcam with GPU feedback trails, kaleidoscope folds, and hue drift).
- **Mood inference** — calm / groove / intense weights derived from energy shape, blended
  continuously into shader parameters rather than switched between presets.
- **Beat sync** — real-time BPM estimation with a confidence score. Visuals quantize to the
  beat grid in proportion to that confidence, so unclear rhythms simply fall back to
  unsynced behaviour. Toggleable.
- **Self-calibrating levels** — every signal is normalized against its own decaying recent
  peak, so quiet and loud sources both drive the full visual range with no gain control.
- **Keyboard control** — `1` / `2` / `3` for visual mode, `S` to toggle beat sync, `Esc` to
  stop playback.

## Quick start

Requires Node `^20.19` or `>=22.12` (Vite 8's engine range) and a browser with WebGL and
Web Audio support.

```bash
npm install
npm run dev
```

Opens on `http://127.0.0.1:5173` (strict port). Then pick an audio source from the glass
panel, or press `2` to go straight to webcam mode.

Production build and local preview:

```bash
npm run build
npm run preview
```

## Configuration

There are no environment variables and no config files to fill in.

Behaviour is tuned through named constants in source. The most useful entry points:

| What you want to change | Where |
|---|---|
| Analysis resolution and latency | `bufferSize` / `hopSize` in `src/audio/AudioEngine.ts` |
| Frequency band edges | `bandEnergy` calls in `src/audio/AudioEngine.ts` |
| Smoothing and peak-decay rates | `StateManager` constructor options |
| Hi-hat flash snappiness | `lightningFlashResponse` in `src/webgl/StateManager.ts` |
| Beat detection sensitivity | `CONFIDENCE_THRESHOLD`, `ONSET_*`, `PLL_NUDGE` in `src/webgl/BeatSync.ts` |
| Camera aggression | Thresholds, FOV values, and orbit params in `src/webgl/layers/Director.ts` |
| Acid look per mood | `blendMood` base tables in `src/webgl/layers/AcidFeedLayer.ts` |

[`docs/PROJECT.md`](docs/PROJECT.md) has the full per-uniform reference and tuning guide.

### Demo tracks

`public/freetibet.mp3` ships with the repo and is served at `/freetibet.mp3`. The second
demo button requests `/huzur.mp3`, which is **not** included — that button will show a load
error until you drop your own file at `public/huzur.mp3`.

## Tests and CI

There is currently no test suite and no CI pipeline. The checks that exist:

```bash
npx tsc --noEmit   # strict typecheck, no emit
npm run build      # production build
```

Both should pass clean. If you are contributing, run them before opening a PR, and check
all three visual modes by hand — the interesting failures here are visual and are not
caught by a typechecker.

## Architecture

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design case study: the interpretation
  ladder, the beat estimator, the feedback pipeline, and the tradeoffs behind them.
- [`docs/c4/`](docs/c4/README.md) — C4 context, containers, and component zooms.
- [`docs/architecture.mmd`](docs/architecture.mmd) — visitor system diagram (Mermaid).
- [`docs/architecture.graph.json`](docs/architecture.graph.json) — portfolio map IR (tour).
- [`docs/PROJECT.md`](docs/PROJECT.md) — detailed component, uniform, and tuning reference.
- [`docs/PHASE1_CHANGELOG.md`](docs/PHASE1_CHANGELOG.md) and
  [`docs/PHASE2_CHANGELOG.md`](docs/PHASE2_CHANGELOG.md) — incremental development log.

Source layout:

```text
src/
  main.ts              app entry, UI, input handling
  audio/AudioEngine.ts Web Audio + Meyda feature extraction
  camera/              webcam capture → VideoTexture
  webgl/
    Loop.ts            rAF driver, analyser sequencing
    StateManager.ts    energy smoothing, shared state types
    MoodAnalyzer.ts    calm / groove / intense inference
    BeatSync.ts        onset detection, tempo, beat clock
    Scene.ts           mode routing, layer orchestration
    layers/            camera director + visual layers
  shaders/             custom GLSL
```

## Browser notes

- Microphone and webcam require user permission and a secure context (`https://` or
  `localhost`).
- Audio loaded from an external origin is subject to CORS.
- The fluid background shader is expensive. Low-end GPUs may need reduced sphere segment
  counts in `EnvironmentLayers` or lower torus-knot density in `AnchorLayer`.

## License

ISC (per `package.json`).

---

Visitor overview: see [`portfolio.yaml`](portfolio.yaml).
