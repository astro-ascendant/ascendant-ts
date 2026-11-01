import { Effect } from "effect";

import type { HouseData, PlanetaryPosition } from "../ephemeris/model.js";
import { placements as placementsMethod } from "../provenance.js";
import { ChartCalculationError } from "./error.js";
import { starOf } from "./helper.js";
import { Longitude, Placements, SourceLagna, SourcePlanet } from "./model.js";

export interface PlacementEvidence {
  readonly houses: HouseData;
  readonly planetEntries: readonly (readonly [SourcePlanet["name"], PlanetaryPosition])[];
}

export const placementsFromEvidence = Effect.fnUntraced(
  function* (evidence: PlacementEvidence) {
    const planets = yield* Effect.forEach(evidence.planetEntries, ([name, position]) =>
      Effect.map(starOf(position.longitude), (star) =>
        SourcePlanet.make({
          name,
          longitude: position.longitude,
          // Rahu and Ketu are the mean nodes and always move backwards, so `is_retrograde` is
          // deliberately false for them in a chart: the flag marks a graha's apparent
          // retrogression, which the nodes do not have. Transit events report the node's
          // actual direction of motion, so a node's `is_retrograde` there is always true.
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
      provenance: placementsMethod.provenance,
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
