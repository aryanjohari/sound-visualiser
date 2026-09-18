# Sound Visualiser — Constitution (`02_CONSTITUTION`)

**Status:** governing doctrine (look-instrument pass)  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Live demo (untouched):** https://music.arkhives.nz on `main` — never force-rewrite.  
**Depends on:** `VISION.md`, `00_FIELD_RESEARCH.md`, `01_ENGINE.md`  
**Feeds:** module cards, implementation plans, code review criteria

---

## 0. Purpose of this document

This document defines the law the Sound Visualiser must obey between engine design and implementation.

`01_ENGINE.md` names the organs. This constitution defines the rules those organs must live under. It exists to preserve identity, prevent scope drift, and give future work a principled way to say "no."

This is not a product pitch, not an organ anatomy doc, not a module card set, and not permission to reopen settled decisions unless a section here marks them as genuinely open.

Wrap the shipped engine. Do not rewrite it. Do not delete `src/`. Do not invent a second product under a new name.

---

## 1. Identity

The Sound Visualiser is a **time-domain look instrument** with a small lab interface.

Its job is simple:

1. An operator plays a track (file, mic, or demo).
2. A live look follows the interpretation (energy, mood, beat-with-confidence).
3. Sliders and optional talk both modify the same look document.
4. The operator may keep a short local clip (picture + soundtrack) and a serializable look JSON.
5. Reloading that JSON restores *how* the engine listens and draws on a new track. It does not replay yesterday's music.

This is for **parametric looks over live interpretation**. It is not for open-ended pixel invention, audio invention, or shader authorship.

Two doors, one engine: **lab | keep**.

- **Lab** is the full-screen live tab. Looks and talk change the look document, not raw FFT wiring.
- **Keep** is reuse of the same draw: a local clip of the canvas stream plus the look document. It is not a video product and not a site builder.

There is no third door. Prism's hero/embed path is a stills sibling pattern. Do not copy it.

This machine occupies the **time-domain / musical-look** lane. It is a sibling to other systems, not a merger of them.

- **ADA** is the daily embodied agent.
- **Prism** is still-image parametric styling.
- **This** is a sometimes-used look instrument.

The Sound Visualiser is not:

- a VJam clone
- a Hydra / Shadertoy playground
- a Resolume / TouchDesigner show-control rig
- a DAW, timeline, or Ableton arrangement exporter
- an AI video app (Runway, Luma, Glitchframe)
- a music generator (Suno, Udio)
- a particle / waveform toy with an export button
- Prism-on-a-spectrogram
- ADA-with-shaders

Frequency: sometimes. Self-use is the gate. GitHub alone is not the reason to build.

---

## 2. Constitutional truths

The following rules are foundational. Future modules, code, prompts, and reviews MUST preserve them.

1. **One engine.**  
   Lab preview and Keep clip are two uses of the same Three.js draw, not two separate systems. The clip is a tap of the lab canvas stream. There is no second renderer, no export-sized FBO, and no rewrite of `src/`.

2. **Look document is the source of truth.**  
   UI state, slider state, talk state, and keep-JSON state MUST converge on the look document. Pixels and audio are outputs. Interpretation is a live bus. Neither is the document.

3. **Parametric looks over live interpretation.**  
   Looks read mood, beat, and energy only. Confidence blends beat-lock in; it does not switch. `powerSpectrum` NEVER becomes a uniform, NEVER leaves the audio engine, and NEVER appears in JSON.

4. **GPU draws; AI routes.**  
   The look registry performs the look. AI may classify intent and emit a validated patch on closed fields. It does not author pixels, audio, or GLSL.

5. **Fail closed over silent drift.**  
   Invalid patches, unknown ops, unknown `schemaVersion`, unknown look ids, unknown axes, schema mismatches, silent clips, and tainted-canvas capture MUST be rejected loudly, not coerced quietly.

6. **Lab first; Keep is reuse of the same draw.**  
   The lab is the primary proving ground. Keep is a reuse path of the same look document and the same renderer, not a second product lane.

7. **Three looks are the vocabulary.**  
   Cinematic, Live, and Acid are the closed registry. They are named craft, not a preset ocean and not a live-coding language. Default axis value `1` is identity with shipped v1. A fourth look is not a feature; it is a different product.

