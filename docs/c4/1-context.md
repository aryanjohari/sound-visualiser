# C1 — System context

Sound Visualiser is one system: a static web app that runs entirely in the operator’s
browser tab. There is no application server, database, or account.

## People

- **Operator** — picks an audio source (mic, local file, or bundled demo), optional webcam,
  visual mode (Cinematic / Live / Acid), and beat-sync Auto/Off.

## This system

- **Sound Visualiser** — captures audio (and optionally video), interprets features into
  energy / mood / beat, and renders a full-screen WebGL scene. Capture, analysis, and
  rendering stay client-side.

## External systems (browser + delivery)

| External | Role |
| --- | --- |
| Web Audio API | Audio graph, mic/element sources, Meyda analysis clock |
| `getUserMedia` | Microphone and webcam streams (secure context + permission) |
| WebGL | Three.js renderer and custom GLSL |
| Static demo host | Serves the built SPA and `/freetibet.mp3` at music.arkhives.nz |
| GitHub | Source and architecture docs |

Hosting vendor for the demo domain is not configured in this repository.

Diagram: [`1-context.mmd`](./1-context.mmd). Next level: [`2-containers`](./2-containers.md).
