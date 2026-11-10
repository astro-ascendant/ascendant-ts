# astro-ascendant

<p align="center">
  <img src="https://raw.githubusercontent.com/astro-ascendant/website/main/assets/brand/wordmark.svg" alt="Ascendant" width="360" />
</p>

[![npm version](https://img.shields.io/npm/v/astro-ascendant)](https://www.npmjs.com/package/astro-ascendant)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)

Effect-first TypeScript library for sidereal Vedic astrology calculations.

`astro-ascendant` calculates planetary Placements once for a Located Moment, then derives charts, Vimshottari, Chara, and Sthira Dasha timelines, Ashtakavarga, Jaimini results, and transit searches from that shared calculation. It includes a Swiss Ephemeris adapter for Node.js and Bun, plus a runtime-neutral ephemeris interface for custom adapters.

## Installation

Install the package and its Effect peer dependency:

```bash
bun add astro-ascendant effect
```

The package includes the Swiss Ephemeris adapter dependency, uses ES modules, includes TypeScript declarations, and needs Node.js 20 or newer (or Bun).

## Quick start

This example generates a D1 and D9 chart for a birth moment in Bengaluru. `Runtime.MainLayer` supplies the Swiss Ephemeris adapter with a position cache and `DefaultAstroParams`, which selects Krishnamurti ayanamsa and Placidus houses.

```typescript
import { Chart, Runtime } from "astro-ascendant";
import { DateTime, ManagedRuntime } from "effect";

const input = Chart.ChartParams.make({
  moment: Chart.Moment.make({
    date: DateTime.makeUnsafe("2000-01-01T12:00:00.000Z"),
  }),
  latitude: 12.9716,
  longitude: 77.5946,
  sex: "Male",
});

const runtime = ManagedRuntime.make(Runtime.MainLayer);
const calculation = await runtime.runPromise(Chart.generate(input, [9]));

console.log(calculation.charts[0]); // D1
console.log(calculation.charts[1]); // D9

await runtime.dispose();
```

Create one runtime and reuse it for every calculation. Each runtime builds its own layer, so a single long-lived runtime shares one position cache across calls: transit scans and repeated charts then re-use positions instead of calling the native library again. Dispose it when the process is done. To choose other methodologies or an uncached ephemeris, build a layer from `AstroParams.layer` and `Swisseph.SwissephLayer` instead of `MainLayer`. `benchmarks/library.bench.ts` (via strobe) measures cache speedups; `bun run benchmark` validates, `bun run benchmark:compare` compares against `origin/main`.

`calculation.placements` contains the shared sidereal positions. `calculation.charts` contains D1 first, followed by the requested divisions in numeric order. Optional birth `sex` is copied into each chart. D1 is a `D1Chart`: its houses begin at the selected house system's cusps, and it alone carries the chart angles, KP star, sub and sub-sub lords, four-level planet significations, four-level house significators, and the five ordered ruling planets. Each divisional chart is a `DivisionalChart` whose houses are whole signs counted from its mapped Lagna.

## Calculations

The package exposes named operations for each calculation surface:

- **Charts**: a cusp-aware D1 with KP evidence and 15 whole-sign divisional charts
- **Dasha**: Vimshottari planetary periods plus Jaimini Chara and Sthira sign periods with date queries
- **Ashtakavarga**: Bhinnashtakavarga, Sarvashtakavarga, reduced BAV, and Shodhya Pinda
- **Jaimini**: Chara Karakas, Rashi Drishti, Karakamsha, Arudha Pada, Upapada, and Argala
- **Transits**: next/previous sign ingresses, longitude hits, house-cusp crossings, and retrograde stations per graha
- **Methodologies**: 47 predefined ayanamsas and 13 house systems

See the [calculation and API reference](https://astro-ascendant.vercel.app) for derivation workflows, provenance, configuration, supported divisions, and focused package exports. The published [API documentation](https://astro-ascendant.vercel.app) has the complete type surface.

## Development

Run the full local verification suite:

```bash
bun install
make check
```

Use `make help` to list all available commands.

## License

`astro-ascendant` is available under the [GNU Affero General Public License v3.0 or later](LICENSE).