8. **Tier A is the protection zone.**  
   The first keepable loop must remain small, coherent, and truthful. Later ambition MUST NOT consume Tier A before Tier A proves itself. Talk MAY NOT consume Tier A before JSON and capture do not lie.

9. **Constraint is the product.**  
   Refusing off-lane requests is not failure; it is constitutional compliance. Three looks, a closed axis set, a duration-capped local clip, and a router that can say no are the instrument.

10. **Don't ship something the operator wouldn't open.**  
    Self-use is the acceptance floor. A silent clip, a twitchy FFT wiring, a talk box that writes shaders, or a cockpit nobody would launch tonight is not a ship.

---

## 3. Hard boundaries

The Sound Visualiser MUST NOT become any of the following:

- **No fourth look.** No MilkDrop / Butterchurn preset dump, no Hydra-style live-coded source, no Shadertoy playground, no new GLSL in this pass. The Live fragment is frozen.
- **No second renderer.** Keep MUST ride the same Three.js `WebGLRenderer` and the same drawing buffer as the lab. No WebGPU v1, no Hydra runtime, no ffmpeg server, no export composer.
- **No FFT leak.** No `powerSpectrum`, bin array, or raw analyser dump as a uniform, a JSON field, or an LLM prompt payload.
- **No generative media.** No Runway / Luma music-video lane, no AI-written shaders, no Suno / Udio track authorship, no "make a video of this song."
- **No VJ I/O.** No MIDI, OSC, Ableton Link, NDI, Spout, or DMX. No Resolume decks, mapping, or projection cockpit.
- **No DAW timeline.** Short local recording is in-lane. Arrangement, markers-to-Ableton, clip trimming suites, and stem export are not.
- **No BeatSync rewrite to "SOTA."** Keep the shipped IOI vote, PLL, and product-confidence blend. Do not replace it with madmom, an AudioWorklet BPM lib, or Link just because mixed material is hard.
- **No VoidLayer as a look.** `VoidLayer` / `voidFog` are unwired dead path. They are not an organ and not a fourth mode. Do not wire them to graduate a leftover shader.
- **No Prism stills / ADA agent features.** No LUTs, masks, recipe layers, hero sites, camera-as-body, or planning stack.
- **No "AI made the art" fiction.** Routing a look patch is not pixel synthesis, not music generation, and not shader authorship.

When a proposal fits one of these categories, the default answer is **no** unless the constitution itself is changed under high scrutiny.

---

## 4. Positive obligations

The Sound Visualiser is constrained, but it still has active duties.

1. **The look must feel musical.**  
   Energy SHOULD breathe. Beat SHOULD lock when confidence is earned and fade when it is not. The system MUST NOT twitch with raw bins. Rest is part of the music.

2. **A Keep clip MUST have picture and soundtrack.**  
   Silent clip = failed Keep. A download that looks like success and plays like mute is a constitutional failure, not a mime footnote.

3. **Look JSON MUST round-trip.**  
   Serialize → reload → identical `schemaVersion`, `lookId`, `syncPolicy`, and axes. Identity defaults (`1`) MUST match shipped v1. Reloading JSON MUST NOT dump live bus state (BPM, mood weights, smear, webcam).

4. **Sliders and talk MUST operate on the same schema.**  
   Natural language is not a parallel editing universe. One writer applies a validated document. If talk cannot express a change sliders can, or sliders cannot express a change talk can, the control model is broken.

5. **BeatSync and Mood MUST stay testable as pure functions.**  
   Tempo vote, octave tiebreak, confidence product, and mood partition of unity are law that tests can catch. A later change MUST NOT silently reintroduce threshold-pop.

6. **The product MUST refuse off-lane requests honestly.**  
   If an operator asks for a new shader, a generated music video, a generated track, a MilkDrop dump, or an Ableton arrangement, the system SHOULD refuse or redirect, not fake compliance with low-truth approximations.

7. **HUD is a view, not in the clip.**  
   Capture records `renderer.domElement`. Glass UI, status readout, and CSS overlays MUST NOT be composited into Keep pixels.

