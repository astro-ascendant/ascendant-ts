import { DateTime, Effect } from "effect";

import type { CurrentDasha, VimshottariDasha } from "../model.js";
import { activeAt } from "../timeline.js";

/** Finds the Mahadasha and Antardasha active at an instant (now by default); null when outside the timeline. */
export const at = Effect.fn("astro-ascendant/dasha/vimshottari/at")(function* (
  timeline: VimshottariDasha,
  when?: DateTime.Utc,
) {
  const active = activeAt(timeline, when ?? (yield* DateTime.now));
  if (active === null) return null;
  return active satisfies CurrentDasha;
});
