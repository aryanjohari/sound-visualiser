# C2 — Containers

There is **one deployable**: `npm run build` → static `dist/` (Vite SPA). No Docker, no
API process, no database. The boxes below are the major **in-tab runtime partitions** of
that SPA — not separate hosts. Collapsing them would hide the distinctive pull-model
analysis ↔ render split and the interpretation ladder.

| Id | Visitor label | Responsibility | Evidence |
| --- | --- | --- | --- |
| `glass-ui` | Glass controls | Source buttons, mode / sync, status line | `src/main.ts`, `index.html`, `src/styles.css` |
| `demo-asset` | Bundled demo track | Shipped `/freetibet.mp3` | `public/freetibet.mp3` |
| `audio-engine` | Audio engine | Web Audio sources, Meyda, band energy, hand-rolled spectral flux | `src/audio/AudioEngine.ts` |
| `feature-snapshot` | Latest audio snapshot | Pull-model “latest features” struct (no queue) | `AudioEngine.latest` → `Loop` |
| `interpretation` | Interpretation ladder | Energy, mood weights, beat / confidence | `StateManager`, `MoodAnalyzer`, `BeatSync` |
| `render-loop` | Frame loop | `requestAnimationFrame` driver; orders analysers then scene | `src/webgl/Loop.ts` |
| `video-capture` | Webcam capture | `getUserMedia` → `THREE.VideoTexture` (Live / Acid) | `src/camera/VideoCapture.ts` |
| `vj-scene` | VJ scene | Mode routing and visual layers | `src/webgl/Scene.ts` + `layers/` + `shaders/` |
| `webgl-canvas` | Full-screen canvas | `#webgl` Three.js output | `index.html`, `main.ts` |

Dashed edges: webcam is only used in Live and Acid modes.

### Notes

- `interpretation` is a **logical** grouping: `StateManager` is constructed in `main.ts`;
  `MoodAnalyzer` and `BeatSync` are owned by `Loop`. Same per-frame ladder either way.
- Second demo button requests `/huzur.mp3`, which is **not** in `public/` (`UNVERIFIED` as a
  shipped asset — only `freetibet.mp3` is).
- `VoidLayer` / `voidFog` exist on disk but are **not** a container (not wired into `Scene`).

**C3 zooms:** [`audio-engine`](./3-components/audio-engine.md), [`interpretation`](./3-components/interpretation.md), [`vj-scene`](./3-components/vj-scene.md).

Diagram: [`2-containers.mmd`](./2-containers.mmd). Zoom index: [`portfolio-map.json`](./portfolio-map.json).