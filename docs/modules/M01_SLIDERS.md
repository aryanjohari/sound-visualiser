# M01 — Sliders

**Status:** research card  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Depends on:** [`VISION.md`](../VISION.md), [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md), [`01_ENGINE.md`](../01_ENGINE.md), [`02_CONSTITUTION.md`](../02_CONSTITUTION.md), [`M00_LOOK_DOCUMENT.md`](M00_LOOK_DOCUMENT.md)  
**Purpose:** Semantic knobs write the **same** look document M00 applies. Unify today’s two writers. HUD stays a DOM view.

---

## 0. Question of this module

How should the operator nudge look id, sync policy, and closed axes from the glass panel — without a second schema, without raw FFT wiring, and without turning the tab into a VJ cockpit?

VISION: lab looks change the **look document**, not bins. `02` §4.4: sliders and talk MUST share one writer. Talk is not this card.

---

## 1. What it wraps in `src/`

| File | Verdict | Why |
|------|---------|-----|
| `src/main.ts` | **WRAP** | `selectMode` / `selectSync` and keys `1/2/3` / `S` must call M00 `apply` (or `patch` → validate → apply). Status readout stays a **view**. |
| `index.html` `#ui` / `src/styles.css` | **KEEP** | Glass HUD is not an organ (`01` E5). Do not composite it into Keep (M02). |
| `src/webgl/Scene.ts` / `Loop.ts` | **KEEP** | No direct mode/sync writes from UI after wrap. |
| Acid / Live / Cinematic layers | **KEEP** | Axis multipliers already belong at uniform writes (M00). Sliders do not touch GLSL. |
| `src/shaders/liveFeed.frag.glsl` | **KEEP** frozen | No slider-authored shader. |

**Do not rewrite** the interpretation bus. Sliders never call `BeatSync` or publish `powerSpectrum`.

---

## 2. Contract / decisions (fail-closed)

- **Fields:** only `lookId`, `syncPolicy`, and the six M00 axes. Unknown slider ids do not exist.
- **Write path:** UI event → absolute `Patch` → M00 validate → M00 apply. Same function talk will use (M04).
- **Defaults:** every axis `1` = shipped v1. Range `[0, 2]`. Out of range is a validator reject, not a clamp-and-lie in the document (`01` E7). The control may visually clamp before emit.
- **Inert axes:** still shown or still stored; apply no-ops them. Do not hide them from the document when look id is cinematic (`01` §6.3).
- **UI covers (proposal, medium scrutiny `02` §10):** the panel may expose **fewer** knobs than registry fields (e.g. look + sync + intensity, with Acid extras when `lookId === "acid"`). Covers still write registry keys. No new axis names.
- **Live bus stays off the sliders:** no BPM, confidence, mood-weight, or band knobs. Those are interpretation, not document (`01` §6.4).
- Offline / no talk: sliders still work (VISION; `00` RQ3 mitigation).

---

## 3. Alternatives rejected

| Rejected | Why |
|----------|-----|
| Two writers forever (`selectMode` vs future talk) | Breaks `02` §4.4. |
| Per-uniform mixer (`u_feedbackAmount` as a slider) | Document would dump live uniforms; identity `1` would not mean v1. |
| FFT / band sliders | Interpretation-only law (`02` §2.3). |
| New axis names (“acid-ness”, “cinema bloom”) | Closed registry (`01` E3). |
| MIDI / OSC / deck faders | VJ I/O (`00` D11; `02` §3). |
| Editing GLSL from a textarea | Playground; Live frozen. |

---

## 4. Admission test vs `02` §8

| # | Question | Yes/no |
|---|---------|--------|
| 1 | Document truth? | **Yes** — knobs are document fields, not view-only CSS. |
| 2 | Interpretation-only? | **Yes** — no bin wiring. |
| 3 | One engine? | **Yes** — HUD is a view on the same draw. |
| 4 | Tier A? | **Yes** — semantic sliders are required (`02` §5.1). |
| 5 | Closed registry? | **Yes** — no fourth look, no new axes. |
| 6 | Honest coverage? | **Yes** — covers existing multipliers; optional fewer knobs. |
| 7 | Sliders ≡ talk? | **Yes** — this *is* the slider half of the shared writer. |
| 8 | Hidden second product? | **No** if the panel stays small; a Resolume-class mixer would fail — **do not build that**. |
| 9 | Still refuse misuse? | **Yes** — no MIDI hole, no shader slider. |

§9: do not capture HUD (M02); do not expand Tier A into a cockpit.

---

## 5. Tiny decision log

| # | Decision | Status |
|---|----------|--------|
| `01` §9 | One apply writer for sliders + talk | **Locked** |
| `01` E3 | Closed axes only; default 1 | **Locked** |
| This card | Mode/sync keys route through M00 | **Locked** |
| This card | Exposed cover set (how many knobs) | **Proposal** — fewer than six is fine; names must match registry |
| M04 | Talk | **Not this module** |

---

## 6. Operator summary

**Build:** wire existing look + sync controls (and a small set of axis knobs) through M00 apply. Keep the glass panel as HUD.

**Do not build:** a VJ mixer, FFT sliders, new axis vocabulary, MIDI, talk, capture, or shader editors.

---

## 7. Citations

- In-repo: [`01_ENGINE.md`](../01_ENGINE.md) §9; [`02_CONSTITUTION.md`](../02_CONSTITUTION.md) §4.4; `src/main.ts` `selectMode` / `selectSync`.
- Field: `00` RQ3 dual-path — talk and sliders write the same document; sliders remain if talk is absent.
