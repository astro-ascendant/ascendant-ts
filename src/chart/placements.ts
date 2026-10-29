import { Effect } from "effect";

import type { HouseData, PlanetaryPosition } from "../ephemeris/model.js";
import { ChartCalculationError } from "./error.js";
import { starOf } from "./helper.js";
import { Longitude, Placements, SourceLagna, SourcePlanet } from "./model.js";

export interface PlacementEvidence {
  readonly houses: HouseData;
  readonly planetEntries: readonly (readonly [SourcePlanet["name"], PlanetaryPosition])[];
}

export const placementsFromEvidence = Effect.fn("astro-ascendant/chart/placementsFromEvidence")(
  function* (evidence: PlacementEvidence) {
    const planets = yield* Effect.forEach(evidence.planetEntries, ([name, position]) =>
      Effect.map(starOf(position.longitude), (star) =>
        SourcePlanet.make({
          name,
          longitude: position.longitude,
          // The nodes always move backwards, so a retrograde flag would carry no information.
          is_retrograde: name === "Rahu" || name === "Ketu" ? false : position.longitudeSpeed < 0,
          star,
        }),
      ),
    );
    const ascendant = evidence.houses.angles.ascendant;

    return Placements.make({
      lagna: SourceLagna.make({
        name: "Lagna",
        longitude: Longitude.make(ascendant),
        star: yield* starOf(Longitude.make(ascendant)),
      }),
      planets,
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
