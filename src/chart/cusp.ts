import { Array, Effect, Function, Option } from "effect";

import { normalizeLongitude } from "../utils/position.js";
import type { Longitude, Planet } from "./model.js";

export const forwardDistance = Effect.fn("astro-ascendant/chart/forwardDistance")(function* (
  from: Longitude,
  to: Longitude,
) {
  return yield* normalizeLongitude(to - from);
});

export const angularDistance: {
  (second: number): (first: number) => number;
  (first: number, second: number): number;
} = Function.dual(2, (first: number, second: number): number => {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance);
});

export const distributePlanets = Effect.fn("astro-ascendant/chart/distributePlanets")(function* (
  planets: readonly Planet[],
  cusps: readonly Longitude[],
  spans: readonly number[],
) {
  const houses = Array.map(Array.zip(cusps, spans), ([cusp, span], index) => ({
    index,
    cusp,
    span,
  }));

  const placements = yield* Effect.forEach(planets, (planet) =>
    Effect.findFirst(houses, ({ cusp, span }) =>
      forwardDistance(cusp, planet.longitude).pipe(Effect.map((distance) => distance < span)),
    ).pipe(Effect.map(Option.map(({ index }) => [index, planet] as const))),
  );

  const placed = Array.getSomes(placements);

  return Array.makeBy(12, (house) =>
    placed.filter(([index]) => index === house).map(([, planet]) => planet),
  );
});
