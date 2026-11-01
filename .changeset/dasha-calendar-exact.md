---
"astro-ascendant": patch
---

Fix Dasha calendar arithmetic. Vimshottari decimal years are now split on whole minutes, so interior Antardasha boundaries no longer land a minute (or, at a month boundary, most of a month) early. Chara, Sthira and Vimshottari periods now step from the start by cumulative years, so a Feb 29 start keeps its leap day in later periods.
