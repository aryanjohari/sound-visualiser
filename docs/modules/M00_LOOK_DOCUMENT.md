# M00 — Look document

**Status:** research card  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Depends on:** [`VISION.md`](../VISION.md), [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md), [`01_ENGINE.md`](../01_ENGINE.md), [`02_CONSTITUTION.md`](../02_CONSTITUTION.md)  
**Purpose:** Make the look a keepable document. One fail-closed schema, one apply writer. Wrap `src/`. No fourth look, no FFT in JSON, no new GLSL.

---

## 0. Question of this module

How should this sometimes-used instrument serialize *how* it listens and draws — three named looks, closed semantic axes, sync policy — so that reload equals the live look, sliders and later talk share one writer, and neither FFT nor shader source ever enter the file?

This is policy over a live interpretation stream, not a timeline and not Prism still-recipe pixels (`00` §11.C; `01` §2; VISION keep door).

---

## 1. What it wraps in `src/`

| File | Verdict | Why |
|------|---------|-----|
| `src/webgl/Scene.ts` (`VisualMode`) | **KEEP** + **WRAP** | `lookId` is already `cinematic \| live \| acid`. Apply calls `setVisualMode`. No fourth mode. |
| `src/webgl/Loop.ts` (`SyncMode`) | **KEEP** + **WRAP** | `syncPolicy` is already `auto \| off`. Apply calls `setSyncMode`. |
| `src/webgl/layers/AcidFeedLayer.ts` | **KEEP** + **WRAP** | Multiply mood-table math by document axes **before** existing caps (0.62 feedback, kaleido `[1,8]`). Warp-align stays. |
| `src/webgl/layers/LiveFeedLayer.ts` | **KEEP** + **WRAP** | `intensity` / `glitch` multipliers only. **Do not** edit `src/shaders/liveFeed.frag.glsl`. |
| Cinematic layers (`Director.ts`, `EnvironmentLayers.ts`, `AnchorLayer.ts`, `PostProcessing.ts`) | **KEEP** + **WRAP** | `intensity` on existing `state.rave` / bass paths. No second composer. |
| `src/main.ts` `selectMode` / `selectSync` | **WRAP** | Two writers today. This module owns the **one** apply function they must call. |
| `src/audio/AudioEngine.ts` | **KEEP** | `powerSpectrum` stays inside. Never a JSON field. |
| `src/webgl/layers/VoidLayer.ts` | **CUT** from this organ | Not a look. Do not serialize it. |
| *(none today)* | **WRAP** (new files beside `src/`) | Schema + `parse` / `serialize` / `validate` / `apply`. Not a second renderer. |

**Do not rewrite:** BeatSync, Acid warp-aligned feedback, pull-model rAF, Three.js drawer.

---

## 2. Contract / decisions (fail-closed)

Shape is locked in `01` §7. Restate, do not reopen:

```text
LookDocument {
  schemaVersion: 1
  lookId: "cinematic" | "live" | "acid"
  syncPolicy: "auto" | "off"
  axes: { intensity, feedback, fold, hue, glitch, melt }  // each 0..2, default 1
}

Patch { lookId?, syncPolicy?, axes?: { [closedAxis]: number } }  // absolute values
```

- Unknown `schemaVersion` / look id / sync / axis key / extra top-level key / non-finite / out of `[0, 2]` → **reject the whole document**. No partial apply (`02` §7.6).
- Missing axes → fill **`1`** (identity with shipped v1).
- Inert axes (e.g. `feedback` on cinematic) **store** and **no-op** on apply so look-id switches round-trip (`01` §6.3).
- Forbidden in JSON: `powerSpectrum`, bins, rms series, GLSL, blobs, webcam, BPM, mood weights, smear, `u_time`, automation curves.
- Round-trip: `apply(parse(serialize(doc)))` yields the same `lookId`, `syncPolicy`, axes. Reloading does **not** replay the track (`02` §1).
- **One writer:** `apply(validatedDoc)` is the only mutation of mode, sync, and axis multipliers. Talk (M04) and sliders (M01) emit patches; merge + validate + apply here.

---

## 3. Alternatives rejected

| Rejected | Why |
|----------|-----|
| Butterchurn / MilkDrop JSON | Per-frame equations — wrong grain (`00` Pattern 1). |
| Dumping live uniforms / FFT into the file | Abandons interpretation-as-truth (`00` D3; `02` §2.3). |
| URL catalog `?preset=acid` without axes | Not a document; identity reload fails (`01` §7 X). |
| Fourth look / wiring `VoidLayer` | Different product (`02` §3). |
| Relative deltas in the validator | Router (later) turns “more acid” into **absolute** numbers against the current doc (`01` §7). |
| Second apply path for Keep vs lab | One engine (`02` §2.1). |

---

## 4. Admission test vs `02` §8

| # | Question | Yes/no |
|---|---------|--------|
| 1 | Preserve document truth? | **Yes** — this *is* the document. Live bus stays out. |
| 2 | Interpretation-only? | **Yes** — no FFT / pixels / audio in JSON. |
| 3 | One engine? | **Yes** — apply wraps existing Three.js looks. |
| 4 | Tier A? | **Yes** — required for the keepable loop (`02` §5.1). |
| 5 | Closed registry? | **Yes** — three looks, six axes, two sync values. |
| 6 | Honest coverage? | **Yes** — serializes shipped looks; does not add looks. |
| 7 | Sliders ≡ talk? | **Yes** — one writer; M01/M04 must not grow a private schema. |
| 8 | Hidden second product? | **No** — not a preset ocean or recipe compositor. |
| 9 | Still refuse misuse? | **Yes** — unknown fields reject; “write a shader” has nowhere to land. |

§9 refusal: no new GLSL, no FFT leak, no `VoidLayer`, no rewrite of `src/`.

---

## 5. Tiny decision log

| # | Decision | Status |
|---|----------|--------|
| `01` D2 / E3 | Three looks; axes `intensity/feedback/fold/hue/glitch/melt` default **1** | **Locked** |
| `01` E2 | `schemaVersion: 1`; unknown → reject | **Locked** |
| `01` E7 / E15 | Fail-closed; missing axes → 1 | **Locked** |
| This card | One `apply` writer; patches are absolute | **Locked** |
| M04 | Talk provider | **OPEN** — not this module |
| D5 | Clip mime / cap | **OPEN** — M02 |

---

## 6. Operator summary

**Build:** a small validate/serialize/parse/apply around existing `VisualMode` / `SyncMode` / uniform-write sites. Identity document = shipped v1. JSON download + reload in the lab tab.

**Do not build:** a fourth look, GLSL in JSON, FFT fields, MilkDrop dump, Prism `objects[]`, a second renderer, BeatSync rewrite, talk, or capture (those are later cards).

---

## 7. Citations

- In-repo: [`01_ENGINE.md`](../01_ENGINE.md) §6–7, §13; [`02_CONSTITUTION.md`](../02_CONSTITUTION.md) §2.2, §7.5–7.7; [`VISION.md`](../VISION.md) keep door.
- Field pattern: Recur URL patches as whole-document grain, not media (`00` Pattern 1; [recur_web](https://github.com/thedirgemedia/recur_web)).
