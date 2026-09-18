# Sound Visualiser — Engine (`01_ENGINE`)

**Status:** living machine design (look-instrument pass)  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Live demo (untouched):** https://music.arkhives.nz on `main` — never force-rewrite.  
**Depends on:** [`VISION.md`](VISION.md), [`00_FIELD_RESEARCH.md`](00_FIELD_RESEARCH.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`PROJECT.md`](PROJECT.md)  
**Feeds:** `02_CONSTITUTION.md`, `docs/modules/*`

Lens: **EVIDENCE** / **FEASIBLE** / **POLICY (proposal)** / **OPEN**

This is a **product pass on the existing v1 engine**. It does not delete `src/`, invent a second renderer, or add a fourth look. Field facts live in `00`; shipped behaviour lives in `ARCHITECTURE.md` / `PROJECT.md`. This file **cites** them and **names the organs**.

---

## 0. Purpose of this doc

This is the **body** of the machine: what a musical look is *for this engine*, how a live interpretation bus plus a closed look document turn a track into pixels and a keepable clip, and which organs exist before any constitution or code.

It is not a VJ pitch, not Ellis/Dixon, not the Web Audio spec, and not a restoration of a MilkDrop dump. Unknown numbers stay **not measured**. New GLSL is **out** unless an RQ later names an organ *and* demands a shader — default: **none**.

**Done when:** an operator can skim §3–5–7–10 and mark KEEP / CUT / OPEN without inventing a second product (VJam, Hydra, Runway, or a particle toy).

---

## 1. What the machine is (two doors, one engine)

**VISION law:** play a track → live look follows interpretation (energy, mood, beat) → optional talk nudges the look → keep a short local clip + serializable look JSON. Two doors, **one** engine: **lab** | **keep**.

| Door | What the user holds | What GPU / audio do |
|------|---------------------|---------------------|
| **Lab** | Track (file / mic / demo) + live full-screen view + sliders / optional talk | Interpretation bus → look document → uniforms → draw |
| **Keep** | Short local clip (picture **+** soundtrack) + look JSON | Same draw, then **canvas capture + audio tap**; JSON is a serialize of the document |

Talk and sliders write the **look document**, not bins and not pixels. LLM is a **router** (`00` D7): intent → validated patch on a closed schema. GPU still draws; BeatSync still listens. Keep is **not** a video product and **not** a site builder (`00` D5, D11).

There is no hero/embed door. Prism’s recipe-behind-HTML is a sibling stills pattern; do not copy it.

---

## 2. Data model (time-domain)

### 2.1 Five things that must not collapse

For this engine (not a graphics textbook, not a DAW):

| Term | Meaning here |
|------|----------------|
| **Audio snapshot** | Latest `AudioFeatures` from `AudioEngine.getFeatures()`: `{ rms, spectralFlux, lowpass, bass, mid, high }`. Pull-model; overwritten on the Web Audio clock. **`powerSpectrum` never leaves `AudioEngine`.** (`ARCHITECTURE.md` audio path; `src/audio/AudioEngine.ts`) |
| **Interpretation state** | Per-rAF `VJState`: energy axis (`rave` / `cinematic` / `lightningFlash`), mood as a partition of unity (`calm + groove + intense ≈ 1`), beat clock + **confidence**. (`StateManager` + `MoodAnalyzer` + `BeatSync`) |
| **Look document** | Closed JSON: `schemaVersion`, `lookId`, semantic **axes**, `syncPolicy`. **Policy over a live stream**, not a timeline of beats, not shader source, not a dump of live uniforms. |
| **Canvas / drawing buffer** | What Three.js presents this frame (`renderer.domElement`). The lab **view**. |
| **Clip** | Time-stamped **picture + soundtrack** from `captureStream` + `AudioContext` tap → `MediaRecorder` Blob. Time lives here. Reloading JSON does **not** replay the track. |

**EVIDENCE:** Recur URL patches are the look *document* grain; Butterchurn `.milk` JSON is per-frame / per-pixel equations — **wrong grain** (`00` Pattern 1). Prism recipe JSON is the still-image cousin: appearance on **fixed** pixels. This document is appearance **policy** over a **live** interpretation stream (`00` §11.C).

**Hard limit (`00` D3):** looks read **mood / beat / energy only**. Energy on this machine is the StateManager axis **plus** peak-normalized band/flux scalars already published as `AudioFeatures`. It is **not** a spectrum array. Confidence **blends** beat-lock in (`final = unsynced + (beat − unsynced) * confidence`); it does not switch — camera punches excepted, already discrete (`ARCHITECTURE.md`).

### 2.2 Audio snapshot vs interpretation vs document

```text
powerSpectrum          → AudioEngine only (flux + four band sums). Never a uniform. Never JSON.
AudioFeatures          → latest energy tensor (log-compressed bands + flux + rms).
VJState                → what the music is doing this frame (rave, mood weights, beat×confidence).
Look document          → how the engine is allowed to listen and draw (look id, axes, sync policy).
Clip                   → what happened for N seconds (pixels + audio).
```

