---
"astro-ascendant": patch
---

Speed up `Transit.findTransits` and stop it missing short events. The sweep now leaps by the earliest time a graha could reach the next sign boundary, target or station (from per-graha speed and acceleration limits) instead of stepping at a fixed rate, and crossings are refined with Newton and secant steps instead of bisection. Typical searches use 5 to 25 times fewer ephemeris calls (for example 1460 to 56 for four Mars longitude hits), event times agree with an hourly dense scan, and crossings that a fixed step could skip, such as a graha grazing a target near a station, are found. Provenance step descriptions were updated.
