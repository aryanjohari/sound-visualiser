# M04 — Talk

**Status:** research card (optional organ)  
**Date:** 2026-09-19  
**Branch:** `look-instrument/v1`  
**Depends on:** [`VISION.md`](../VISION.md), [`00_FIELD_RESEARCH.md`](../00_FIELD_RESEARCH.md), [`01_ENGINE.md`](../01_ENGINE.md), [`02_CONSTITUTION.md`](../02_CONSTITUTION.md), [`M00_LOOK_DOCUMENT.md`](M00_LOOK_DOCUMENT.md), [`M02_CAPTURE.md`](M02_CAPTURE.md)  
**Purpose:** One-shot language → validated look **patch**, same writer as M01. Admissible **only after** M00 JSON and M02 capture do not lie. Not a shader author, not an agent.

---

## 0. Question of this module

Once look JSON round-trips and Keep clips have picture + soundtrack, should a short sentence (“more acid,” “calmer,” “lock to the beat”) route onto the **closed** document — fail-closed to sliders — without audio, pixels, or GLSL in the prompt?

VISION: LLM is a small router. `02` §5.1 / E10: talk MAY NOT consume Tier A before Keep is honest. If M00 or M02 still lie, **do not implement this card**.

---

## 1. What it wraps in `src/`

| File | Verdict | Why |
|------|---------|-----|
| M00 apply / validate | **WRAP** | Talk emits `Patch`; merge against current document; **same** `apply` as sliders. |
| `src/main.ts` | **WRAP** | Optional text field on `#ui`. Failure copy; sliders remain. HUD still not in the clip. |
| `src/webgl/*` looks, shaders | **KEEP** | GPU never sees prose. Live fragment stays frozen. |
| `src/audio/AudioEngine.ts` | **KEEP** | **Zero** spectrum / audio bytes in the request (`02` §6). |
| `src/webgl/BeatSync.ts` | **KEEP** | Talk may set `syncPolicy`; it does not retune the tracker. |

No talk files until M00 + M02 are truthful. This organ is named in `01` §3 as **optional A**.

---

## 2. Contract / decisions (fail-closed)

**Sequence (locked):** implement **after** M00 round-trip + M02 silent-clip-is-fail. Not in parallel as a “chat demo.”

**Turn (copy Prism router *discipline*, not the stills schema):**

- Prompt = user sentence + **current look document JSON**. Nothing else.
- Response schema = `{ lookId?, syncPolicy?, axes? }` with closed enums and `[0, 2]` numbers (structured outputs). Absolute fields; the server/router may interpret “more acid” against the current doc **before** the client validator sees numbers (`01` §7).
- Invalid JSON / unknown field / timeout / 4xx → **no-op**. Sliders still work.
- Refuse: “write me a shader,” “make a music video,” “dump MilkDrop,” audio/pixel payloads, extra keys.

**D6 provider — proposal, not locked:** unset until this card’s impl pass. Gemini `responseSchema` *or* OpenAI structured outputs are both FEASIBLE (`00` D6; `01` §9). Pick one at implementation; both must be:

- server-held API key (no `VITE_` client secret)
- schema-constrained JSON, not free chat
- one shot, not a tool-calling agent

Multi-turn document-diff talk is **Tier B** (`01` §3 stub). Tap-tempo is not talk.

---

## 3. Alternatives rejected

| Rejected | Why |
|----------|-----|
| Talk before truthful JSON/clip | Violates `02` §5.1 sequencing. |
| Audio / canvas / webcam in the prompt | `02` §6 prompt law. |
| LLM-authored GLSL (AI Co-Artist) | Anti-pattern (`00` Pattern 4; `02` §3). |
| Private talk schema (“mood JSON” ≠ M00) | Breaks sliders ≡ talk. |
| Client-bundled keys | Unsafe; Prism discipline. |
| CoSTA* / multi-tool agent | Paper, not v1 (`00` E). |
| Making talk required for Tier A | Optional; sliders cover the loop. |

---

## 4. Admission test vs `02` §8

| # | Question | Yes/no |
|---|---------|--------|
| 1 | Document truth? | **Yes** — patches are M00 fields only. |
| 2 | Interpretation-only? | **Yes** — no FFT/pixels/audio in the model. |
| 3 | One engine? | **Yes** — GPU still draws the three looks. |
| 4 | Tier A? | **Yes, optional and last.** If this card jumps the queue, it **fails** — shrink by not shipping until M00+M02 pass. |
| 5 | Closed registry? | **Yes** — cannot invent a fourth look or axis. |
| 6 | Honest coverage? | **Yes** — convenience writer for existing axes, not new looks. |
| 7 | Sliders ≡ talk? | **Yes** — same apply; talk cannot express what sliders cannot. |
| 8 | Hidden second product? | **No** if one-shot router; an “agentic VJ” would fail — **do not build that**. |
| 9 | Still refuse misuse? | **Yes** — unknown ops reject; “write a shader” has no organ. |

§9: AI-as-author, expanding Tier A before Keep is honest, FFT in the prompt — refuse. If admission wobbles, **cut talk**, do not grow it.

---

## 5. Tiny decision log

| # | Decision | Status |
|---|----------|--------|
| D7 / `02` §6 | Router only; zero audio/pixels | **Locked** |
| E10 | Optional A **after** JSON + capture | **Locked** |
| D6 provider | Gemini vs OpenAI | **OPEN proposal** — unset until impl; copy Prism discipline |
| Multi-turn / vision | Tier B / refuse | **Locked deferred / refuse** |
| RQ3 prompt set (~30) | Eval later (`00` D12) | **OPEN** — not a ship gate for sliders |

---

## 6. Operator summary

**Build (only after M00 + M02):** one server route, structured patch, M00 apply, fail closed to sliders. Provider chosen at impl time.

**Do not build:** talk first, client keys, pixels/audio in prompts, shader authorship, multi-turn agents, a second look language, or a required chat box.

---

## 7. Citations

- In-repo: [`01_ENGINE.md`](../01_ENGINE.md) §9, E10; [`02_CONSTITUTION.md`](../02_CONSTITUTION.md) §5.1, §6; [`VISION.md`](../VISION.md) “LLM is a small router.”
- Field + API: `00` Pattern 4; [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs); [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Sibling: Prism M03 talk router — **discipline only**, still-image domain stays there.