8. **The engine must stay small enough to understand.**  
   Complexity must earn its place through coverage, not intrigue. New axes, new looks, and new I/O MUST justify themselves against the closed registry and the keepable loop.

9. **Preview / capture parity is a discipline, not a marketing sentence.**  
   Same shaders, same document, same drawing buffer. The only honest difference is whether a `MediaStream` is tapped. If parity is unproven, it remains unproven.

---

## 5. Tier law

### 5.1 Tier A is protected

Tier A is the smallest keepable loop and the constitutional baseline for this pass.

Tier A MUST include:

- play of a track on the existing engine (file / mic / demo)
- live GPU look from the **existing** three looks: cinematic, live, acid
- interpretation bus as the only look driver (mood / beat / energy; confidence blends)
- a small closed look-document schema (`schemaVersion: 1`, closed look ids, closed sync policy, closed axes)
- semantic sliders writing that document
- look JSON export / reload that round-trips
- short local clip of canvas + audio (feature-detected MediaRecorder; duration cap exists)
- BeatSync / MoodAnalyzer unit tests
- wrap of current `src/`; `main` demo still runs

Tier A MUST NOT include:

- a fourth look, a MilkDrop dump, or new GLSL
- live-coded shaders or a GLSL playground
- a second renderer or export-sized FBO
- MIDI / OSC / Link / NDI / DAW timeline
- generative video, AI shaders, or music generation
- rewriting BeatSync to another tracker
- wiring `VoidLayer` as a look
- WebCodecs / MP4 mux as a requirement if MediaRecorder already keeps a clip
- tap-tempo as a requirement
- multi-turn talk as a requirement
- talk as a requirement before JSON and capture are truthful

**Talk sequencing (locked):** talk is **optional** in Tier A, and **only after** look JSON and capture do not lie. Talk MAY NOT consume the pass, the prompt budget, or the control model before the Keep door is honest.

Tier A runtime law from `01_ENGINE.md` remains locked:

- one Three.js renderer; Keep = same canvas stream
- Live fragment frozen; no new GLSL this pass
- axes are multipliers on existing math; default `1` = shipped v1
- `powerSpectrum` never a uniform or JSON
- capture is tap + disconnect; HUD out of pixels
- invalid document / patch rejects wholly (no partial apply)

### 5.2 Later tiers are allowed, not owed

Tier B may add mime/feature-detected MP4 mux if WebM fails self-use, optional tap-tempo writing the same beat state, multi-turn talk with document diff, and a capture FPS budget — only if Tier A document truth and clip honesty remain intact.

Tier C is research territory. It may study a madmom/RNN compare arm, AudioWorklet extractors, or a documented BeatSync-vs-Ellis note, but it does not retroactively define what this instrument "really was."

The burden of proof rises by tier. Later-tier possibility MUST NOT be used to smuggle complexity into Tier A. A fourth look, Link, or a shader playground does not become owed because a later RQ exists on paper.

---

## 6. AI law

AI in the Sound Visualiser is constitutionally subordinate to the look document, the interpretation bus, and the look registry.

The LLM MAY:

- classify intent
- choose a look id from the closed enum
- emit bounded axis values and `syncPolicy` on the closed schema
- emit validated patch JSON
- use the current look document as context to refine an existing look

The LLM MUST NOT:

- author pixels
- author audio
- emit free-form GLSL or shader source
- invent unknown axes, looks, or ops
- receive audio bytes, spectrum, canvas data-URLs, or webcam frames
- become a second source of truth
- bypass validation
- hide uncertainty behind plausible prose

AI outputs MUST be:

- human-visible
- schema-bounded
- version-aware
- rejectable

If AI fails (timeout, 4xx, invalid JSON, unknown field), the instrument MUST degrade to sliders and manual control, not collapse the look model.

Prompt law: **zero audio, zero pixels.** The prompt contains the user sentence and the current look document. Nothing else.

AI is a **router**, never the renderer, never the look-document authority, never the beat tracker, and never the product identity.

---

## 7. Engine law

This section is the constitutional reading of `01_ENGINE.md`. It governs interpretation without duplicating internals and without inventing organs.

1. **Wrap v1; do not rewrite.**  
   `src/` stays. The live demo on `main` stays. This pass adds look-document apply, capture, tests, and optional talk around named organs. It does not replace the machine.

