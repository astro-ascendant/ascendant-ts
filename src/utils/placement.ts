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

/** The placement of each planet a calculation requires, each known to appear exactly once. */
export type Required<P extends Planets> = { readonly [Planet in P]: SourcePlanet };

/**
 * Indexes the placements of exactly the planets a calculation requires (ADR-0003),
 * failing with the calculation's own error on the first that is missing or
 * duplicated. Planets the calculation does not require are not inspected.
 */
export const requireEach = Function.dual<
  <const P extends Planets, E>(
    planets: ReadonlyArray<P>,
    failWith: (planet: P, actual: number) => E,
  ) => (placements: Placements) => Effect.Effect<Required<P>, E>,
  <const P extends Planets, E>(
    placements: Placements,
    planets: ReadonlyArray<P>,
    failWith: (planet: P, actual: number) => E,
  ) => Effect.Effect<Required<P>, E>
>(
  3,
  <const P extends Planets, E>(
    placements: Placements,
    planets: ReadonlyArray<P>,
    failWith: (planet: P, actual: number) => E,
  ): Effect.Effect<Required<P>, E> =>
    Effect.map(
      Effect.forEach(planets, (planet) =>
        Effect.map(
          exactlyOnce(placements, planet, (actual) => failWith(planet, actual)),
          (placement) => [planet, placement] as const,
        ),
      ),
      (entries) => Object.fromEntries(entries) as Required<P>,
    ),
);
