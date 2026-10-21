# Charts

The chart module generates cusp-aware natal and divisional charts from a
located moment and shared planetary placements.

The public API includes:

- `generate` for calculating placements and requested divisions
- `project` for projecting shared placements into chart divisions
- chart models, errors, houses, placements, and sign/planet helpers

D1 is always included in generated results. Additional supported divisions
are selected by their numeric division number.