2. **Pull-model is law.**  
   Latest audio snapshot is overwritten on the Web Audio clock. rAF reads. There is no backpressure queue of analysis frames. Frames the renderer never sees are dropped for free.

3. **Interpretation is the only look driver.**  
   Looks consume the interpretation bus. Band scalars already collapsed in the audio engine may drive energy after peak-normalize. Looks MUST NOT sample `powerSpectrum` or FFT bins. Energy is not a spectrum array.

4. **Confidence blends; it does not switch.**  
   `final = unsynced + (beat − unsynced) * confidence` (with `syncWeight` zeroed when sync is off). Discrete camera punches already exist and stay discrete. Continuous parameters MUST NOT pop because someone "simplified" to a boolean.

5. **Axes are multipliers on existing math.**  
   Closed set: `intensity`, `feedback`, `fold`, `hue`, `glitch`, `melt`. Range `[0, 2]`. Default `1` = shipped v1. Unknown names reject. Inert axes on a look may still be stored so look-id switches round-trip; apply no-ops them. Axes are not new knobs and not per-frame uniform dumps.

6. **`schemaVersion` 1 is fail-closed.**  
   Unknown version, unknown look id, unknown sync policy, extra top-level keys, or non-finite / out-of-range axes → reject the whole document. Missing axes fill defaults (`1`). Partial apply is forbidden.

7. **The document is policy over a live stream.**  
   It is not a timeline of beats, not shader source, not a dump of live uniforms, and not a media container. Time lives in the clip. Reloading JSON does not restore BPM, webcam frames, or smear.

8. **Capture is tap + disconnect.**  
   Video from `renderer.domElement.captureStream`; audio from an `AudioContext` destination fan-out on the existing source; combined `MediaRecorder`; duration cap honoured. On stop, disconnect the tap. Do not close the shared `AudioContext` because recording ended. A second destination left connected is a phantom-mix failure.

9. **Canvas and HUD are views, not organs.**  
   The canvas is the view of `(look document, interpretation, audio snapshot)`. HUD / glass UI is a DOM view. Neither is an organ. Keep MUST NOT capture the HUD. Webcam pixels are in Live/Acid clips because they are on the canvas, not because Keep grew a camera sidecar.

10. **No new shaders this pass.**  
    Live fragment frozen. Acid warp-aligned feedback and ordered concatenation stay. RQ1, if ever run, rebinds existing shaders; it does not author a fourth look.

11. **Three.js remains the one renderer.**  
    Existing cinematic / live / acid paths stay. Keep is the same canvas stream. Pixel-ratio cap stays; do not silently raise it for "sharper capture."

These organs exist. This constitution does not add to the map: audio engine, interpretation bus, look registry, look document, sliders, talk, capture / export, tests. Stubs only, later tier: tap-tempo, MP4 mux, multi-turn talk. HUD is a view. `VoidLayer` is not an organ.

---

## 8. Admission test for new features or modules

A proposed addition is valid only if it can survive all of the following questions.

1. **Does it preserve document truth?**  
   If the feature cannot be faithfully represented, serialized, and replayed through the look document (or is honestly *not* document state — e.g. a live bus value or a clip), it does not belong as a look-JSON field.

2. **Does it stay interpretation-only?**  
   If it needs raw FFT uniforms, invented pixels, invented audio, or generative motion, it is outside this instrument.

3. **Does it fit one engine?**  
   If it demands a second renderer, a second export truth, a deleted `src/`, or a special-case Keep path, it fails.

4. **Does it belong in Tier A, or is it later-tier work?**  
   If it enlarges Tier A without protecting the smallest keepable loop, it should be deferred. Talk in particular may not jump the queue ahead of truthful JSON and capture.

5. **Does it respect the closed registry?**  
   If it requires a fourth look, a new axis name, free GLSL, or vague "AI style magic" rather than named looks and bounded parameters, it fails.

6. **Does it increase expressive coverage honestly?**  
   New axes or looks should earn their keep by covering real operator needs that existing looks and multipliers cannot represent cleanly. Coverage is not "we could also dump MilkDrop."

7. **Does it keep sliders and talk aligned?**  
   If only one control path can use it, scrutiny increases immediately. Talk MUST NOT grow a private schema.

