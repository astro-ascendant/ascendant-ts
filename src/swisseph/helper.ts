import { Effect } from "effect";

import type { Ayanamsa, HouseSystem } from "../astro-params/model.js";
import type { Houses } from "../chart/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import { type CelestialBody } from "../ephemeris/model.js";
import { SIDEREAL_MODE, CELESTIAL_BODY, HOUSE_SYSTEM } from "./model.js";

/** Reads one house's cusp from the native thirteen-slot array, where slot 0 is unused. */
export const nativeCuspOf = Effect.fn("astro-ascendant/swisseph/nativeCuspOf")(function* (
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
