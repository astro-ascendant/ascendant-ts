import { Effect } from "effect";

import { AstroParams } from "../astro-params/service.js";
import { Ephemeris } from "../ephemeris/service.js";
import { planetBodyOf } from "../utils/position.js";
import { chartFromHouseData } from "./calculate.js";
import { mappedPositions, requestedDivisions } from "./charts.js";
import { ChartCalculationError, LocatedMomentValidationError } from "./error.js";
import {
  ChartCalculation,
  Chart,
  type ChartParams,
  Division,
  LocatedMoment,
  Planets,
} from "./model.js";
import { placementsFromEvidence, type PlacementEvidence } from "./placements.js";

const validateInput = Effect.fn("astro-ascendant/chart/validateInput")(function* (
  input: LocatedMoment,
) {
  const valid =
    Number.isFinite(input.latitude) &&
    input.latitude >= -90 &&
    input.latitude <= 90 &&
    Number.isFinite(input.longitude) &&
    input.longitude >= -180 &&
    input.longitude <= 180 &&
    Number.isFinite(input.moment.date.epochMilliseconds);

  if (!valid) {
    return yield* LocatedMomentValidationError.make({
      message: "Moment and geographic coordinates must be valid",
      cause: input,
    });
  }
});

const calculatePlacementEvidence = Effect.fn("astro-ascendant/chart/calculatePlacementEvidence")(
  function* (input: LocatedMoment) {
    const astroParams = yield* AstroParams;
    const ephemeris = yield* Ephemeris;
    const julianDay = yield* ephemeris.dateToJulianDay(input.moment.date);
    const houses = yield* ephemeris.calculateHouses(
      julianDay,
      input.latitude,
      input.longitude,
      astroParams.houseSystem,
      astroParams.ayanamsa,
    );
    const planetEntries = yield* Effect.forEach(
      Planets.literals.filter((planet) => planet !== "Ketu"),
      (planet) =>
        Effect.gen(function* () {
          const body = planetBodyOf(planet);
          const position = yield* ephemeris.calculatePosition(
            julianDay,
            body,
            astroParams.ayanamsa,
          );
          return [planet, position] as const;
        }),
      { concurrency: "unbounded" },
    );

    return { houses, planetEntries } satisfies PlacementEvidence;
  },
  Effect.mapError((cause) =>
    ChartCalculationError.make({
      stage: "placements",
      message: "Could not calculate Placements",
      cause,
    }),
  ),
);

export const generate = Effect.fn("astro-ascendant/chart/generate")(function* (
  input: ChartParams,
  divisions: readonly Division[] = [],
) {
  const astroParams = yield* AstroParams;
  yield* validateInput(input);
  const evidence = yield* calculatePlacementEvidence(input);
  const placements = yield* placementsFromEvidence(evidence);
  const requested = requestedDivisions(divisions);
  const calculatedCharts = yield* Effect.all(
    requested.map((division) =>
      Effect.gen(function* () {
        const positions = yield* mappedPositions(placements, division, input.sex).pipe(
          Effect.mapError((cause) =>
            ChartCalculationError.make({
              stage: "mapping",
              message: "Could not map one or more requested Divisions",
              cause,
            }),
          ),
        );
        return yield* chartFromHouseData(evidence.houses, positions, input.moment.date);
      }),
    ),
    { concurrency: "unbounded" },
  );
  if (calculatedCharts[0] === undefined) {
    return yield* ChartCalculationError.make({
      stage: "mapping",
      message: "Could not calculate charts",
      cause: requested,
    });
  }
  const canonicalCharts = calculatedCharts as [Chart, ...Chart[]];

  return ChartCalculation.make({
    placements,
    charts: canonicalCharts,
    astroParams,
  });
});
