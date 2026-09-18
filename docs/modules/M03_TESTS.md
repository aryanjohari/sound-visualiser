# M03 — Tests

**Status:** research card  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Depends on:** [`VISION.md`](../VISION.md), [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md), [`01_ENGINE.md`](../01_ENGINE.md), [`02_CONSTITUTION.md`](../02_CONSTITUTION.md), [`M00_LOOK_DOCUMENT.md`](M00_LOOK_DOCUMENT.md)  
**Purpose:** Lock BeatSync and MoodAnalyzer as testable law so a later change cannot silently reintroduce threshold-pop. Do not rewrite the tracker.

---

## 0. Question of this module

Can tempo vote (60–180), octave tiebreak, product confidence, and mood partition of unity be tested as **pure functions** well enough that “simplify to `if (syncActive)`” fails CI — without claiming MIREX SOTA or rebuilding BeatSync?

`00` RQ5; `02` §4.5. Visual regression farms and golden GPU screenshots are out of lane for this sometimes-used instrument.

---

## 1. What it wraps in `src/`

| File | Verdict | Why |
|------|---------|-----|
| `src/webgl/BeatSync.ts` | **KEEP** + **TEST** | IOI vote, double-period match, median-IOI octave tiebreak, product confidence (onset count × consistency × BPM stability × energy gate × warmup). **Do not rewrite** to madmom / AudioWorklet BPM (`00` D8). May **export helpers** used by `estimateBpm` / `updateConfidence` without changing the live `update()` path (`01` §13). |
| `src/webgl/MoodAnalyzer.ts` | **KEEP** + **TEST** | `calm + groove + intense ≈ 1` after normalize; no snap between named moods as the only driver. |
| `src/webgl/Loop.ts` | **KEEP** | Pull-model rAF stays. Do not extract a second live engine “for tests.” |
| M00 validate/apply | **TEST** | Round-trip + reject unknown keys / FFT-shaped fields. Cheap; belongs with the document organ. |
| Layers / shaders / Three.js | **KEEP** | No GPU screenshot suite in Tier A (`00` D10). |

`package.json` has **no runner today** (`01` E14). Vite 8 already drives the app.

---

## 2. Contract / decisions (fail-closed)

**Must lock (fixtures, not live mic):**

1. **Tempo vote 60–180** — synthetic IOIs at a known period score the expected BPM band; periods outside the window do not invent a lock.
2. **Octave tiebreak** — when best/second BPM are ~2:1, median IOI prefers the period closer to the median (`BeatSync.estimateBpm`).
3. **Product confidence** — silence / empty interval buffer keeps confidence low; a “threshold switch” helper that ignores the blend equation must be easy to fail against `final = unsynced + (beat − unsynced) * confidence` (`01` §5.2). Export a tiny `blendSync(unsynced, beat, weight)` if Acid’s copy is the production one — **do not** duplicate a second blend in tests only.
4. **Mood partition** — weights sum to ~1 (`1e-6` tolerance); a fixture must not snap 1.0/0/0 in one frame unless that is actually the math (it interpolates).
5. **Look JSON** — identity axes `1`; extra key / `powerSpectrum` / bad `lookId` → reject.

**Proposal (D10 / E14 — not a fake lock on fixtures, runner is picked here as a proposal):**

| Item | Proposal |
|------|----------|
| **Runner** | **Vitest** in Vite mode (`vitest` + existing `vite.config.ts`). Lightweight; same ESM/TS as `src/`. No Playwright, no browser GPU farm. |
| **Fixtures** | Synthetic IOI lists + mood-weight inputs in-repo. Optional later: a short golden-track **log** of features (not the mp3 in CI). MIREX F-measure **not measured**. |
| **Scripts** | `npm test` → vitest. Do not block `npm run dev`. |

If a known 2:1 octave fixture or silent-gate fixture fails in the tab while tests pass, the tests are lying — shrink helpers until they call the same functions the live class uses (`00` RQ5 falsifier).

---

## 3. Alternatives rejected

| Rejected | Why |
|----------|-----|
| Rewrite BeatSync to madmom / realtime-bpm-analyzer “so it is testable” | Tests wrap the shipped tracker (`00` D8; `02` §3). |
| Visual regression / Percy / screenshot Acid | Not Tier A; GPU not measured (`00` D10). |
| Playwright Keep E2E as a gate | Mime/tap are browser-real; optional later, not the organ. |
| Claiming SOTA F-measure | Honesty law (`00` H; `02` §3). |
| Jest-only extra toolchain | Heavier than Vitest next to Vite 8. |

---

## 4. Admission test vs `02` §8

| # | Question | Yes/no |
|---|---------|--------|
| 1 | Document truth? | **Yes** — tests are not look-JSON fields; M00 round-trip tests protect the document. |
| 2 | Interpretation-only? | **Yes** — no FFT-uniform harness here (that is RQ1 later, same shaders). |
| 3 | One engine? | **Yes** — export helpers; do not fork a test renderer. |
| 4 | Tier A? | **Yes** — required (`02` §5.1). |
| 5 | Closed registry? | **Yes**. |
| 6 | Honest coverage? | **Yes** — locks blend + partition, not a preset dump. |
| 7 | Sliders ≡ talk? | **N/A**. |
| 8 | Hidden second product? | **No** if unit-only; a CI video lab would fail — **do not build that**. |
| 9 | Still refuse misuse? | **Yes** — tests are not an excuse to add Link or a fourth look. |

§9: do not rewrite BeatSync “for coverage.”

---

## 5. Tiny decision log

| # | Decision | Status |
|---|----------|--------|
| D8 / D10 | Keep BeatSync; unit-test vote / octave / confidence / mood | **Locked** |
| E14 runner | **Vitest** (Vite) | **Proposal** (fits this repo; not a second product) |
| D10 fixture tracks | Synthetic IOIs first; golden audio log later | **Proposal** |
| D12 eval rubric (~8 tracks × 3 looks) | Human musical-feel | **OPEN** — not this module |
| RQ1 FFT A/B harness | Later; no new shaders | **Not Tier A tests** |

---

## 6. Operator summary

**Build:** Vitest + exported BeatSync/Mood/M00 helpers; synthetic fixtures for vote, octave, silence/confidence, mood sum, JSON reject.

**Do not build:** a BeatSync rewrite, MIREX pipeline, screenshot farm, WebCodecs tests as a gate, or Link “because mixed material is hard.”

---

## 7. Citations

- In-repo: [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md) RQ5, D10; [`01_ENGINE.md`](../01_ENGINE.md) §10.4–10.5, E14; `src/webgl/BeatSync.ts` (`estimateBpm`, `updateConfidence`).
- Field: Dixon graceful degradation — [DOI 10.1080/09298210701653310](https://doi.org/10.1080/09298210701653310) (`00` Pattern 2). Confidence **blends**; tests must punish a boolean switch.
