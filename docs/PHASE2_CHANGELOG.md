# Phase 2a Changelog

Incremental log of Phase 2a (visual modes, mood auto, Acid feedback) work.

---

## Step 1 — VisualMode skeleton + routing

**What changed:** Replaced `cameraEnabled` boolean with `VisualMode` (`cinematic` | `live` | `acid`). Added `setVisualMode()`, webcam lifecycle keyed off mode, and `AcidFeedLayer` stub wired into `VJScene`.

**Files touched:**
- `src/webgl/Scene.ts` (modified)
- `src/webgl/layers/AcidFeedLayer.ts` (new)

**Behavior now:** Default mode is Cinematic (unchanged 3D). `setCameraEnabled` kept as deprecated shim mapping to `live`/`cinematic`. Render branches on `visualMode`.

---

## Step 2 — UI mode switcher

**What changed:** Replaced standalone camera toggle with Visual Mode segmented control (Cinematic | Live | Acid). Keyboard shortcuts `1`/`2`/`3`. Status line shows current mode.

**Files touched:**
- `src/main.ts` (modified)
- `src/styles.css` (modified — `.mode-btn--active`)

**Behavior now:** Selecting Live or Acid auto-starts webcam. Cinematic stops webcam. Permission errors surface in status bar.

---

## Step 3 — MoodAnalyzer + state extension

**What changed:** New `MoodAnalyzer` infers `calm` / `groove` / `intense` from audio shape. Extended `VJState` with `mood` and `moodWeights`. Loop merges mood after StateManager.

**Files touched:**
- `src/webgl/MoodAnalyzer.ts` (new)
- `src/webgl/StateManager.ts` (types extended)
- `src/webgl/Loop.ts` (modified)

**Behavior now:** Status shows mode · mood (e.g. `Acid · groove`). Live visuals unchanged — mood only drives Acid orchestration.

---

## Step 4 — Acid FBO ping-pong + basic feedback

**What changed:** `AcidFeedLayer` uses two `WebGLRenderTarget`s in ping-pong. Process pass writes to FBO; blit pass presents to canvas. `clearFeedbackBuffers()` on Live ↔ Acid switch and when entering Cinematic.

**Files touched:**
- `src/webgl/layers/AcidFeedLayer.ts` (modified)
- `src/shaders/acidFeedMain.frag.glsl` (new)
- `src/webgl/Scene.ts` (buffer clear on mode switch)

**Behavior now:** Acid shows temporal feedback trails. Live has no feedback (Phase 1.7 frozen).

---

## Step 5 — Full acid shader (1.7 port + kaleidoscope + hue)

**What changed:** Extracted shared GLSL helpers to `liveFeedCommon.glsl`. Acid shader ports Phase 1.7 composite plus kaleidoscope UV fold, hue rotation, and feedback mix. `liveFeed.frag.glsl` untouched.

**Files touched:**
- `src/shaders/liveFeedCommon.glsl` (new)
- `src/shaders/acidFeedMain.frag.glsl` (modified)
- `src/webgl/layers/AcidFeedLayer.ts` (shader concat)

**Behavior now:** Acid looks like Live plus trails, kaleidoscope folds, and color drift. Live shader byte-identical to Phase 1.7.

---

## Step 6 — Mood-weight orchestration + polish

**What changed:** Acid uniforms blended from mood weight table × audio reactivity. Mobile uses half-res FBOs. Feedback capped at 0.78 with 0.98 decay per sample.

**Files touched:**
- `src/webgl/layers/AcidFeedLayer.ts` (modified)
- `src/shaders/acidFeedMain.frag.glsl` (feedback cap in shader)

**Behavior now:** Quiet audio → calm mood → low feedback, kaleidoscope off. Drops → intense mood → higher feedback, more folds, faster hue. Several parameters move together — never one knob at max.

---

## Step 7 — Documentation + build

**What changed:** Updated `docs/PROJECT.md` with Phase 2a architecture. Verified `npm run build` passes.

**Files touched:**
- `docs/PROJECT.md` (updated)
- `docs/PHASE2_CHANGELOG.md` (this file)

**Behavior now:** Phase 2a complete.

---

## Fix — Acid shader concat order (black screen)

**What changed:** Split `acidFeedMain.frag.glsl` into `acidFeedHeader.frag.glsl` (precision + uniforms + varying) and `acidFeedBody.frag.glsl` (`main()` only). `AcidFeedLayer` now assembles: header → `liveFeedCommon` helpers → body. GLSL requires uniforms before functions that reference them.

