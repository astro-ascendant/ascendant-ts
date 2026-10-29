import { Array as Arr, Effect, HashMap, Match, pipe } from "effect";

import { PLANETS } from "../../chart/internal/constants.js";
import { Planets, Rashis, type Placements } from "../../chart/model.js";
import { jaiminiArgala } from "../../provenance.js";
import { Placement, Zodiac } from "../../utils/index.js";
import { relation } from "./helper.js";
import type { Reference, Relation, Result } from "./model.js";
import { EvidenceError, Positions } from "./model.js";

/** Groups located planets by occupied sign; every sign stays present, even when empty. */
function occupantsOf(located: ReadonlyArray<{ readonly planet: Planets; readonly sign: Rashis }>) {
  return pipe(
    Zodiac.SIGNS,
    Arr.map(
      (sign) =>
        [
          sign,
          located.filter((entry) => entry.sign === sign).map((entry) => entry.planet),
        ] as const,
    ),
    HashMap.fromIterable,
  );
}

/** Calculates Jaimini Argala (planetary intervention) for a sign or Ketu reference. */
export const calculate = Effect.fn("astro-ascendant/jaimini/argala/calculate")(function* (
  placements: Placements,
  reference: Reference,
) {
  const required = yield* Placement.requireEach(placements, PLANETS, (placement, actual) =>
    EvidenceError.make({ placement, expected: 1, actual }),
  );
  const occupants = occupantsOf(
    PLANETS.map((planet) => ({ planet, sign: Zodiac.signOfLongitude(required[planet].longitude) })),
  );

  const reverse = reference.kind === "Ketu";
  const referenceSign = Match.value(reference).pipe(
    Match.when({ kind: "Sign" }, ({ sign }) => sign),
    Match.when({ kind: "Ketu" }, () => Zodiac.signOfLongitude(required.Ketu.longitude)),
    Match.exhaustive,
  );
  const referenceIndex = Zodiac.rashiIndexOf(referenceSign);

  // Positions.literals runs supporting (2, 4, 11), obstructing (12, 10, 3), then secondary (5, 9).
  // forEach preserves order, so the results split 1:1 with the literals.
  const relations = yield* Effect.forEach(Positions.literals, (position) =>
    relation(referenceIndex, position, occupants, reverse),
  );
  const tripleAt = (start: number): readonly [Relation, Relation, Relation] => [
    Arr.getUnsafe(relations, start),
    Arr.getUnsafe(relations, start + 1),
    Arr.getUnsafe(relations, start + 2),
  ];

  return {
    provenance: jaiminiArgala.provenance,
    reference,
    referenceSign,
    direction: reverse ? ("reverse" as const) : ("forward" as const),
    supporting: tripleAt(0),
    obstructing: tripleAt(3),
    secondarySupporting: Arr.getUnsafe(relations, 6),
    secondaryObstructing: Arr.getUnsafe(relations, 7),
  } satisfies Result;
});
