---
"astro-ascendant": patch
---

Fix `Transit.findTransits` returning the point opposite the target for `longitude-hit` and `cusp-crossing` searches. A search for the Sun at 100° alternated between 100° and 280°, and a house-cusp search returned the cusp's antipode as well. The crossing test now ignores the sign flip of the signed difference at 180° from the target, so every returned event is at the requested longitude or cusp. `sign-ingress` and `station` searches are unchanged.
