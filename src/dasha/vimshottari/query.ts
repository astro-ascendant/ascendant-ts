import { DateTime, Effect } from "effect";

import type { CurrentDasha, VimshottariDasha } from "../model.js";
import { contains } from "../query.js";

export const at = Effect.fn("astro-ascendant/dasha/vimshottari/at")(function* (
  timeline: VimshottariDasha,
  when?: DateTime.Utc,
) {
  const instant = when ?? (yield* DateTime.now);

  for (const mahadasha of timeline) {
    if (!contains(mahadasha, instant)) continue;

    for (const antardasha of mahadasha.antardashas) {
      if (contains(antardasha, instant)) {
        return { mahadasha, antardasha } satisfies CurrentDasha;
      }
    }
  }

  return null;
});
