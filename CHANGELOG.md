# astro-ascendant

## 6.1.0

### Minor Changes

- 3fdc49d: Export `getDivisionalTarget` from `astro-ascendant/chart` as well as `astro-ascendant/chart/divisional-mapping`.
- 03215d6: Name the Jaimini error classes after their tags (`ArgalaEvidenceError`, `KarakamshaCalculationError`, and so on). The old unprefixed names remain as deprecated aliases.
- 1ce7f4c: Change calculation provenance: `version` is now the date the method last changed (`YYYY-MM-DD`, currently `2026-11-01` for every method) instead of a number, and the school is a tradition, never `Ascendant`. D1 charts are `Universal`, since their houses follow the chosen house system and ayanamsa; divisional charts, Placements and transit events are `Parashari`. Code that compares provenance values must be updated.
- 1d5e4be: Add calculation provenance to the results that lacked it: `Placements` (optional, filled by `Chart.generate`), each Vimshottari `MahaDasha`, and the Ashtakavarga result. The method registry gains `placements`, `vimshottariDasha` and `ashtakavarga` entries. Vimshottari still returns an array, so its provenance is on each Mahadasha.

### Patch Changes

- 667a7f1: Fix `Longitude.normalize` and `CircleAngle.normalize` changing in-range values: adding 360 before reducing rounded low bits, so `29.999999999999996` became `30` and a longitude exactly on a nakshatra span landed in the previous star. Also keep the divisional degree below 30 when a longitude just under a sign edge rounds up to the next part.
- 7830f4d: Map D2 to the Parashari Hora: odd signs give Leo then Cancer, even signs Cancer then Leo, instead of cycling from Aries.
- b4cb7f4: Fix Dasha calendar arithmetic. Vimshottari decimal years are now split on whole minutes, so interior Antardasha boundaries no longer land a minute (or, at a month boundary, most of a month) early. Chara, Sthira and Vimshottari periods now step from the start by cumulative years, so a Feb 29 start keeps its leap day in later periods.
- 8ece94f: Take the ruling-planet day lord from the local mean-time weekday at the birthplace instead of the UTC weekday.
- f6de76d: Improve the documentation. The README quick start now uses `ManagedRuntime.make(Runtime.MainLayer)` and explains why to share one runtime, and states the Node.js 20 requirement. New notes cover the 47 ayanamsas (grouped, with measured offsets), high-latitude behaviour of Placidus and Koch, the Chara and Sthira conventions, the Vimshottari start before birth, the plain Arudha projection and its two unapplied exceptions, the meaning of `sign` and `is_retrograde` on transit events, `cusp-crossing` following the cusp at `from`, `LocatedMoment.make` throwing while `Chart.generate` fails typed, and `sex` being copy-only. Placements also now document why Rahu and Ketu are never flagged retrograde in a chart.
- 04c9270: Apply planet occupancy in Ekadhipatya reduction. Each pair of signs one planet rules is now reduced by whether the seven planets occupy them: no reduction when both are occupied, the empty sign loses the occupied sign's score when only one is, and the larger score keeps the difference when neither is. Reduced Bhinnashtakavarga and Shodhya Pinda change for charts where a pair has an occupied sign.
- 3ae3c5f: Declare `engines.node >=20`, the oldest Node.js the package supports.
- 64fd051: Fix Moon's Bhinnashtakavarga: the Moon, Mars and Jupiter rows now match the classical houses (Moon 1 3 6 7 10 11, Mars 2 3 5 6 9 10 11, Jupiter 1 4 7 8 10 11 12), which changes Moon BAV, SAV by sign and every reduction derived from them.
- fcef0d3: Subtract the true ayanamsa (nutation included) from lagna, cusps and angles, as planets already do. Houses were offset by 4 to 14 arcseconds against the planets.
- 6ecf7eb: Fix the Ashtakavarga Rashi multipliers for Leo, Virgo and Libra (now 10, 5 and 7 per BPHS 69.2-3), which changes every `rashi_pinda` and `shodhya_pinda`.
- 3fbcdbb: Report the motion just after a station as its `is_retrograde` state. The flag was read from the near-zero speed at the refined station moment, so it was unreliable. It is now `true` at the station that starts a retrograde and `false` at the one that ends it.
- 0fb7377: Make `from` inclusive for `sign-ingress` searches. A graha starting exactly on a sign boundary now reports the ingress at that instant: forward when it moves up from the boundary, backward when it moves down. `longitude-hit` and `cusp-crossing` already did.
- a628587: Fail `Transit.findTransits` with a `TransitValidationError` when the search window leaves the supported Julian Day range, instead of a bare schema issue.
- 12d3696: Speed up `Transit.findTransits` and stop it missing short events. The sweep now leaps by the earliest time a graha could reach the next sign boundary, target or station (from per-graha speed and acceleration limits) instead of stepping at a fixed rate, and crossings are refined with Newton and secant steps instead of bisection. Typical searches use 5 to 25 times fewer ephemeris calls (for example 1460 to 56 for four Mars longitude hits), event times agree with an hourly dense scan, and crossings that a fixed step could skip, such as a graha grazing a target near a station, are found. Provenance step descriptions were updated.
- 549674c: Fix `Transit.findTransits` returning the point opposite the target for `longitude-hit` and `cusp-crossing` searches. A search for the Sun at 100° alternated between 100° and 280°, and a house-cusp search returned the cusp's antipode as well. The crossing test now ignores the sign flip of the signed difference at 180° from the target, so every returned event is at the requested longitude or cusp. `sign-ingress` and `station` searches are unchanged.
- ba79171: Fix two `Transit.findTransits` window bugs. A target landing exactly on a sample could be reported twice when `precisionMinutes` equalled the refinement bracket (for example 45), which also consumed `count`. The final step could also run past `maxYears`, so a hit outside the requested window was returned instead of `TransitSearchExhausted`.
- cfead5b: Stop rounding the Moon's longitude to a hundredth of an arcminute when computing the Vimshottari balance. The Dasha start could be off by up to a couple of hours; it now follows the exact arc travelled.

