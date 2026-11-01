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
`from`), and `station` (retrograde station via `longitudeSpeed` sign change). For a
station, `is_retrograde` is the motion just after it in time: `true` at the
station that starts a retrograde, `false` at the one that ends it.

Guarantees: `from` is inclusive for every kind, so an event at the starting instant
is reported, forward or backward; every zero-crossing counts in strict time order, so retrograde
triples yield three events; refinement converges to `precisionMinutes`
(default 1); an exhausted `maxYears` window fails with typed
`TransitSearchExhausted` instead of a short list. Pass `includeCharts` with
divisions to attach one full `ChartCalculation` per found moment.

`findTransits` is the module's only operation; the leap-and-refine
kernel behind it (ADR-0007) is internal. A search samples tens to a few
hundred ephemeris positions; for repeated or
overlapping scans, provide `SwissephCachedLayer` (see `../swisseph/README.md`)
instead of `SwissephLayer` so re-scans hit the position cache.

## Reading an event

- `sign`: for `sign-ingress`, the sign the graha moves into at that instant, in the
  direction of the search, so a backward search reports the sign it was in before.
  For the other kinds it is the sign containing the graha at the event.
- `is_retrograde`: whether the graha is moving backwards at the event. At a `station`
  it is the motion just after the station. Rahu and Ketu always report `true`.
- `cusp-crossing` follows the cusp as it stands at `from`: the D1 cusp for `house` at
  the starting moment under the active house system. A different house system moves the
  crossing times.
