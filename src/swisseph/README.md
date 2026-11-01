# Swiss Ephemeris

This module adapts the native `@swisseph/node` package to the runtime-neutral
ephemeris service used by `astro-ascendant`. Native payloads are decoded into
validated schemas at the adapter boundary, so corrupt library output fails
typed (`EphemerisError`) instead of propagating. The adapter reads both Rahu and Ketu
from the mean lunar node, placing Ketu opposite with a mirrored latitude, turns
the native thirteen-slot cusp array into twelve sidereal cusps keyed by house,
and applies the `WholeSign` convention itself.

Provide `SwissephLayer` to an Effect program that needs planetary positions.
For repeated or overlapping lookups (transit scans, dashboards), provide
`SwissephCachedLayer` instead: it memoizes `calculatePosition` per
`(julianDay, body, ayanamsa)` with singleflight dedupe for concurrent
identical calls. Failures are never cached, so transient native errors stay
retryable.

## High latitudes

The cusp-based systems Placidus and Koch are undefined inside the polar circles, where
some degrees never rise or set. The native library then reports failure, and the adapter
surfaces it as a typed `EphemerisError` (`Chart.generate` wraps it in a
`ChartCalculationError`) instead of returning bad cusps. With the January 2000 obliquity
that starts between 66° and 68° of latitude. Other systems, such as Porphyrius, Equal,
Whole Sign and Campanus, still return cusps there; they are not meaningful astrologically
near the poles, so choose one deliberately for high-latitude births.
