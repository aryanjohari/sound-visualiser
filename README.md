# Sound Visualiser

Visitor overview: see portfolio.yaml.

An audio-reactive WebGL visualizer built with TypeScript, Three.js, Meyda, and custom GLSL shaders.

The project turns real-time audio features (RMS, spectral flux, and frequency-band energies) into:
- camera choreography (cinematic <-> rave transitions, kick punches, dolly hits),
- volumetric/noise-driven background motion,
- particle-knot deformation,
- dynamic lighting,
- post-processing aberration.

## What This Project Does

At runtime, the app:
1. Captures audio from one of three sources:
   - microphone,
   - local file upload,
   - demo URL path (currently `/freetibet.mp3` and `/huzur.mp3`).
2. Extracts per-frame audio features using Meyda.
3. Normalizes and smooths those features into a stable scene state.
4. Pushes the state into multiple visual layers and shader uniforms.
5. Renders continuously in a requestAnimationFrame loop.

The system is designed to feel musical rather than noisy: peaks are adaptive, transitions are eased, and transient-heavy features are used for impacts while low/mid energy drives slower deformation.

## Stack

- `TypeScript`
- `Vite`
- `three`
- `postprocessing` (EffectComposer + ShaderPass)
- `meyda` (audio feature extraction)
- `gsap` (camera choreography/tweening)

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Run dev server

```bash
npm run dev
```

Vite is configured for `127.0.0.1:5173` (strict port).

### 3) Build / preview

```bash
npm run build
npm run preview
```

## Audio Sources and UX

The UI overlay lets you:
- play a remote/public URL (via the two demo buttons),
- upload local audio (`audio/*`),
- use microphone input.

Controls:
- `Stop` button,
- hidden hover stop button (top-right, visible on hover while audio is playing),
- `Escape` key also stops playback.

When playback starts, the glass UI recesses and pointer events are disabled on the overlay so the visual canvas is fully interactive.

## Important Note About Demo Tracks

The code references:
- `/freetibet.mp3`
- `/huzur.mp3`

For these buttons to work in dev/prod, those files must exist at your web root (for Vite apps, typically under `public/` so they are served as `/freetibet.mp3` and `/huzur.mp3`).

## Architecture Overview

Main flow:

`src/main.ts` -> `AudioEngine` + `StateManager` + `Loop` -> `VJScene` -> layers -> renderer/composer

Key modules:
- `src/audio/AudioEngine.ts`: Web Audio + Meyda feature extraction.
- `src/webgl/StateManager.ts`: adaptive smoothing/normalization and high-level mode metrics.
- `src/webgl/Loop.ts`: frame timing, state update, render loop, global event triggers.
- `src/webgl/Scene.ts`: layer orchestration.
- `src/webgl/layers/*`: independent visual systems (environment, anchor particles, lighting, direction/camera, post FX).
- `src/shaders/*`: custom GLSL.

## Signal Processing and Math

This section is the core "what maths is going on" explanation.

### 1) Frame-level feature extraction

Meyda runs on each audio frame with:
- `bufferSize = 512`
- `hopSize = 256`
- extractors: `rms`, `powerSpectrum`

#### RMS

`rms` is provided by Meyda:

- larger RMS -> more overall signal energy/loudness,
- used as a smooth energy control (not transient detector).

#### Spectral Flux (manual)

Meyda's built-in `spectralFlux` is intentionally not used (commented in code due to web build crash), so flux is computed manually from consecutive `powerSpectrum` frames:

- For each bin `i`, compute `d_i = current_i - previous_i`.
- Keep only positive changes.
- Sum them: `sumPos = Σ max(d_i, 0)`.
- Compress dynamic range with:
  - `spectralFlux = log10(1 + sumPos)`.

Why this works:
- positive-only deltas emphasize onsets and sudden brightness changes in the spectrum,
- log compression keeps huge transient values from overwhelming the control space.

