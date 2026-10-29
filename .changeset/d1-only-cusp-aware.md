---
"astro-ascendant": major
---

Only D1 is cusp-aware; divisional charts are whole-sign (ADR-0008).

- `Chart` is now a union of `D1Chart` (`division: 1`) and `DivisionalChart`. D1 alone carries `angles`, `planetSignifications`, `houseSignificators`, `rulingPlanets` and the KP `starLord`, `subLord` and `subSubLord` on each house, and those fields are no longer optional. Divisional houses are whole signs counted from the mapped Lagna and carry no KP fields. `ChartCalculation.charts` is typed as `[D1Chart, ...DivisionalChart[]]`.
- Each Chart's `provenance` names its projection: `methods.d1ChartProjection` or `methods.divisionalChartProjection`, replacing `methods.chartProjection`.
- Degenerate D1 cusps (zero-width houses, or cusps that do not span the circle) fail with `ChartCalculationError` at the new `"houses"` stage instead of silently switching to equal houses.
- `Chart.project` is removed. Use `Chart.generate`, providing an in-memory `Ephemeris` layer if you need charts without Swiss Ephemeris.
- `HouseData` returned by `Ephemeris.calculateHouses` is now `{ houseSystem, cusps, angles }`, with `cusps` keyed by house `1`–`12` and `angles` as `ChartAngles`. `NativeHouseData` and `NativePlanetaryPosition` are no longer exported from `astro-ascendant/ephemeris`.
- `Ephemeris.calculatePosition` takes a `Planets` value, Ketu included, instead of a `CelestialBody`, and returns a `PlanetaryPosition` whose `longitude` is a branded `Longitude`; the native `flags` field is gone. Adapters resolve the lunar nodes, so chart and transit code no longer derive Ketu from Rahu. `CelestialBody`, `Position.planetBodyOf`, `Position.ketuFromRahu` and the now-unused `MissingPlacementError` are removed.
- `Transit` exports only `findTransits` with its request, event and error models; the search kernel's constants, helpers and types are internal. Use `Zodiac.wrapLongitude` / `Zodiac.wrapSigned` for the angle helpers and `dateTimeOfJulianDay` / `julianDayOfDateTime` from the ephemeris model for Julian Day conversion.
- Sign arithmetic lives in one total `Zodiac` module, which gains `signOfLongitude`, `lordOf`, `modalityOf`, `signStartOf`, `forwardArc` and `separation`. `Position.signIndexOf`, `signAtIndex`, `indexOfSign`, `signStartOf`, `wrap180` and `SignIndexError` are removed. `RashiDrishti.calculate` cannot fail, and `RashiDrishti.CalculationError` is removed.
- `Dasha.calculate` (Vimshottari) now fails with `DashaEvidenceError` when the Moon is missing or duplicated; it previously accepted a duplicate Moon silently and reported a missing one as `DashaCalculationError`. `CharaKarakas.exactDegreeOf` returns an `ExactDegree` directly instead of an `Effect`.
- `House`, `ChartHouses` and `Chart.Provenance` are replaced by `D1House`, `DivisionalHouse`, `D1Houses`, `DivisionalHouses`, `D1ChartProvenance` and `DivisionalChartProvenance`.

Migrating: narrow on `chart.division === 1` (or use `calculation.charts[0]`) before reading KP fields; read cusps as `houses.cusps[house]` and angles as `houses.angles.ascendant`.
