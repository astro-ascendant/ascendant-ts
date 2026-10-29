import { Array, Match } from "effect";

import type { Rashis } from "../../chart/model.js";
import { Zodiac } from "../../utils/index.js";

function signsOf(modality: Zodiac.Modality): readonly Rashis[] {
  return Zodiac.SIGNS.filter((sign) => Zodiac.modalityOf(sign) === modality);
}

function triple(signs: readonly Rashis[]): readonly [Rashis, Rashis, Rashis] {
  return [Array.getUnsafe(signs, 0), Array.getUnsafe(signs, 1), Array.getUnsafe(signs, 2)];
}

/**
 * The three Signs a Sign aspects: movable Signs aspect the fixed Signs except
 * the next one, fixed Signs the movable Signs except the previous one, and dual
 * Signs the other dual Signs (ADR-0006).
 */
export function targetsOf(reference: Rashis): readonly [Rashis, Rashis, Rashis] {
  const index = Zodiac.rashiIndexOf(reference);
  return Match.value(Zodiac.modalityOf(reference)).pipe(
    Match.when("Movable", () =>
      triple(signsOf("Fixed").filter((sign) => sign !== Zodiac.signAt(index + 1))),
    ),
    Match.when("Fixed", () =>
      triple(signsOf("Movable").filter((sign) => sign !== Zodiac.signAt(index - 1))),
    ),
    Match.when("Dual", () => triple(signsOf("Dual").filter((sign) => sign !== reference))),
    Match.exhaustive,
  );
}