**Files touched:**
- `src/shaders/acidFeedHeader.frag.glsl` (new)
- `src/shaders/acidFeedBody.frag.glsl` (new)
- `src/shaders/acidFeedMain.frag.glsl` (removed)
- `src/webgl/layers/AcidFeedLayer.ts` (shader concat order)

**Behavior now:** Acid mode compiles and shows webcam + feedback trails. Live and Cinematic unchanged.

---

## Phase 2a.5 — Acid color blend

**What changed:** Tuned Acid-only color so the feed stays readable — weaker RGB split (~50%), slower hue rotation (~65% reduction), softer flash punch, partial hue mix (35%), and a 20% sharp-webcam anchor blend at the end of the composite.

**Files touched:**
- `src/shaders/acidFeedBody.frag.glsl` (RGB, flash, hue, sharp-feed mix)
- `src/webgl/layers/AcidFeedLayer.ts` (hue speed table only: 0.02 / 0.12 / 0.35)
- `docs/PROJECT.md` (Acid look note)

**Behavior now:** Acid feels like the live feed with color accents on hi-hats and drops. Kaleidoscope, trails, warp, melt, glitch, feedback, mood, Live, and Cinematic unchanged.

---

## Phase 2a.6 — Acid integration

**What changed:** Removed sharp-webcam overlay mix. RGB and subtle hue (15%) applied on warped `fgCol` before composite. Feedback samples warp-aligned UVs (`fgUv`) with mild hue tint on trails only. Lower feedback bases (0.15 / 0.32 / 0.52) and cap (0.62).

**Files touched:**
- `src/shaders/acidFeedBody.frag.glsl` (integrated color path, warp-aligned feedback)
- `src/webgl/layers/AcidFeedLayer.ts` (feedback bases/caps only)
- `docs/PROJECT.md` (pipeline note)

**Behavior now:** Acid feels like one liquid reactive feed — warp, trails, and color on the same pixels. No stacked overlay.

---

## Phase 2b — Beat sync (BPM + beat-quantized visuals)

### Step 1 — BeatSync module + state + Loop wiring

**What changed:** New `BeatSync` class estimates BPM from bass + flux onsets. Extended `VJState` with `BeatState`. Loop merges beat after MoodAnalyzer.

**Files touched:**
- `src/webgl/BeatSync.ts` (new)
- `src/webgl/StateManager.ts` (BeatState, SyncMode types)
- `src/webgl/Loop.ts` (BeatSync wiring, setSyncMode)

**Behavior now:** BPM and confidence computed each frame; debug log includes beat fields.

---

### Step 2 — Confidence + phase clock

**What changed:** Full confidence formula (interval consistency, energy gate, warmup). PLL beat phase, bar phase (4/4), `onBeat` / `onDownbeat` pulses. Silence decays confidence.

**Files touched:**
- `src/webgl/BeatSync.ts`

**Behavior now:** `syncActive` when Auto + confidence ≥ 0.45.

---

### Step 3 — UI Sync toggle + status

**What changed:** Sync Auto | Off control in glass UI. Key `S` toggles. Status shows BPM, `no beat`, or `sync off`.

**Files touched:**
- `src/main.ts`
- `src/styles.css` (reuses mode-btn styles)

**Behavior now:** Sync Off = Phase 2a behavior unchanged.

---

### Step 4–5 — Acid beat-quantized modulation

**What changed:** Feedback bump on beat, kaleidoscope steps on bar, hue discrete steps, bass zoom phase lock (`u_beatPhase`), glitch gated to beat window.

**Files touched:**
- `src/webgl/layers/AcidFeedLayer.ts`
- `src/shaders/acidFeedHeader.frag.glsl`
- `src/shaders/acidFeedBody.frag.glsl`

**Behavior now:** Acid pulses and steps on beat when sync active on rhythmic tracks.

---

### Step 6 — Live light sync

**What changed:** Glitch gated to beat window; subtle bass pulse when sync active.

**Files touched:**
- `src/webgl/layers/LiveFeedLayer.ts`

**Behavior now:** Live unchanged when sync off.

---

### Step 7 — Cinematic downbeat dolly

**What changed:** When sync active, Z dolly on downbeat (half-beat cooldown). Flux dolly preserved when sync inactive.

**Files touched:**
- `src/webgl/Loop.ts`

**Behavior now:** Cinematic dolly can lock to bar when rhythm is clear.

---

### Step 8 — Documentation

**Files touched:**
- `docs/PROJECT.md` (beat pipeline, tuning)
- `docs/PHASE2_CHANGELOG.md` (this section)

**Behavior now:** Phase 2b complete.
