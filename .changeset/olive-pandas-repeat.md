---
"astro-ascendant": minor
---

Memoize ephemeris positions and read astro-params from Effect Config.

- `SwissephCachedLayer` memoizes `calculatePosition` per `(julianDay, body, ayanamsa)` with singleflight dedupe for concurrent identical lookups. Failures are never cached, so transient native errors stay retryable; `SwissephLayer` stays uncached.
- `withPositionCache` decorates any `Ephemeris` layer with the same memoization.
- `AstroParams.layerConfig` builds the service from an Effect `Config` provider alongside the concrete `layer(options)`.
- `Runtime.MainLayer` wires the cached ephemeris subgraph by default.
