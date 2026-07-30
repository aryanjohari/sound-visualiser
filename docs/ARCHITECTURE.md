# Architecture — Sound Visualiser

## Premise

Sound Visualiser is a browser-only VJ rig. It takes an audio source (microphone, a local
file, or a bundled demo track) and optionally a webcam, and renders a full-screen,
audio-reactive WebGL scene at display refresh rate.

The interesting part is not the FFT and it is not the shaders. It is the interpretation
layer between them. Wiring frequency bins straight to shader uniforms produces something
that twitches with amplitude and reads as noise. This project instead spends three stages
turning raw per-frame features into a *description of what the music is doing* — how
energetic it is, what mood shape it has, and where the beat grid sits — and only then
hands that description to the visual layers. Every visual parameter is driven by the
interpretation, never by a raw bin value.

There is no backend. No audio, video, or telemetry leaves the browser tab.

## Goals and non-goals

**Goals**

- Feel musical rather than reactive. Transients should hit, sustained energy should
  breathe, and nothing should strobe just because a number moved.
- Self-calibrate to any input. A quiet ballad and a mastered club track should both drive
  the full expressive range without a gain slider.
- Degrade gracefully. When the rhythm is ambiguous, beat-locked behaviour should fade out
  rather than fight the music.
- Zero install, zero upload, zero server. Open a tab, press a button.
- Hold a stable frame rate on a normal laptop GPU.

**Non-goals**

- Not an audio editor or DAW. No transport, no timeline, no export or recording.
- No genre classification and no machine learning. Mood here is an energy-shape heuristic,
  deliberately, so it works on material it has never seen.
- No external control surfaces — no MIDI, DMX, OSC, or network sync.
- Not a general-purpose shader playground. The shaders are purpose-built for this signal
  chain.

## Unique approach

These are the parts I designed or adapted specifically for this project, rather than
picked off the shelf.

**Hand-rolled spectral flux.** Meyda ships a `spectralFlux` extractor, but it crashes in
this web build, so flux is computed in the analysis callback from consecutive
`powerSpectrum` frames: keep only positive per-bin deltas, sum them, and compress with
`log10(1 + sum)`. Positive-only differencing is what makes it an onset detector rather
than a change detector, and the log keeps a single loud transient from swallowing the
entire control range.

**Peak-relative everything.** There is no absolute loudness anywhere in the system. Every
consumer keeps its own decaying peak tracker, `peak = max(peak * 0.985, value)`, and
reports `value / peak`. This is why the visualiser needs no input gain control: it
continuously re-references itself to whatever the source has been doing for the last few
seconds. Each layer tracks its own peaks independently, so a layer that only cares about
bass is not desensitised by a loud cymbal elsewhere in the mix.

**A three-stage interpretation ladder.** Raw features feed `StateManager` (a smoothed
`rave` ↔ `cinematic` energy axis plus a fast hi-hat flash channel), then `MoodAnalyzer`
(calm / groove / intense as a normalized three-way weight vector), then `BeatSync` (tempo,
phase, confidence). Mood is a *partition of unity*, not a switch — the three weights sum
to one and shader parameters are blended across them, so the look drifts continuously
instead of snapping between presets.

**A custom BPM estimator built for cheap real-time operation.** Onsets are peak-picked
from combined bass and flux with a 220 ms refractory period. Inter-onset intervals go into
a 12-slot ring buffer. Tempo is chosen by brute-force voting over every integer BPM from
60 to 180, scoring each candidate by how many intervals land within 12% of its period *or
double its period*, which makes it robust to missed beats. A median-interval tiebreak
catches octave errors when two candidates score close in a 2:1 ratio. Phase is maintained
by a PLL-style nudge toward each detected onset rather than by re-latching.

**Confidence as a continuous blend weight.** This is the design decision I am most happy
with. Beat sync never switches on. Every synced parameter is computed as
`final = unsyncedValue + (beatValue - unsyncedValue) * confidence`. On four-on-the-floor
material confidence saturates and visuals quantize hard to the grid; on a rubato ballad
confidence stays near zero and the system behaves exactly as if beat sync did not exist.
There is no threshold pop and no failure mode where the visuals confidently lock onto the
wrong tempo.

**Warp-aligned feedback in Acid mode.** The obvious way to build a feedback trail is to
mix in the previous frame at its own UV, which leaves the trails sitting statically behind
a moving image. Here the previous frame is sampled through the *same* warped UV as the
current frame, so smear travels with the distortion and the whole thing reads as one
liquid surface rather than two stacked layers. Runaway is bounded by a 0.98 per-sample
decay multiplied into the feedback texture plus a hard 0.62 cap on the mix amount.