8. **Does it create a hidden second product?**  
   If the module quietly introduces a VJ cockpit, a DAW timeline, a particle toy, a Hydra playground, an AI video app, Prism-on-a-spectrogram, or ADA-with-shaders, it fails even if technically elegant.

9. **Can the instrument still refuse misuse clearly after this addition?**  
   If the feature blurs refusal boundaries and makes off-mission requests harder to reject ("just write the shader," "just add MIDI," "just one more look"), it is probably a bad fit.

Passing one or two questions is not enough. Constitutional admission requires a coherent yes across the set.

Module cards for look-schema, capture, tests, and optional talk MUST be judged against this test. They MAY wrap named organs. They MUST NOT invent organs or a second product.

---

## 9. Refusal test

Kill a feature quickly if any of the following is true:

- it requires invented pixels, invented audio, or invented shaders
- it requires a second renderer or a rewrite / deletion of `src/`
- it leaks `powerSpectrum` / FFT into uniforms, JSON, or the LLM prompt
- it introduces a timeline, arrangement, or DAW export
- it adds a fourth look, wires `VoidLayer`, or unfreezes the Live fragment
- it rewrites BeatSync to "SOTA" instead of testing the blend
- it ships Keep as a silent clip, or treats silence as success
- it makes AI the author rather than a router
- it expands Tier A before JSON + capture are proven truthful
- it captures the HUD, or raises pixel ratio solely to flatter the recording
- it exists mainly to rebuild VJam, Hydra, Resolume, Runway, or a particle toy

If a proposal fails this checklist, the Sound Visualiser should refuse it without apology.

---

## 10. Decision rights

Not all changes require the same scrutiny.

### Low scrutiny

- slider labels and default exposed covers over the closed axis set
- prompt wording that does not alter document meaning
- UI naming that does not alter look-id / axis / sync semantics
- non-semantic implementation cleanup inside a named organ
- validator messages and fail-closed copy

### Medium scrutiny

- validator rule refinements that preserve fail-closed behaviour
- slider cover groupings (macros that still write registry fields)
- capture mime feature-detection order that still requires picture + audio
- test fixtures and runner choice (OPEN: D10 / E14)
- talk provider choice (OPEN: D6) while remaining router-only
- duration-cap value (OPEN: D5) while a cap still exists

### High scrutiny

- second renderer of any kind
- a new look, new GLSL, or unfreezing the Live fragment
- generative pixels, audio, or shaders of any kind
- MIDI / OSC / Link / NDI / DAW / timeline
- weakening the look document (unknown fields, partial apply, FFT in JSON)
- capturing HUD or compositing DOM into Keep
- publishing `powerSpectrum` as a uniform, JSON field, or prompt payload
- rewriting BeatSync
- wiring `VoidLayer` as a look
- AI authority increases
- any reopening of interpretation-only, one-engine, or three-look law
- expanding Tier A before JSON and capture do not lie

The higher the scrutiny, the stronger the burden to show constitutional fit rather than local convenience.

---

## 11. Failure modes to guard against

This pass is especially vulnerable to the following forms of drift:

1. **Rebuilding VJam under new names.**  
   Preset oceans, decks, MIDI, mapping, and "just one more look" can re-enter disguised as craft. Three looks are the vocabulary. A playground is a different product.

2. **Becoming an AI gimmick.**  
   If the language layer becomes the product story, the instrument loses its identity as a GPU look driven by interpretation. Talk is optional. Sliders must still work.

3. **Turning look JSON into vague UI state.**  
   Hidden derived fields, untracked view state, live-bus dumps, or export-only adjustments erode replayability. The document is policy, not a screenshot of this frame.

4. **Adding looks faster than they earn keep.**  
   Registry sprawl creates a fake sense of power while weakening the document, validation, and learnability. A leftover `VoidLayer` is not a candidate; it is a trap.

5. **Pretending clip / lab parity without proof.**  
   Similar-looking output is not constitutional truth if Keep is a different renderer, a different resolution policy, or a silent file. A mute WebM shipped as success is the tell.

6. **Letting later-tier dreams govern the current wrap.**  
   Designing everything for WebCodecs, tap-tempo, multi-turn agents, or a future fourth look can bury the living Keep door before it exists.

