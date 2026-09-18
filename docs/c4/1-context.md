# C1 — System context

Sound Visualiser is one system: a static web app that runs entirely in the operator’s
browser tab. There is no application server, database, auth, telemetry, or talk API.

## People

- **Operator** — plays a track (mic, local file, or bundled demo), optional webcam, a live
  look (Cinematic / Live / Acid) with beat-sync Auto/Off, may download or reload look JSON,
  and may keep a short local clip of the canvas plus soundtrack.

## This system

- **Sound Visualiser** — interprets audio into energy / mood / beat, drives a full-screen
  WebGL look from a closed JSON document, and can keep a ≤30s local canvas+audio clip.
  Capture, analysis, rendering, JSON, and Keep stay client-side. Nothing is uploaded.

## External systems (browser + delivery)

| External | Role | Evidence |
| --- | --- | --- |
| Web Audio API | Audio graph, mic/element sources, Meyda analysis clock | `src/audio/AudioEngine.ts` |
| `getUserMedia` | Microphone and webcam streams (secure context + permission) | `AudioEngine`, `VideoCapture` |
| WebGL | Three.js renderer and custom GLSL | `main.ts`, `src/webgl/*`, `src/shaders/*` |
| MediaRecorder | Local canvas `captureStream` + audio tap; ≤30s clip in-tab | `src/capture/KeepCapture.ts` |
| Static demo host | Serves the built SPA and `/freetibet.mp3` | `portfolio.yaml` `demo:`, `public/freetibet.mp3` |
| GitHub | Source and architecture docs | `portfolio.yaml` `links.github` |

### Notes / UNVERIFIED

- Live demo URL in `portfolio.yaml` / README: `https://music.arkhives.nz`.
- **Hosting vendor** for that domain is not configured in this repository (`UNVERIFIED`).
- Libraries (Three.js, Meyda, GSAP, Vite) are **inside** the SPA bundle, not external systems.
- There is no backend and no talk/LLM host on this wrap. Safari mime support is unmeasured
  (OPEN, not a merge gate).

Diagram: [`1-context.mmd`](./1-context.mmd). Next level: [`2-containers`](./2-containers.md).
