---
"astro-ascendant": minor
---

Add Vimshottari Pratyantardashas and Sookshmas. `Dasha.pratyantardashas(antardasha)` and `Dasha.sookshmas(pratyantardasha)` split a period into its nine children, and `Dasha.at` now also returns the active `pratyantardasha` and `sookshma`. The deeper levels split their parent's span in proportion to each lord's share of the 120-year cycle on whole minutes; `calculate` and its Mahadasha and Antardasha boundaries are unchanged.
