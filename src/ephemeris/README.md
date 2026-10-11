# Ephemeris

This module defines the runtime-neutral ephemeris service used to obtain
planetary positions for a located moment.

The model exports describe ephemeris inputs and results. `Ephemeris`
is the abstraction consumed by chart generation; concrete implementations,
such as Swiss Ephemeris, are provided by adapter modules.

`withPositionCache` decorates any `Ephemeris` layer with `calculatePosition`
memoization (`Cache.makeWith`, exit-aware TTL): successes are cached,
failures are not, and concurrent identical lookups share one pending call.
Only `calculatePosition` is cached; `calculateHouses` and `dateToJulianDay`
delegate straight to the backend.