## 6.0.0

### Major Changes

- 08b6947: Only D1 is cusp-aware; divisional charts are whole-sign (ADR-0008).

  - `Chart` is now a union of `D1Chart` (`division: 1`) and `DivisionalChart`. D1 alone carries `angles`, `planetSignifications`, `houseSignificators`, `rulingPlanets` and the KP `starLord`, `subLord` and `subSubLord` on each house, and those fields are no longer optional. Divisional houses are whole signs counted from the mapped Lagna and carry no KP fields. `ChartCalculation.charts` is typed as `[D1Chart, ...DivisionalChart[]]`.
  - Each Chart's `provenance` names its projection: `methods.d1ChartProjection` or `methods.divisionalChartProjection`, replacing `methods.chartProjection`.
  - Degenerate D1 cusps (zero-width houses, or cusps that do not span the circle) fail with `ChartCalculationError` at the new `"houses"` stage instead of silently switching to equal houses.
  - `Chart.project` is removed. Use `Chart.generate`, providing an in-memory `Ephemeris` layer if you need charts without Swiss Ephemeris.
  - `HouseData` returned by `Ephemeris.calculateHouses` is now `{ houseSystem, cusps, angles }`, with `cusps` keyed by house `1`–`12` and `angles` as `ChartAngles`. `NativeHouseData` and `NativePlanetaryPosition` are no longer exported from `astro-ascendant/ephemeris`.
  - `Ephemeris.calculatePosition` takes a `Planets` value, Ketu included, instead of a `CelestialBody`, and returns a `PlanetaryPosition` whose `longitude` is a branded `Longitude`; the native `flags` field is gone. Adapters resolve the lunar nodes, so chart and transit code no longer derive Ketu from Rahu. `CelestialBody`, `Position.planetBodyOf`, `Position.ketuFromRahu` and the now-unused `MissingPlacementError` are removed.
  - `Transit` exports only `findTransits` with its request, event and error models; the search kernel's constants, helpers and types are internal. Use `Longitude.normalize` / `Zodiac.wrapSigned` for the angle helpers and `dateTimeOfJulianDay` / `julianDayOfDateTime` from the ephemeris model for Julian Day conversion.
  - `Longitude.normalize`, `Longitude.inSign`, `Degree.of` and `CircleAngle.normalize` are attached to their schemas, and values stay plain numbers. Sign arithmetic lives in one total `Zodiac` module, which gains `signOfLongitude`, `lordOf`, `modalityOf`, `signStartOf`, `forwardArc` and `separation`. `Position.signIndexOf`, `signAtIndex`, `indexOfSign`, `signStartOf`, `wrap180` and `SignIndexError` are removed. `RashiDrishti.calculate` cannot fail, and `RashiDrishti.CalculationError` is removed.
  - `Dasha.calculate` (Vimshottari) now fails with `DashaEvidenceError` when the Moon is missing or duplicated; it previously accepted a duplicate Moon silently and reported a missing one as `DashaCalculationError`. `CharaKarakas.exactDegreeOf` returns an `ExactDegree` directly instead of an `Effect`.
  - `LocatedMoment` now checks latitude in [-90, 90] and longitude in [-180, 180] itself, so `LocatedMoment.make` and every schema embedding it, such as `ChartParams` and `TransitRequest`, reject out-of-range coordinates. `Chart.generate` decodes its input through it and still fails with `LocatedMomentValidationError`.
  - Only public operations and once-per-call ephemeris work open tracing spans; internal helpers, including per-sample transit and per-point KP work and `Swisseph` position lookups, use `Effect.fnUntraced`, so traces are much smaller.
  - `House`, `ChartHouses` and `Chart.Provenance` are replaced by `D1House`, `DivisionalHouse`, `D1Houses`, `DivisionalHouses`, `D1ChartProvenance` and `DivisionalChartProvenance`.

  Migrating: narrow on `chart.division === 1` (or use `calculation.charts[0]`) before reading KP fields; read cusps as `houses.cusps[house]` and angles as `houses.angles.ascendant`.

