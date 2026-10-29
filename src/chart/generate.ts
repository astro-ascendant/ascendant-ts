import { Effect, Schema } from "effect";

import { AstroParams } from "../astro-params/service.js";
import { Ephemeris } from "../ephemeris/service.js";
import { ChartCalculationError, LocatedMomentValidationError } from "./error.js";
import { ChartCalculation, type ChartParams, Division, LocatedMoment, Planets } from "./model.js";
import { placementsFromEvidence, type PlacementEvidence } from "./placements.js";
import { projectCharts } from "./projection.js";

/** Decodes the Located Moment, so out-of-range or malformed input fails typed before any ephemeris call. */
function validateInput(input: ChartParams) {
  return Effect.mapError(Schema.decodeEffect(LocatedMoment)(input), (cause) =>
    LocatedMomentValidationError.make({
      message: "Moment and geographic coordinates must be valid",
      cause,
    }),
  );
}

const calculatePlacementEvidence = Effect.fnUntraced(
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
      Planets.literals,
      (planet) =>
        Effect.map(
          ephemeris.calculatePosition(julianDay, planet, astroParams.ayanamsa),
          (position) => [planet, position] as const,
        ),
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
  const charts = yield* projectCharts(
    placements,
    evidence.houses,
    input.moment.date,
    divisions,
    input.sex,
  );

  return ChartCalculation.make({ placements, charts, astroParams });
});
