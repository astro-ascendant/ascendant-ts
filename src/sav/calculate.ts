import { Array, Effect, Record } from "effect";

import { RASHIS } from "../chart/internal/constants.js";
import type { Placements } from "../chart/model.js";
import { Placement, Zodiac } from "../utils/index.js";
import { signIndexOf } from "../utils/position.js";
import {
  ASHTAKAVARGA_ENTITY_ORDER,
  ASHTAKAVARGA_PLANET_ORDER,
  CONTRIBUTION_OFFSETS,
  DUAL_LORD_PAIRS,
  EXPECTED_BAV_TOTALS,
  EXPECTED_SAV_TOTAL,
  GRAHA_GUNAKAR,
  RASHI_GUNAKAR,
  TRIKONA_GROUPS,
} from "./constants.js";
import { SAVCalculationError } from "./error.js";
import {
  AshtakavargaEntities,
  AshtakavargaPlanets,
  AshtakavargaResult,
  AshtakavargaTotals,
  BhinnaAshtakavarga,
  Pinda,
  ReducedAshtakavarga,
  ShodhyaPinda,
  SignScores,
} from "./model.js";

type EntityPositions = Readonly<Record<AshtakavargaEntities, Zodiac.RashiIndex>>;

function signScoresFromArray(scores: readonly number[]): SignScores {
  return Record.fromEntries(
    RASHIS.map((rashi, index) => [rashi, Array.getUnsafe(scores, index)] as const),
  ) as SignScores;
}

const signScores = Effect.fn("astro-ascendant/sav/signScores")(function* (
  scores: readonly number[],
) {
  if (scores.length !== RASHIS.length) {
    return yield* SAVCalculationError.make({
      message: `Expected 12 sign scores; received ${scores.length}`,
      cause: { expected: RASHIS.length, actual: scores.length },
    });
  }
  return signScoresFromArray(scores);
});

const total = (scores: SignScores): number => RASHIS.reduce((sum, rashi) => sum + scores[rashi], 0);

const entityPositions = Effect.fn("astro-ascendant/sav/entityPositions")(function* (
  placements: Placements,
) {
  const planetPosition = Effect.fn("astro-ascendant/sav/planetPosition")(function* (
    name: AshtakavargaPlanets,
  ) {
    const match = yield* Placement.exactlyOnce(placements, name, (count) =>
      SAVCalculationError.make({
        message: `Placements must contain exactly one ${name}; received ${count}`,
        cause: { planet: name, count },
      }),
    );
    return yield* signIndexOf(match.longitude);
  });

  const positions = yield* Effect.all(
    ASHTAKAVARGA_ENTITY_ORDER.map((entity) =>
      entity === "Lagna" ? signIndexOf(placements.lagna.longitude) : planetPosition(entity),
    ),
    { concurrency: "unbounded" },
  );

  return Record.fromEntries(
    ASHTAKAVARGA_ENTITY_ORDER.map((entity, i) => [entity, Array.getUnsafe(positions, i)]),
  ) as EntityPositions;
});

const calculateSignScores = Effect.fn("astro-ascendant/sav/calculateSignScores")(function* (
  target: AshtakavargaEntities,
  positions: EntityPositions,
) {
  return yield* signScores(
    RASHIS.map((_, signIndex) =>
      ASHTAKAVARGA_ENTITY_ORDER.reduce((score, contributor) => {
        const distance = Zodiac.houseDistance(positions[contributor], signIndex);
        return score + (CONTRIBUTION_OFFSETS[target][contributor].includes(distance) ? 1 : 0);
      }, 0),
    ),
  );
});

const calculateBhinna = Effect.fn("astro-ascendant/sav/calculateBhinna")(function* (
  positions: EntityPositions,
) {
  const bhinnaEntries = yield* Effect.all(
    ASHTAKAVARGA_ENTITY_ORDER.map((entity) =>
      calculateSignScores(entity, positions).pipe(
        Effect.map((scores) => [entity, scores] as const),
      ),
    ),
    { concurrency: "unbounded" },
  );
  return Record.fromEntries(bhinnaEntries) as BhinnaAshtakavarga;
});

const validateBhinna = Effect.fn("astro-ascendant/sav/validateBhinna")(function* (
  bhinna: BhinnaAshtakavarga,
) {
  for (const entity of ASHTAKAVARGA_ENTITY_ORDER) {
    const actual = total(bhinna[entity]);
    const expected = EXPECTED_BAV_TOTALS[entity];
    if (actual !== expected) {
      return yield* SAVCalculationError.make({
        message: `Invalid ${entity} BAV total: ${actual}; expected ${expected}`,
        cause: { entity, actual, expected },
      });
    }
  }
});