## 5.1.1

### Patch Changes

- b917524: Point the published metadata at the project's current homes: `repository` and `bugs` now name `astro-ascendant/ascendant-ts` after the repository move, and `homepage` points at the documentation site's new URL, `https://astro-ascendant.vercel.app`.

## 5.1.0

### Minor Changes

- d4ab2ad: Memoize ephemeris positions and read astro-params from Effect Config.

  - `SwissephCachedLayer` memoizes `calculatePosition` per `(julianDay, body, ayanamsa)` with singleflight dedupe for concurrent identical lookups. Failures are never cached, so transient native errors stay retryable; `SwissephLayer` stays uncached.
  - `withPositionCache` decorates any `Ephemeris` layer with the same memoization.
  - `AstroParams.layerConfig` builds the service from an Effect `Config` provider alongside the concrete `layer(options)`.
  - `Runtime.MainLayer` wires the cached ephemeris subgraph by default.

## 5.0.0

### Major Changes

- 2381ffa: Add KP sub-sub lord (SSL). New `subSubLordOf` helper, required `House.subSubLord` on cusps, and Sub-Sub Lord columns in the chart example. Verified against AstroSage K.P. New: 21/21 Harini significators/SSL match; Laxman matches except 3 sub-arcminute boundary cases where an independent engine agrees with us.

## 4.0.6

### Patch Changes

- ceef4e7: Fix KP sub-lord boundaries double-counting the current division and align planet-signification ownership with AstroSage K.P. New (no node-agent expansion; Rahu/Ketu own no signs).

## 4.0.5

### Patch Changes

- 50c6a45: Fix KP significators dropping node-agent houses: the star lord now always comes from the planet's own longitude, and a Rahu/Ketu star lord expands one level into its agent's ownership for level3. Node occupancy (level2) is the node's own house and node ownership (level4) is the agent's ownership.

## 4.0.4

### Patch Changes

- Republish 4.0.3 contents as 4.0.4: the 4.0.3 tarball never reached the registry and the version number is now burned and cannot be reused.

## 4.0.3

### Patch Changes

