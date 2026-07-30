# C4 diagrams — Sound Visualiser

Official-style C4 views built **bottom-up from this repo’s code**. Labels are plain
English; IDs are stable kebab-case for portfolio zoom tooling.

## How to read (zoom path)

| Level | What it answers | Files |
| --- | --- | --- |
| **C1 Context** | Who uses it, and which browser / host capabilities it depends on | [`1-context.mmd`](./1-context.mmd) · [`1-context.md`](./1-context.md) |
| **C2 Containers** | In-tab runtime partitions of the single static SPA | [`2-containers.mmd`](./2-containers.mmd) · [`2-containers.md`](./2-containers.md) |
| **C3 Components** | Internals of containers that need a zoom | [`3-components/`](./3-components/) |

There is no C4 **Code** level (no class diagrams). Narrative case study:
[`../ARCHITECTURE.md`](../ARCHITECTURE.md). Tuning/reference: [`../PROJECT.md`](../PROJECT.md).

**Zoom:** Context system box → Containers → (optional) Component diagram for
`audio-engine`, `interpretation`, or `vj-scene`. Machine index:
[`portfolio-map.json`](./portfolio-map.json).

## Component zooms (C3)

| Container id | Diagram |
| --- | --- |
| `audio-engine` | [`3-components/audio-engine.mmd`](./3-components/audio-engine.mmd) |
| `interpretation` | [`3-components/interpretation.mmd`](./3-components/interpretation.mmd) |
| `vj-scene` | [`3-components/vj-scene.mmd`](./3-components/vj-scene.mmd) |

Containers without a C3 file (`glass-ui`, `demo-asset`, `feature-snapshot`, `render-loop`,
`video-capture`, `webgl-canvas`) are thin enough that C2 + source paths suffice.

## Portfolio fetch

Root [`portfolio.yaml`](../../portfolio.yaml):

- `diagram:` → [`2-containers.mmd`](./2-containers.mmd) (default architecture map)
- `c4:` → [`portfolio-map.json`](./portfolio-map.json) (Context → Containers → Components index)
- `links.docs` → this README on GitHub

Optional visitor overview (collapsed storytelling Mermaid, not the C4 SoT):
[`../architecture.mmd`](../architecture.mmd).

The old flowchart IR lived at `docs/architecture.graph.json` and is archived under
[`../archive/`](../archive/README.md).