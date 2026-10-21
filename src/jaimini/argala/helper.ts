import { Array, Effect, HashMap, Option } from "effect";

import { RASHIS } from "../../chart/internal/constants.js";
import type { Planets, Rashis } from "../../chart/model.js";
import { signAtIndex } from "../../utils/position.js";
import type { Relation } from "./model.js";
import { CalculationError, Positions } from "./model.js";

type PositionType = typeof Positions.Type;

export const relation = Effect.fn("astro-ascendant/jaimini/argala/relation")(function* (
  referenceIndex: number,
  position: PositionType,
  occupants: HashMap.HashMap<Rashis, readonly Planets[]>,
  reverse: boolean,
) {
  const offset = position - 1;
  const index = yield* signAtIndex(referenceIndex + (reverse ? -offset : offset));
  const sign = Array.getUnsafe(RASHIS, index);
  const planets = HashMap.get(occupants, sign);
  if (Option.isNone(planets)) {
    return yield* CalculationError.make({
      message: `Missing occupants for ${sign}`,
      cause: sign,
    });
  }
  return { position, sign, planets: planets.value } satisfies Relation;
});