Reloading JSON restores *how* the engine listens and draws on a **new** track. It does not restore yesterday’s BPM, webcam frames, or smear buffer.

**POLICY:** if JSON contains FFT, you have abandoned interpretation-as-truth (`00` §11.C).

### 2.3 What “the canvas” is

**POLICY:** the canvas is **not** an organ. It is the **view** of `(look document, interpretation, audio snapshot)`. HUD / glass UI (`src/main.ts` `#ui`) is also a **view**, not an organ, and is **not** in the pixels.

Four sizes that must not be collapsed:

| Surface | What it is **here** |
|---------|---------------------|
| **CSS box** | How large `#webgl` *looks* (fullscreen `window.innerWidth` × `innerHeight`). |
| **Drawing buffer** | `canvas.width` × `canvas.height` after `renderer.setSize(w, h, false)` × pixel ratio. GL default framebuffer. Independent of CSS. |
| **Device pixels** | Capped: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` (`src/main.ts`). Prefer this cap; do not silently raise it for “sharper capture.” |
| **Capture resolution** | `HTMLCanvasElement.captureStream` video track = **drawing buffer**, not the CSS box, not Acid’s internal FBO. |

**EVIDENCE:** `gl.drawingBufferWidth/Height` is what actually allocated ([webgl2fundamentals resize](https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)). Acid ping-pong FBOs may be **half-res** on coarse pointer, then **blit** to the drawing buffer (`AcidFeedLayer`; `ARCHITECTURE.md`). Capture sees the blit.

Default WebGL clears after present (`preserveDrawingBuffer: false`). **Keep does not `toDataURL` after the fact.** Capture is a live `MediaStream` of the presented canvas ([MDN `captureStream`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)). That is a different path from Prism’s FBO `readPixels` → PNG.

Webcam pixels **are** in Live/Acid because they are on the canvas (`VideoTexture` → fullscreen quad). They are **not** in Cinematic.

---

## 3. Organ map

| Organ | Responsibility | Side-effect | Tier |
|-------|----------------|-------------|------|
| **audio engine** | Own `AudioContext` + source lifecycle (mic / `<audio>` / blob URL); Meyda `rms` + `powerSpectrum`; collapse to `AudioFeatures`; overwrite latest | Speakers on file path; tracks/blob teardown | A (ships) |
| **interpretation bus** | `StateManager` energy axis + `MoodAnalyzer` partition + `BeatSync` IOI/PLL/product confidence; merge to one `VJState` per frame | None until looks read it | A (ships) |
| **look registry** | Exactly three named looks: **cinematic** (3D + chroma post), **live** (frozen webcam quad), **acid** (ping-pong + warp-aligned feedback). Consume the bus; **never** sample `powerSpectrum` | GPU draw; webcam start/stop | A (ships; **no fourth**) |
| **look document** | Source of truth for look id + axes + sync policy; validate fail-closed | None until apply | A (**new wrap**) |
| **sliders** | Semantic knobs → **same** document fields as talk (today: mode + sync; this pass: axes) | Document mutation | A |
| **talk** | One-shot LLM router → validated **patch JSON** only; zero audio/pixels in the prompt | Network; never pixels | A **optional**, after JSON + capture do not lie |
| **capture / export** | `renderer.domElement.captureStream` + `AudioContext.createMediaStreamDestination` fan-out → `MediaRecorder`; serialize look JSON; duration cap; file stays on disk | Blob download; audio-graph tap | A (**new**) |
| **tests** | Pure-function BeatSync (vote / octave tiebreak / confidence product) + MoodAnalyzer (partition / no snap) | None | A (**new**) |
| **tap-tempo** (stub) | Optional nudge writing the **same** beat state; keep the blend equation | Beat state | **B** (`00` RQ4 / D8) |
| **MP4 mux** (stub) | WebCodecs / Mediabunny if WebM fails self-use | File bytes | **B** (`00` D5) |
| **multi-turn talk** (stub) | Document-diff conversation | Network | **B** (`00` RQ3) |

**Not organs:** HUD / glass overlay (`main.ts` DOM); `#status` readout; CSS. Webcam (`VideoCapture`) is **look-registry plumbing** for Live/Acid, not a Keep sidecar. `VoidLayer` / `voidFog` are **unwired** — not an organ; **CUT** from the map (§13).

Packs in the Prism sense do not exist. The three looks **are** the registry.

---

## 4. Control loop

Pull-model (`ARCHITECTURE.md`): Meyda overwrites latest; rAF reads. **No backpressure queue.** Analysis frames the renderer never sees are dropped for free.

