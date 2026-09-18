# M02 — Capture

**Status:** research card  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Depends on:** [`VISION.md`](../VISION.md), [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md), [`01_ENGINE.md`](../01_ENGINE.md), [`02_CONSTITUTION.md`](../02_CONSTITUTION.md), [`M00_LOOK_DOCUMENT.md`](M00_LOOK_DOCUMENT.md)  
**Purpose:** Honest Keep door — short **local** picture + soundtrack of the **same** lab canvas, plus the M00 JSON. Not a video product.

---

## 0. Question of this module

How does the operator keep ~half a minute of this look with sound, on disk, from the existing Three.js canvas — without a second renderer, without HUD in the pixels, and without shipping silence as success?

VISION: short local recording is in-lane; a timeline is not. `02` §4.2: silent clip = failed Keep.

---

## 1. What it wraps in `src/`

| File | Verdict | Why |
|------|---------|-----|
| `src/audio/AudioEngine.ts` | **KEEP** + **WRAP** | Expose `AudioContext` + current source for `createMediaStreamDestination` fan-out. Mic path is analyse-only today — tap **must** still connect or Keep is silent. Do not publish `powerSpectrum`. Do not `close()` the shared context when recording ends. |
| `src/main.ts` | **WRAP** | Start/stop Keep controls on `#ui` (DOM). Record **`renderer.domElement`**, never `#ui`. |
| `src/webgl/Scene.ts` + layers | **KEEP** | Same draw. No export composer, no extra FBO, no pixel-ratio bump for “sharper capture” (`01` E5; `02` §7.11). |
| `src/camera/VideoCapture.ts` | **KEEP** | Webcam is canvas content in Live/Acid, therefore in the clip — not a JSON sidecar (`01` E12). |
| `src/shaders/*` | **KEEP** | No new GLSL. |

New capture helper sits beside the engine; it is the named **capture / export** organ (`01` §3), not a second body.

---

## 2. Contract / decisions (fail-closed)

Path locked in `01` §8.2:

```text
video  = renderer.domElement.captureStream(fps).getVideoTracks()[0]
dest   = audioContext.createMediaStreamDestination()
         sourceNode.connect(dest)          // fan-out; file path already hits speakers
combined = new MediaStream([videoTrack, audioTrack])
mime   = first MediaRecorder.isTypeSupported(...)
recorder = new MediaRecorder(combined, { mimeType })
stop   → recorder.stop(); dest.disconnect(); Blob download
```

**Laws**

1. **Silent clip = fail.** No audio track, forgotten tap, or coerced empty Blob → readable error, not a success download (`02` §2.5, §4.2).
2. **Disconnect on stop.** Do not leave the tap connected (phantom mix, `00` D9). Do not close the shared `AudioContext`.
3. **HUD out of pixels.** `#webgl` only. `#ui` / `#status` stay DOM.
4. **Duration cap exists.** Uncapped session is a video product (`00` D5; `02` §12.1).
5. **Origin-clean.** Tainted canvas → fail closed, not a mute file.
6. **Same engine.** Keep is a tap of the lab stream. No ffmpeg server, no export-sized FBO.

**Proposals (still OPEN — not fake locks)**

| Item | Proposal | Why |
|------|----------|-----|
| **D5 cap** | **30 seconds**, hard stop | Long enough to keep a passage; short enough not to become an editor. |
| **D5 mime** | Feature-detect: **WebM first** (`video/webm` VP9+Opus, then VP8+Opus), **MP4** (`video/mp4`) only if WebM `isTypeSupported` is false | Chromium vs Safari fork (`00` Pattern 3). Never assume. |
| **E4 fps** | `captureStream(30)`; rAF stays display refresh | `01` E4. Reopen fps only if 30 fails Chromium self-use — do not uncap duration or raise pixel ratio instead. |
| **D9 graph** | Fan-out on the existing source node; one dest per session; `disconnect()` in `stop` (and on error/teardown) | Implementation of locked tap law. No second `AudioContext`. |

JSON download is M00 serialize at Keep time (or beside it). Clip does not embed the document; they are two artifacts (`01` §2.1).

**Tier B (not this card):** WebCodecs / Mediabunny mux if WebM fails self-use. Do not require it for Tier A (`02` §5.1).

---

## 3. Alternatives rejected

| Rejected | Why |
|----------|-----|
| Second renderer / export composer / `toDataURL` after present | Breaks one-engine and `preserveDrawingBuffer: false` (`01` §2.3). |
| `element.captureStream` on a wrapper that includes HUD | HUD in clip (`02` §4.7). |
| Uncapped MediaRecorder | Video product. |
| WebCodecs as Tier A requirement | Later tier if MediaRecorder already keeps a clip. |
| Timeline trimmer, stems, cloud transcode, NDI | `00` §7; `02` §3. |
| Treating silence as “at least we got video” | Constitutional failure. |

---

## 4. Admission test vs `02` §8

| # | Question | Yes/no |
|---|---------|--------|
| 1 | Document truth? | **Yes** — clip is honestly *not* document state; JSON is M00. Time lives here. |
| 2 | Interpretation-only? | **Yes** — does not rewire looks to FFT. |
| 3 | One engine? | **Yes** — same canvas stream. |
| 4 | Tier A? | **Yes** — required Keep door; not WebCodecs-from-zero. |
| 5 | Closed registry? | **Yes** — no new look. |
| 6 | Honest coverage? | **Yes** — keepable loop (`00` RQ2). |
| 7 | Sliders ≡ talk? | **N/A** (not a control schema). Must not grow private look fields. |
| 8 | Hidden second product? | **No** if 30s + local Blob; a DAW/export suite would fail — **do not build that**. |
| 9 | Still refuse misuse? | **Yes** — no arrangement, no “make a music video.” |

§9: silent Keep, HUD capture, pixel-ratio vanity, second renderer — refuse.

---

## 5. Tiny decision log

| # | Decision | Status |
|---|----------|--------|
| `01` §8.2 / E5 / E11 | Tap + disconnect; HUD out; same canvas | **Locked** |
| D5 cap | **30 s** | **Proposal** |
| D5 mime | WebM first, MP4 if needed, always `isTypeSupported` | **Proposal** |
| E4 | `captureStream(30)` | **Proposal** (reopen only if self-use fails) |
| MP4 muxer / WebCodecs | Tier B | **Locked deferred** |

---

## 6. Operator summary

**Build:** start/stop MediaRecorder on `renderer.domElement` + audio tap; feature-detected mime; 30s cap; fail if silent or tainted; download Blob + M00 JSON. Mic tap required.

**Do not build:** a video editor, second renderer, HUD-in-file, WebCodecs requirement, Uncapped sessions, ffmpeg, or “success” mute files.

---

## 7. Citations

- In-repo: [`01_ENGINE.md`](../01_ENGINE.md) §8.2; [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md) Pattern 3; [`02_CONSTITUTION.md`](../02_CONSTITUTION.md) §4.2, §7.8.
- Primary API: [MDN `HTMLCanvasElement.captureStream`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) · [MDN `AudioContext.createMediaStreamDestination`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamDestination) · [MDN `MediaRecorder.isTypeSupported`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static).
