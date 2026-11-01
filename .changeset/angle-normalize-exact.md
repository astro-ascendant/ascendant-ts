---
"astro-ascendant": patch
---

Fix `Longitude.normalize` and `CircleAngle.normalize` changing in-range values: adding 360 before reducing rounded low bits, so `29.999999999999996` became `30` and a longitude exactly on a nakshatra span landed in the previous star. Also keep the divisional degree below 30 when a longitude just under a sign edge rounds up to the next part.
