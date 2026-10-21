import { Array as Arr, Effect, HashMap, Match, Option, pipe } from "effect";

import { PLANETS, RASHIS } from "../../chart/internal/constants.js";
import { signAt } from "../../chart/internal/position.js";
import { Planets, Rashis, type Placements } from "../../chart/model.js";
import { jaiminiArgala } from "../../provenance.js";
import { Placement, Zodiac } from "../../utils/index.js";
import { relation } from "./helper.js";
import type { Reference, Relation, Result } from "./model.js";
import { EvidenceError, Positions } from "./model.js";

/** Locates one planet's placement and sign; fails when it does not appear exactly once. */
const locate = Effect.fn("astro-ascendant/jaimini/argala/locate")(function* (
  placements: Placements,
  planet: Planets,
) {
  const placement = yield* Placement.exactlyOnce(placements, planet, (actual) =>
    EvidenceError.make({ placement: planet, expected: 1, actual }),
  );
  return { planet, placement, sign: yield* signAt(placement.longitude) };
});

/** Groups located planets by occupied sign; every sign stays present, even when empty. */
function occupantsOf(located: ReadonlyArray<{ readonly planet: Planets; readonly sign: Rashis }>) {
  return pipe(
    RASHIS,
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
  const located = yield* Effect.forEach(PLANETS, (planet) => locate(placements, planet));
  const byPlanet = HashMap.fromIterable(
    located.map(({ planet, placement }) => [planet, placement] as const),
  );
  const occupants = occupantsOf(located);

  const ketu = HashMap.get(byPlanet, "Ketu");
  if (Option.isNone(ketu)) {
    return yield* EvidenceError.make({ placement: "Ketu", expected: 1, actual: 0 });
  }
  const reverse = reference.kind === "Ketu";
  const referenceSign = yield* Match.value(reference).pipe(
    Match.when({ kind: "Sign" }, ({ sign }) => Effect.succeed(sign)),
    Match.when({ kind: "Ketu" }, () => signAt(ketu.value.longitude)),
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
