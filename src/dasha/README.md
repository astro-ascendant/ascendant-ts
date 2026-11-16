# Dasha

This module calculates planetary and sign-based dasha timelines from chart
placements.

The top-level API exposes:

- Vimshottari periods through `calculate` and `at`, with Pratyantardashas and
  Sookshmas on request through `pratyantardashas` and `sookshmas`
- Chara sign periods through `calculateChara`
- Sthira sign periods through `calculateSthira`
- date queries through `at` and `atRashi`

The `chara`, `sthira`, and `vimshottari` submodules provide focused exports
for each dasha system.
