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

## Ayanamsas

The 47 `Ayanamsa` values are the Swiss Ephemeris sidereal modes, listed in their native
ID order (0-46). Grouped by what they anchor to:

| Family | Values (Swiss Ephemeris id) |
| --- | --- |
| Indian, Vedic | `Lahiri` (1), `Lahiri1940` (43), `LahiriVP285` (44), `LahiriICRC` (46), `Raman` (3), `Krishnamurti` (5), `KrishnamurtiVP291` (45), `Yukteshwar` (7), `JNBhasin` (8), `Ushashashi` (4) |
| Siddhantic | `SuryaSiddhanta` (21), `SuryaSiddhantaMeanSun` (22), `Aryabhata` (23), `AryabhataMeanSun` (24), `Aryabhata522` (37), `SSRevati` (25), `SSCitra` (26) |
| Fixed-star anchored | `TrueCitra` (27), `TrueRevati` (28), `TruePushya` (29), `TrueMula` (35), `TrueSheoran` (39), `Aldebaran15Tau` (14) |
| Galactic | `GalacticCenter0Sag` (17), `GalacticCenterGilBrand` (30), `GalacticCenterCochrane` (40), `GalacticEquatorIAU1958` (31), `GalacticEquator` (32), `GalacticEquatorMidMula` (33), `GalacticEquatorFiorenza` (41), `DhruvaGalCenterMulaWilhelm` (36) |
| Babylonian and ancient | `BabylKugler1` (9), `BabylKugler2` (10), `BabylKugler3` (11), `BabylHuber` (12), `BabylEtPSC` (13), `BabylBritton` (38), `Hipparchos` (15), `Sassanian` (16), `ValensMoon` (42) |
| Western and other | `FaganBradley` (0), `DeLuce` (2), `DjwhalKhul` (6), `Skydram` (34) |
| Reference equinox | `J2000` (18), `J1900` (19), `B1950` (20) |

What the Swiss Ephemeris documentation says of a few: `Lahiri` has been the official
ayanamsa of the Indian Astronomical Ephemeris since 1985; `LahiriVP285` is its "Lahiri
1980" definition; `KrishnamurtiVP291` is the Krishnamurti/Senthilathiban definition;
`DeLuce` has zero ayanamsa at 1 January 1 BCE; `J2000`, `J1900` and `B1950` measure
from those mean equinoxes. The library default is `KrishnamurtiVP291`.

Variants differ by amounts that matter for narrow boundaries. Measured with this
library at 2000-01-01 and 2024-06-01 (degrees):

| | 2000-01-01 | 2024-06-01 |
| --- | --- | --- |
| `Lahiri` | 23.8532 | 24.1969 |
| `LahiriVP285` | 23.8596 | 24.2033 |
| `Krishnamurti` | 23.7564 | 24.1001 |
| `KrishnamurtiVP291` | 23.7765 | 24.1202 |
| `Raman` | 22.4069 | 22.7506 |
| `FaganBradley` | 24.7364 | 25.0801 |

So `Krishnamurti` and `KrishnamurtiVP291` differ by about 0.02 degrees (72 arcseconds),
enough to move a KP sub-lord, and `Raman` sits about 1.45 degrees behind `Lahiri`.
Reference-date and star definitions are in the Swiss Ephemeris programmer's manual.
