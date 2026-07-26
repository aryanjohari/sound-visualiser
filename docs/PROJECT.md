# Sound Visualiser — Project Reference

> **Scope of this document.** This is the exhaustive implementation reference: every visual
> mode, every shader uniform, the mood parameter matrix, and the tuning constants. For the
> design rationale, the custom algorithms, and the tradeoffs behind them, read
> [`ARCHITECTURE.md`](./ARCHITECTURE.md). For install and run instructions, read the
> [README](../README.md).

## What the app does

Sound Visualiser is a browser app that listens to audio (microphone, uploaded file, or demo tracks) and turns it into moving visuals on a full-screen WebGL canvas. Three **visual modes** are available:

| Mode | Camera | What you see |
|------|--------|--------------|
| **Cinematic** | OFF | 3D scene: fluid sphere, particle torus knot, dynamic lighting, chromatic aberration post-processing |
| **Live** | ON | Sharp audio-reactive webcam feed (Phase 1.7) — no feedback trails |
| **Acid** | ON | Same webcam with temporal feedback trails, kaleidoscope folds, hue drift, mood-orchestrated intensity |

**Mood Auto** (hidden, no manual picker in 2a) infers **calm / groove / intense** from audio energy shape and smoothly blends Acid visual parameters. Works across EDM, rap, pop, and ballads via energy archetypes — not genre labels.

## How data flows

```
Audio source (mic / file / URL)
  → AudioEngine (Meyda: RMS, spectral flux, bass/mid/high bands)
  → StateManager (smooth rave/cinematic, lightning flash)
  → MoodAnalyzer (calm / groove / intense weights)
  → BeatSync (BPM estimate, beat phase, confidence)
  → VJScene.update() → active visual layer reads features + state
  → VJScene.render()
       cinematic → PostProcessing (3D RenderPass + chromatic aberration)
       live      → LiveFeedLayer (webcam + liveFeed.frag.glsl, direct)
       acid      → AcidFeedLayer (webcam + acid shader + ping-pong FBO feedback)
```

Webcam lifecycle (independent of audio capture):

```
setVisualMode('live' | 'acid')
  → VideoCapture.start() → getUserMedia({ video })
  → Hidden <video> → THREE.VideoTexture (shared by Live + Acid layers)
setVisualMode('cinematic')
  → VideoCapture.stop() → tracks released, FBOs cleared
Live ↔ Acid switch
  → webcam stays on; feedback buffers cleared (no ghost smear)
```

## Acid feedback pipeline

```
VideoTexture
  → acidFeed.frag.glsl (warp + kaleidoscope + hue + Phase 1.7 composite)
  → mix with previous FBO frame (feedbackAmount, warped UV)
  → write to FBO A (or B)
  → blit FBO to canvas
  → swap A ↔ B each frame
```

On mobile / coarse pointer, FBOs render at **half resolution** and upscale on blit (~4× memory savings, slightly softer trails).

## Mood system (plain English)

Mood is **not** genre detection or BPM sync. It reads existing audio state:

- **calm** — quiet, smooth, low flux variance (ballad verses, silence)
- **groove** — steady mid energy, consistent flux (funk, rap groove, four-on-the-floor)
- **intense** — high rave, flux spikes, hi-hat flashes (drops, builds)

Scores are smoothed with EMA so mood drifts gradually within a track. The status line shows the dominant mood label (e.g. `Acid · groove`).

**What mood means for quiet vs loud tracks:**

- Quiet ballad → calm weights high → Acid feedback ~0.2, kaleidoscope off, slow hue, gentle melt
- Steady groove → groove weights high → medium feedback ~0.45, 3–4 kaleidoscope folds
- Drop / peak → intense weights high → feedback ~0.65, 5–8 folds, fast hue cycle, stronger melt/zoom

Live mode ignores mood for visuals; mood still appears in status.

## Beat sync (Phase 2b)

When **Sync: Auto** is on and rhythm is clear (house, EDM, rap with steady drums), visuals **quantize** to a musical grid. When rhythm is unclear (ballads, ambient, speech) or sync is off, behavior is identical to Phase 2a.

**Render loop stays at full rAF rate (~60fps).** Beat sync modulates parameters on a grid — it does not throttle frames to BPM.

### How BPM is estimated (plain English)

1. **Onsets** — peak-pick combined bass + spectral flux spikes (220ms cooldown).
2. **Intervals** — measure time between onsets; keep a rolling buffer of the last ~12.
3. **BPM vote** — try every tempo 60–180; pick the one whose beat period best fits recent intervals (allows half/double hits).
4. **Confidence** — rises when intervals are consistent, energy is present, and enough onsets have been seen (~2.5s warmup). Falls on silence or rubato.

**Limitations:** Works best on four-on-the-floor / clear drums. Weak on ballads and free tempo.

### Beat clock

Once confidence ≥ 0.45 (`syncActive`):

