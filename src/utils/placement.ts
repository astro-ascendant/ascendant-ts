import { Effect, Function } from "effect";

import type { Placements, Planets, SourcePlanet } from "../chart/model.js";

/**
 * Finds a planet's placement, failing when it does not appear exactly once.
 * Callers pass their module's error via `failWith`, so error provenance stays
 * local while the exactly-once rule lives here.
 */
export const exactlyOnce = Function.dual<
  <E>(
    planet: Planets,
    failWith: (actual: number) => E,
  ) => (placements: Placements) => Effect.Effect<SourcePlanet, E>,
  <E>(
    placements: Placements,
    planet: Planets,
    failWith: (actual: number) => E,
  ) => Effect.Effect<SourcePlanet, E>
>(
  3,
  <E>(
    placements: Placements,
    planet: Planets,
    failWith: (actual: number) => E,
  ): Effect.Effect<SourcePlanet, E> => {
    const matches = placements.planets.filter((candidate) => candidate.name === planet);
    const match = matches[0];
    return match !== undefined && matches.length === 1
      ? Effect.succeed(match)
      : Effect.fail(failWith(matches.length));
  },
);
