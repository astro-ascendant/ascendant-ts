import { Effect } from "effect";

import type { Ayanamsa, HouseSystem } from "../astro-params/model.js";
import type { Houses, Planets } from "../chart/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import { SIDEREAL_MODE, CELESTIAL_BODY, HOUSE_SYSTEM } from "./model.js";

/** Reads one house's cusp from the native thirteen-slot array, where slot 0 is unused. */
export const nativeCuspOf = Effect.fnUntraced(function* (
  houses: { readonly cusps: ReadonlyArray<number> },
  house: Houses,
) {
  const cusp = houses.cusps[house];
  if (cusp === undefined) {
    return yield* EphemerisError.make({
      operation: "calculateHouses",
      cause: new Error(`Native house data has no cusp for house ${house}`),
    });
  }
  return cusp;
});

export function siderealModeOf(ayanamsa: Ayanamsa): (typeof SIDEREAL_MODE)[Ayanamsa] {
  return SIDEREAL_MODE[ayanamsa];
}

export const celestialBodyOf = Effect.fnUntraced(function* (planet: Planets) {
  const cb = CELESTIAL_BODY[planet];
  if (cb === undefined) {
    return yield* EphemerisError.make({
      operation: "celestialBodyOf",
      cause: new Error(`Unknown planet: ${planet}`),
    });
  }
  return cb;
});

export const houseSystemOf = Effect.fnUntraced(function* (system: HouseSystem) {
  const hs = HOUSE_SYSTEM[system];
  if (hs === undefined) {
    return yield* EphemerisError.make({
      operation: "houseSystemOf",
      cause: new Error(`Unknown house system: ${system}`),
    });
  }
  return hs;
});
