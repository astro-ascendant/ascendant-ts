# Utils

Shared helpers for all service modules. One file per concern; import through
`./index.js`, which re-exports the `Zodiac`, `Position`, `Placement`, and
`ExactDegree` namespaces.

- [`zodiac.js`](./zodiac.ts): the one module for sign arithmetic. Longitudes
  resolve to Signs, Signs to their lords, modality and starting longitude,
  wheel positions to Signs and twelve-sign sequences, and angles to wrapped
  longitudes and arcs. Everything here is total on branded inputs and
  integers.
- [`position.js`](./position.ts): the fallible `Effect` edge where raw angles
  become branded Longitudes (`LongitudeError`), plus tolerances.
- [`placement.js`](./placement.ts): exactly-once planet placement lookup, and
  `requireEach`, the exactly-once view of the planets one calculation
  requires. Callers pass their module's error factory, so error provenance
  stays local while the rule lives here (ADR-0003).
- [`exact-degree.js`](./exact-degree.ts): exact decimal Degree comparison, so
  planets at the same printed position tie (ADR-0005).

`RashiIndex` is the branded 0-based sign position (0 = Aries … 11 = Pisces).
Use it for sign indices; `Houses` (1–12) is for houses only.