```text
rAF (every frame):
  AudioEngine.getFeatures()                    // latest snapshot; may be stale
    → StateManager.update(features, dt)        // rave / cinematic / lightningFlash
    → MoodAnalyzer.update(...)                 // moodWeights, partition of unity
    → BeatSync.update(..., syncPolicy)         // bpm, phase, confidence, syncActive
    → VJState = merge                          // interpretation bus, this frame
    → look apply: document + VJState + features → uniforms
    → VJScene.update(); VJScene.render()       // drawing buffer → <canvas> (view)

serialize branch (on demand):
  look document → JSON download
  (do not serialize powerSpectrum, VJState, webcam, smear FBO, or HUD)

capture branch (on demand, start/stop):
  start: tap AudioContext → MediaStreamDestination
         canvas.captureStream(fps) video + dest.stream audio
         MediaRecorder(combined); honour duration cap
  stop:  recorder.stop(); destination.disconnect(); revoke tap
         Blob download (picture + soundtrack)
         (do not capture #ui; do not leave the tap connected)
```

**What is GPU every frame:** look draw (Cinematic composer **or** Live quad **or** Acid ping-pong + blit); uniform uploads from the bus.  
**What is CPU every frame:** interpretation ladder; peak trackers in layers.  
**What is CPU on demand:** schema validate, JSON serialize, MediaRecorder, LLM call.  
**What must not exist:** a FIFO of analysis frames; a second render tree for export; a timeline of automation.

`Loop` already sequences the ladder (`src/webgl/Loop.ts`). This pass **wraps** look-document apply in front of the existing `VJScene.update` — it does not replace rAF.

Talk failure → sliders still work (VISION; `00` RQ3 mitigation). Capture failure (silent blob, unsupported mime, tap still connected) → **Keep failed**; lab still runs.

---

## 5. Look / render model

**POLICY (`00` D2):** exactly three looks. No fourth. Live fragment is **frozen**. No new GLSL in this pass (no RQ demands it).

Looks consume the **interpretation bus**. They **MUST NOT** sample raw FFT / `powerSpectrum`. Band scalars already collapsed in `AudioEngine` (`bass` 20–140 Hz, `mid` 200–2000, `high` 4–12 kHz, `spectralFlux` as positive log flux) may drive **energy** uniforms after per-layer peak-normalize — that is the shipped energy tensor, not a bin array (`PROJECT.md` shader tables; `ARCHITECTURE.md` unique approach).

**RQ1 later** may rebind the **same** shaders to raw bins vs this bus. That is a harness, not a new look.

### 5.1 How each look reads the bus

| Look | Draw path | Bus consumption (EVIDENCE in `src`) | Document axes that apply |
|------|-----------|--------------------------------------|--------------------------|
| **cinematic** | 3D layers always update; `EffectComposer` + chromatic aberration present | `Director`: `state.rave` hysteresis 0.62 / 0.38; flux kick; downbeat vs flux **dolly** (the one discrete switch). `EnvironmentLayers`: bass + `thresholdedHigh`. `AnchorLayer`: bass/mid/high + `lightningFlash`. `PostProcessing`: peak-norm bass × rave. Lighting: `lightningFlash`. | `intensity`, `syncPolicy` |
| **live** | Fullscreen quad, `liveFeed.frag.glsl`, **direct to canvas**, no composer | Peak-norm bass/mid/high; `u_rave`; `lightningFlash`; flux-gated 3-frame glitch; beat-window + `blendSync` on bass pulse when `syncActive`. **Ignores mood for pixels** (status only). | `intensity`, `glitch`, `syncPolicy` |
| **acid** | Ping-pong FBO A/B; warp-aligned feedback (previous frame through **same** warped UV); 0.98 decay; 0.62 cap; blit to canvas | Mood **table blend** → `u_feedbackAmount` / kaleido / hue speed / glitch strength / melt; then bass/rave modulation; `u_beatPhase` + `u_beatSyncWeight = confidence` when sync active. Same Live energy uniforms plus Acid extras (`PROJECT.md`). | all v1 axes |

**Warp-aligned feedback (`ARCHITECTURE.md`):** mix previous frame at the **warped** UV, not the identity UV, so smear travels with the distortion. Runaway bounded by `u_feedbackDecay = 0.98` and mix cap **0.62**. Do not “fix” this with a new shader.

**Ordered concatenation:** Acid fragment = `acidFeedHeader + liveFeedCommon + acidFeedBody` so Live’s frozen file is never edited. **KEEP.**

**Mode routing (`VJScene`):** Live/Acid draw their quad and return early; Cinematic goes through the composer. 3D layers **update even when not drawn** (documented CPU tradeoff for instant switch). Webcam: enter Live/Acid starts `VideoCapture`; return to Cinematic stops tracks and clears FBOs; Live ↔ Acid keeps camera, clears smear only. Mode changes serialised through one in-flight promise.

**Mobile:** Acid FBO `fboScale = 0.5` on coarse pointer. Capture still records the **blit** (drawing buffer).

### 5.2 Confidence blend (law)

```text
syncWeight = beat.syncActive ? beat.confidence : 0
final      = unsynced + (beatValue - unsynced) * syncWeight
```

`syncActive = (syncPolicy === 'auto') && (confidence ≥ 0.45)` (`CONFIDENCE_THRESHOLD` in `BeatSync.ts`). The threshold gates **discrete** events (downbeat dolly, beat-window glitch). Continuous parameters still **blend** with the raw confidence when active — they do not pop (`00` Pattern 2; Dixon graceful degradation).