### 2) Frequency band energies

Band energies are derived from the `powerSpectrum` using:

- `hzPerBin = sampleRate / bufferSize`
- `startBin = floor(startHz / hzPerBin)`
- `endBin = floor(endHz / hzPerBin)`
- band sum = sum of bins in that range
- compressed with `log10(1 + sum)`

Bands used:
- `lowpass`: 0-220 Hz
- `bass`: 20-140 Hz
- `mid`: 200-2000 Hz
- `high`: 4000-12000 Hz

These bands feed different visual controls:
- bass -> large-scale warp, punch, chromatic offset
- mid -> particle deformation intensity
- high -> lightning/flash behavior

### 3) Rolling averages and adaptive normalization

`StateManager` computes exponential moving averages and rolling peaks so behavior adapts to each track's own loudness profile.

#### Exponential moving average (EMA)

Given frame delta `dtSeconds` and base alpha:

- `a = 1 - (1 - avgAlpha)^(dtSeconds * 60)`
- `avg = avg * (1 - a) + value * a`

This makes smoothing roughly frame-rate independent.

#### Decaying peak tracker

For each tracked metric:

- `peak = max(peak * peakDecay, current)`

This gives an adaptive recent ceiling rather than a fixed absolute max.

#### Normalization

- `norm = current / (peak + 1e-9)`

This allows visuals to self-calibrate across quiet vs loud sources.

### 4) Rave vs cinematic state

`raveTarget` blends normalized RMS and Flux:

- `mixSignal = 0.55 * rmsN + 0.65 * fluxN`
- `raveTarget = smoothstep(0.35, 1.0, mixSignal)`

Then `rave` is smoothed via another EMA-like transition alpha.

State outputs:
- `rave`: [0..1]
- `cinematic = 1 - rave`

These drive camera FOV/orbit behavior, post effects intensity scaling, and layer motion style.

### 5) High-frequency thresholding and flash

High-band value is peak-normalized and thresholded:

- `highN = high / highPeak`
- `thresholdedHigh = min(1, min(1.2, highN) * smoothstep(0.4, 0.9, highN))`

Then smoothed with a fast exponential response:

- `flashAlpha = 1 - exp(-dt * response)`
- `lightningFlash += (thresholdedHigh - lightningFlash) * flashAlpha`

This creates a sharp-but-controlled hi-hat flash channel used by:
- center white point light,
- particle shader brightness/opacity boost,
- fluid lightning emphasis.

## Visual Layer Mapping

### Director (camera language)

`src/webgl/layers/Director.ts`

Controls:
- mode hysteresis:
  - enter rave if `state.rave > 0.62`
  - return cinematic if `state.rave < 0.38`
- orbit radius/height/speed
- FOV tweening
- kick shake and kick FOV punch (flux-triggered)
- transient Z-dolly punch (external trigger from loop when fluxN crosses high bar)

Behavior:
- cinematic: wider radius, slower movement, narrower FOV, softer behavior
- rave: tighter/faster orbit, larger FOV, aggressive impulses

### Environment Layer (fluid sphere)

`src/webgl/layers/EnvironmentLayers.ts` + `fluidBackground.*.glsl`

A large back-faced sphere encloses the camera.

Shader ingredients:
- sphere UV mapping from normalized world position,
- cellular/Voronoi-like warp vectors,
- fBM noise fields,
- ridge extraction from fBM combinations,
- high-frequency "lightning" on ridge seams,
- bass-driven warp amplitude and animation speed.

Color model:
- deep black base + crimson veil from fluid pattern,
- white lightning additions scaled by high-band threshold.

### Anchor Layer (particle torus knot)

`src/webgl/layers/AnchorLayer.ts` + `anchor.*.glsl`

Geometry:
- samples all vertex positions from a dense `TorusKnotGeometry`,
- renders as `THREE.Points`.

