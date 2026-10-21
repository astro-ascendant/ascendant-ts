# astro-ascendant

<p align="center">
  <img src="assets/wordmark.webp" alt="Ascendant" width="360" />
</p>

[![npm version](https://img.shields.io/npm/v/astro-ascendant)](https://www.npmjs.com/package/astro-ascendant)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)

Effect-first TypeScript library for sidereal Vedic astrology calculations.

`astro-ascendant` calculates planetary Placements once for a Located Moment, then derives charts, Vimshottari, Chara, and Sthira Dasha timelines, Ashtakavarga, Jaimini results, and transit searches from that shared calculation. It includes a Swiss Ephemeris adapter for Node.js and Bun, plus a runtime-neutral ephemeris interface for custom adapters.

## Installation

Install the package and its Effect peer dependency:

```bash
npm install astro-ascendant effect
```

The package includes the Swiss Ephemeris adapter dependency, uses ES modules, and includes TypeScript declarations.

## Quick start

This example generates a D1 and D9 chart for a birth moment in Bengaluru. `SwissephLayer` supplies the ephemeris implementation, while `DefaultAstroParams` selects Krishnamurti ayanamsa and Placidus houses.

```typescript
import { AstroParams, Chart } from "astro-ascendant";
import * as Swisseph from "astro-ascendant/swisseph";
import { DateTime, Effect, Layer } from "effect";

const input = Chart.ChartParams.make({
  moment: Chart.Moment.make({
    date: DateTime.makeUnsafe("2000-01-01T12:00:00.000Z"),
  }),
  latitude: 12.9716,
  longitude: 77.5946,
  sex: "Male",
});

const program = Chart.generate(input, [9]);
const layers = Layer.merge(AstroParams.DefaultAstroParams, Swisseph.SwissephLayer);
const calculation = await Effect.runPromise(program.pipe(Effect.provide(layers)));

console.log(calculation.charts[0]); // D1
console.log(calculation.charts[1]); // D9
```

For repeated or overlapping workloads (transit scans, dashboards), swap in
`Swisseph.SwissephCachedLayer`: it memoizes `calculatePosition` per
`(julianDay, body, ayanamsa)` with singleflight dedupe, so re-scans hit the
cache instead of the native library. See `benchmarks/stress.md` for measured
speedups.

`calculation.placements` contains the shared sidereal positions. `calculation.charts` contains D1 first, followed by the requested divisions in numeric order. Optional birth `sex` is copied into each chart. Every chart uses cusp-defined houses and includes KP house significations, four-level planet significations, four-level house significators, and the five ordered ruling planets.

## Calculations

The package exposes named operations for each calculation surface:

- **Charts**: D1 and 15 cusp-aware divisional charts
- **Dasha**: Vimshottari planetary periods plus Jaimini Chara and Sthira sign periods with date queries
- **Ashtakavarga**: Bhinnashtakavarga, Sarvashtakavarga, reduced BAV, and Shodhya Pinda
- **Jaimini**: Chara Karakas, Rashi Drishti, Karakamsha, Arudha Pada, Upapada, and Argala
- **Transits**: next/previous sign ingresses, longitude hits, house-cusp crossings, and retrograde stations per graha
- **Methodologies**: 39 predefined ayanamsas and 13 house systems

See the [calculation and API reference](docs/reference.md) for derivation workflows, provenance, configuration, supported divisions, and focused package exports. The published [API documentation](https://ascendant-docs.vercel.app) has the complete type surface.

## Development

Run the full local verification suite:

```bash
bun install
make check
```

Use `make help` to list all available commands.

## License

`astro-ascendant` is available under the [GNU Affero General Public License v3.0 or later](LICENSE).
