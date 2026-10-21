import { DateTime, Effect } from "effect";

import type { CurrentRashiDasha, RashiDasha } from "./model.js";
import { contains } from "./query.js";

/** Finds the Rashi Mahadasha and Antardasha active at an instant (now by default); null when outside the timeline. */
export const atRashi = Effect.fn("astro-ascendant/dasha/atRashi")(function* (
  timeline: RashiDasha,
  when?: DateTime.Utc,
) {
  const instant = when ?? (yield* DateTime.now);

  for (const mahadasha of timeline.mahadashas) {
    if (!contains(mahadasha, instant)) continue;
    for (const antardasha of mahadasha.antardashas) {
      if (contains(antardasha, instant)) {
        return {
          system: timeline.system,
          mahadasha,
          antardasha,
        } satisfies CurrentRashiDasha;
      }
    }
  }

  return null;
});
