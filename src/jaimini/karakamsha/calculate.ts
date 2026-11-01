import { Effect } from "effect";

import { getDivisionalTarget } from "../../chart/divisional-mapping/calculate.js";
import { Placements } from "../../chart/model.js";
import { jaiminiKarakamsha } from "../../provenance.js";
import { Placement, Zodiac } from "../../utils/index.js";
import { calculate as calculateCharaKarakas } from "../chara-karakas/calculate.js";
import type { CharaKarakasEvidenceError, CharaKarakasParseError } from "../chara-karakas/model.js";
import type { Result } from "./model.js";
import { KarakamshaCalculationError, KarakamshaEvidenceError } from "./model.js";

function karakamshaError(
  error: CharaKarakasEvidenceError | CharaKarakasParseError,
): KarakamshaEvidenceError | KarakamshaCalculationError {
  if (error._tag === "CharaKarakasEvidenceError") {
    return KarakamshaEvidenceError.make({
      placement: error.placement,
      expected: 1,
      actual: error.actual,
    });
  }
  return KarakamshaCalculationError.make({
    message: "Chara Karaka calculation failed",
    cause: error,
  });
}

export const calculate = Effect.fn("astro-ascendant/jaimini/karakamsha/calculate")(function* (
  placements: Placements,
) {
  const charaKarakas = yield* calculateCharaKarakas(placements).pipe(
    Effect.mapError(karakamshaError),
  );

  const karakamshaPlacements = yield* Effect.all(
    charaKarakas.assignments.Atmakaraka.map((holder) =>
      Placement.exactlyOnce(placements, holder.planet, (actual) =>
        KarakamshaEvidenceError.make({ placement: holder.planet, expected: 1, actual }),
      ).pipe(
        Effect.flatMap((source) =>
          getDivisionalTarget(source.longitude, 9).pipe(
            Effect.mapError((cause) =>
              KarakamshaCalculationError.make({
                message: `Could not calculate the D9 Sign for ${holder.planet}`,
                cause,
              }),
            ),
          ),
        ),
        Effect.map((target) => ({ planet: holder.planet, sign: Zodiac.signAt(target.signIndex) })),
      ),
    ),
    { concurrency: "unbounded" },
  );

  const first = karakamshaPlacements[0];
  if (first === undefined) {
    return yield* KarakamshaCalculationError.make({
      message: "Karakamsha requires at least one Atmakaraka",
      cause: charaKarakas.assignments,
    });
  }

  return {
    provenance: jaiminiKarakamsha.provenance,
    placements: [first, ...karakamshaPlacements.slice(1)],
  } satisfies Result;
});
