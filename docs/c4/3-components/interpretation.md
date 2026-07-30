# C3 — interpretation

Zoom of container `interpretation`. The frame loop (`src/webgl/Loop.ts`) runs three
analysers in a fixed order each `requestAnimationFrame`, then merges them into one
`VJState`.

| Component | File | Role |
| --- | --- | --- |
| `StateManager` | `src/webgl/StateManager.ts` | Frame-rate-independent smoothing into `rave` ↔ `cinematic` plus fast `lightningFlash` |
| `MoodAnalyzer` | `src/webgl/MoodAnalyzer.ts` | calm / groove / intense as a normalized weight vector (partition of unity) |
| `BeatSync` | `src/webgl/BeatSync.ts` | Onset pick, 60–180 BPM vote, PLL phase, confidence blend weight |

## Design notes (evidence in ARCHITECTURE)

- Mood is blended continuously — not a hard preset switch.
- Beat sync never hard-gates most parameters: `final = unsynced + (synced − unsynced) * confidence`.
- Peak-relative normalization lives in these consumers (and layers), not as absolute gain.

## Boundaries

- Upstream: latest features from `audio-engine`.
- Downstream: `VJState` drives `vj-scene` (and camera impulses in `Loop`).

Diagram: [`interpretation.mmd`](./interpretation.mmd).