7. **Using "research" to launder scope.**  
   Comparative experiments and honest limits are acceptable. Sneaking FFT uniforms, Link, or AI shaders into the mainline because a paper exists is not.

8. **Shipping silent clips as success.**  
   Forgotten audio tap, mic-analyse-only path never connected, unsupported mime coerced, tap left connected, tainted canvas swallowed. Keep failed. Lab may still run. Do not celebrate the Blob.

---

## 12. Open constitutional questions

Only a few constitutional questions remain genuinely open at this stage. Locked identity is not among them.

1. **What duration cap and mime path make Keep honest without becoming a video product?**  
   `01_ENGINE.md` requires a cap and feature-detected MediaRecorder (WebM *or* MP4). Exact seconds and the fallback when `isTypeSupported` fails remain open (`00` / `01` D5). Uncapped recording is not an allowed answer.

2. **Which talk provider preserves router discipline?**  
   Gemini vs OpenAI is open (`00` / `01` D6). The constitution requires structured, fail-closed, zero-audio / zero-pixel prompts either way. Provider choice MUST NOT reopen AI-as-author.

3. **Does tap-tempo earn Tier B, or does it hide a broken estimator?**  
   Tap is a later-tier stub writing the same beat state (`00` RQ4 / D8). It is not a third `syncPolicy` yet and not a BeatSync rewrite. Graduation depends on evidence, not appetite.

4. **How exactly should the audio-tap graph connect and disconnect?**  
   Fan-out + disconnect-on-stop is law (`00` / `01` D9, E11). The implementation card is still owed. The constitution does not pre-approve a second `AudioContext` or a tap left connected.

5. **Which test runner and which fixture tracks lock BeatSync / Mood without claiming MIREX?**  
   Tests are a Tier A organ (`00` / `01` D10, E14). Runner and fixtures are open. SOTA F-measure is not a target and not an excuse to skip tests.

6. **What eval rubric makes "felt musical" falsifiable?**  
   Curated ~8 tracks × 3 looks and ~30 talk prompts are proposed (`00` / `01` D12). The rubric is open. Shipping vibes in place of a rubric is not.

7. **Does `captureStream(30)` survive Chromium self-use?**  
   rAF stays display refresh (`01` E4). Reopen capture fps only if 30 fails self-use. Do not uncap duration, raise pixel ratio, or fork a second renderer instead.

These are real open questions because they affect implementation policy without changing identity. They do not reopen the hard boundary against a fourth look, a second renderer, FFT-as-truth, generative media, VJ I/O, or AI authorship.

---

## 13. Appendix: short doctrine summary

The Sound Visualiser is a constrained time-domain look instrument.

Play a track. A live look follows interpretation. Optional talk nudges the same document sliders write. Keep a short local clip (picture + audio) and look JSON. Two doors, one engine: lab | keep. The look document is law. The GPU draws. Interpretation is truth. AI may route intent to bounded patches, but AI is never the pixel author, never the audio author, never the shader author, and never the source of truth.

There is one engine, not two. Lab and Keep are reuse paths of the same Three.js draw. Wrap `src/`; do not delete it; `main` still runs at https://music.arkhives.nz. Tier A is protected: three looks (cinematic, live, acid), closed axes (`intensity`, `feedback`, `fold`, `hue`, `glitch`, `melt`; default 1), JSON round-trip, short local canvas+audio clip, BeatSync/Mood tests, optional talk only after JSON and capture do not lie. No fourth look, no new GLSL, no FFT in JSON or uniforms, no VJam, no Hydra, no Resolume, no DAW, no Runway, no Suno, no particle toy, no silent Keep.

When in doubt, ask:

1. Does it preserve look-document truth?
2. Does it stay interpretation-only?
3. Does it fit one engine?
4. Does it protect Tier A?
5. Does it avoid creating a second hidden product?

If not, the Sound Visualiser should refuse it.

---

Operator next: review the constitutional truths, hard boundaries, tier law, and admission test before module cards or implementation. Module cards for look-schema, capture, tests, and optional talk must be admissible under this file alone — wrapping named organs from `01_ENGINE.md`, inventing none.