**Ordered shader concatenation.** The Live shader is frozen — it is the reference look and
must not change. Acid needs most of its helper functions. So the Acid fragment shader is
assembled at import time as `header + sharedHelpers + body`, in that order, because GLSL
requires uniform declarations to precede any function that references them. This lets both
modes share `liveFeedCommon.glsl` without touching `liveFeed.frag.glsl`.

**Pull-model decoupling of analysis and rendering.** Meyda's callback fires on the Web
Audio clock (roughly `sampleRate / hopSize`, a few hundred times a second); the renderer
runs on `requestAnimationFrame`. They are not connected by a queue. The engine simply
overwrites a "latest features" struct and the render loop reads whatever is there. Analysis
frames the renderer never sees are dropped for free, and neither side can apply
backpressure to the other.

## C4 overview (links to docs/c4/*)

Structured C4 diagrams (Context → Containers → Components). No Code-level diagrams.

| Level | Link |
| --- | --- |
| Index | [`docs/c4/README.md`](./c4/README.md) |
| C1 System context | [`docs/c4/1-context.mmd`](./c4/1-context.mmd) |
| C2 Containers | [`docs/c4/2-containers.mmd`](./c4/2-containers.mmd) |
| C3 `audio-engine` | [`docs/c4/3-components/audio-engine.mmd`](./c4/3-components/audio-engine.mmd) |
| C3 `interpretation` | [`docs/c4/3-components/interpretation.mmd`](./c4/3-components/interpretation.mmd) |
| C3 `vj-scene` | [`docs/c4/3-components/vj-scene.mmd`](./c4/3-components/vj-scene.mmd) |

Portfolio fetch: [`architecture.graph.json`](./architecture.graph.json) (map IR from C2) and
[`architecture.mmd`](./architecture.mmd) (visitor flowchart). Declared in root
[`portfolio.yaml`](../portfolio.yaml).

## System overview

One static SPA in the browser. Logical containers (C2): glass UI and demo asset feed the
**audio engine**, which overwrites a **latest-features** snapshot; the **frame loop** pulls
that snapshot into the **interpretation** ladder (energy → mood → beat) and drives the
**VJ scene** (Cinematic / Live / Acid) onto the **full-screen canvas**. Webcam capture is
optional and only used in Live and Acid.

Visitor-facing diagrams (kept in sync with C2, collapsed for storytelling):

- [`docs/architecture.mmd`](./architecture.mmd) — Mermaid flowchart
- [`docs/architecture.graph.json`](./architecture.graph.json) — portfolio map + tour

For the full container map and component zooms, use [`docs/c4/`](./c4/README.md) rather than
duplicating those fences here.

## Key components

| Component | File | Responsibility |
|---|---|---|
| `AudioEngine` | `src/audio/AudioEngine.ts` | Owns the `AudioContext` and source lifecycle (mic stream, `<audio>` element, blob URLs). Runs Meyda and publishes a latest-features struct. |
| `StateManager` | `src/webgl/StateManager.ts` | Frame-rate-independent smoothing into the `rave` ↔ `cinematic` energy axis plus the fast `lightningFlash` channel. Also home of the shared `VJState` / `BeatState` types. |
| `MoodAnalyzer` | `src/webgl/MoodAnalyzer.ts` | Scores calm / groove / intense from energy shape and flux variance, normalizes to weights summing to one, smooths the result. |
| `BeatSync` | `src/webgl/BeatSync.ts` | Onset detection, tempo voting, phase-locked beat clock, and the confidence score that gates everything downstream. |
| `Loop` | `src/webgl/Loop.ts` | The `requestAnimationFrame` driver. Pulls features, runs the three analysers in order, assembles `VJState`, fires camera impulses, calls scene update and render. |
| `VJScene` | `src/webgl/Scene.ts` | Mode routing and layer orchestration. Owns webcam attach/detach and serialises in-flight mode changes. |
| `Director` | `src/webgl/layers/Director.ts` | Camera language: orbit, FOV, kick shake, dolly punches, GSAP transitions between cinematic and rave behaviour. |
| `EnvironmentLayers` | `src/webgl/layers/EnvironmentLayers.ts` | The enclosing fluid sphere — Voronoi warp and fBM ridges with bass-driven motion and treble lightning. |
| `AnchorLayer` | `src/webgl/layers/AnchorLayer.ts` | Torus-knot point cloud deformed by curl noise in the vertex shader. |
| `LightingLayer` | `src/webgl/layers/LightingLayer.ts` | Three scene lights plus a white centre flash driven by `lightningFlash`. |
| `PostProcessing` | `src/webgl/layers/PostProcessing.ts` | `EffectComposer` with a custom edge-weighted chromatic aberration pass. Cinematic only. |
| `LiveFeedLayer` | `src/webgl/layers/LiveFeedLayer.ts` | Frozen reference webcam look: bass zoom, mid melt, edge RGB fringe, flux glitch. Renders straight to canvas. |
| `AcidFeedLayer` | `src/webgl/layers/AcidFeedLayer.ts` | Ping-pong render targets, mood-orchestrated uniforms, beat-quantized modulation, blit to canvas. |
| `VideoCapture` | `src/camera/VideoCapture.ts` | `getUserMedia` → hidden `<video>` → `THREE.VideoTexture`, with plain-English error mapping. |

