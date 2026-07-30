# C1 — System context

Sound Visualiser is one system: a static web app that runs entirely in the operator’s
browser tab. There is no application server, database, auth, or telemetry.

## People

- **Operator** — picks an audio source (mic, local file, or bundled demo), optional webcam,
  visual mode (Cinematic / Live / Acid), and beat-sync Auto/Off.

## This system

- **Sound Visualiser** — captures audio (and optionally video), interprets features into
  energy / mood / beat, and renders a full-screen WebGL scene. Capture, analysis, and
  rendering stay client-side.

## External systems (browser + delivery)

| External | Role | Evidence |
| --- | --- | --- |
| Web Audio API | Audio graph, mic/element sources, Meyda analysis clock | `src/audio/AudioEngine.ts` |
| `getUserMedia` | Microphone and webcam streams (secure context + permission) | `AudioEngine`, `VideoCapture` |
| WebGL | Three.js renderer and custom GLSL | `main.ts`, `src/webgl/*`, `src/shaders/*` |
| Static demo host | Serves the built SPA and `/freetibet.mp3` | `portfolio.yaml` `demo:`, `public/freetibet.mp3` |
| GitHub | Source and architecture docs | `portfolio.yaml` `links.github` |

### Notes / UNVERIFIED

- Live demo URL in `portfolio.yaml` / README: `https://music.arkhives.nz`.
- **Hosting vendor** for that domain is not configured in this repository (`UNVERIFIED`).
- Libraries (Three.js, Meyda, GSAP, Vite) are **inside** the SPA bundle, not external systems.

Diagram: [`1-context.mmd`](./1-context.mmd). Next level: [`2-containers`](./2-containers.md).