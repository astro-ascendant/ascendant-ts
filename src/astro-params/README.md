# Astro parameters

This module defines the configuration used when calculating a chart:
ayanamsa, house system, and related astronomical parameters.

`DefaultAstroParams` provides the package defaults. `AstroParams` is the
Effect service used by chart calculations, while the model exports provide
the supported parameter values and types.

Build the service with `layer(options)` for concrete values, or with
`layerConfig(config)` to decode them from an Effect `Config` provider
(e.g. `Config.schema(Ayanamsa, "ayanamsa")` records read from the
environment in tests via `ConfigProvider.fromUnknown`).

The module is runtime-neutral and does not perform ephemeris calculations.
