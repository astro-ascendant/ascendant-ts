---
"astro-ascendant": patch
---

Make `from` inclusive for `sign-ingress` searches. A graha starting exactly on a sign boundary now reports the ingress at that instant: forward when it moves up from the boundary, backward when it moves down. `longitude-hit` and `cusp-crossing` already did.