**Do not** replace this with a SOTA RNN unless RQ4/RQ5 is falsified *and* the replacement still blends (`00` D8).

### 5.3 What looks must not grow

- A `sampler` / uniform of `powerSpectrum` or FFT bins.
- A fourth `VisualMode`.
- Live-coded GLSL, Hydra-style sources, MilkDrop per-pixel equations.
- Reading the look document as shader source.

---

## 6. Closed registry (semantic axes)

**POLICY:** the document may name **only** these axes. They are **covers of existing uniforms/state**, not new knobs and not per-frame dumps. Default **1** = identity with shipped v1 (reload does not restyle the look). Apply clamps to `[0, 2]`. Unknown names → **reject**.

### 6.1 Look id (closed enum)

`lookId ∈ { cinematic, live, acid }` — already `VisualMode` in `Scene.ts`. No aliases (`"Acid"`, `"mode3"`).

### 6.2 Sync policy (closed enum)

`syncPolicy ∈ { auto, off }` — already `SyncMode` in `StateManager.ts`. **Not** in v1: `tap`, `link`, `manual-bpm`. Tap-tempo is a **B stub** writing beat state, not a third enum value yet (`00` D8).

### 6.3 Axes (v1 ship set — resolves `00` D4)

Derived from actual uniforms / mood-table constants in `AcidFeedLayer`, `LiveFeedLayer`, and `state.rave` consumers — **not** invented editorial names.

| Axis | Default | Maps onto (existing) | Looks |
|------|---------|----------------------|-------|
| `intensity` | `1` | Multiplier on how hard `state.rave` / `u_rave` drives the look (Live’s +25% rave ramp, Acid’s `rave * 0.02` feedback term, Director/Environment rave). `1` = current code. | all three |
| `feedback` | `1` | Multiplier on Acid `u_feedbackAmount` **before** the 0.62 cap (mood table 0.15 / 0.32 / 0.52 + bass/rave). | acid; **inert** elsewhere |
| `fold` | `1` | Multiplier on Acid kaleido **base** (mood table 1 / 3.5 / 6.5) before round/clamp to `[1, 8]`. | acid; inert elsewhere |
| `hue` | `1` | Multiplier on Acid hue cycle **speed** (mood table 0.02 / 0.12 / 0.35, then high boost). | acid; inert elsewhere |
| `glitch` | `1` | Multiplier on Acid `u_glitchStrength` (mood table 0.55 / 1 / 1) and Live glitch offset amplitude (`0.04` / `0.03`). | live + acid; inert on cinematic |
| `melt` | `1` | Multiplier on Acid `u_meltZoomScale` (mood table 1 / 1 / 1.22 + bass). | acid; inert elsewhere |

**Inert ≠ invalid:** a cinematic document may still **store** Acid axes so look-id switches round-trip. Apply **no-ops** them. Validator rejects only **unknown** keys / out-of-range / bad enums.

**Not axes (live bus — forbidden in JSON):** `rave`, `moodWeights`, `bpm`, `confidence`, `beatPhase`, `u_bass`, `u_time`, `lightningFlash`, `rms`, band arrays.

Slider UI may expose **fewer** semantic covers (e.g. one “acid” macro that writes `feedback`+`fold`+`hue`+`melt`). The **document** still stores the registry fields. That cover list is a module-card UI choice, not a second schema.

### 6.4 Forbidden in the document

| Forbidden | Why |
|-----------|-----|
| `powerSpectrum` / FFT / band arrays / rms series | Interpretation-as-truth (`00` D3, Pattern 5) |
| GLSL source, shader AST, `.milk` equations | Wrong grain; Live stays frozen (`00` D2, D11) |
| Video / audio blobs, data-URLs, webcam frames | Clip is the media; JSON is policy |
| Automation curves, beat-event timelines, markers | Time lives in the clip; this is not a DAW |
| Live uniform dumps (`u_time`, smear FBO) | Not reloadable policy |
| Unknown fields | Fail-closed; talk cannot invent knobs (`00` D7) |

---

## 7. Look JSON contract (shape, not TypeScript)

Source of truth. Talk + sliders emit **patches** against this. GPU never sees prose.

```text
LookDocument {
  schemaVersion: 1                 // integer; unknown → reject
  lookId: "cinematic" | "live" | "acid"
  syncPolicy: "auto" | "off"
  axes: {
    intensity: number              // 0..2, default 1
    feedback: number               // 0..2, default 1
    fold: number                   // 0..2, default 1
    hue: number                    // 0..2, default 1
    glitch: number                 // 0..2, default 1
    melt: number                   // 0..2, default 1
  }
}

Patch {
  lookId?: LookId
  syncPolicy?: SyncPolicy
  axes?: { [axisName]: number }    // absolute values, not deltas
}
```

**Validation (fail-closed):**

