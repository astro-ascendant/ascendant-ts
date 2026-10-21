import { Context, Effect } from "effect";
import type { DateTime } from "effect/DateTime";

import { type Ayanamsa, type HouseSystem } from "../astro-params/model.js";
import { EphemerisError } from "./error.js";
import {
  type CelestialBody,
  type HouseData,
  type JulianDay,
  type PlanetaryPosition,
} from "./model.js";

class Service extends Context.Service<
  Service,
  {
    readonly dateToJulianDay: (date: DateTime) => Effect.Effect<JulianDay, EphemerisError>;
    readonly calculatePosition: (
      julianDay: JulianDay,
      body: CelestialBody,
      ayanamsa: Ayanamsa,
    ) => Effect.Effect<PlanetaryPosition, EphemerisError>;
    readonly calculateHouses: (
      julianDay: JulianDay,
      latitude: number,
      longitude: number,
      houseSystem: HouseSystem,
      ayanamsa: Ayanamsa,
    ) => Effect.Effect<HouseData, EphemerisError>;
  }
>()("astro-ascendant/ephemeris/service") {}

export { Service as Ephemeris };
