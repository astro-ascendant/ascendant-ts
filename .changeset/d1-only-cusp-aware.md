---
"astro-ascendant": major
---

Only D1 is cusp-aware; divisional charts are whole-sign (ADR-0008).

- `Chart` is now a union of `D1Chart` (`division: 1`) and `DivisionalChart`. D1 alone carries `angles`, `planetSignifications`, `houseSignificators`, `rulingPlanets` and the KP `starLord`, `subLord` and `subSubLord` on each house, and those fields are no longer optional. Divisional houses are whole signs counted from the mapped Lagna and carry no KP fields. `ChartCalculation.charts` is typed as `[D1Chart, ...DivisionalChart[]]`.
- Each Chart's `provenance` names its projection: `methods.d1ChartProjection` or `methods.divisionalChartProjection`, replacing `methods.chartProjection`.
- Degenerate D1 cusps (zero-width houses, or cusps that do not span the circle) fail with `ChartCalculationError` at the new `"houses"` stage instead of silently switching to equal houses.
- `Chart.project` is removed. Use `Chart.generate`, providing an in-memory `Ephemeris` layer if you need charts without Swiss Ephemeris.
- `HouseData` returned by `Ephemeris.calculateHouses` is now `{ houseSystem, cusps, angles }`, with `cusps` keyed by house `1`–`12` and `angles` as `ChartAngles`. `NativeHouseData` and `NativePlanetaryPosition` are no longer exported from `astro-ascendant/ephemeris`.
- `House`, `ChartHouses` and `Chart.Provenance` are replaced by `D1House`, `DivisionalHouse`, `D1Houses`, `DivisionalHouses`, `D1ChartProvenance` and `DivisionalChartProvenance`.

Migrating: narrow on `chart.division === 1` (or use `calculation.charts[0]`) before reading KP fields; read cusps as `houses.cusps[house]` and angles as `houses.angles.ascendant`.
