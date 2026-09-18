# Sound Visualiser — Field Research & Design Notes

**Status:** living research notes (look-instrument pass)  
**Date:** 2026-09-16  
**Branch:** `look-instrument/v1`  
**Live demo (untouched):** https://music.arkhives.nz on `main` — never force-rewrite.  
**North star:** Play a track → live look follows interpretation (energy, mood, beat) → optional talk nudges the look → export a short local clip + serializable look JSON.  
**Feeds:** `VISION.md`, `ARCHITECTURE.md`, future `01_ENGINE.md`, future `02_CONSTITUTION.md`

### Project intent (lab framing)

Portfolio + sometimes-used tool in the **time-domain / musical-look** lane (sibling to Prism’s still-image GPU recipes and ADA’s embodied agent stack). This is a **product pass on an existing v1**, not a blank-slate renderer. The interpretation ladder already ships; the job under study is **keeping a musical look**, not “build a visualiser.” Success is measured by falsifiable RQs and a shippable Tier A loop—not a VJam clone, a particle toy, or an AI video app.

### Lens legend

| Lens | Meaning |
|------|---------|
| **HYPE** | Market narrative / demo magic—useful taste signal, not engineering truth |
| **EVIDENCE** | Papers, benchmarks, widely shipped product patterns |
| **FEASIBLE** | Realistic for solo browser: existing Three.js/WebGL2 + Web Audio + MediaRecorder; optional one server LLM call; no DAW, no MIDI/OSC/Link/NDI stack, no render farm |
| **POLICY** | Locked intent for this pass (proposals until the decision log) |

---

## 0. Problem statement (engine exists)

**User job under study:** An operator plays a track (file, mic, or demo) and wants a **named look** that **follows the music**—energy that breathes, mood that drifts, beat that locks when it should and fades when it shouldn’t—then optionally **nudge** that look in language, then **keep** a short local clip plus a **reloadable look document**. Frequency: sometimes. ADA is daily; Prism is stills.

**Core hypothesis (to test, not assume):** A **closed look document** (three named looks + semantic axes) driven only by a **three-stage interpretation ladder**, plus a **minimal LLM router** onto that document, plus **short canvas+audio capture**, can satisfy “I want to keep this musical look” better than (a) wiring FFT bins to shaders, (b) browsing a MilkDrop preset dump, or (c) generating a music video. The engine is already the evidence that interpretation-as-truth *can* feel musical; this pass asks whether that loop is **keepable**.

**Explicit boundary:** We study **parametric looks over live interpretation**, not open-ended pixel/audio synthesis and not a VJ rig. Generative video, AI shaders, AI music, DAWs, Resolume-class I/O, and Hydra-class live-coding are mapped as **competitors** and **won’t-chase** unless a later tier’s RQ (none in A/B) justifies a narrow exception.

**What already ships on `main` (do not delete `src/`):** mic / file / demo; Cinematic / Live / Acid; mood as a partition of unity; beat-with-confidence blend; peak-relative self-calibration; warp-aligned Acid feedback. **What does not ship:** look JSON, clip export, talk, tests. `ARCHITECTURE.md` currently lists recording as a non-goal; this pass **revises that for short local capture only**—it does not reopen a video product.

---

## 1. Field map (taxonomy)

