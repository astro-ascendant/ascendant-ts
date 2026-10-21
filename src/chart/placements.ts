import { Array, Effect, Option } from "effect";

import type { HouseData, PlanetaryPosition } from "../ephemeris/model.js";
import { ketuFromRahu, normalizeLongitude } from "../utils/position.js";
import { ChartCalculationError, MissingPlacementError } from "./error.js";
import { starOf } from "./helper.js";
import { Placements, SourceLagna, SourcePlanet } from "./model.js";

export interface PlacementEvidence {
  readonly houses: HouseData;
  readonly planetEntries: readonly (readonly [SourcePlanet["name"], PlanetaryPosition])[];
}

export const placementsFromEvidence = Effect.fn("astro-ascendant/chart/placementsFromEvidence")(
  function* (evidence: PlacementEvidence) {
    const sourcePlanets: SourcePlanet[] = [];

    for (const [name, position] of evidence.planetEntries) {
      const longitude = yield* normalizeLongitude(position.longitude);
      const star = yield* starOf(longitude);

      sourcePlanets.push(
        SourcePlanet.make({
          name,
          longitude,
          is_retrograde: name === "Rahu" ? false : position.longitudeSpeed < 0,
          star,
        }),
      );
    }

    const rahuOption = Array.findFirst(sourcePlanets, (planet) => planet.name === "Rahu");

    if (Option.isNone(rahuOption)) {
      return yield* MissingPlacementError.make({ placement: "Rahu" });
    }

    const rahu = rahuOption.value;

    const ketuLongitude = yield* ketuFromRahu(rahu.longitude);
    const ketuStar = yield* starOf(ketuLongitude);
    const ascendant = yield* normalizeLongitude(evidence.houses.ascendant);
    const ascendantStar = yield* starOf(ascendant);

    return Placements.make({
      lagna: SourceLagna.make({
        name: "Lagna",
        longitude: ascendant,
        star: ascendantStar,
      }),
      planets: [
        ...sourcePlanets,
        SourcePlanet.make({
          name: "Ketu",
          longitude: ketuLongitude,
          is_retrograde: false,
          star: ketuStar,
        }),
      ],
    });
  },
  Effect.mapError((cause) =>
    ChartCalculationError.make({
      stage: "placements",
      message: "Could not calculate Placements",
      cause,
    }),
  ),
);
