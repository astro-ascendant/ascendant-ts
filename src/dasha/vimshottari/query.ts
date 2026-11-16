import { DateTime, Effect } from "effect";

import type { CurrentDasha, VimshottariDasha } from "../model.js";
import { contains } from "../query.js";
import { activeAt } from "../timeline.js";
import { pratyantardashas, sookshmas } from "./calculate.js";

/**
 * Finds the Mahadasha, Antardasha, Pratyantardasha and Sookshma active at an
 * instant (now by default); null when outside the timeline. Only the active
 * branch is subdivided below the Antardasha.
 */
export const at = Effect.fn("astro-ascendant/dasha/vimshottari/at")(function* (
  timeline: VimshottariDasha,
  when?: DateTime.Utc,
) {
  const instant = when ?? (yield* DateTime.now);
  const active = activeAt(timeline, instant);
  if (active === null) return null;
  const pratyantardasha = pratyantardashas(active.antardasha).find((period) =>
    contains(period, instant),
  );
  if (pratyantardasha === undefined) return null;
  const sookshma = sookshmas(pratyantardasha).find((period) => contains(period, instant));
  if (sookshma === undefined) return null;
  return { ...active, pratyantardasha, sookshma } satisfies CurrentDasha;
});