- Unknown `schemaVersion` / `lookId` / `syncPolicy` / axis key → **reject**; do not apply a partial look.
- Non-finite or out of `[0, 2]` → **reject**.
- Extra top-level keys → **reject**.
- Missing `axes` fields → fill **defaults (1)** so an identity document equals shipped v1.

**Round-trip:** `apply(parse(serialize(doc)))` yields the **same look** (same `lookId`, `syncPolicy`, axis values). `JSON.parse(JSON.stringify(doc))` equals `doc` (no `NaN`, no `undefined`). Human check: reload JSON mid-track → no jump except the documented field change.

**Patch transport:** absolute fields. The router (not the GPU) turns “more acid” into numbers against the **current** document, then the **same writer** sliders use applies the patch. Relative deltas never reach the validator.

**Cousins:** Recur URL = whole patch, no media (**right grain**). Prism recipe = still appearance (**router discipline**, different tensor). Butterchurn `.milk` JSON = equations (**wrong grain**). phase-viz JSON presets bind particle modes (**cousin export, not this ladder**).

**X:** base64 audio in the JSON; catalog-id share that is not the document (`?preset=acid` without axes).

---

## 8. GPU + audio data path

### 8.1 What already draws (KEEP — do not replace)

**EVIDENCE:** Three.js `WebGLRenderer` + per-look paths (`ARCHITECTURE.md` C3 `vj-scene`). This pass does **not** introduce raw-WebGL2-as-destiny or WebGPU. One engine.

| Piece | Role |
|-------|------|
| **Cinematic** | Perspective camera, fluid sphere, torus-knot points, lights, `EffectComposer` `RenderPass` + custom chroma `ShaderPass` (`u_bass`) |
| **Live** | Ortho fullscreen quad; `liveFeed.frag.glsl` (frozen); `VideoTexture` |
| **Acid** | Same video; ping-pong `WebGLRenderTarget` A/B; blit shader; warp-aligned mix |
| **Uniforms** | Interpretation + peak-norm energy; look-document axes as **multipliers** on existing computations |
| **Webcam** | `getUserMedia` → hidden `<video>` → `THREE.VideoTexture`, shared by Live + Acid (`VideoCapture.ts`) |

Upload vs bind vs draw is **already** the rAF loop. Look-document apply is a **CPU multiply** before the existing uniform writes — not a shader graph compile (unlike Prism/Shaddy op lists). Recompile is **out of scope**; looks are a closed three-program registry.

Preview / capture **parity:** same shaders, same document, same drawing buffer. Difference is whether a `MediaStream` is tapped. There is no export-sized FBO for Keep.

FPS of the **lab** stays display refresh. Beat sync **must not** throttle rAF to BPM (`PROJECT.md`). Capture frame-rate request is a separate number (§12 E4). Preview / capture FPS of this GPU: **not measured**.

### 8.2 Capture path (Tier A)

**EVIDENCE:** `00` Pattern 3; [MDN `captureStream`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream); [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API); [MDN `createMediaStreamDestination`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination).

```text
videoTrack  = renderer.domElement.captureStream(fps).getVideoTracks()[0]
dest        = audioContext.createMediaStreamDestination()
              sourceNode.connect(dest)          // fan-out; speakers already connected on file path
audioTrack  = dest.stream.getAudioTracks()[0]
combined    = new MediaStream([videoTrack, audioTrack])
mime        = first MediaRecorder.isTypeSupported(...)   // never assume
recorder    = new MediaRecorder(combined, { mimeType })
```

**Laws:**

1. **Silent clip = failed Keep.** No audio track, forgotten tap, or mic path that never connected a destination → do not present a “success” download.
2. **Disconnect on stop.** Second destination left connected is a phantom-mix footgun (`00` D9). `disconnect()` the tap; do not `close()` the shared `AudioContext` just because recording ended.
3. **HUD not in pixels.** Record `renderer.domElement`, not `element.captureStream` on a wrapper that composites DOM.
4. **Webcam is in the clip** for Live/Acid because it is on the canvas. Cinematic clips have no camera picture.
5. **Origin-clean canvas.** File + webcam + WebGL taint → `SecurityError`. Keep must fail closed with a readable error, not a silent empty Blob.
6. **Duration cap.** Uncapped session accidentally becomes a video product (`00` D5 — cap seconds still **OPEN**; engine assumes a cap exists).
7. **Mime fork.** Chromium historically `video/webm` (VP8/VP9 + Opus). Safari 14.1–18.3 MP4/H.264/AAC; Safari 18.4 added WebM (`00` Pattern 3). **Always `isTypeSupported`.** Numbers on *this* codebase: **not measured**.
8. **`AudioContext` suspended until gesture.** Recording cannot start from a cold context; lab play already resumes it (`AudioEngine`).
9. **Mic path.** Today mic is analyse-only (no `destination` connect). Capture must still tap the mic `MediaStreamAudioSourceNode` or Keep is silent. Operator-heard monitor is **not** required for v1.

File path already does `sourceNode.connect(audioContext.destination)` so the operator hears the track. Tap is an **additional** fan-out, not a reroute.

