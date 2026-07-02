# Sound Visualiser

Ground-truth evidence for CV bullets and cover letters. Fill in every section with verified facts only.

## One-line summary

A browser-based audio-reactive WebGL visualizer that maps real-time audio features to 3D scenes, webcam shaders, and temporal feedback effects.

## Context

- **Role:** Solo developer [inferred from codebase — all 10 git commits authored by `aryanjohari`]
- **Dates:** Mar 2026 -- Jul 2026 [inferred from git history; first commit 2026-03-27, latest 2026-07-01] [VERIFY]
- **Institution / org:** N/A — personal project [inferred; no course, employer, or org named in repo]
- **Links:** https://github.com/aryanjohari/sound-visualiser — no hosted demo URL recorded in repo

## Problem

The app listens to audio from a microphone, uploaded file, or bundled demo track and drives full-screen WebGL visuals in real time. It extracts per-frame audio features (RMS, spectral flux, bass/mid/high band energies), smooths them into stable control signals, and routes them to shader uniforms and scene layers. Three visual modes address different use cases: a 3D cinematic scene, a sharp audio-reactive webcam feed, and an acid-style webcam feed with temporal feedback trails. Beat sync optionally quantizes visual parameters to an estimated musical grid when rhythm is clear.

## Your contributions

- Built the full application end-to-end as sole committer on the repository [inferred from git log]
- Implemented `AudioEngine` using Web Audio API and Meyda (`rms`, `powerSpectrum`); manual spectral-flux calculation because Meyda's built-in extractor is disabled in this web setup [inferred from codebase]
- Derived log-compressed frequency-band energies for bass (20–140 Hz), mid (200–2000 Hz), and high (4000–12000 Hz) from the power spectrum [inferred from codebase]
- Built `StateManager` with frame-rate-independent EMA smoothing, decaying peak normalization, rave/cinematic blending, and hi-hat lightning-flash channel [inferred from codebase]
- Implemented cinematic 3D mode: fluid background sphere (`EnvironmentLayers`), torus-knot particle anchor (`AnchorLayer`), dynamic lighting (`LightingLayer`), camera choreography (`Director` with GSAP tweens), and chromatic-aberration post-processing (`PostProcessing`) [inferred from codebase]
- Added `VideoCapture` for webcam lifecycle (`getUserMedia`, `THREE.VideoTexture`, track release on mode change) [inferred from codebase; documented in `docs/PHASE1_CHANGELOG.md`]
- Built `LiveFeedLayer` with custom GLSL (`liveFeed.frag.glsl`): bass zoom, mid melt, flux glitch bursts, edge-weighted chromatic aberration, blurred background plate [inferred from codebase]
- Built `AcidFeedLayer` with ping-pong FBO feedback, kaleidoscope UV folds, hue drift, and mood-orchestrated parameter blending; half-resolution FBOs on mobile/coarse pointer [inferred from codebase]
- Implemented `MoodAnalyzer` inferring calm / groove / intense weights from audio energy shape (not genre labels) [inferred from codebase]
- Implemented `BeatSync`: onset detection, BPM voting (60–180 BPM), confidence gating, PLL beat-phase clock, and beat-quantized modulation across Acid, Live, and Cinematic layers [inferred from codebase]
- Built glass-overlay UI in `main.ts`: visual mode switcher (Cinematic / Live / Acid), Sync Auto/Off toggle, demo tracks, file upload, microphone input, keyboard shortcuts (`1`/`2`/`3`, `S`, Escape) [inferred from codebase]
- Wrote project reference and phase changelogs in `docs/PROJECT.md`, `docs/PHASE1_CHANGELOG.md`, `docs/PHASE2_CHANGELOG.md` [inferred from codebase]
- `VoidLayer` exists with volumetric shader code but is not wired into `VJScene.init()` — not part of shipped behavior [inferred from codebase]

## Tech stack

TypeScript, Vite, Three.js, postprocessing (EffectComposer, ShaderPass), Meyda, GSAP, GLSL, Web Audio API, MediaDevices/getUserMedia, HTML Canvas

## Architecture (optional but helpful)

