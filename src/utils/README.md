# Utils

Shared helpers for all service modules. One file per concern; import through
`./index.js`, which re-exports the `Zodiac`, `Position`, and `Placement`
namespaces.

- [`zodiac.js`](./zodiac.ts): pure zodiac wheel math. Longitudes resolve to a
  wheel position, positions resolve to signs, signs resolve back to positions,
  and a position expands to the full twelve-sign sequence. Everything here is
  total for integer inputs.
- [`position.js`](./position.ts): validated coordinate parsing. The fallible
  `Effect` half of the conversion hub: raw angles enter and leave as branded
  coordinates (`LongitudeError`, `SignIndexError`), plus ephemeris body
  mapping and tolerances.
- [`placement.js`](./placement.ts): exactly-once planet placement lookup.
  Callers pass their module's error factory, so error provenance stays local
  while the rule lives here.

`RashiIndex` is the branded 0-based sign position (0 = Aries … 11 = Pisces).
Use it for sign indices; `Houses` (1–12) is for houses only.
