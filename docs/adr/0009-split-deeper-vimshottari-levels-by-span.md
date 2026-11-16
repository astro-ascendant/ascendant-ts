---
status: accepted
---

# Split deeper Vimshottari levels by span, on request

Pratyantardashas and Sookshmas split their parent's actual `[start, end)` span in proportion to each lord's share of the 120-year cycle, with boundaries a whole number of minutes after the parent's start and the last child ending on the parent's end. Mahadashas and Antardashas keep stepping through the calendar, so their published boundaries do not move. Calendar stepping cannot serve the deeper levels: it adds whole calendar months and then 30-day months, and whole months clamp to a month's end, so from 31 January a 0.0834-year step lands on 28 February before a 0.082-year step lands on 1 March, and a sub-month period would end before it began. The deeper levels are calculated on request (`pratyantardashas`, `sookshmas`, and the active branch in `at`) rather than nested into every timeline, because a full cycle holds 6,561 Sookshmas that almost no caller reads.

_Considered:_ stepping the deeper levels through the calendar like the upper two (rejected — not monotonic below a month), switching every level to proportional splitting (rejected — it moves Antardasha boundaries that are already published), nesting all four levels into `calculate` (rejected — it multiplies the timeline 81-fold for every caller), and extending Chara and Sthira the same way (deferred — no standard rule for their deeper levels, and their whole-month calendar cannot express them).
