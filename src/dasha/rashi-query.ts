import { DateTime, Effect } from "effect";

import type { CurrentRashiDasha, RashiDasha } from "./model.js";
import { activeAt } from "./timeline.js";

/** Finds the Rashi Mahadasha and Antardasha active at an instant (now by default); null when outside the timeline. */
export const atRashi = Effect.fn("astro-ascendant/dasha/atRashi")(function* (
  timeline: RashiDasha,
  when?: DateTime.Utc,
) {
  const active = activeAt(timeline.mahadashas, when ?? (yield* DateTime.now));
  if (active === null) return null;
  return { system: timeline.system, ...active } satisfies CurrentRashiDasha;
});
