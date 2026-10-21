# Transits

Mechanics-only search for the next or previous Transit events of one graha
from a Located Moment. There is no interpretation here: each event reports
the exact moment, longitude, kind, and retrograde state.

```ts
import { Effect } from "effect";

import { AstroParams } from "astro-ascendant/astro-params";
import * as Transit from "astro-ascendant/transit";
import { SwissephLayer } from "astro-ascendant/swisseph";

const ingresses = await Effect.runPromise(
  Transit.findTransits({
    planet: "Jupiter",
    from: locatedMoment,
    count: 3,
    direction: "forward",
    kinds: ["sign-ingress"],
    maxYears: 12,
  }).pipe(
    Effect.provide(AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" })),
    Effect.provide(SwissephLayer),
  ),
);
```

Event kinds: `sign-ingress` (sidereal D1 Rashi boundary), `longitude-hit`
(exact `targetLongitude`), `cusp-crossing` (natal house cusp for `house` at
`from`), and `station` (retrograde station via `longitudeSpeed` sign change).

Guarantees: every zero-crossing counts in strict time order, so retrograde
triples yield three events; refinement bisects to `precisionMinutes`
(default 1); an exhausted `maxYears` window fails with typed
`TransitSearchExhausted` instead of a short list. Pass `includeCharts` with
divisions to attach one full `ChartCalculation` per found moment.

Searches sample thousands of ephemeris positions; for repeated or
overlapping scans, provide `SwissephCachedLayer` (see `../swisseph/README.md`)
instead of `SwissephLayer` so re-scans hit the position cache.