| Domain | Representative work | What they optimize for | Relevance here |
|--------|---------------------|------------------------|----------------|
| **A. Musical interpretation / beat tracking** | Ellis DP beat tracking ([DOI 10.1080/09298210701653344](https://doi.org/10.1080/09298210701653344)); Dixon BeatRoot ([DOI 10.1080/09298210701653310](https://doi.org/10.1080/09298210701653310)); spectral flux (Masri 1996; Dixon DAFx-06); Böck SuperFlux / madmom ([DOI 10.1145/2964284.2973795](https://doi.org/10.1145/2964284.2973795)); Meyda WAC 2015 ([DOI 10.5281/zenodo.34093](https://doi.org/10.5281/zenodo.34093)); realtime-bpm-analyzer; this repo’s `BeatSync` | Onset → tempo → phase; octave-error; online vs offline | **Primary engine lane** — interpretation is truth; bins are not |
| **B. Real-time GPU VJ / feedback looks** | Hydra; Recur (dirgemedia); Butterchurn/MilkDrop; Acid ping-pong FBO + warp-aligned UV (`ARCHITECTURE.md`) | Temporal continuity, feedback smear, live camera | **Primary look lane** — three named looks, not a playground |
| **C. Look packs / recipe JSON in time** | Recur URL patches; Butterchurn `.milk` JSON; Prism recipe JSON; VideoFlow / Shaddy stacks | Serializable craft, share, reload | **Keep-door artifact** — look *document*, not a timeline |
| **D. Browser capture / export** | `canvas.captureStream` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)); MediaRecorder ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)); `createMediaStreamDestination` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination)); WebCodecs ([Chrome](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)); Mediabunny / mp4-muxer; phase-viz MP4 export; VJam WebCodecs recording | Local clip of canvas + audio | **Keep-door capture** — short, local, in-lane |
| **E. LLM as structured router** | OpenAI / Gemini structured outputs; InstructPipe ([DOI 10.1145/3706598.3713905](https://doi.org/10.1145/3706598.3713905)); CoSTA* ([DOI 10.48550/arxiv.2503.10613](https://doi.org/10.48550/arxiv.2503.10613)); Prism M03 talk router | Intent → validated patch on a closed schema | **Router lane** — small scope; no audio/pixels in the prompt |
| **F. Generative video / AI music / AI shaders** | Runway; Luma Dream Machine; Suno; Udio; AI Co-Artist GLSL evolution ([arXiv 2512.08951](https://arxiv.org/abs/2512.08951)); Glitchframe SDXL+shaders | Invent pixels, invent music, invent shaders | **Competitor / refuse** |
| **G. Siblings ADA + Prism** | Prism `00` / M03 (still recipes + talk router); ADA (embodied agent, daily) | Spatial still vs time look vs agent | **Positioning** — don’t duplicate either |
| **H. Research vs industry shape** | MIREX beat eval ([DOI 10.1080/09298210701653252](https://doi.org/10.1080/09298210701653252)); Ableton Link ([LAC 2018](https://lac.linuxaudio.org/2018/pdf/42-paper.pdf)); Resolume / TouchDesigner; FLAYSync | SOTA tempo vs shippable feel; desktop VJ I/O | **CV / paper credibility** — mostly tests + honest limits, not SOTA MIR |

---

## 2. What “effective” means here

Operational metrics—not vibes. Unknown numbers stay **not measured**.

| Metric | Definition | Tier A target (provisional) | Notes |
|--------|------------|----------------------------|-------|
| **Musical feel vs FFT twitch** | Blind A/B: interpretation-driven look vs same shaders driven by raw band/FFT uniforms, same track | Majority preference for interpretation on a curated set (n≈8 tracks × 3 looks) | **RQ1.** Subjective; needs rubric (strobe, false lock, rest vs breathe) |
| **Look JSON round-trip** | Serialize → reload → identical look id + semantic axes + schemaVersion | 100% on validator suite | **FEASIBLE.** Document, not a performance timeline |
| **Clip export** | Start/stop → local file with **picture + soundtrack**, playable in the recording browser | ≥1 successful WebM *or* MP4 path on Chromium desktop; duration cap (proposal: ≤30 s) | Safari mime is a known fork (**EVIDENCE:** WebKit MediaRecorder; Safari 18.4 WebM). **Not measured** on this codebase |
| **Talk routing accuracy** | Intent → correct look id and/or axis deltas (human eval) | ≥80% on curated prompt set (n≈30), fail-closed otherwise | **EVIDENCE:** structured outputs improve schema fidelity. Optional in A |
| **Patch validity rate** | Router JSON passes schema + apply | ≥99% with constrained decoding + validator | **FEASIBLE** |
| **Beat confidence honesty** | Four-on-the-floor: confidence rises; rubato/speech/ambient: stays low, no false lock | Qualitative + unit tests on synthetic IOIs; MIREX-style F-measure **not measured** | **POLICY:** blend, never switch (camera punches excepted — already discrete) |
| **Mood partition** | `calm + groove + intense ≈ 1`; no snap between presets | Invariant in tests; Acid params interpolate | Already the v1 contract |
| **Self-use** | Operator opens it for a real track and keeps a clip | At least one self-kept clip in a lab week | **POLICY:** GitHub stars are not the reason |
| **Preview / capture FPS** | rAF loop stays interactive while recording | Not measured yet | Acid FBOs already half-res on coarse pointer |
| **Router latency** | Prompt → validated patch | <2 s (single LLM call) | **FEASIBLE** with small schema |
| **Audio/pixels in prompt** | Bytes of spectrum or canvas in the LLM request | **Zero** | **POLICY** |

---

## 3. Architecture patterns (2024–2026)

### Pattern 1: Recipe JSON + GPU (look document, not shader source)  
**EVIDENCE + FEASIBLE**

A closed JSON document (look id, versioned semantic axes, sync policy) drives uniforms. GPU draws. Recur encodes the whole patch into a URL—“every parameter, chain order, blend mode and modulation binding. A few hundred bytes, no server” ([recur_web](https://github.com/thedirgemedia/recur_web)). Prism does the still-image version (packs + PathPatch). Butterchurn serializes MilkDrop presets as JSON, which is a **different language** (per-frame / per-pixel equations)—a dump of that corpus is **not** this product.

**Claim:** Serialization is a product when **reload equals the live look**.  
**Demo vs ship:** Schema + validator matter more than a fourth mode.  
**POLICY:** Look JSON is a **document** (what the look *is*), not a timeline of beat events. Time lives in the clip.

### Pattern 2: Confidence-as-blend (not a tempo switch)  
**EVIDENCE + this-repo IP**

Beat tracking literature is full of **octave error**, weak pulse, and style-specific failure (Böck et al. ISMIR 2014 multi-model; McKinney et al. JNMR 2007 eval). Desktop VJ tools often **switch** when a lock is declared, or they outsource tempo to Ableton Link ([Goltz LAC 2018](https://lac.linuxaudio.org/2018/pdf/42-paper.pdf); [FLAYSync](https://sync.flaysh.com/)). This engine computes `final = unsynced + (beat − unsynced) * confidence` so ambiguous rhythm **fades** rather than fights (`ARCHITECTURE.md`). Dixon’s BeatRoot already argued for **graceful degradation** when the beat is weakly implied ([DOI 10.1080/09298210701653310](https://doi.org/10.1080/09298210701653310)).

**Claim:** Continuous confidence is the musical-feel differentiator vs “BPM number + threshold.”  
**Demo vs ship:** Do not replace this with a SOTA RNN unless RQ4 is falsified *and* the replacement still blends.

### Pattern 3: captureStream + audio tap → local MediaRecorder (Tier A); WebCodecs mux (Tier B)  
**EVIDENCE + FEASIBLE**

`HTMLCanvasElement.captureStream` is video-only ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)). Mix the soundtrack by tapping the existing `AudioContext` with `createMediaStreamDestination` and constructing `new MediaStream([videoTrack, audioTrack])` ([MDN destination](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination); NearForm mixing writeup). Three.js records `renderer.domElement`—the HUD is not in the pixels unless you draw it there.

**Mime fork (EVIDENCE, not folklore):** Chromium historically prefers `video/webm` (VP8/VP9 + Opus). Safari 14.1–18.3 recorded **MP4/H.264/AAC** only ([WebKit](https://webkit.org/blog/11353/mediarecorder-api/)); Safari 18.4 added WebM ([Guttandin, Media Codings](https://media-codings.com/articles/recording-cross-browser-compatible-media)). **Always `MediaRecorder.isTypeSupported`.** Phase-viz and VJam already ship browser recording (WebCodecs / ffmpeg.wasm fallback; VJam lists “Video recording via WebCodecs API” ([vjam.art](https://vjam.art/))). Mediabunny `CanvasSource` is the current muxer path if MP4 must be first-class ([mediabunny.dev](https://mediabunny.dev/api/CanvasSource)); mp4-muxer is deprecated in favor of it.

**Claim:** Short **local** clip is a weekend of careful audio-graph plumbing, not a video product.  
**Demo vs ship:** A silent WebM is a failed Keep door. A timeline editor is a different product.

### Pattern 4: LLM → validated patch on a closed look schema  
**EVIDENCE + FEASIBLE**

Same pattern as Prism: structured outputs ([OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs); [Gemini](https://ai.google.dev/gemini-api/docs/structured-output)) emit `{ lookId?, axes[] }` → validator → same writer as sliders. InstructPipe / CoSTA* / GenArtist are **tool-routing** evidence, not a mandate to build an agent. AI Co-Artist generates **new GLSL** from prompts ([arXiv 2512.08951](https://arxiv.org/abs/2512.08951))—that is the **anti-pattern**.

**Claim:** Works for “more acid / calmer / lock to the beat.” Fails for “write me a shader” and “make a music video of this song.”  
**Demo vs ship:** No audio, no pixels, no free GLSL in the prompt. Offline → sliders still work.

### Pattern 5: FFT-to-uniform visualisers (competitor default)  
**EVIDENCE + HYPE**

Most browser visualisers map `AnalyserNode` bins or 3–4 bands straight to displacement, color, and particle count. It demos in five seconds and **twitches**. MilkDrop/Butterchurn is the high-craft version of the same idea: a huge preset corpus reacting to a built-in analyser ([butterchurn](https://github.com/jberg/butterchurn); [MilkDrop / Geiss](https://www.geisswerks.com/about_milkdrop.html)).

**Claim:** Amplitude-reactive is a solved demo. Musical interpretation is the unsolved product.  
**POLICY:** Looks read mood / beat / energy, never raw FFT bins.

### Pattern 6: Desktop VJ I/O (Link, NDI, MIDI, OSC)  
**EVIDENCE, not FEASIBLE as v1 scope**

Resolume, TouchDesigner, OpenDrop, FLAYSync optimize **show control**: decks, mapping, Link phase, NDI/Spout. Link is a peer-to-peer musical timeline, not a beat detector ([Goltz](https://lac.linuxaudio.org/2018/pdf/42-paper.pdf); [ableton.github.io/link](https://ableton.github.io/link/)). FLAYSync *is* a detector that **emits** Link ([sync.flaysh.com](https://sync.flaysh.com/)).

**Claim:** That stack is a career. This tab is a look instrument.  
**POLICY:** No MIDI / OSC / Link / NDI.

---

## 4. Market & OSS landscape

| Tool | Category | Strength | Gap (for this product) | Lens |
|------|----------|----------|------------------------|------|
| **VJam** | Browser VJ, Butterchurn + custom shaders | 1,300+ presets, decks, MIDI, projection mapping, WebCodecs record ([vjam.art](https://vjam.art/)) | Preset dump + VJ cockpit; FFT/preset culture, not a 3-look interpretation instrument | EVIDENCE / **refuse clone** |
| **Butterchurn** | WebGL2 MilkDrop engine | Authentic `.milk` in the browser ([GitHub jberg/butterchurn](https://github.com/jberg/butterchurn)) | Engine-for-hire; no interpretation ladder | EVIDENCE |
| **OpenDrop VJ** | 4-deck MilkDrop + Electron I/O | 16k presets, MIDI/OSC/Link, NDI/Spout ([opendrop-vj](https://github.com/kushiemoon-dev/opendrop-vj)) | Full VJ rig; opposite of “three looks” | EVIDENCE / POLICY refuse |
| **Hydra** | Live-coded video synth | Modular sources, feedback, webcam, shareable sketches ([hydra.ojack.xyz](https://hydra.ojack.xyz/)) | The product *is* the GLSL playground | EVIDENCE / **refuse playground** |
| **Recur (dirgemedia)** | Browser sampler + gen/FX chains | URL-encoded patch, audio/LFO/MIDI modulation, record/cast ([dirgemedia.com/recur](https://github.com/thedirgemedia/recur_web)) | General VJ toy; FFT-band modulation, not mood/beat document | EVIDENCE (JSON pattern) |
| **r_e_c_u_r / recurBOY** | Pi video sampler + GLSL | Hardware instrument, MIDI, feedback ([cyberboy666/r_e_c_u_r](https://github.com/cyberboy666/r_e_c_u_r)) | Embedded sampler, not a browser look-keeper | EVIDENCE (adjacent) |
| **phase-viz** | Three.js visualiser + local MP4 | File in, 3 modes, WebCodecs/ffmpeg.wasm export, JSON presets ([7g3n/phase-viz](https://github.com/7g3n/phase-viz)) | Particle/waveform toy; analysis ≠ interpretation ladder | EVIDENCE (export cousin) |
| **Resolume Arena / Avenue** | Desktop VJ / media server | Decks, mapping, DXV, Link ([resolume.com](https://resolume.com/support/en/link)) | Show control. Not a tab | EVIDENCE / won’t chase |
| **TouchDesigner** | Node AV / installation | TOP/CHOP, sensors, I/O ([derivative.ca](https://derivative.ca/)) | Career tool; live vs still split already in Prism `00` | EVIDENCE (adjacent) |
| **FLAYSync** | BPM → Ableton Link | Onset lock + tap + half/double + Resolume ([sync.flaysh.com](https://sync.flaysh.com/)) | Tempo *appliance* for someone else’s visuals | EVIDENCE (tap-tempo RQ) |
| **realtime-bpm-analyzer** | AudioWorklet BPM lib | Off-main-thread peaks + interval voting ([realtime-bpm-analyzer.com](https://www.realtime-bpm-analyzer.com/guide/how-it-works)) | BPM candidates, not look-driving confidence blend | EVIDENCE / compare arm |
| **Meyda** | Browser feature extractors | WAC 2015; RMS / spectrum in Web Audio ([DOI 10.5281/zenodo.34093](https://doi.org/10.5281/zenodo.34093)) | Features only; this repo already wraps it and rolls its own flux | EVIDENCE (shipped) |
| **audiojs/beat-detection** | JS onset/tempo/DP tracker | Ellis-style DP; file-oriented ([GitHub](https://github.com/audiojs/beat-detection)) | Offline-friendly; not a live blend weight | EVIDENCE |
| **@uln/impulse** | WASM features + BPM | Autocorr tempo, onset classes | Heavy path; overkill for three looks | HYPE / later |
| **NestDrop** | MilkDrop → Spout | High-res presets into Resolume/TD ([nestimmersion.ca](https://nestimmersion.ca/nestdrop.php)) | Desktop preset player | EVIDENCE / refuse dump |
| **Prism talk router** | Sibling stills | Structured `{ pack, patch }` + sliders same document (`web-image-editor` M03) | Spatial stills; copy the **router pattern**, not the domain | EVIDENCE (sibling) |
| **Runway / Luma** | Generative video | Text/image → video | Invented pixels, not a live look | HYPE / refuse |
| **Suno / Udio** | Generative music | Prompt → song ([suno.com](https://suno.com/)) | Invented audio | POLICY refuse |
| **Shadertoy / AI Co-Artist** | Shader authorship | Community GLSL; LLM writes new shaders | Playground / generator | HYPE / refuse |

---

## 5. Research questions (explicit)

**RQ1:** Do **interpretation-only looks** (mood / beat / energy → uniforms) beat **the same shaders driven by raw FFT/band values** on musical feel (less twitch, fewer false strobes, lock that matches tapping)?  
- **Falsifier:** Blind raters show no preference, or prefer the FFT wiring, at equal latency.  
- **Requires:** A/B harness that can rebind uniforms; **no new shaders**. Curated tracks (4/4 club, rap groove, ballad, speech, ambient).

**RQ2:** Does **clip + look JSON** get used by the operator (self-kept artifact), or is the live tab the only thing that matters?  
- **Falsifier:** In a lab week, zero clips kept and zero JSON reloads; only fullscreen play.  
- **Measure:** Export click-through, reload success, “would I send this to myself.”

**RQ3:** Is a **one-shot talk router** sufficient to refine the look (“more acid,” “calmer,” “lock to the beat”) if the current document is in context—or do sliders alone cover it?  
- **Falsifier:** >40% of refinement turns mis-parse look id or delta direction; or the operator never talks because sliders are faster.  
- **Mitigation:** Dual path—talk and sliders write the **same** document; fail closed.

**RQ4:** Does **tap-tempo** (FLAYSync-style nudge) beat **confidence-only** auto-sync on mixed material, or does tap become a crutch that hides a broken estimator?  
- **Falsifier:** On the curated set, tap does not raise “in time” ratings vs confidence blend; or tap-on-wrong-tempo makes false lock **worse** than auto.  
- **Requires:** Optional tap writing the same beat state; keep the blend equation.

**RQ5 (systems):** Can BeatSync (IOI vote 60–180, PLL, product confidence) and MoodAnalyzer (partition of unity) be **tested as pure functions** well enough that a later change cannot silently reintroduce threshold-pop?  
- **Falsifier:** Tests pass while a known 2:1 octave fixture or a silent-gate fixture still fails in the live tab.  
- **Measure:** Synthetic IOI fixtures + a short golden-track log (not MIREX SOTA).

**RQ6 (research-shaped):** Is a **serializable look document** a differentiated deliverable vs VJam’s preset hash and phase-viz’s JSON presets?  
- **Falsifier:** The document is just `{ mode: "acid" }` with no axes, and nobody reloads it.  
- **Measure:** Round-trip of **semantic** fields (sync policy, look id, intensity axes)—not shader source.

---

## 6. Tier A / B / C (FEASIBLE on solo browser)

**Protect Tier A.** Do not spend the pass on a fourth look, a MilkDrop dump, or WebCodecs-from-zero if MediaRecorder already keeps a clip.

| Tier | Scope | Depends on | Ship signal |
|------|-------|------------|-------------|
| **A — Smallest keepable loop** | Existing **three looks** follow interpretation → **look JSON** round-trip → **short local clip** (canvas + audio) → optional **one-shot talk** → **BeatSync / Mood tests** | Current `src/` engine; JSON schema + validator; MediaRecorder mix; optional server structured-output call; unit tests on pure DSP | Operator can play, nudge, keep. Demo on `main` still runs |
| **B — Capture + tempo craft** | Mime/feature-detect MP4 (WebCodecs / Mediabunny) if WebM fails the self-use test; optional tap-tempo; multi-turn talk with document diff; capture FPS budget | Tier A stable | RQ3/RQ4 testable without new shaders |
| **C — Deferred / lab-only** | madmom/RNN compare arm; AudioWorklet extractors; LUT/neural shading; Ableton marker export; fourth look | GPU/server budget, eval harness | Paper-grade blog or explicit “we measured BeatSync vs Ellis DP” |

**User story feasibility tags:**

| Story | Tier | Required tech |
|-------|------|---------------|
| “Play the demo — Acid follows the drop” | **Shipped** | Interpretation + Acid |
| “Keep 20 s of this + the look file” | A | captureStream + audio tap + JSON |
| “More acid, calmer, lock to the beat” | A | Router or sliders, same document |
| “Reload yesterday’s look on a new track” | A | Schema version + apply |
| “Tap if auto is unsure” | B | Tap → same beat state |
| “Export an Ableton arrangement” | **Won’t chase** | Timeline / Link / DAW |
| “Add a fourth look / dump MilkDrop” | **Won’t chase** | Preset corpus |
| “Write me a new shader from a prompt” | **Won’t chase** (F) | LLM-as-author |
| “Generate a music video / generate the track” | **Won’t chase** (F) | Runway / Suno |

---

## 7. Explicit non-goals & won’t chase

- **VJam / OpenDrop / NestDrop clone** — preset oceans, decks, MIDI, mapping. **POLICY**
- **Hydra / Shadertoy / GLSL playground** — the Live fragment is already **frozen**; no live-coded fourth mode. **POLICY**
- **MilkDrop dump** — Butterchurn is an engine, not a look vocabulary. **POLICY**
- **DAW / timeline / Ableton marker export** — short local recording is in-lane; arrangement is not. **POLICY**
- **MIDI / OSC / Link / NDI / Spout / DMX** — Resolume/TD/FLAYSync lane ([Goltz](https://lac.linuxaudio.org/2018/pdf/42-paper.pdf)). **POLICY**
- **Generative video** — Runway / Luma / SDXL music-video pipelines (Glitchframe). **POLICY**
- **AI-written shaders** — AI Co-Artist ([arXiv 2512.08951](https://arxiv.org/abs/2512.08951)). **POLICY**
- **Music generation** — Suno / Udio. **POLICY**
- **Genre ML / valence-arousal networks** — mood here is an **energy-shape heuristic** on purpose (`ARCHITECTURE.md`). **POLICY**
- **Prism stills / ADA agent features** — siblings; don’t duplicate. **POLICY**
- **Rewriting or deleting `src/`** — product pass, not a second renderer. `main` demo stays. **POLICY**
- **Claiming SOTA beat F-measure** without measuring it. **POLICY**
- **Shipping something the operator would not open for himself.** **POLICY**

---

## 8. Recommended first vertical slice (after research)

**No new shaders unless an RQ demands it.** Live stays frozen. Acid and Cinematic stay the named looks they are.

Build **Tier A Keep** on the existing ladder: (1) a **strict look JSON schema** (`schemaVersion`, `lookId ∈ {cinematic, live, acid}`, semantic axes that already exist as uniforms/state, `syncPolicy`, no FFT arrays, no GLSL source); (2) **round-trip apply** from that document so sliders (and later talk) have one writer; (3) **short local recording** — `renderer.domElement.captureStream` + `AudioContext` tap → `MediaRecorder`, feature-detected mime, duration cap, file stays on disk; (4) **pure-function tests** for tempo vote / octave tiebreak / confidence product / mood normalization. Optional **one-shot talk** only after (1)–(3) do not lie. This proves the hypothesis core: **a musical look is a document you can keep**, not a visualiser you can only watch. Tap-tempo, MP4 mux, and multi-turn talk wait on RQ4 / self-use of the clip.

---

## 9. Decision log (initial proposals — not locked)

| # | Topic | Proposal | Evidence | Open? |
|---|-------|----------|----------|-------|
| D1 | Product posture | **Pass on v1**, do not delete `src/`; `main` demo stays | VISION; live URL | No |
| D2 | Looks | **Exactly three:** Cinematic, Live, Acid | VISION; frozen Live shader | No — unless RQ1 somehow needs a fourth (it doesn’t) |
| D3 | Interpretation | Looks read **mood / beat / energy only**; confidence **blends** | `ARCHITECTURE.md`; Dixon graceful degradation | No |
| D4 | Look JSON | Versioned **document**: lookId + semantic axes + syncPolicy; not a timeline; not shader source | Recur URL patches; Prism recipe | Yes — axis names |
| D5 | Clip format | **Tier A:** feature-detected MediaRecorder (WebM *or* MP4), canvas + audio, local, capped | MDN captureStream; WebKit mime fork; phase-viz/VJam | Yes — cap seconds; MP4 muxer if WebM fails self-use |
| D6 | Talk in Tier A | **Optional one-shot**, fail-closed to sliders; **no** audio/pixels in prompt | Prism M03; structured-output APIs | Yes — provider (Gemini vs OpenAI) |
| D7 | LLM role | **Router only** — never shader/pixel/audio author | InstructPipe; AI Co-Artist as anti-pattern | No |
| D8 | BeatSync | **Keep** IOI vote + PLL + product confidence; **test it**; do not rewrite to madmom | Cheap online vs Böck RNN; octave tiebreak already exists | Yes — tap-tempo as RQ4, not as a rewrite |
| D9 | Audio graph | One `AudioContext`; record tap is a **destination fan-out**, disconnect on stop | Phantom-mix footgun (MediaRecorder + multiple destinations) | Yes — implementation card |
| D10 | Tests | **BeatSync + MoodAnalyzer** unit tests in Tier A; no visual regression farm | ARCHITECTURE: DSP helpers are pure | Yes — fixture tracks |
| D11 | Generative / VJ I/O | **Out** | Runway/Suno; Resolume/Link | No — unless an RQ is explicitly added later |
| D12 | Eval | Curated **~8 tracks × 3 looks** + **~30 talk prompts** before calling the pass “felt” | MIREX-as-inspiration, not as a claim | Yes — rubric |

---

## 10. Module research card gate (ADA / Prism style)

**POLICY (proposal):** No major code module (look schema, capture/export, talk router, BeatSync change, mood change) ships without a **one-page research card**: problem, RQ link, alternatives rejected, FEASIBLE tier, falsifier, and ≥2 primary citations. This is the brake that stops the pass from collapsing into “add MediaRecorder and a chat box” or “rewrite BeatSync because a WASM BPM lib exists.”

New GLSL is **not** a module in this pass unless `01_ENGINE` names an organ **and** an RQ demands it.

---

## 11. Domain deep dives (A–H)

### A. Musical interpretation / beat tracking

**Frame:** Raw features (RMS, bands, **spectral flux**) are not the look. Flux as positive spectral difference is the classical onset cue (Masri, *Computer Modeling of Sound…*, PhD Bristol 1996; Dixon, “Onset Detection Revisited,” DAFx-06, [PDF](https://dafx.de/paper-archive/2006/papers/p_133.pdf)). SuperFlux adds a maximum filter to kill vibrato false positives (Böck & Widmer, DAFx-13, [PDF](https://phenicx.upf.edu/system/files/publications/Boeck_DAFx-13.pdf)). This repo already computes positive-only log flux in `AudioEngine` because Meyda’s extractor crashed in-build (`ARCHITECTURE.md`)—same *family* as Dixon/Masri, not a new MIR model.

**Tempo / beat:** Ellis: onset envelope → tempo via biased autocorrelation → **dynamic programming** beats ([DOI 10.1080/09298210701653344](https://doi.org/10.1080/09298210701653344)). Dixon BeatRoot: **multi-agent** hypotheses + spectral-flux onsets, explicit **graceful degradation** ([DOI 10.1080/09298210701653310](https://doi.org/10.1080/09298210701653310)). Böck: RNN activation + DBN, SOTA-ish, **octave errors remain the villain** (ISMIR 2014; madmom [DOI 10.1145/2964284.2973795](https://doi.org/10.1145/2964284.2973795); joint beat/downbeat [DOI 10.5281/zenodo.1415835](https://doi.org/10.5281/zenodo.1415835)). This engine: peak-pick bass+flux (220 ms refractory) → 12-slot IOI buffer → brute vote 60–180 BPM including double-period, **median IOI octave tiebreak**, PLL phase, **product confidence** (onset count × consistency × BPM stability × energy gate × warmup). Cheap enough to sit on rAF beside Three.js. Weak on rubato, speech, ambient, and tempos outside 60–180—the architecture already says so.

**Mood:** Not genre (Tzanetakis-class) and not circumplex emotion ML. Calm / groove / intense is a **normalized energy-shape partition**. That is a product choice: works on unseen material; will never output “this is drum and bass.”

**Browser extractors:** Meyda is the client-side MIR primitive ([DOI 10.5281/zenodo.34093](https://doi.org/10.5281/zenodo.34093)). realtime-bpm-analyzer moves peaks to **AudioWorklet** (correct vs deprecated `ScriptProcessorNode`). Neither supplies a look document.

**Key answer:** Interpretation (energy axis + mood weights + beat clock × confidence) is the **only** honest driver for a musical look. Raw bins are a twitch generator. SOTA offline trackers are a **compare arm**, not Tier A.

**Lens:** **EVIDENCE** (papers + this v1); **HYPE** (“just use a WASM BPM model”).

---

### B. Real-time GPU VJ / feedback looks

**Product pattern:** Named looks with **temporal memory** (feedback) vs instantaneous 3D. Hydra’s modular analog-synth metaphor ([docs](https://hydra.ojack.xyz/docs/docs/learning/getting-started/)) and Recur’s gen/FX chains prove browser feedback is a real instrument. MilkDrop/Butterchurn prove a **preset civilization** can live in WebGL2.

**This engine’s craft (keep):** Warp-aligned Acid feedback (previous frame sampled through the **same** warped UV; 0.98 decay; 0.62 cap); Live as frozen reference; Cinematic 3D + chromatic post; mood table blends Acid uniforms; beat-quantized glitch/kaleido/hue when confidence is high. Ordered shader concatenation so Acid reuses helpers without touching `liveFeed.frag.glsl`.

**Anti-pattern:** A fourth mode, a preset browser, or exposing GLSL. VJam’s 1,300 presets are a **museum**; they are not a look you can name in a sentence.

**Key answer:** Three looks is a **vocabulary**. A playground is a **language**. This pass ships the vocabulary.

**Lens:** **EVIDENCE** (shipped Hydra/Recur/Butterchurn); **POLICY** (no playground).

---

### C. Look packs / recipe JSON in time

**Still vs time:** Prism’s recipe is appearance on **fixed pixels**. This look document is appearance **policy** over a **live** interpretation stream. Reloading JSON restores *how* the engine listens and draws, not *what* the last track did. The clip is the time-stamped artifact.

**Industry patterns:** Recur URL = full patch, no media. Butterchurn JSON = MilkDrop equations (wrong grain). phase-viz “JSON-shareable preset foundation” is closer but binds to particle/waveform modes. VideoFlow/Shaddy (cited in Prism `00`) show **recipe + GPU** is a real product pattern in stills/video FX.

**What belongs in the document (proposal):** `schemaVersion`, `lookId`, sync policy (auto/off), semantic axes already implied by v1 (e.g. Acid mood-driven feedback/kaleido/hue *policy*, not per-frame uniforms), maybe “talk/slider last write.” **What does not:** `powerSpectrum`, shader source, webcam frames, audio blobs, automation curves.

**Key answer:** If JSON cannot round-trip the **named look**, Keep is a video download button. If JSON includes FFT, you have abandoned interpretation-as-truth.

**Lens:** **EVIDENCE** (Recur, Prism); **FEASIBLE** (small schema).

---

### D. Browser capture / export

**Tier A path:** `canvas.captureStream(fps)` → video track; `AudioContext.createMediaStreamDestination()` as a **tap** on the graph that already reaches speakers; `MediaRecorder` on the combined stream; Blob download. HUD/glass UI is **not** in the file unless composited (usually good). Webcam pixels **are** in Live/Acid because they are on the canvas.

**Footguns (EVIDENCE):** (1) Forgotten audio track → silent clip. (2) Second destination never `disconnect()` → phantom mix. (3) `AudioContext` suspended until gesture. (4) Canvas not origin-clean → `SecurityError`. (5) Mime not feature-detected → Safari vs Chrome. (6) Uncapped session → a video product by accident.

**Tier B path:** WebCodecs `VideoEncoder` + muxer (Mediabunny `CanvasSource`; phase-viz already does MP4 + ffmpeg.wasm fallback). Use if Instagram/QuickTime self-use **falsifies** WebM (kaizen.place writeup of WebM-vs-MP4 is the cautionary tale).

**Out of lane:** ffmpeg server, cloud transcode, NDI, timeline trimmer, “export stems.”

**Key answer:** Short **local** canvas+audio is **FEASIBLE** on the existing tab. A video suite is not.

**Lens:** **EVIDENCE** (MDN, WebKit, Mediabunny, phase-viz, VJam); numbers for *this* GPU **not measured**.

---

### E. LLM as structured router (not pixel/audio author)

**Minimum job:** Map a short sentence + **current look document** → `{ lookId? , axisDeltas? , syncPolicy? }` in a closed enum/number schema. Validate. Apply with the same function sliders use. Timeout / 4xx / invalid → no-op, sliders remain.

**APIs:** OpenAI structured outputs ([docs](https://developers.openai.com/api/docs/guides/structured-outputs)); Gemini `responseSchema` ([docs](https://ai.google.dev/gemini-api/docs/structured-output)). Prism M03 already ran this pattern for stills (Gemini, server key, no pixels). Copy **discipline**, not the photo schema.

**Refuse:** Spectrum arrays, canvas data-URLs, “generate GLSL,” multi-tool agents (CoSTA* is a paper, not a v1), client-bundled API keys.

**Key answer:** Talk is a **convenience writer** on the look document. GPU still draws; BeatSync still listens.

**Lens:** **EVIDENCE** (APIs + Prism); **HYPE** (“agentic VJ”).

---

### F. Generative video / AI music / AI shaders (competitor-refuse)

| Lane | What they sell | Why it fails this job |
|------|----------------|------------------------|
| **Generative video** | Runway, Luma Dream Machine — text/image → clips | Offline invented motion; not a live interpretation look |
| **AI music** | Suno, Udio — prompt → song | This product **consumes** a track; it does not author one |
| **AI shaders** | AI Co-Artist, vibe-coded GLSL | New programs every turn; breaks frozen Live and the 3-look POLICY |
| **AI music video** | Glitchframe (SDXL keyframes + reactive shaders + ffmpeg) | Timeline product; render farm energy |

**Optional Tier C:** a **compare demo** only if RQ2 is accused of “just make a Runway video instead”—to show the operator wanted *this track, this look, this minute*, not a generated clip.

**Lens:** **EVIDENCE** (shipped at scale); **POLICY** non-goal.

---

### G. Siblings: ADA + Prism positioning

| Sibling | Domain | Shared pattern | Do not copy |
|---------|--------|----------------|-------------|
| **Prism** | Spatial stills: upload → GPU grade → PNG + recipe | Talk = validated patch; sliders = same document; module cards | Masks, LUTs, posters, hero sites, still-only ops |
| **ADA** | Embodied agent (daily system) | Tool routing, fail-closed | Camera-as-body, planning, hardware |
| **This** | Time-domain look instrument (sometimes) | Interpretation ladder + keep door | DAW, VJ I/O, generative media |

Prism’s `00` already points at this repo as the **time** lane. This `00` points back: **don’t become Prism-on-a-spectrogram** (styling a 2D plot) and **don’t become ADA-with-shaders** (an agent that happens to draw). Frequency: sometimes. Self-use is the gate.

**Lens:** **POLICY** positioning.

---

### H. Research vs industry shape

**Research-shaped (fits lab):** RQ1 ablation (interpretation vs FFT wiring); confidence blend vs threshold switch; look JSON as a typed artifact; honest BeatSync limits (60–180, onset-IOI, no SOTA claim). Contributes a **systems + HCI** note: constrained LLM control of a **live** visual DSL (cousin to InstructPipe), plus a documented cheap online tracker that **degrades**.

**Industry-shaped:** End-to-end typed Keep door (validate → GPU → clip), mime feature detection, audio-tap teardown, router observability, “would I open this tonight.”

**Would not qualify as a paper:** “We put MediaRecorder on a Three.js visualiser.” **Would strengthen an AI-engineering / graphics CV:** interpretation-as-truth writeup (`ARCHITECTURE.md` already), look schema spec, RQ1 A/B, tests that lock the blend equation.

**Ableton Link / Resolume / FLAYSync** are the **industry** of show sync. Citing them is how we **refuse** them with evidence rather than taste.

**Lens:** **POLICY** — research cards; **EVIDENCE** — MIREX as a humility device, not a leaderboard we entered.

---

## 12. References (selected)

### Beat / onset / MIR
- Ellis, *Beat Tracking by Dynamic Programming* — [DOI 10.1080/09298210701653344](https://doi.org/10.1080/09298210701653344); [PDF](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- Dixon, *Evaluation of the Audio Beat Tracking System BeatRoot* — [DOI 10.1080/09298210701653310](https://doi.org/10.1080/09298210701653310); [PDF](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2007/jnmr07.pdf)
- Dixon, *Onset Detection Revisited* (DAFx-06) — [PDF](https://dafx.de/paper-archive/2006/papers/p_133.pdf) *(proceedings; ISSN 2413-6689)*
- McKinney et al., *Evaluation of Audio Beat Tracking and Music Tempo Extraction Algorithms* — [DOI 10.1080/09298210701653252](https://doi.org/10.1080/09298210701653252)
- Masri, *Computer Modeling of Sound for Transformation and Synthesis of Musical Signal* — PhD, University of Bristol, 1996 *(spectral flux lineage; no DOI)*
- Böck & Widmer, *Maximum Filter Vibrato Suppression for Onset Detection* (DAFx-13) — [PDF](https://phenicx.upf.edu/system/files/publications/Boeck_DAFx-13.pdf)
- Böck et al., *madmom: a new Python Audio and Music Signal Processing Library* — [DOI 10.1145/2964284.2973795](https://doi.org/10.1145/2964284.2973795)
- Böck, Krebs & Widmer, *Joint Beat and Downbeat Tracking with Recurrent Neural Networks* — [DOI 10.5281/zenodo.1415835](https://doi.org/10.5281/zenodo.1415835)
- Böck et al., *A Multi-Model Approach to Beat Tracking Considering Heterogeneous Music Styles* (ISMIR 2014) — [PDF](https://www.cp.jku.at/research/papers/Boeck_etal_ISMIR.2014.pdf)
- McFee et al., *librosa: Audio and Music Signal Analysis in Python* — [DOI 10.25080/majora-7b98e3ed-003](https://doi.org/10.25080/majora-7b98e3ed-003)
- Rawlinson, Segal & Fiala, *Meyda: an Audio Feature Extraction Library for the Web Audio API* (WAC 2015) — [DOI 10.5281/zenodo.34093](https://doi.org/10.5281/zenodo.34093)
- Klapuri, *Sound onset detection by applying psychoacoustic knowledge* — [DOI 10.1109/ICASSP.1999.757494](https://doi.org/10.1109/ICASSP.1999.757494)

### Browser BPM / features (industry)
- realtime-bpm-analyzer — [how it works](https://www.realtime-bpm-analyzer.com/guide/how-it-works); [realtime guide](https://www.realtime-bpm-analyzer.com/guide/realtime-bpm-detection)
- audiojs/beat-detection — [GitHub](https://github.com/audiojs/beat-detection)
- MDN, *AudioWorklet* — [docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet)

### GPU VJ / presets / feedback
- Butterchurn — [GitHub jberg/butterchurn](https://github.com/jberg/butterchurn)
- MilkDrop / Geiss — [geisswerks.com](https://www.geisswerks.com/about_milkdrop.html)
- VJam — [vjam.art](https://vjam.art/)
- OpenDrop VJ — [GitHub kushiemoon-dev/opendrop-vj](https://github.com/kushiemoon-dev/opendrop-vj)
- Hydra — [docs](https://hydra.ojack.xyz/hydra-docs-v2/); [getting started](https://hydra.ojack.xyz/docs/docs/learning/getting-started/)
- Recur (browser) — [GitHub thedirgemedia/recur_web](https://github.com/thedirgemedia/recur_web)
- r_e_c_u_r — [GitHub cyberboy666/r_e_c_u_r](https://github.com/cyberboy666/r_e_c_u_r)
- phase-viz — [GitHub 7g3n/phase-viz](https://github.com/7g3n/phase-viz)
- NestDrop — [nestimmersion.ca/nestdrop.php](https://nestimmersion.ca/nestdrop.php)
- Resolume, Ableton Link support — [resolume.com/support/en/link](https://resolume.com/support/en/link)
- TouchDesigner — [derivative.ca](https://derivative.ca/); TOPs vs CHOPs — [interactiveimmersive.io](https://interactiveimmersive.io/blog/touchdesigner-operators-tricks/touchdesigner-tops-vs-chops/)

### Sync appliances (boundary)
- Goltz, *Ableton Link – A technology to synchronize music software* (LAC 2018) — [PDF](https://lac.linuxaudio.org/2018/pdf/42-paper.pdf); [docs](https://ableton.github.io/link/)
- FLAYSync — [sync.flaysh.com](https://sync.flaysh.com/)

### Capture / codecs
- MDN, `HTMLCanvasElement.captureStream` — [docs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
- MDN, MediaStream Recording API — [docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- MDN, `AudioContext.createMediaStreamDestination` — [docs](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination)
- WebKit, *MediaRecorder API* — [webkit.org/blog/11353](https://webkit.org/blog/11353/mediarecorder-api/)
- Guttandin, *Recording cross browser compatible media* — [media-codings.com](https://media-codings.com/articles/recording-cross-browser-compatible-media)
- Chrome, *Video processing with WebCodecs* — [developer.chrome.com](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)
- Mediabunny `CanvasSource` — [mediabunny.dev/api/CanvasSource](https://mediabunny.dev/api/CanvasSource)
- NearForm, *Screen and Webcam Mixing and Recording with Web APIs* — [nearform.com](https://nearform.com/digital-community/screen-webcam-mixing-recording/)

### LLM / structured routing
- OpenAI, *Structured model outputs* — [docs](https://developers.openai.com/api/docs/guides/structured-outputs) *(product docs; no DOI)*
- Gemini, *Structured outputs* — [docs](https://ai.google.dev/gemini-api/docs/structured-output) *(product docs; no DOI)*
- Zhou et al., *InstructPipe* — [DOI 10.1145/3706598.3713905](https://doi.org/10.1145/3706598.3713905)
- Gupta et al., *CoSTA\**: Cost-Sensitive Toolpath Agent…* — [DOI 10.48550/arxiv.2503.10613](https://doi.org/10.48550/arxiv.2503.10613)
- Wang et al., *GenArtist* — [DOI 10.52202/079017-4077](https://doi.org/10.52202/079017-4077)
- Cohere, *Structured Outputs* — [docs](https://docs.cohere.com/docs/structured-outputs) *(product docs; no DOI)*

### Generative competitors (refuse)
- Runway — [runwayml.com](https://runwayml.com/)
- Luma Dream Machine — [lumalabs.ai](https://lumalabs.ai/)
- Suno — [suno.com](https://suno.com/)
- Kachkine, *AI Co-Artist: A LLM-Powered Framework for Interactive GLSL Shader Animation Evolution* — [arXiv 2512.08951](https://arxiv.org/abs/2512.08951); [DOI 10.48550/arxiv.2512.08951](https://doi.org/10.48550/arxiv.2512.08951)
- Glitchframe — [GitHub OlaProeis/glitchframe](https://github.com/olaproeis/glitchframe)

### This repo / siblings
- This repo `VISION.md`, `ARCHITECTURE.md`, `PROJECT.md`; demo [music.arkhives.nz](https://music.arkhives.nz)
- Prism `docs/00_FIELD_RESEARCH.md`, `docs/modules/M03_TALK_ROUTER.md` *(format + router pattern; different domain)*

---

## Executive summary

**Domain:** Time-domain **look instrument** — three named GPU looks driven by a live interpretation ladder (energy, mood, beat-with-confidence), with a Keep door (short local clip + look JSON) and optional talk as a schema router. Existing v1 engine; product pass, not a rewrite.

**Primary RQ:** Does interpretation-only driving beat FFT-twitch on the same shaders (RQ1), and does clip + look JSON actually get kept (RQ2)—without becoming VJam, Hydra, or Runway?

**Tier A v1:** Play a track on the **existing** Cinematic / Live / Acid looks → look JSON round-trip → short local canvas+audio clip → optional one-shot talk onto the same document → BeatSync/Mood tests. **Protect this.** No fourth look, no new shaders unless an RQ later demands them.

**Biggest risk / won’t work:** The pass **rebuilds a visualiser** (preset dump, particle toy, FFT shader playground) instead of a **keepable look**; or capture ships **silent / mime-broken** so Keep is fake; or talk becomes a shader author. Secondary: BeatSync false-lock on mixed material, “fixed” by adding Link/MIDI instead of testing confidence (RQ4/RQ5).

**Differentiator vs market:**
- vs **VJam** — three interpreted looks, not 1,300 presets and a cockpit.
- vs **Hydra** — a closed look document, not a live-coded synth.
- vs **phase-viz** — interpretation ladder + confidence blend, not analyser-driven particles with an MP4 button.
- vs **Prism** — time and music, not still appearance; same **router discipline**, different tensor.

---

**One-line finish:** play → interpreted look → optional talk → **keep clip + JSON**; if a design would equally describe VJam, a particle toy, or an AI video app, it is out.
