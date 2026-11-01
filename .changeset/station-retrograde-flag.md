---
"astro-ascendant": patch
---

Report the motion just after a station as its `is_retrograde` state. The flag was read from the near-zero speed at the refined station moment, so it was unreliable. It is now `true` at the station that starts a retrograde and `false` at the one that ends it.
