import { Effect } from "effect";

import type { Rashis } from "../../chart/model.js";
import { jaiminiRashiDrishti } from "../../provenance.js";
import { targetsOf } from "./helper.js";
import type { Result } from "./model.js";

export const calculate = Effect.fn("astro-ascendant/jaimini/rashi-drishti/calculate")(function* (
  reference: Rashis,
) {
  const targets = yield* targetsOf(reference);

  return {
    provenance: jaiminiRashiDrishti.provenance,
    reference,
    targets,
  } satisfies Result;
});
