---
"astro-ascendant": patch
---

Improve the documentation. The README quick start now uses `ManagedRuntime.make(Runtime.MainLayer)` and explains why to share one runtime, and states the Node.js 20 requirement. New notes cover the 47 ayanamsas (grouped, with measured offsets), high-latitude behaviour of Placidus and Koch, the Chara and Sthira conventions, the Vimshottari start before birth, the plain Arudha projection and its two unapplied exceptions, the meaning of `sign` and `is_retrograde` on transit events, `cusp-crossing` following the cusp at `from`, `LocatedMoment.make` throwing while `Chart.generate` fails typed, and `sex` being copy-only. Placements also now document why Rahu and Ketu are never flagged retrograde in a chart.
