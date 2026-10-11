import { Array, Effect } from "effect";

import { RASHIS } from "../../chart/internal/constants.js";
import { isDualSign, isFixedSign, isMovableSign } from "../../chart/internal/position.js";
import type { Rashis } from "../../chart/model.js";
import { Zodiac } from "../../utils/index.js";
import { signAtIndex, type SignIndexError } from "../../utils/position.js";
import { CalculationError } from "./model.js";

export const targetsOf = Effect.fn("astro-ascendant/jaimini/rashi-drishti/targetsOf")(function* (
  reference: Rashis,
): Effect.fn.Return<readonly [Rashis, Rashis, Rashis], CalculationError | SignIndexError> {
  const referenceIndex = Zodiac.rashiIndexOf(reference);
  const targets: Array<Rashis> = [];
  if (isMovableSign(reference)) {
    const excluded = Array.getUnsafe(RASHIS, yield* signAtIndex(referenceIndex + 1));
    for (const candidate of RASHIS) {
      if (isFixedSign(candidate) && candidate !== excluded) {
        targets.push(candidate);
      }
    }
  } else if (isFixedSign(reference)) {
    const excluded = Array.getUnsafe(RASHIS, yield* signAtIndex(referenceIndex - 1));
    for (const candidate of RASHIS) {
      if (isMovableSign(candidate) && candidate !== excluded) {
        targets.push(candidate);
      }
    }
  } else {
    for (const candidate of RASHIS) {
      if (isDualSign(candidate) && candidate !== reference) {
        targets.push(candidate);
      }
    }
  }

  const first = targets[0];
  const second = targets[1];
  const third = targets[2];
  if (first === undefined || second === undefined || third === undefined) {
    return yield* CalculationError.make({
      message: `Rashi Drishti did not produce three targets for ${reference}`,
      cause: reference,
    });
  }

  return [first, second, third];
});