**Tier B:** Mediabunny / WebCodecs MP4 if WebM fails self-use. Not in this organ’s A path.

---

## 9. Sliders + talk (same writer)

Organs, not UI chrome. **One function** applies a validated `LookDocument` (or `Patch` merged then validated) onto `VJScene.setVisualMode`, `Loop.setSyncMode`, and axis multipliers. Today `selectMode` / `selectSync` in `main.ts` are two writers; this pass **unifies** them.

| Path | Writes | Must not |
|------|--------|----------|
| **Sliders** | `lookId`, `syncPolicy`, bounded axes | Invent axes; send bins; compile GLSL |
| **Talk** | Same fields via one-shot structured patch | Audio bytes, spectrum, canvas data-URLs, free GLSL, unknown keys |
| **Both** | After merge → **one** validator → document → apply | Diverge schemas |

**GPU every frame:** nothing extra for talk. LLM is CPU/network **once per turn**.  
**GPU every frame:** uniform updates from the bus × document multipliers (cheap).  
**CPU once:** validate on patch.

**Talk contract (`00` Pattern 4, D6, D7):**

- Prompt contains: user sentence + **current look document** (JSON). **Zero** audio, **zero** pixels.
- Response schema: `{ lookId?, syncPolicy?, axes? }` with closed enums / numeric ranges (structured outputs).
- Invalid / timeout / 4xx / unknown field → **no-op**; sliders remain.
- Optional in Tier A, and **only after** JSON round-trip + capture do not lie (`00` §8).
- Provider (Gemini vs OpenAI) remains **OPEN** (`00` D6). Copy Prism **discipline**, not the photo schema.

Offline → sliders still work.

---

## 10. Acceptance criteria (how we know the engine is real)

Falsifiable; no demo theater. Numbers from `00` §2 unless **not measured**.

1. **JSON round-trip:** serialize → reload → identical `schemaVersion`, `lookId`, `syncPolicy`, axes. 100% on the validator suite (`00` metric). Identity document (defaults) matches shipped v1 look (human; ΔE/SSIM **not measured**).
2. **Clip has picture + audio on Chromium:** start/stop → local file playable in the recording browser with a visible frame **and** a soundtrack. Silent WebM = fail. Safari mime: **not measured** (D5). Duration respects the cap (cap seconds **OPEN**, but *a* cap must fire).
3. **Looks still ignore raw bins:** no look uniform is `powerSpectrum` / FFT array. RQ1 harness may rebind; production path must not grow a bin sampler.
4. **Confidence still blends (not switches):** `final = unsynced + (beat − unsynced) * confidence` on Acid feedback / kaleido / hue / Live bass pulse. Toggle Sync Off (`S`) mid-track: motion continues minus quantization, **no jump** (`ARCHITECTURE.md` how to verify). Threshold-pop fixtures must fail the test suite if someone “simplifies” to `if (syncActive)`.
5. **BeatSync / Mood unit tests exist:** tempo vote 60–180, octave tiebreak, product confidence, mood `calm+groove+intense ≈ 1`. DSP helpers stay pure. MIREX F-measure **not measured**.
6. **Talk if present cannot emit unknown fields:** validator reject; GPU never compiles prose; prompt bytes of spectrum/canvas = **zero**.
7. **One engine:** Keep uses the lab canvas stream; no second renderer; `main` demo still runs.
8. **Won’t-chase still holds:** “write me a shader” / “dump MilkDrop” / “Ableton arrangement” have **no** organ (`00` D11).

---

## 11. Non-goals (engine-level)

From VISION + `00` §7, restated as **machine** refusals:

- Second renderer; deleting `src/`; rewriting BeatSync to madmom / AudioWorklet BPM as v1.
- Fourth look; MilkDrop / Butterchurn preset dump; Hydra / Shadertoy playground; new GLSL in this pass.
- DAW timeline, arrangement, Ableton marker export, Link / MIDI / OSC / NDI / Spout.
- Generative video, AI-written shaders, music generation.
- Genre ML / valence-arousal nets (mood stays an energy-shape heuristic).
- Prism stills (LUTs, masks, recipe layers, hero sites) and ADA agent features.
- Claiming SOTA beat F-measure, capture FPS, or talk accuracy without measuring.
- Shipping a Keep door that downloads silence.

---

## 12. Decision log

Inherit `00` D1–D12. Locked stays locked. OPEN stays OPEN unless this file had to name an organ.

### 12.1 Inherited from `00`