const calculateSarva = Effect.fn("astro-ascendant/sav/calculateSarva")(function* (
  bhinna: BhinnaAshtakavarga,
) {
  const sarva = yield* signScores(
    RASHIS.map((rashi) =>
      ASHTAKAVARGA_PLANET_ORDER.reduce((score, planet) => score + bhinna[planet][rashi], 0),
    ),
  );
  const actual = total(sarva);
  if (actual !== EXPECTED_SAV_TOTAL) {
    return yield* SAVCalculationError.make({
      message: `Invalid SAV total: ${actual}; expected ${EXPECTED_SAV_TOTAL}`,
      cause: { actual, expected: EXPECTED_SAV_TOTAL },
    });
  }
  return sarva;
});

const reduceScores = Effect.fn("astro-ascendant/sav/reduceScores")(function* (scores: SignScores) {
  const reduced = RASHIS.map((rashi) => scores[rashi]);

  for (const group of TRIKONA_GROUPS) {
    const minimum = Math.min(...group.map((index) => reduced[index] ?? 0));
    for (const index of group) reduced[index] = (reduced[index] ?? 0) - minimum;
  }

  for (const [first, second] of DUAL_LORD_PAIRS) {
    const firstValue = reduced[first] ?? 0;
    const secondValue = reduced[second] ?? 0;
    if (firstValue >= secondValue) {
      reduced[first] = firstValue - secondValue;
      reduced[second] = 0;
    } else {
      reduced[first] = 0;
      reduced[second] = secondValue - firstValue;
    }
  }

  return yield* signScores(reduced);
});

const calculateReduced = Effect.fn("astro-ascendant/sav/calculateReduced")(function* (
  bhinna: BhinnaAshtakavarga,
) {
  const reducedEntries = yield* Effect.forEach(
    ASHTAKAVARGA_PLANET_ORDER,
    (planet) =>
      reduceScores(bhinna[planet]).pipe(Effect.map((scores) => [planet, scores] as const)),
    { concurrency: "unbounded" },
  );
  return Record.fromEntries(reducedEntries) as ReducedAshtakavarga;
});

function calculatePlanetPinda(scores: SignScores, positions: EntityPositions): Pinda {
  const rashi_pinda = RASHIS.reduce(
    (sum, rashi, index) => sum + scores[rashi] * (RASHI_GUNAKAR[index] ?? 0),
    0,
  );
  const graha_pinda = ASHTAKAVARGA_PLANET_ORDER.reduce(
    (sum, planet) =>
      sum + scores[Array.getUnsafe(RASHIS, positions[planet])] * GRAHA_GUNAKAR[planet],
    0,
  );
  return { rashi_pinda, graha_pinda, shodhya_pinda: rashi_pinda + graha_pinda } satisfies Pinda;
}

function calculateShodhyaPinda(
  reduced: ReducedAshtakavarga,
  positions: EntityPositions,
): ShodhyaPinda {
  return Record.fromEntries(
    ASHTAKAVARGA_PLANET_ORDER.map(
      (planet) => [planet, calculatePlanetPinda(reduced[planet], positions)] as const,
    ),
  ) as ShodhyaPinda;
}

const calculateTotals = Effect.fn("astro-ascendant/sav/calculateTotals")(function* (
  bhinna: BhinnaAshtakavarga,
) {
  const entityTotals = yield* Effect.all(
    ASHTAKAVARGA_ENTITY_ORDER.map((entity) =>
      Effect.sync(() => total(bhinna[entity])).pipe(Effect.map((t) => [entity, t] as const)),
    ),
    { concurrency: "unbounded" },
  );
  const sarvaTotal = total(yield* calculateSarva(bhinna));
  return Record.fromEntries([...entityTotals, ["sarva", sarvaTotal]]) as AshtakavargaTotals;
});

export const calculate = Effect.fn("astro-ascendant/sav/calculate")(function* (
  placements: Placements,
) {
  const positions = yield* entityPositions(placements);
  const bhinna = yield* calculateBhinna(positions);
  yield* validateBhinna(bhinna);
  const sarva = yield* calculateSarva(bhinna);
  const reduced = yield* calculateReduced(bhinna);
  const shodhya_pinda = calculateShodhyaPinda(reduced, positions);
  const totals = yield* calculateTotals(bhinna);

  return { bhinna, sarva, reduced, shodhya_pinda, totals } satisfies AshtakavargaResult;
});