Vertex shader:
- scales base positions with bass (`u_bass`),
- deforms points by curl noise field controlled by mid-band (`u_mid`),
- mixes simplex noise layers for local variation.

Fragment shader:
- soft circular point sprites (`gl_PointCoord` radial falloff),
- intensity/opacity scale with mid+high,
- lightning flash multiplies brightness/opacity to mimic physical center flash.

### Lighting Layer

`src/webgl/layers/LightingLayer.ts`

Lights:
- 1 directional,
- 2 colored point lights,
- 1 center white flash point light.

Controls:
- spectral flux normalization drives main intensity boost and hue shifts,
- center flash intensity = `state.lightningFlash * 22`.

### Post Processing

`src/webgl/layers/PostProcessing.ts` + `chromaticAberration.frag.glsl`

Single custom shader pass:
- radial RGB split from screen center,
- offset proportional to `u_bass`.

In JS:
- bass is peak-normalized, clamped, then mildly boosted in rave mode.

### Optional / Unused Layer

`src/webgl/layers/VoidLayer.ts` exists and has a volumetric-void shader path, but it is currently not wired into `VJScene.init()`.

## Runtime Loop

`src/webgl/Loop.ts`

Per frame:
1. Get `dt` from `THREE.Timer`.
2. Read latest audio features from `AudioEngine`.
3. Detect extreme spectral flux events for camera dolly punches.
4. Update state (`StateManager.update(features, dt)`).
5. Update scene and all layers with `(dt, features, state)`.
6. Render via post-processing composer.

## Project Structure

```text
src/
  audio/
    AudioEngine.ts
  shaders/
    anchor.vert.glsl
    anchor.frag.glsl
    fluidBackground.vert.glsl
    fluidBackground.frag.glsl
    chromaticAberration.frag.glsl
    voidFog.vert.glsl
    voidFog.frag.glsl
  webgl/
    Loop.ts
    Scene.ts
    StateManager.ts
    layers/
      Director.ts
      EnvironmentLayers.ts
      AnchorLayer.ts
      LightingLayer.ts
      PostProcessing.ts
      VoidLayer.ts
  main.ts
  styles.css
index.html
vite.config.ts
```

## Tuning Guide

If you want to tweak feel quickly:

- Feature responsiveness:
  - `AudioEngine` -> `bufferSize`, `hopSize`
- State smoothing:
  - `StateManager` -> `avgAlpha`, `transitionAlpha`, `peakDecay`
- Hi-hat flash snap:
  - `StateManager` -> `lightningFlashResponse`
- Camera aggression:
  - `Director` thresholds, kick cooldown, FOV values, orbit params
- Beat trigger sensitivity:
  - `Loop` -> `highBar` and `cooldown` in flux punch logic
- Visual intensity:
  - per-layer normalization clamps and multipliers (`Math.min(...)` and constants)

## Performance Notes

- Renderer pixel ratio is capped at `min(devicePixelRatio, 2)`.
- Heavy GLSL noise and sphere resolution can be expensive on low-end GPUs.
- If needed, reduce:
  - sphere segment counts in `EnvironmentLayers`,
  - torus knot density in `AnchorLayer`,
  - number/complexity of noise calls in shaders.

## Browser and Platform Notes

- Requires Web Audio API + WebGL support.
- Microphone mode requires user permission and secure context rules depending on browser.
- URL-based audio playback can be affected by CORS if hosting external files.

## Debugging Tips

- `main.ts` includes periodic console logs of extracted features (`rms`, `flux`, `bass`, `mid`, `high`).
- If visuals feel dead:
  - confirm audio actually plays (or mic permission granted),
  - inspect feature logs for non-zero values,
  - verify demo audio files are served from expected paths.

## Known Caveat

The built-in Meyda `spectralFlux` extractor is not used due to instability in this web setup; manual spectral flux calculation is implemented instead.

## License

Current `package.json` sets license to `ISC`.