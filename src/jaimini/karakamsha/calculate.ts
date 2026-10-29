import { Effect } from "effect";

import { getDivisionalTarget } from "../../chart/divisional-mapping/calculate.js";
import { Placements } from "../../chart/model.js";
import { jaiminiKarakamsha } from "../../provenance.js";
import { Zodiac } from "../../utils/index.js";
import { calculate as calculateCharaKarakas } from "../chara-karakas/calculate.js";
import type {
  EvidenceError as CharaKarakasEvidenceError,
  ParseError as CharaKarakasParseError,
} from "../chara-karakas/model.js";
import type { Result } from "./model.js";
import { CalculationError, EvidenceError } from "./model.js";

function karakamshaError(
  error: CharaKarakasEvidenceError | CharaKarakasParseError,
): EvidenceError | CalculationError {
  if (error._tag === "CharaKarakasEvidenceError") {
    return EvidenceError.make({
      placement: error.placement,
      expected: 1,
      actual: error.actual,
    });
  }
  return CalculationError.make({
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
    charaKarakas.assignments.Atmakaraka.map((holder) => {
      const source = placements.planets.find((planet) => planet.name === holder.planet);
      if (source === undefined) {
        return Effect.fail(
          EvidenceError.make({ placement: holder.planet, expected: 1, actual: 0 }),
        );
      }
      return getDivisionalTarget(source.longitude, 9).pipe(
        Effect.mapError((cause) =>
          CalculationError.make({
            message: `Could not calculate the D9 Sign for ${holder.planet}`,
            cause,
          }),
        ),
        Effect.map((target) => ({ planet: holder.planet, sign: Zodiac.signAt(target.signIndex) })),
      );
    }),
    { concurrency: "unbounded" },
  );

  const first = karakamshaPlacements[0];
  if (first === undefined) {
    return yield* CalculationError.make({
      message: "Karakamsha requires at least one Atmakaraka",
      cause: charaKarakas.assignments,
    });
  }

  return {
    provenance: jaiminiKarakamsha.provenance,
    placements: [first, ...karakamshaPlacements.slice(1)],
  } satisfies Result;
});
