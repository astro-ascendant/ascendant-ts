# astro-ascendant

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
