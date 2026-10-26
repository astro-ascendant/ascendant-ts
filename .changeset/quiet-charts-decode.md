---
"astro-ascendant": patch
---

Decode chart schemas through `Effect` in the chart tests, asserting invalid `sex` values through the typed `SchemaError` failure channel instead of synchronous throws.
