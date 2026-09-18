# Sound Visualiser — border vision (draft)

**Status:** v1 lives on `main` (demo: https://music.arkhives.nz). This pass is on `look-instrument/v1`.  
Never force-rewrite `main`.

A personal **lab + sometimes-used tool**: music in, a look that follows the song, a clip you can keep. Built for Aryan. Frequency: sometimes — ADA is the daily system; Prism is stills.

v1 already ships the engine (mic / file / demo, Cinematic / Live / Acid, mood, beat-with-confidence). This branch is a **product pass**, not a new renderer.

**North star:** play a track → live look follows the interpretation (energy, mood, beat) → optional talk nudges the look → export a short local clip + a serializable look JSON.

**Two doors, one engine:** lab | keep.

- **Lab** — full-screen live tab. Looks and talk change the **look document**, not raw FFT wiring.
- **Keep** — WebM/MP4 clip (canvas + audio, stays on the machine) + look JSON you can reload. Not a video product, not a site builder.

Constraints for later engine brainstorm (soft):

- Interpretation is truth. Looks read mood / beat / energy, never raw bins. Confidence blends beat-lock in; it does not switch.
- LLM is a small router: intent → validated JSON patch on a closed look schema (“more acid,” “calmer,” “lock to the beat”). GPU does the drawing. No audio or pixels in the prompt. Talk and sliders write the same document.
- Three named looks in this pass: Cinematic, Live, Acid. No fourth mode. No MilkDrop preset dump. No GLSL playground.
- Not a DAW, not Resolume, not VJam, not Hydra. No MIDI / OSC / Link / NDI. No generative video, no AI-written shaders, no music generation.
- Not Prism (still photos) and not ADA (embodied agent). Siblings; don’t duplicate.
- Short local recording is in-lane. A timeline, arrangement, or “export markers to Ableton” is not.
- Don’t ship something I wouldn’t open myself. GitHub alone is not the reason to build.
- Process: this file → `00` field → `01` engine → `02` constitution → module cards → code. New shaders only after `01` names organs.

**Feeds:** [`00_FIELD_RESEARCH.md`](00_FIELD_RESEARCH.md) · [`01_ENGINE.md`](01_ENGINE.md) · [`02_CONSTITUTION.md`](02_CONSTITUTION.md) · [`modules/`](modules/README.md)

Done when this file can be read in under a minute and would stop someone from rebuilding VJam, a particle toy, or an AI video app.