| # | Topic | Status in this file | Open? |
|---|-------|---------------------|-------|
| **D1** | Pass on v1; do not delete `src/`; `main` demo stays | **KEEP** — wrap, don’t rewrite | No |
| **D2** | Exactly three looks | **KEEP** — registry = cinematic / live / acid | No |
| **D3** | Interpretation-only; confidence blends | **KEEP** — §5–6; bins never leave `AudioEngine` | No |
| **D4** | Look JSON axis names | **Resolved here** as §6.3 | **Closed** |
| **D5** | Clip format / cap seconds / MP4 mux if WebM fails | Path named (§8.2); **cap seconds + mime choice** | **Yes** |
| **D6** | Talk provider | Organ named; optional A | **Yes** — Gemini vs OpenAI |
| **D7** | LLM router only | **KEEP** — §9 | No |
| **D8** | Keep BeatSync; test it; tap later | **KEEP** + tests organ; tap = B stub | **Yes** — tap as RQ4, not a rewrite |
| **D9** | Record tap = destination fan-out; disconnect on stop | Path named; impl card later | **Yes** — implementation card |
| **D10** | BeatSync + Mood unit tests | Tests organ named | **Yes** — fixture tracks |
| **D11** | Generative / VJ I/O out | **KEEP** | No |
| **D12** | Eval set ~8 tracks × 3 looks + ~30 talk prompts | Not an organ | **Yes** — rubric |

### 12.2 Engine decisions (new)

| # | Topic | Proposal | Evidence | Open? |
|---|-------|----------|----------|-------|
| **E1** | Renderer | Keep **Three.js WebGLRenderer** + existing three look paths. No second renderer, no WebGPU v1, no Hydra runtime | D1; `ARCHITECTURE.md` | No |
| **E2** | `schemaVersion` | Start at integer **`1`**. Unknown → reject (no silent look-drift) | `00` Pattern 1; Prism fail-closed | No |
| **E3** | v1 axes | Closed set §6.3: `intensity`, `feedback`, `fold`, `hue`, `glitch`, `melt`; default **1** = shipped v1 | Actual uniforms in `AcidFeedLayer` / `LiveFeedLayer` / `state.rave` | No |
| **E4** | Capture fps | `captureStream(30)` request; **rAF stays display refresh**. If 30 falsifies self-use vs lab, reopen — do not uncap duration instead | MDN `captureStream(frameRate)`; FPS **not measured** | Yes — only if 30 fails self-use |
| **E5** | Canvas / HUD | Views, not organs. Capture `renderer.domElement`. HUD out of pixels | `00` Pattern 3; `main.ts` DOM overlay | No |
| **E6** | Document grain | Policy over a live stream, not a timeline, not shader source | Recur vs Butterchurn (`00` C) | No |
| **E7** | Invalid patch | Reject loudly / fail-closed; no partial apply | D7; closed registry | No |
| **E8** | New GLSL | **None** this pass. RQ1 A/B rebinds existing shaders | `00` §8, §10 | No |
| **E9** | `VoidLayer` | **Not an organ.** Leave unwired; do not rewrite; do not ship as a fourth look | `ARCHITECTURE.md` dead code | No — CUT from map |
| **E10** | Talk sequencing | Optional A **after** JSON + capture do not lie | `00` §8 | No |
| **E11** | Audio tap | Fan-out `createMediaStreamDestination` on the existing source node; `disconnect` on stop; do not close the shared context | MDN destination; `00` D9 | Impl remains D9 |
| **E12** | Webcam vs Keep | Webcam is canvas content in Live/Acid, therefore in the clip; not a JSON sidecar | `VideoCapture` + feed layers | No |
| **E13** | Band scalars | `AudioFeatures` bands/flux are the **energy** bus after spectrum collapse. Looks may peak-normalize them. Looks may **not** receive the array | `AudioEngine.ts`; D3 | No |
| **E14** | Test runner | Unit tests as organ; runner/harness choice is a module card | D10; no runner in `package.json` today | Yes — with D10 fixtures |
| **E15** | Identity apply | Missing axes → `1`. Multipliers wrap existing mood-table / rave math; no shader edit required | §6.3; D1 wrap | No |

**Operator — remaining OPEN only:**

- [ ] **D5** duration cap (seconds) and mime (WebM vs MP4 path when `isTypeSupported` fails)
- [ ] **D6** talk provider
- [ ] **D8** tap-tempo (Tier B / RQ4) — not a BeatSync rewrite
- [ ] **D9** capture/audio-tap implementation card (connect/disconnect details)
- [ ] **D10** fixture tracks + **E14** test runner
- [ ] **D12** eval rubric
- [ ] **E4** capture fps only if 30 fails Chromium self-use

---

## 13. Existing `src` map LAST

Pointers into current files **after** organs are named — they do not get to invent a second body. Verdicts: **KEEP** (as-is), **WRAP** (new organ around it), **TEST** (don’t rewrite), **CUT** (not an organ), **DROP** (out of product).

