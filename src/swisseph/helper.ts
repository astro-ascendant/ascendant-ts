import { Effect } from "effect";

import type { Ayanamsa, HouseSystem } from "../astro-params/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import { type CelestialBody } from "../ephemeris/model.js";
import { signStartOf } from "../utils/position.js";
import { SIDEREAL_MODE, CELESTIAL_BODY, HOUSE_SYSTEM } from "./model.js";

export const wholeSignCusps = Effect.fn("astro-ascendant/swisseph/wholeSignCusps")(function* (
  houses: { readonly cusps: ReadonlyArray<number>; readonly ascendant: number },
  ascendant: number,
) {
  const start = yield* signStartOf(ascendant);
  return Array.from({ length: 13 }, (_, index) => {
    if (index === 0) return houses.cusps[0] ?? 0;
    return (start + (index - 1) * 30) % 360;
  });
});

export function siderealModeOf(ayanamsa: Ayanamsa): (typeof SIDEREAL_MODE)[Ayanamsa] {
  return SIDEREAL_MODE[ayanamsa];
}

export const celestialBodyOf = Effect.fn("astro-ascendant/swisseph/celestialBodyOf")(function* (
  body: CelestialBody,
) {
  const cb = CELESTIAL_BODY[body];
  if (cb === undefined) {
    return yield* EphemerisError.make({
      operation: "celestialBodyOf",
      cause: new Error(`Unknown celestial body: ${body}`),
    });
  }
  return cb;
});

export const houseSystemOf = Effect.fn("astro-ascendant/swisseph/houseSystemOf")(function* (
  system: HouseSystem,
) {
  const hs = HOUSE_SYSTEM[system];
  if (hs === undefined) {
    return yield* EphemerisError.make({
      operation: "houseSystemOf",
      cause: new Error(`Unknown house system: ${system}`),
    });
  }
  return hs;
});
