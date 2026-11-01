# Find transits by sampling and bisection

Transit search has no native `@swisseph/node` API, so it samples `Ephemeris.calculatePosition` at per-planet coarse steps and bisects each bracketed crossing to one-minute precision, with stations detected from `longitudeSpeed` sign changes.

## Update: leaps and safeguarded refinement

Fixed per-planet steps either wasted samples far from any event or, for a short event, could step over it. The sweep now leaps by the earliest time the graha could reach the nearest sign boundary, target or station, bounded by a speed ceiling and an acceleration ceiling per graha (`MOTION_LIMITS`, measured over 1900-2100 with a margin). Nothing can happen inside a leap, so a crossing pair that a fixed step could skip is found. Bracketed crossings are refined with Newton steps (longitude speed is the derivative) or secant steps for stations, falling back to bisection whenever a step leaves the bracket, so a crossing costs about four ephemeris calls instead of eleven. The ceilings are physical assumptions about real grahas, not guarantees for arbitrary motion; `tests/transit-swisseph.test.ts` checks the search against an hourly scan of the real ephemeris.
