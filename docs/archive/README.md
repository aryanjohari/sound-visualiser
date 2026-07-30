# Archived architecture artifacts

`architecture.graph.json` was the old portfolio “flowchart IR” (nodes/edges + tour captions).
It is **not** the source of truth anymore.

Use [`../c4/`](../c4/README.md) and [`../c4/portfolio-map.json`](../c4/portfolio-map.json) instead
(Context → Containers → Components). Kept here only so older portfolio builds that still
fetch `graph:` can be pointed at this path temporarily if needed.