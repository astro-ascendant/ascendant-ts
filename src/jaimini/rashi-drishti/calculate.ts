import { Effect } from "effect";

import type { Rashis } from "../../chart/model.js";
import { jaiminiRashiDrishti } from "../../provenance.js";
import { targetsOf } from "./helper.js";
import type { Result } from "./model.js";

/** Calculates the Signs one reference Sign aspects under Jaimini Rashi Drishti; it cannot fail. */
export function calculate(reference: Rashis): Effect.Effect<Result> {
  return Effect.succeed({
    provenance: jaiminiRashiDrishti.provenance,
    reference,
    targets: targetsOf(reference),
  } satisfies Result);
}