- `beatPhase` (0–1) advances within each beat, phase-locked to onsets (PLL nudge).
- `barPhase` (0–1) assumes 4/4 — one bar = 4 beats.
- `onBeat` / `onDownbeat` fire for ~1 frame at beat and bar boundaries.

When confidence is low or sync is off, phases may still advance internally but **visuals use mood-only** (sync weight = 0).

### What sync affects

| Target | Sync behavior |
|--------|---------------|
| Acid feedback | Downbeat bump + exponential decay between beats |
| Acid kaleidoscope | Steps fold count across bar beats |
| Acid hue | Discrete step per beat (not continuous drift) |
| Acid bass zoom | Phase-locked sine wobble via `u_beatPhase` |
| Acid / Live glitch | Gated to beat window when sync active |
| Live bass | Subtle phase-locked pulse |
| Cinematic dolly | Downbeat-triggered when sync active; flux dolly when not |

**Blend rule:** `final = phase2a + (beatValue - phase2a) * confidence` when `syncActive`.

## Audio features explained simply

| Feature | What it measures | What it controls (Cinematic) | What it controls (Live / Acid) |
|---------|------------------|----------------------------|--------------------------------|
| **RMS** | Overall loudness / energy | Helps drive rave vs cinematic mode | Indirect via `state.rave` intensity ramp |
| **Spectral flux** | How much the spectrum changed since last frame (onsets, drops) | Camera dolly punches, rave mode | Glitch UV bursts; mood intense score |
| **Bass** (20–140 Hz) | Low-end thump | Fluid warp, chromatic split, knot scale | Breathing zoom pulse; Acid feedback UV warp |
| **Mid** (200–2000 Hz) | Body of the mix (vocals, snares) | Particle curl deformation | Sinusoidal melt — strongest at center |
| **High** (4000–12000 Hz) | Bright transients (hi-hats, cymbals) | Lightning ridges, flash | RGB split; Acid hue speed boost |

Raw band values are log-compressed in AudioEngine (`log10(1 + sum)`). Each layer **peak-normalizes** with decaying recent maximum (`peak *= 0.985`).

## StateManager + MoodAnalyzer outputs

| Output | Range | Meaning |
|--------|-------|---------|
| **rave** | 0–1 | Track intensity (high RMS + flux → 1) |
| **cinematic** | 0–1 | `1 - rave` |
| **lightningFlash** | 0–1 | Smoothed hi-hat flash |
| **mood** | calm / groove / intense | Dominant mood label for status |
| **moodWeights** | calm + groove + intense ≈ 1 | Blended weights driving Acid parameters |
| **beat.bpm** | 60–180 | Estimated tempo when rhythm is clear |
| **beat.confidence** | 0–1 | How trustworthy the beat grid is |
| **beat.beatPhase** | 0–1 | Position within current beat (shaders) |
| **beat.syncActive** | boolean | Auto + confidence ≥ 0.45 |

## Visual layers

| Layer | When active | Responsibility |
|-------|-------------|----------------|
| **Director** | Always updates | Camera orbit, FOV, kick shake, flux dolly |
| **EnvironmentLayers** | Always updates; drawn in Cinematic | Fluid background sphere |
| **AnchorLayer** | Always updates; drawn in Cinematic | Torus-knot particles |
| **LightingLayer** | Always updates; drawn in Cinematic | Scene lights + flash |
| **PostProcessing** | Always updates; drawn in Cinematic | EffectComposer + chromatic aberration |
| **LiveFeedLayer** | Updates in Live mode | Phase 1.7 sharp reactive webcam (no feedback) |
| **AcidFeedLayer** | Updates in Acid mode | Webcam + FBO feedback + mood-orchestrated extras |

## Live mode pipeline (Phase 1.7 — frozen)

1. User selects **Live** in Visual Mode (or key `2`).
2. Webcam starts if not already active.
3. `LiveFeedLayer` renders fullscreen quad with `liveFeed.frag.glsl` directly to canvas.
4. Two-layer composite: blurred bg plate + sharp warped foreground. Bass zoom, mid melt, flux glitch, edge-weighted RGB, horizontal color hits on highs.

## Shader uniforms (LiveFeedLayer)

| Uniform | Audio source | Visual effect |
|---------|--------------|---------------|
| `u_video` | VideoTexture | Live camera image |
| `u_time` | Frame time | Idle drift, bass pulse |
| `u_bass` | peak-normalized bass | Breathing zoom (~4% max) |
| `u_mid` | peak-normalized mid | Center melt wobble |
| `u_high` | peak-normalized high | Edge RGB fringe + horizontal shimmer |
| `u_lightningFlash` | state | Flash glow + saturation lift |
| `u_rave` | state | +25% effect intensity |
| `u_glitchOffset` | flux spike in JS | 3-frame UV jump |

## Shader uniforms (AcidFeedLayer)

All Live uniforms plus:

| Uniform | Source | Visual effect |
|---------|--------|---------------|
| `u_feedback` | Previous FBO frame | Temporal trails / smear |
| `u_feedbackAmount` | mood weights + bass + rave (cap 0.62) | Trail strength |
| `u_kaleidoscopeSegments` | mood weights (1 = off, up to 8) | UV mirror fold count |
| `u_huePhase` | mood hue speed × time + high boost | Subtle hue on warped fg (15%) + trail tint |
| `u_meltZoomScale` | mood intense boost + bass | Stronger warp on intense |
| `u_glitchStrength` | mood weights | Scales flux glitch amplitude |
| `u_feedbackDecay` | constant 0.98 | Prevents feedback runaway to white |
| `u_beatPhase` | beat state | Phase-locked bass zoom wobble |
| `u_beatSyncWeight` | confidence when sync active | Blends time-based vs beat-based zoom |

**Mood → base parameter table (before audio modulation):**

| Parameter | Calm | Groove | Intense |
|-----------|------|--------|---------|
| feedbackAmount | 0.15 | 0.32 | 0.52 |
| kaleidoscope fold | 1 (off) | 3–4 | 5–8 |
| hue cycle speed | 0.02 | 0.12 | 0.35 |
| glitch strength | 0.55× | 1.0× | 1.0× |
| melt/zoom scale | 1.0 | 1.0 | 1.22 |

**Acid pipeline (2a.6):** Warp path first — kaleidoscope → zoom/melt/glitch → RGB + subtle hue on `fgCol` → bg composite → flash → warp-aligned feedback mix. No sharp-webcam overlay; trails follow `fgUv` so smear moves with the distorted feed.

**Acid color look (2a.5):** Color accents are integrated into the warped foreground samples before composite, not pasted on top. RGB split is moderate (~60% of Live parity); hue is 15% on fg only plus a light tint on feedback trails.

## UI controls

- **Visual Mode:** Cinematic | Live | Acid buttons; keys `1` / `2` / `3`
- **Sync:** Auto | Off buttons; key `S` (default Auto)
- **Audio:** Demo tracks, file upload, microphone, Stop, Escape
- **Status:** Shows `Mode · mood · BPM` or `· no beat` / `· sync off` when camera active or audio playing

## File map

| File | Purpose |
|------|---------|
| `src/main.ts` | App entry, glass UI, mode + audio controls |
| `src/styles.css` | Glass overlay, mode button active state |
| `src/audio/AudioEngine.ts` | Web Audio + Meyda feature extraction |
| `src/camera/VideoCapture.ts` | Webcam lifecycle and VideoTexture |
| `src/webgl/Loop.ts` | rAF loop, MoodAnalyzer + BeatSync wiring |
| `src/webgl/StateManager.ts` | Smoothed rave/cinematic/lightningFlash + BeatState types |
| `src/webgl/MoodAnalyzer.ts` | Calm/groove/intense inference |
| `src/webgl/BeatSync.ts` | BPM estimation, beat phase clock, confidence |
| `src/webgl/Scene.ts` | VJScene — VisualMode routing, layer orchestration |
| `src/webgl/layers/LiveFeedLayer.ts` | Live mode webcam shader |
| `src/webgl/layers/AcidFeedLayer.ts` | Acid mode FBO feedback pipeline |
| `src/webgl/layers/PostProcessing.ts` | Cinematic post-processing |
| `src/shaders/liveFeed.frag.glsl` | Live feed composite (Phase 1.7, frozen) |
| `src/shaders/liveFeedCommon.glsl` | Shared GLSL helpers (Acid only) |
| `src/shaders/acidFeedHeader.frag.glsl` | Acid uniforms + varying declarations |
| `src/shaders/acidFeedBody.frag.glsl` | Acid `main()` body |
| `docs/PROJECT.md` | This reference |
| `docs/ARCHITECTURE.md` | Design case study — rationale, custom algorithms, tradeoffs |
| `docs/architecture.mmd` | System diagram (Mermaid, source of truth) |
| `docs/PHASE1_CHANGELOG.md` | Phase 1 change log |
| `docs/PHASE2_CHANGELOG.md` | Phase 2a change log |

## Tuning guide

**MoodAnalyzer.ts:** `moodAlpha` (transition speed), groove `smoothstep` edges, `fluxVar` multiplier, raw score weights.

**AcidFeedLayer.ts / acidFeedBody.frag.glsl:** mood table bases, `feedbackDecay` (0.98), kaleidoscope cap (8), hue speed range, `meltZoomScale` intense boost (1.22), mobile `fboScale` (0.5), beat constants (`BEAT_FB_PULSE`, `BEAT_KALEIDO_STEP`, `BEAT_HUE_STEP`, `BEAT_GLITCH_WINDOW`).

**BeatSync.ts:** `CONFIDENCE_THRESHOLD` (0.45), `ONSET_COOLDOWN_SEC` (0.22), `ONSET_FLUX_BAR` (0.78), `ONSET_BASS_BAR` (0.72), `WARMUP_SEC` (2.5), `PLL_NUDGE` (0.35).
