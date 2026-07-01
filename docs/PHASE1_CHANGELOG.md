# Phase 1 Changelog

Incremental log of Phase 1 (live camera + audio-reactive feed) work.

---

## Step 1 — VideoCapture module + stream lifecycle

**What changed:** Added `VideoCapture` class for webcam access, stream lifecycle, and Three.js `VideoTexture` creation. Added initial project documentation scaffold.

**Files touched:**
- `src/camera/VideoCapture.ts` (new)
- `docs/PROJECT.md` (new)
- `docs/PHASE1_CHANGELOG.md` (new)

**Behavior now:** App builds and runs unchanged visually. `VideoCapture` can be imported and used independently: `start()` requests the front-facing camera, `stop()` releases tracks and disposes the texture.

**Math/shader notes:** None yet — no shader in this step.

---

## Step 2 — LiveFeedLayer + basic full-screen video

**What changed:** Added `LiveFeedLayer` with orthographic fullscreen quad, `liveFeed` GLSL shaders (cover-crop UV math), and wired into `VJScene` with render branch when camera is enabled.

**Files touched:**
- `src/webgl/layers/LiveFeedLayer.ts` (new)
- `src/shaders/liveFeed.vert.glsl` (new)
- `src/shaders/liveFeed.frag.glsl` (new)
- `src/webgl/Scene.ts` (modified)

**Behavior now:** When `setCameraEnabled(true)` is called (console for now), live webcam fills the canvas with object-fit cover. Camera off shows unchanged 3D visualizer. No audio-reactive effects yet — passthrough video only.

**Math/shader notes:** Cover UV compares `u_videoAspect` (webcam width/height) to `u_screenAspect` (canvas width/height) and scales the smaller dimension so the video fills the screen without letterboxing.

---

## Step 3 — Audio-reactive shader uniforms wired

**What changed:** Live feed shader now warps and color-splits based on audio. `LiveFeedLayer.update()` peak-normalizes bass/mid/high/flux and drives uniforms; flux spikes trigger 3-frame glitch offsets.

**Files touched:**
- `src/shaders/liveFeed.frag.glsl` (modified)
- `src/webgl/layers/LiveFeedLayer.ts` (modified)

**Behavior now:** Live feed reacts to music — bass zoom/warp, mid melt, high/lightningFlash RGB split, flux glitch bursts. Idle ambient warp when bands sum below 0.05.

**Math/shader notes:**
- `u_bass` 0–1 means “how loud is bass vs recent peak”; multiplies a sin pulse for radial zoom (~2% max offset).
- `u_mid` scales sinusoidal UV wobble (~3.5% max) for melt.
- RGB split offset = `(u_high * 0.015 + u_lightningFlash * 0.03) * intensity` in UV space along radial direction from center.
- Glitch fires when normalized flux > 0.85, random vec2 offset decays after 3 frames.

---

## Step 4 — VJScene camera toggle routing

**What changed:** Finalized `setCameraEnabled()` in VJScene — starts/stops VideoCapture, attaches texture to LiveFeedLayer, render branch skips PostProcessing when camera is ON.

**Files touched:**
- `src/webgl/Scene.ts` (modified)

**Behavior now:** Camera ON shows only live feed (3D layers still update but are not drawn). Camera OFF restores PostProcessing → 3D + chromatic aberration exactly as before.

**Math/shader notes:** None — routing only.

---

## Step 5 — UI toggle + permission handling

**What changed:** Added Camera section to glass UI with ON/OFF toggle. Permission errors surface via `#status`. Stream released on page unload.

**Files touched:**
- `src/main.ts` (modified)
- `src/styles.css` (modified)

**Behavior now:** User can turn camera on/off from the UI. Button shows active state when camera is live. Works alongside any audio source. Permission denied / no camera / in-use errors show plain-English status messages.

**Math/shader notes:** None — UI only.

---

## Step 6 — Idle polish + docs finalization

**What changed:** Preserved playback status when turning camera off during audio. Finalized `docs/PROJECT.md` with full feature/layer/uniform reference. Verified production build.

**Files touched:**
- `src/main.ts` (minor status UX fix)
- `docs/PROJECT.md` (finalized)
- `docs/PHASE1_CHANGELOG.md` (this entry)

**Behavior now:** Phase 1 complete. Camera toggle, audio-reactive live feed, graceful errors, stream cleanup, 3D fallback unchanged. Idle ambient warp when no audio. Build passes.

