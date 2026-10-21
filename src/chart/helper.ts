import { Array, Effect, Function, Option } from "effect";

import { normalizeLongitude } from "../utils/position.js";
import {
  STARS,
  STAR_SPAN,
  STAR_LORD_CYCLE,
  DIGNITY_RANGES,
  VIMSHOTTARI_CYCLE_YEARS,
  VIMSHOTTARI_YEARS,
} from "./internal/constants.js";
import { type Longitude, Star, type PlanetDignity, type Planets } from "./model.js";

export const starOf = Effect.fn("astro-ascendant/chart/starOf")(function* (longitude: Longitude) {
  const position = yield* normalizeLongitude(longitude);
  const index = Math.floor(position / STAR_SPAN);
  const pada = Math.floor(((position % STAR_SPAN) / STAR_SPAN) * 4) + 1;
  return Star.make({
    name: Array.getUnsafe(STARS, index),
    lord: Array.getUnsafe(STAR_LORD_CYCLE, index % STAR_LORD_CYCLE.length),
    pada: pada as 1 | 2 | 3 | 4,
  });
});

function spanOf(planet: Planets): number {
  return VIMSHOTTARI_YEARS[planet] / VIMSHOTTARI_CYCLE_YEARS;
}

function orderedSequence(start: Planets, cyclePlanet: (index: number) => Planets): Array<Planets> {
  const startIndex = STAR_LORD_CYCLE.indexOf(start);
  return Array.range(0, STAR_LORD_CYCLE.length - 1).map((index) =>
    cyclePlanet((startIndex + index) % STAR_LORD_CYCLE.length),
  );
}

function pickLord(
  position: number,
  ordered: Array<Planets>,
): { readonly lord: Planets; readonly elapsed: number } | undefined {
  for (const [index, planet] of ordered.entries()) {
    const elapsed = ordered
      .slice(0, index)
      .reduce((total, priorPlanet) => total + spanOf(priorPlanet), 0);
    if (position < elapsed + spanOf(planet)) {
      return { lord: planet, elapsed };
    }
  }
  return undefined;
}

export const subLordOf = Effect.fn("astro-ascendant/chart/subLordOf")(function* (
  longitude: Longitude,
) {
  const star = yield* starOf(longitude);
  const offset = (yield* normalizeLongitude(longitude)) % STAR_SPAN;
  const position = offset / STAR_SPAN;
  const cyclePlanet = (index: number): Planets =>
    Option.getOrElse(Array.get(index)(STAR_LORD_CYCLE), () => star.lord);
  const picked = pickLord(position, orderedSequence(star.lord, cyclePlanet));

  return picked === undefined ? star.lord : picked.lord;
});

export const subSubLordOf = Effect.fn("astro-ascendant/chart/subSubLordOf")(function* (
  longitude: Longitude,
) {
  const star = yield* starOf(longitude);
  const offset = (yield* normalizeLongitude(longitude)) % STAR_SPAN;
  const position = offset / STAR_SPAN;
  const cyclePlanet = (index: number): Planets =>
    Option.getOrElse(Array.get(index)(STAR_LORD_CYCLE), () => star.lord);
  const subPicked = pickLord(position, orderedSequence(star.lord, cyclePlanet));
  if (subPicked === undefined) {
    return star.lord;
  }
  const positionInSub = (position - subPicked.elapsed) / spanOf(subPicked.lord);
  const sslPicked = pickLord(positionInSub, orderedSequence(subPicked.lord, cyclePlanet));

  return sslPicked === undefined ? subPicked.lord : sslPicked.lord;
});

export const inSignStatus = Function.dual<
  (longitude: number) => (planet: Planets) => ReadonlyArray<PlanetDignity>,
  (planet: Planets, longitude: number) => ReadonlyArray<PlanetDignity>
>(2, (planet, longitude) => {
  const normalized = ((longitude % 360) + 360) % 360;
  const planetDignityMap = DIGNITY_RANGES[planet];

  const match = planetDignityMap.find(({ ranges }) =>
    ranges.some(([from, to]) => normalized >= from && normalized < to),
  );

  return match !== undefined ? [match.dignity] : [];
});
