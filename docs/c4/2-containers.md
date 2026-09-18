# C2 — Containers

There is **one deployable**: `npm run build` → static `dist/` (Vite SPA). No Docker, no
API process, no database, no talk API. The boxes below are the major **in-tab runtime
partitions** of that SPA — not separate hosts. Collapsing them would hide the distinctive
pull-model analysis ↔ render split, the interpretation ladder, and the wrap: look JSON
plus Keep.

| Id | Visitor label | Responsibility | Evidence |
| --- | --- | --- | --- |
| `glass-ui` | Glass controls | Source buttons, look / sync / axes, JSON and Keep controls, status line | `src/main.ts`, `index.html`, `src/styles.css` |
| `demo-asset` | Bundled demo track | Shipped `/freetibet.mp3` | `public/freetibet.mp3` |
| `audio-engine` | Audio engine | Web Audio sources, Meyda, band energy, hand-rolled spectral flux | `src/audio/AudioEngine.ts` |
| `feature-snapshot` | Latest audio snapshot | Pull-model “latest features” struct (no queue) | `AudioEngine.latest` → `Loop` |
| `interpretation` | Interpretation ladder | Energy, mood weights, beat / confidence | `StateManager`, `MoodAnalyzer`, `BeatSync` |
| `look-document` | Look document | Closed JSON (`schemaVersion: 1`) plus one apply writer | `src/look/` (`types.ts`, `schema.ts`, `apply.ts`) |
| `render-loop` | Frame loop | `requestAnimationFrame` driver; orders analysers then scene | `src/webgl/Loop.ts` |
| `video-capture` | Webcam capture | `getUserMedia` → `THREE.VideoTexture` (Live / Acid) | `src/camera/VideoCapture.ts` |
| `vj-scene` | VJ scene | Mode routing and visual layers (Cinematic / Live / Acid) | `src/webgl/Scene.ts` + `layers/` + `shaders/` |
| `webgl-canvas` | Full-screen canvas | `#webgl` Three.js output | `index.html`, `main.ts` |
| `keep` | Keep | ≤30s canvas + audio clip; HUD out of pixels; local download | `src/capture/KeepCapture.ts`, `src/main.ts` |

Dashed edges: webcam is only used in Live and Acid modes.

### Notes

- `interpretation` is a **logical** grouping: `StateManager` is constructed in `main.ts`;
  `MoodAnalyzer` and `BeatSync` are owned by `Loop`. Same per-frame ladder either way.
- `look-document` is in-tab schema and apply, not a backend. Sliders write it; reload
  restores look / sync / axes on a new track. It does not dump live BPM, mood, or webcam.
- `keep` taps `renderer.domElement.captureStream` plus an `AudioContext` destination
  fan-out. Duration cap is 30s. Glass HUD is not composited into the clip. Silent clip =
  failed Keep. The clip is paired with a look JSON download from `look-document`.
- Talk is **not** a container on this wrap (deferred; no LLM host).
- Second demo button requests `/huzur.mp3`, which is **not** in `public/` (`UNVERIFIED` as a
  shipped asset — only `freetibet.mp3` is).
- `VoidLayer` / `voidFog` exist on disk but are **not** a container (not wired into `Scene`).

**C3 zooms:** [`audio-engine`](./3-components/audio-engine.md), [`interpretation`](./3-components/interpretation.md), [`vj-scene`](./3-components/vj-scene.md).

Diagram: [`2-containers.mmd`](./2-containers.mmd). Zoom index: [`portfolio-map.json`](./portfolio-map.json).