Entry point `src/main.ts` wires `AudioEngine`, `StateManager`, `Loop`, and `VJScene`. Per-frame flow: audio features → `StateManager` (rave/cinematic/lightningFlash) → `MoodAnalyzer` → `BeatSync` → `VJScene.update()` → mode-specific render path.

| Mode | Render path |
|------|-------------|
| `cinematic` | 3D layers + `PostProcessing` (chromatic aberration) |
| `live` | `LiveFeedLayer` fullscreen quad, direct to canvas |
| `acid` | `AcidFeedLayer` webcam shader → ping-pong FBO feedback → blit to canvas |

Key directories:
- `src/audio/` — `AudioEngine.ts`
- `src/camera/` — `VideoCapture.ts`
- `src/webgl/` — `Loop.ts`, `Scene.ts`, `StateManager.ts`, `MoodAnalyzer.ts`, `BeatSync.ts`
- `src/webgl/layers/` — per-mode and 3D visual layers
- `src/shaders/` — GLSL for fluid background, anchor particles, live feed, acid feed, chromatic aberration
- `docs/` — architecture reference and phase changelogs

Webcam starts when entering Live or Acid mode and stops on Cinematic; switching Live ↔ Acid keeps the stream but clears feedback buffers.

## Outcomes & metrics (verified only)

| Metric | Value | How measured | Notes |
|--------|-------|--------------|-------|
| Source files (`src/`, `.ts` + `.glsl` + `.css`) | 30 | `find src` file count | Excludes `node_modules` |
| Source lines (`src/`, `.ts` + `.glsl` + `.css`) | ~3,960 | `wc -l` on `src/` | Approximate |
| Git commits | 10 | `git log` | All by `aryanjohari` |
| Visual modes | 3 | `VisualMode` type in `Scene.ts` | cinematic, live, acid |
| Audio analysis buffer / hop | 512 / 256 | `AudioEngine.ts` defaults | Meyda analyzer config |
| BPM estimation range | 60–180 | `BeatSync.ts` constants | |
| Beat sync confidence threshold | 0.45 | `BeatSync.ts` `CONFIDENCE_THRESHOLD` | `syncActive` when Auto + confidence ≥ threshold |
| Renderer pixel ratio cap | 2 | `main.ts` `setPixelRatio` | |
| Acid FBO scale on mobile | 0.5 | `docs/PROJECT.md` / `AcidFeedLayer.ts` | ~4× memory savings per docs |
| Automated tests | not recorded | No test files or test runner in project root | |
| Production users / traffic | not recorded | No analytics or deployment config in repo | |
| Hosted demo URL | not recorded | No URL in README or config | |

## Keywords for tailoring

WebGL, Three.js, GLSL shaders, audio visualization, real-time graphics, Web Audio API, Meyda, spectral analysis, beat detection, BPM estimation, webcam, getUserMedia, post-processing, Vite, TypeScript, creative coding, VJ

## Do not claim

- Production deployment, commercial users, or enterprise clients — no hosting config, CI/CD, or analytics in repo
- Team or coursework collaboration — all commits are from a single author; no co-authors or org named
- Automated test coverage — no project test suite found
- Both demo tracks working out of the box — `public/` contains `freetibet.mp3` only; `huzur.mp3` is referenced in UI but not present in `public/` [inferred from codebase]
- Meyda built-in `spectralFlux` extractor — code uses manual flux calculation instead
- `VoidLayer` as a shipped feature — module exists but is not initialized in `VJScene`
- Docker, cloud infrastructure, or backend services — client-only browser app
- Genre classification or ML-based mood detection — mood is rule-based on energy/flux shape per docs

## Suggested CV tags

`webgl`, `typescript`, `creative-coding`, `audio`, `shaders`, `threejs`

## Open questions for Aryan

- Confirm project dates (git shows Mar 2026 -- Jul 2026; system date is Jul 2026) [VERIFY]
- Was this built for a course, employer, hackathon, or purely personal? Institution/org for CV context
- Has this been deployed to a public URL (GitHub Pages, Vercel, etc.)? If yes, provide link
- Is the project complete, actively maintained, or a demo/WIP?
- Any performance benchmarks, user feedback, or live-performance usage you want recorded as verified metrics?
- Should `huzur.mp3` be added to `public/`, or should the demo button be removed from CV claims?
