---
"astro-ascendant": patch
---

Fix two `Transit.findTransits` window bugs. A target landing exactly on a sample could be reported twice when `precisionMinutes` equalled the refinement bracket (for example 45), which also consumed `count`. The final step could also run past `maxYears`, so a hit outside the requested window was returned instead of `TransitSearchExhausted`.
