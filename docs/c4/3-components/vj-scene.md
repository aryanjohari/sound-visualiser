# C3 — vj-scene

Zoom of container `vj-scene` (`src/webgl/Scene.ts` and `src/webgl/layers/`).

## Mode routing

`VJScene` serialises mode changes and owns webcam attach/detach. Three modes:

| Mode | What draws | Notes |
| --- | --- | --- |
| **Cinematic** | 3D layers + `EffectComposer` chromatic aberration | Fluid sphere, particle knot, lights, GSAP camera (`Director`) |
| **Live** | `LiveFeedLayer` fullscreen quad | Frozen reference webcam look; no composer |
| **Acid** | `AcidFeedLayer` + ping-pong FBOs | Shared helpers from `liveFeedCommon.glsl`; warp-aligned feedback |

3D layers still update while Live/Acid are on screen so switching back to Cinematic is
instant (documented tradeoff: extra CPU).

## Webcam

Entering Live or Acid starts `VideoCapture` and shares one `VideoTexture` with both feed
layers. Returning to Cinematic stops tracks and clears feedback. Live ↔ Acid keeps the
camera and only clears FBO smear.

## Not on the diagram

`VoidLayer` / `voidFog` exist under `layers/` and `shaders/` but are not wired into
`Scene.ts` (dead path; see ARCHITECTURE tradeoffs).

Diagram: [`vj-scene.mmd`](./vj-scene.mmd).