**Math/shader notes:** Idle threshold is `energy < 0.05` (sum of normalized bass+mid+high in shader). Below that, UV shift is `0.003 * sin/cos` — about 0.3% of screen, one slow cycle every ~15 seconds.

---

## Phase 1.5 — Live feed warp polish

**What changed:** Reworked live feed fragment shader to eliminate black edge voids during bass/melt warps. Bass now drives center zoom instead of outward UV push. Added blurred dark background plate for depth. UVs clamp instead of black fill. Edge falloff reduces melt/glitch near corners. Glitch amplitude reduced in JS.

**Files touched:**
- `src/shaders/liveFeed.frag.glsl` (modified)
- `src/webgl/layers/LiveFeedLayer.ts` (modified — glitch constants)
- `docs/PROJECT.md` (updated)
- `docs/PHASE1_CHANGELOG.md` (this entry)

**Behavior now:** Live feed warps cleanly on bass hits — image breathes via zoom, no black semi-circles at edges. Blurred dark background visible at periphery gives depth. Strong flux glitches may briefly smear but no longer tear black holes. Camera OFF path unchanged.

**Math/shader notes (simple):**
- **Zoom bass:** `zoom = 1 + u_bass × sin(time × 2) × 0.04` — values above 1 crop toward center (like zooming in). Stays inside texture; no outward push.
- **Background plate:** Same video zoomed in 6% (`÷ 1.06`), 9-tap box blur, multiplied by 0.35 for a dark soft backdrop.
- **Edge falloff:** `1 - smoothstep(0.25, 0.9, distance from center)` — 1.0 at middle, ~0 at corners. Multiplies melt, idle, and glitch strength.
- **UV clamp:** `clamp(fgUv, 0, 1)` before every sample — edge pixels repeat instead of black.
- **Composite:** `mix(bgCol, fgCol, 0.52→1.0 by edge)` — corners show more blurred bg, center is sharp fg.
- **Glitch max offset:** Reduced from ±0.04/0.03 to ±0.02/0.015 in LiveFeedLayer.ts, also scaled by edge falloff in shader.

---

## Phase 1.6 (redo) — Edge-weighted chromatic on live feed

**What changed:** Replaced radial RGB split in `liveFeed.frag.glsl` with edge-weighted chromatic aberration (ported from `chromaticAberration.frag.glsl`). No other Phase 1.5 logic touched.

**Files touched:**
- `src/shaders/liveFeed.frag.glsl` (modified — RGB split block only)
- `docs/PROJECT.md` (updated)
- `docs/PHASE1_CHANGELOG.md` (this entry)

**Behavior now:** Live feed center stays clean on hi-hats and drops — no bright dot or colored ray hub. Color separation appears as a subtle fringe toward screen edges when highs or lightningFlash spike. Bass zoom, melt, glitch, bg plate, composite, and vignette unchanged from Phase 1.5.

**Math/shader notes (simple):**
- **Old:** `off = normalize(dir) × splitAmt` — same offset direction everywhere from center → visible dot + radial rays.
- **New:** `off = normalize(dir) × dist × splitAmt × 0.02` — offset grows with distance from center, zero at hub. Center pixels skip split entirely (`dist < 1e-5`).
- Matches the 3D post-process: fringe at edges, clean middle.

---

## Phase 1.7 — Bring back color hits on live feed

**What changed:** Boosted hi-hat / flash color visibility in `liveFeed.frag.glsl` RGB split block only. Stronger edge fringe multiplier, added whole-frame horizontal RGB layer, brighter flash glow with mild saturation lift.

**Files touched:**
- `src/shaders/liveFeed.frag.glsl` (modified — RGB split + flash composite only)
- `docs/PROJECT.md` (updated)
- `docs/PHASE1_CHANGELOG.md` (this entry)

**Behavior now:** Hi-hats and drops show clear color shimmer and brief glow — stronger than Phase 1.6 redo. Center/face stays natural (edge split still zero at hub; horizontal split has no radial origin). Bass zoom, melt, glitch, bg plate, fgMix, vignette unchanged.

**Math/shader notes (simple):**
- **Edge fringe:** Multiplier `0.02 → 0.10` — five× stronger color at screen edges, still zero at center.
- **Horizontal layer:** `hOff = vec2(splitAmt × 0.6, 0)` samples R/G/B shifted left/right uniformly — no center dot. Mixed up to 45% with edge-split result when highs/flash active.
- **Flash glow:** Brightness `0.5 → 0.65`; when `lightningFlash > 0.3`, mild saturation boost via luma mix.
