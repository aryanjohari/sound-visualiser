# C4 diagrams — Sound Visualiser

C4 views of this repo for humans and for machines. Labels are plain English; IDs are
stable kebab-case so portfolio tooling and Dive links stay consistent.

## How to read

| Level | What it answers | Files |
| --- | --- | --- |
| **C1 Context** | Who uses it, and which browser / host capabilities it depends on | [`1-context.mmd`](./1-context.mmd) · [`1-context.md`](./1-context.md) |
| **C2 Containers** | Major runnable pieces inside the browser tab (default architecture map) | [`2-containers.mmd`](./2-containers.mmd) · [`2-containers.md`](./2-containers.md) |
| **C3 Components** | Internals of containers that need a zoom | [`3-components/`](./3-components/) |

There is no C4 **Code** level here (no class diagrams). Implementation detail lives in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) and [`../PROJECT.md`](../PROJECT.md).

## Component zooms (C3)

| Container id | Diagram |
| --- | --- |
| `audio-engine` | [`3-components/audio-engine.mmd`](./3-components/audio-engine.mmd) |
| `interpretation` | [`3-components/interpretation.mmd`](./3-components/interpretation.mmd) |
| `vj-scene` | [`3-components/vj-scene.mmd`](./3-components/vj-scene.mmd) |

Which containers have zooms is also listed in [`portfolio-map.json`](./portfolio-map.json).

## Portfolio fetch artifacts

The portfolio site (`aryan-portfolio`) loads architecture at build time from the repo root
[`portfolio.yaml`](../../portfolio.yaml):

- `diagram:` → [`../architecture.mmd`](../architecture.mmd) (visitor Mermaid flowchart, aligned with C2)
- `graph:` → [`../architecture.graph.json`](../architecture.graph.json) (preferred map IR — collapsed from C2, with tour + captions)

Start with the graph for a walkthrough; open C2 when you want the full container map; open
a C3 file when you need internals of one box.

## Design case study

Narrative (goals, unique algorithms, tradeoffs, local verify steps):
[`../ARCHITECTURE.md`](../ARCHITECTURE.md).