## Data / control flow

**Audio path.** A source is attached to the `AudioContext` and to a Meyda analyzer
(`bufferSize` 512, `hopSize` 256, extractors `rms` and `powerSpectrum`). On each analysis
callback the engine derives spectral flux from the previous spectrum, sums four band
energies (`lowpass` 0–220 Hz, `bass` 20–140 Hz, `mid` 200–2000 Hz, `high` 4–12 kHz) using
`hzPerBin = sampleRate / bufferSize`, log-compresses each, and overwrites the latest
struct. Nothing downstream is notified; there is no queue.

**Frame path.** Each `requestAnimationFrame`, `Loop` takes `dt` from a `THREE.Timer`, reads
the latest features, and runs the analysers strictly in order — `StateManager`, then
`MoodAnalyzer` (which consumes `StateManager`'s output), then `BeatSync` (which consumes
the smoothed RMS for its silence gate). The three results are merged into one immutable
`VJState` for the frame. `Loop` then evaluates camera impulses, notifies the UI, and calls
`VJScene.update()` followed by `VJScene.render()`.

**Camera impulse arbitration.** `Loop.maybeSpectralFluxCameraPunch` chooses between two
trigger sources. When beat sync is active, dolly punches fire on downbeats with a
half-beat cooldown and the flux path is skipped entirely. When it is not, punches fall back
to normalized flux crossing 0.88 with a 240 ms cooldown. This is the one place where sync
switches rather than blends, because a camera move is a discrete event and cross-fading two
competing triggers would double-fire.

**Mode routing.** `VJScene.update()` always updates the 3D layers regardless of mode, then
additionally updates whichever webcam layer is active. `render()` branches: Live and Acid
draw their own fullscreen quad and return early; Cinematic goes through the composer.
Keeping the 3D layers warm costs some CPU but means switching back to Cinematic is
instantaneous and never shows a cold scene.

**Webcam lifecycle.** Entering Live or Acid from Cinematic starts the capture and hands the
same `VideoTexture` to both webcam layers; returning to Cinematic stops tracks and clears
the feedback buffers. Switching directly between Live and Acid keeps the camera running and
only clears feedback, so there is no permission re-prompt and no ghost smear from the
previous mode. Mode changes are serialised through a stored in-flight promise, so rapid
clicking cannot issue two concurrent `getUserMedia` calls.

## Notable implementation details

**Frame-rate-independent smoothing.** Every exponential average uses
`a = 1 - (1 - alpha)^(dt * 60)` rather than a fixed per-frame alpha, so the perceived
smoothing time constant is identical at 30, 60, and 144 fps. The same correction is applied
in `StateManager`, `MoodAnalyzer`, and `BeatSync`'s confidence tracker.

**Two-speed treble response.** `thresholdedHigh` gates normalized treble through
`smoothstep(0.4, 0.9, highN)` so only genuine transients register, then `lightningFlash`
chases it with `1 - exp(-dt * 38)` — a response fast enough to look instantaneous on attack
but with a visible decay tail. This single channel drives the white centre point light, the
particle brightness boost, and the fluid shader's lightning term, which is what makes those
three read as one physical event rather than three coincidences.

**Hysteresis on the camera mode.** `Director` enters rave above `rave > 0.62` and only
returns below `rave < 0.38`. The gap prevents oscillation during passages that hover near
the boundary.

**Octave-error correction in tempo voting.** After the brute-force vote, if the best and
runner-up candidates are in roughly a 2:1 or 1:2 ratio, the estimator compares both periods
against the median inter-onset interval and takes whichever is closer. Without this, a track
with strong eighth-note hi-hats reliably locks to double tempo.

**Confidence is a product, not a sum.** It multiplies five terms — onset count, interval
consistency, BPM stability, an energy gate, and a 2.5-second warmup ramp — so any single
failing condition drives it to zero. Silence decays it at 0.9 per frame independently. This
is deliberately pessimistic: the cost of a false negative is "visuals behave as before",
while the cost of a false positive is visuals pulsing against the music.

