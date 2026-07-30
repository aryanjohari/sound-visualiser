# C3 — interpretation

Zoom of container `interpretation`. Each `requestAnimationFrame`, `Loop`
(`src/webgl/Loop.ts`) runs three analysers in a fixed order, then merges them into one
`VJState`.

| Component | File | Role |
| --- | --- | --- |
| Loop sequencer | `src/webgl/Loop.ts` | Owns `MoodAnalyzer` + `BeatSync`; also arbitrates camera Z-dolly punches (downbeat vs flux) |
| StateManager | `src/webgl/StateManager.ts` | Frame-rate-independent smoothing into `rave` ↔ `cinematic` plus fast `lightningFlash` |
| MoodAnalyzer | `src/webgl/MoodAnalyzer.ts` | calm / groove / intense as a normalized weight vector (partition of unity) |
| BeatSync | `src/webgl/BeatSync.ts` | Onset pick, 60–180 BPM vote (+ octave tiebreak), PLL phase, product-form confidence |

## Design notes (evidence in ARCHITECTURE)

- Mood is blended continuously — not a hard preset switch.
- Beat sync never hard-gates most parameters:
  `final = unsynced + (synced − unsynced) * confidence` (applied in visual layers).
- Peak-relative normalization lives in these consumers (and layers), not as absolute gain.
- `CONFIDENCE_THRESHOLD` (0.45) only sets `syncActive` for discrete events (e.g. downbeat
  dolly); continuous blend still uses the raw confidence score.

## Ownership note

`StateManager` is constructed in `main.ts` and injected into `Loop`; mood and beat live
inside `Loop`. Treated as one container because they form one per-frame ladder.

## Boundaries

- Upstream: latest features from `audio-engine`.
- Downstream: `VJState` drives `vj-scene` (and camera impulses in `Loop`).

Diagram: [`interpretation.mmd`](./interpretation.mmd).