import { Array, Effect, Order, pipe, Record as Struct } from "effect";

import { chartProjection } from "../provenance.js";
import { Zodiac } from "../utils/index.js";
import { normalizeLongitude } from "../utils/position.js";
import { getDivisionalTarget } from "./divisional-mapping/calculate.js";
import { ChartCalculationError } from "./error.js";
import { inSignStatus, starOf, subLordOf, subSubLordOf } from "./helper.js";
import { SIGN_LORDS } from "./internal/constants.js";
import {
  Chart,
  type Division,
  House,
  Houses,
  Lagna,
  type Placements,
  Planet,
  Rashis,
  Sign,
  type Sex,
  HOUSE_SIGNIFICATIONS,
} from "./model.js";

export interface MappedPositions {
  readonly division: Division;
  readonly lagna: Lagna;
  readonly planets: readonly Planet[];
  readonly sex: Sex | undefined;
}

const chartFromMappedPlacements = Effect.fn("astro-ascendant/chart/chartFromMappedPlacements")(
  function* ({ division, lagna, planets, sex }: MappedPositions) {
    const lagnaSignIndex = Rashis.literals.indexOf(lagna.sign.name);
    const entries: Array<readonly [string, House]> = [];
    for (const index of Array.range(0, 11)) {
      const house = (index + 1) as Houses;
      const houseSign = Zodiac.signAt(lagnaSignIndex + index);
      const cusp = yield* normalizeLongitude(Zodiac.wrapIndex(lagnaSignIndex + index) * 30);
      entries.push([
        String(house),
        House.make({
          sign: houseSign,
          cusp,
          signLord: SIGN_LORDS[houseSign],
          starLord: (yield* starOf(cusp)).lord,
          subLord: yield* subLordOf(cusp),
          subSubLord: yield* subSubLordOf(cusp),
          significations: HOUSE_SIGNIFICATIONS[house],
          planets: planets.filter((planet) => planet.sign.name === houseSign),
          lagna: house === 1 ? lagna : null,
        }),
      ] as const);
    }
    const houses = Struct.fromEntries(entries) as Record<Houses, House>;

    return Chart.make({
      ...(sex === undefined ? {} : { sex }),
      provenance: chartProjection.provenance,
      division,
      houses,
    });
  },
);

export const mappedPositions = Effect.fn("astro-ascendant/chart/mappedPositions")(function* (
  placements: Placements,
  division: Division,
  sex: Sex | undefined,
) {
  const lagna = yield* getDivisionalTarget(placements.lagna.longitude, division).pipe(
    Effect.map((mapped) => {
      const mappedSign = Array.getUnsafe(Rashis.literals, mapped.signIndex);
      return Lagna.make({
        name: "Lagna",
        longitude: mapped.longitude,
        degree: mapped.degree,
        sign: Sign.make({
          name: mappedSign,
          lord: SIGN_LORDS[mappedSign],
        }),
      });
    }),
  );

  const planets = yield* Effect.forEach(
    placements.planets,
    (source) =>
      getDivisionalTarget(source.longitude, division).pipe(
        Effect.map((mapped) => {
          const mappedSign = Array.getUnsafe(Rashis.literals, mapped.signIndex);
          return Planet.make({
            name: source.name,
            longitude: mapped.longitude,
            degree: mapped.degree,
            is_retrograde: source.is_retrograde,
            in_sign: inSignStatus(source.name, mapped.longitude),
            sign: Sign.make({
              name: mappedSign,
              lord: SIGN_LORDS[mappedSign],
            }),
          });
        }),
      ),
    { concurrency: "unbounded" },
  );

  return { division, lagna, planets, sex } satisfies MappedPositions;
});

const chartFromPlacements = Effect.fn("astro-ascendant/chart/chartFromPlacements")(function* (
  placements: Placements,
  division: Division,
  sex: Sex | undefined,
) {
  const positions = yield* mappedPositions(placements, division, sex);

  return yield* chartFromMappedPlacements(positions);
});

export function requestedDivisions(
  divisions: readonly Division[],
): readonly [Division, ...Division[]] {
  const requested = pipe(
    divisions,
    Array.filter((division) => division !== 1),
    Array.dedupe,
    Array.sort(Order.Number),
  );

  return [1, ...requested];
}

export const project = Effect.fn("astro-ascendant/chart/project")(
  function* (placements: Placements, divisions: readonly Division[] = [], sex?: Sex) {
    const requested = requestedDivisions(divisions);
    const [firstDivision, ...remainingDivisions] = requested;
    const firstChart = yield* chartFromPlacements(placements, firstDivision, sex);
    const remainingCharts = yield* Effect.forEach(
      remainingDivisions,
      (division) => chartFromPlacements(placements, division, sex),
      { concurrency: "unbounded" },
    );

    return [firstChart, ...remainingCharts] as [Chart, ...Chart[]];
  },
  Effect.mapError((cause) =>
    ChartCalculationError.make({
      stage: "mapping",
      message: "Could not map one or more requested Divisions",
      cause,
    }),
  ),
);
