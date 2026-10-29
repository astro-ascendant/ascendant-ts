# Charts

The chart module generates a cusp-aware D1 chart and whole-sign divisional
charts from a located moment and shared planetary placements.

The public API includes:

- `generate` for calculating placements and requested divisions
- chart models, errors, houses, placements, and sign/planet helpers

D1 is always included in generated results. Additional supported divisions
are selected by their numeric division number.

A `Chart` is either a `D1Chart` or a `DivisionalChart`, told apart by
`division`. D1 houses begin at the selected house system's cusps and carry the
angles, KP lords, significations and ruling planets. Divisional houses are
whole signs counted from the mapped Lagna: mapping cusps through a division
does not preserve their order, and KP lords belong to source longitudes, not
mapped ones (ADR-0008). If the house system's D1 cusps do not divide the
circle into twelve houses, `generate` fails with `ChartCalculationError` at
the `"houses"` stage.
