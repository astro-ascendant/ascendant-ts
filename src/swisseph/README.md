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
