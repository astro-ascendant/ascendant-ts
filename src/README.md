# Source modules

The `src` tree contains the calculation modules exported by `astro-ascendant`.
The root entry point re-exports the public modules so consumers can use named
namespaces such as `Chart`, `Dasha`, `SAV`, and `Ephemeris`.

Calculations are Effect-based. Shared placement data is produced from an
ephemeris implementation and then passed to chart, dasha, Ashtakavarga, and
Jaimini calculations.

## Modules

- [`astro-params`](./astro-params/): ayanamsa and house-system configuration
- [`chart`](./chart/): cusp-aware natal and divisional charts
- [`dasha`](./dasha/): Vimshottari and sign-based dasha timelines
- [`ephemeris`](./ephemeris/): runtime-neutral ephemeris contracts
- [`jaimini`](./jaimini/): Jaimini astrology calculations
- [`sav`](./sav/): Ashtakavarga and Shodhya Pinda calculations
- [`swisseph`](./swisseph/): Swiss Ephemeris adapter
- [`transit`](./transit/): Transit event search
- [`runtime`](../runtime.ts): default full-stack layer graph (`MainLayer`)
- [`utils`](./utils/): shared helpers — pure zodiac math, validated coordinates, placement lookup, operation-labeled error mapping