- 8b4256e: Fix Vimshottari sequence starting from the wrong Mahadasha lord: the nakshatra-lord rotation used Effect's `Array.rotate` with the wrong direction (positive `n` rotates right), so a Moon in Bharani (Venus) produced a Mercury-led timeline instead of Venus-led. Both Mahadasha and Antardasha ordering now use an explicit left rotation from the Moon's nakshatra lord.

## 4.0.2

### Patch Changes

- c2d57f7: Suppress retrograde flag for lunar nodes: Rahu and Ketu now always report `is_retrograde: false` instead of deriving it from mean-node speed. Backward motion is their normal state, so the permanent `R` is hidden by convention. Planet flags are unchanged.

## 4.0.1

### Patch Changes

- 7dbf503: Internal refactor only, no API changes: use `Effect.forEach` for concurrent traversals and `Array.sort` with `Order` combinators instead of native `Array#sort` / `Effect.all` over `Array#map`.
- 244d938: Track Effect v4 GA: `effect`, `@effect/platform-bun`, and `@effect/vitest` move from `4.0.0-rc.112` to `4.0.0`, and the `effect` peer dependency becomes `^4.0.0`. Consumers should upgrade to Effect v4 GA.

## 4.0.0

### Major Changes

- ca954cd: Rename Nakshatra vocabulary to Star: the `Nakshatra` model becomes `Star` (`Stars` literals), `SourcePlanet` and `SourceLagna` carry `star` instead of `nakshatra`, and `nakshatraOf` becomes `starOf`. One term everywhere — Star, not nakshatra

### Patch Changes

- 91ba0dd: Remove dead internal surface and consolidate duplicated tables: unexported single-use helpers, one shared Vimshottari cycle table, canonical planet lists, one SAV table builder, and shared sign-modality predicates
- 1307c44: Fix Transit searches ignoring validated `maxYears` and `precisionMinutes`, enforce Ashtakavarga BAV total validation instead of silently passing, and map the `TrueNode` celestial body in the Swiss Ephemeris adapter
- 7d287e3: Consolidate shared helpers into `src/utils`: one zodiac conversion hub with a branded `RashiIndex`, one exactly-once placement lookup, and the former `src/position` Effect boundary moved in. Removes duplicated rotation, distance, sign-lookup, and placement-validation helpers across dasha, Jaimini, SAV, chart, and transit. Standardizes `Effect.fn` trace names to `astro-ascendant/<module>/<fn>`, maps invalid longitudes to `DivisionalMappingError`, and fixes Upapada error propagation so unknown channels no longer leak

## 3.2.0

### Minor Changes

- f35447f: Add missing Swiss Ephemeris ayanamsas (IDs 39-46) and default to KrishnamurtiVP291

## 3.1.0

### Minor Changes

- bbcc7d4: Calculate Rahu with the mean lunar node instead of the true/osculating node. Ketu remains exactly opposite Rahu. This shifts node longitudes by up to ~2 degrees, which can change signs, nakshatras, and dasha balance in existing charts and transits.

## 3.0.0

### Major Changes

- 6c59872: Normalize `ChartProjection` provenance version from `"1"` (string) to `1` (int). All method provenances now use integer versions. This breaks consumers pinning the chart provenance identity.

### Minor Changes

- 6c59872: Add `Transit` module (`astro-ascendant/transit`): mechanics-only search for the next or previous transit events (`sign-ingress`, `longitude-hit`, `cusp-crossing`, `station`) of one graha from a located moment, with optional chart attachment per event.
- 8c79613: Replace internal `throw` and `Effect.die` sites with typed errors. Argala gains `ArgalaCalculationError`, Rashi Drishti gains `RashiDrishtiCalculationError`, and Sthira Dasha reports `DashaCalculationError`; previously-defective invariant failures are now recoverable through the error channel.

## 2.0.0

### Major Changes

- 19814b6: Change default ayanamsa from "Lahiri" to "Krishnamurti" and default house system from "WholeSign" to "Placidus".

## 1.0.1

### Patch Changes

- 8d964c8: Export the Swiss Ephemeris layer as `Swisseph` from the package root.