**The kaleidoscope mirror-fold parity trick.** Mirroring alternate wedges requires knowing
whether the current wedge index is odd or even, but `atan` returns negative angles for half
the circle and `floor` of a negative number breaks the parity. `liveFeedCommon.glsl` adds
`1000.0` before flooring to push the index positive while preserving parity, since 1000 is
even.

**Three-frame glitch holds.** Glitch offsets are latched for exactly three frames rather
than tweened. A single-frame displacement is invisible at 60 fps and an eased one looks like
motion rather than corruption; three held frames read as a digital tear. When sync is
active, glitches are additionally gated to the first 20% of each beat, so tearing lands on
the grid.

**Aspect handling.** `coverUv` reproduces CSS `object-fit: cover` in GLSL by comparing video
and screen aspect and scaling the appropriate axis around 0.5. Every subsequent UV
manipulation clamps to `[0,1]` before sampling, so warps at extreme amplitudes repeat edge
pixels instead of tearing black holes.

**Mobile FBO downscaling.** On coarse-pointer devices the Acid render targets are allocated
at half resolution and upscaled during the blit — roughly a 4× memory and fill-rate saving
for slightly softer trails. Render target reallocation is skipped when dimensions are
unchanged, so resize events do not thrash GPU memory.

**Resource teardown.** Stopping audio suspends the `AudioContext`, stops every
`MediaStreamTrack`, clears the element `src`, revokes any blob URL created for a local file,
and drops the previous-spectrum reference. Webcam teardown disposes the texture and removes
the hidden video element from the DOM.

For exhaustive per-uniform tables, the mood parameter matrix, and tuning constants, see
[`docs/PROJECT.md`](./PROJECT.md).

## Tradeoffs and limitations

- **Tempo estimation is onset-interval based**, not autocorrelation over a spectrogram. It
  is cheap enough to run every frame alongside rendering, but it is weak on rubato,
  ballads, ambient, and speech. The 60–180 BPM clamp means material outside that range gets
  reported at half or double time.
- **Peak-relative normalization has no memory of absolute loudness.** A sustained quiet
  passage eventually normalizes up to full range, so the visualiser never truly rests. This
  is the intended trade — self-calibration in exchange for losing dynamics between sections.
- **The 3D layers update even when they are not drawn.** In Live and Acid mode that is
  wasted CPU, accepted in exchange for instant mode switching.
- **No automated tests and no CI.** Verification today is a typecheck, a production build,
  and listening to it. For a project whose correctness criterion is "does it feel right",
  unit tests would cover the least interesting parts, but the DSP helpers
  (`bandEnergy`, the tempo vote, the EMA correction) are pure functions and are the obvious
  place to start if that changes.
- **Single ~658 kB bundle (~180 kB gzipped)**, dominated by Three.js. No code splitting or
  lazy loading is configured.
- **Heavy fragment shaders.** The fluid background runs several five-octave fBM evaluations
  plus three 3×3 Voronoi cell searches per pixel — two warp lookups and one edge mask.
  Low-end GPUs will struggle even with the pixel-ratio cap of 2.
- **`VoidLayer` and its `voidFog` shaders are dead code** — complete and functional, but
  never added to the scene graph. Kept as a starting point for a future volumetric mode.
- **The second demo button is not wired to a shipped asset.** `main.ts` requests
  `/huzur.mp3`, which is not in `public/`; the button surfaces a load error unless you add
  that file yourself. Only `freetibet.mp3` ships with the repo.
- **`node_modules/` and `dist/` are currently committed** to the repository.

## How to verify locally

Full setup is in the [README](../README.md). The short version:

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npx tsc --noEmit     # typecheck
npm run build        # production build
```

Once it is running:

- **Interpretation ladder** — open the console. `main.ts` logs `rms`, `flux`, band energies,
  and the live `bpm` / `confidence` / `beatPhase` about once a second. Play the demo track and
  watch confidence climb past 0.45; the status line switches from `· no beat` to a BPM
  readout at the same moment.
- **Confidence blending** — press `S` to toggle sync off mid-track. Visuals should keep
  moving identically minus the quantization, with no jump.
- **Peak-relative normalization** — play something very quiet. Within a few seconds the
  visuals should reach full range without touching any control.
- **Warp-aligned feedback** — switch to Acid (key `3`) and move in front of the camera. The
  trails should travel with the distorted image, not sit behind it.
- **Webcam lifecycle** — alternate keys `2` and `3` rapidly. The camera indicator should stay
  on continuously, with no repeated permission prompt and no smear carried across.
