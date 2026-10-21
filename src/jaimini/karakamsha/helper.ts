import { Array, Effect } from "effect";

import { RASHIS } from "../../chart/internal/constants.js";
import { signAtIndex } from "../../utils/position.js";
import { CalculationError } from "./model.js";

export const signOf = Effect.fn("astro-ascendant/jaimini/karakamsha/signOf")(function* (
  signIndex: number,
) {
  if (!Number.isInteger(signIndex) || signIndex < 0 || signIndex >= RASHIS.length) {
    return yield* CalculationError.make({
      message: `Missing sign at index ${signIndex}`,
      cause: signIndex,
    });
  }
  const index = yield* signAtIndex(signIndex);
  return Array.getUnsafe(RASHIS, index);
});