| Current file | Organ | Verdict | Why |
|--------------|-------|---------|-----|
| `src/audio/AudioEngine.ts` | audio engine | **KEEP** + **WRAP** for tap | Spectrum collapse and pull-model stay. Expose `AudioContext` / source for `createMediaStreamDestination`. Do not publish `powerSpectrum`. |
| `src/webgl/StateManager.ts` | interpretation bus | **KEEP** | `VJState` / `BeatState` / `SyncMode` are the bus types. |
| `src/webgl/MoodAnalyzer.ts` | interpretation bus | **KEEP** + **TEST** | Partition of unity; exportable for fixtures. |
| `src/webgl/BeatSync.ts` | interpretation bus | **KEEP** + **TEST** | IOI vote, octave tiebreak, PLL, product confidence. **Do not rewrite.** May export vote/confidence helpers for tests without touching the live path. |
| `src/webgl/Loop.ts` | control loop (not a separate product organ) | **KEEP** + **WRAP** | Already features → ladder → scene. Look-document apply and `syncPolicy` from the document live here or immediately beside. |
| `src/webgl/Scene.ts` | look registry | **KEEP** + **WRAP** | `VisualMode` **is** `lookId`. Axis multipliers belong at uniform write sites, not a new scene graph. |
| `src/webgl/layers/LiveFeedLayer.ts` | look registry (live) | **KEEP** | Frozen look; wrap `glitch` / `intensity`; never edit `liveFeed.frag.glsl` in this pass. |
| `src/shaders/liveFeed.frag.glsl` | look registry (live) | **KEEP** frozen | `00` D2. |
| `src/webgl/layers/AcidFeedLayer.ts` | look registry (acid) | **KEEP** + **WRAP** | Mood table + blendSync stay; multiply by document axes before caps. Ping-pong / warp-align stay. |
| `src/shaders/acidFeedHeader.frag.glsl`, `acidFeedBody.frag.glsl`, `liveFeedCommon.glsl` | look registry (acid) | **KEEP** | Concatenation law. No new GLSL. |
| `src/webgl/layers/Director.ts`, `EnvironmentLayers.ts`, `AnchorLayer.ts`, `LightingLayer.ts`, `PostProcessing.ts` | look registry (cinematic) | **KEEP** + **WRAP** `intensity` | Still the Cinematic look. Do not split a second composer for capture. |
| `src/camera/VideoCapture.ts` | look-registry plumbing | **KEEP** | Webcam for Live/Acid; not a Keep sidecar. |
| `src/main.ts` | sliders (mode/sync) + HUD **view** | **WRAP** | Unify mode/sync (and new axes) through one document writer. HUD stays DOM. |
| `src/styles.css` | view | **KEEP** | Not an organ. |
| `src/webgl/layers/VoidLayer.ts`, `src/shaders/voidFog.*.glsl` | — | **CUT** from organ map | Unwired dead path (`ARCHITECTURE.md`). Do not wire as a fourth look. File may remain; it is not part of the machine. |
| *(none)* | look document, capture/export, talk, tests | **new organs** | Schema + validator; MediaRecorder mix; optional router; unit tests. No new shaders. |

**Do not rewrite:** `BeatSync` (D8), frozen Live fragment, Acid warp-aligned feedback, pull-model latest-features, Three.js as the drawer.

---

## 14. References

Long list: [`00_FIELD_RESEARCH.md`](00_FIELD_RESEARCH.md) §12. Do not duplicate it.

**In-repo:** [`VISION.md`](VISION.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) (ladder, pull-model, warp-aligned Acid, confidence blend) · [`PROJECT.md`](PROJECT.md) (per-uniform tables, mood matrix) · [`docs/c4/`](./c4/README.md)

**Capture / audio (primary APIs):** [MDN `HTMLCanvasElement.captureStream`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) · [MDN MediaStream Recording](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) · [MDN `AudioContext.createMediaStreamDestination`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination) · [MDN `MediaRecorder.isTypeSupported`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) · [WebKit MediaRecorder](https://webkit.org/blog/11353/mediarecorder-api/)

**Cousins (grain):** Recur URL patches · Prism `01_ENGINE` / M03 talk router *(discipline, stills domain)* · Butterchurn `.milk` *(wrong grain)*

---

## Executive summary

- **Organs:** audio engine, interpretation bus, three-look registry, look document, sliders, optional talk router, capture/export, tests. Stubs only: tap-tempo, MP4 mux, multi-turn talk. HUD is a view. `VoidLayer` is not an organ.
- **One-engine law:** lab canvas and Keep clip are the **same** draw; JSON is policy over the live bus, not a second product. Talk and sliders share one writer. No second renderer. `main` demo stays.
- **Tier A machine:** existing Cinematic / Live / Acid follow interpretation → look JSON round-trip (`schemaVersion: 1`, closed axes, `syncPolicy auto|off`) → short local canvas+audio clip (feature-detected mime, tap disconnect, duration cap) → optional one-shot talk after that does not lie → BeatSync/Mood tests. **No new shaders.**
- **Biggest engine risk:** Keep ships a **silent** clip; looks **grow an FFT sampler**; talk becomes a **shader author**. Secondary: “fixing” BeatSync with Link/MIDI instead of testing the blend (RQ4/RQ5).

---

Operator next: skim §3–5–7–10, carry only the genuinely unresolved OPEN items (D5/D6/D8/D9/D10/D12, E4/E14) into `02_CONSTITUTION`. Module cards for look-schema / capture / talk / tests should file against **named** organs above — not against a new renderer.
