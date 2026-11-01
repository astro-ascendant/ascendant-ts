---
"astro-ascendant": minor
---

Add calculation provenance to the results that lacked it: `Placements` (optional, filled by `Chart.generate`), each Vimshottari `MahaDasha`, and the Ashtakavarga result. The method registry gains `placements`, `vimshottariDasha` and `ashtakavarga` entries. Vimshottari still returns an array, so its provenance is on each Mahadasha.
