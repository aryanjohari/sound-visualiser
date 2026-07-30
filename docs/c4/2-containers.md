# C2 — Containers

These are the major **logical** runtime pieces inside the single browser SPA. There is only
one deployable artifact (`npm run build` → static `dist/`); the boxes below are how that
tab is structured, not separate services.

| Id | Visitor label | Responsibility | Evidence |
| --- | --- | --- | --- |
| `glass-ui` | Glass controls | Source buttons, mode / sync, status line | `src/main.ts`, `index.html` |
| `demo-asset` | Bundled demo track | Shipped `/freetibet.mp3` | `public/freetibet.mp3` |
| `audio-engine` | Audio engine | Web Audio sources, Meyda, band energy, spectral flux | `src/audio/AudioEngine.ts` |
| `feature-snapshot` | Latest audio snapshot | Pull-model “latest features” struct (no queue) | `AudioEngine` → `Loop` |
| `interpretation` | Interpretation ladder | Energy, mood weights, beat / confidence | `StateManager`, `MoodAnalyzer`, `BeatSync` |
| `render-loop` | Frame loop | `requestAnimationFrame` driver; orders analysers then scene | `src/webgl/Loop.ts` |
| `video-capture` | Webcam capture | `getUserMedia` → `THREE.VideoTexture` (Live / Acid) | `src/camera/VideoCapture.ts` |
| `vj-scene` | VJ scene | Mode routing and visual layers | `src/webgl/Scene.ts` + `layers/` |
| `webgl-canvas` | Full-screen canvas | `#webgl` Three.js output | `index.html`, `main.ts` |

Dashed edges are secondary: webcam is only used in Live and Acid modes.

**C3 zooms:** [`audio-engine`](./3-components/audio-engine.md), [`interpretation`](./3-components/interpretation.md), [`vj-scene`](./3-components/vj-scene.md).

Diagram: [`2-containers.mmd`](./2-containers.mmd). Portfolio map IR is collapsed from this level into [`../architecture.graph.json`](../architecture.graph.json).
