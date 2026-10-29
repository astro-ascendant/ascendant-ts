import { Effect, Function, Layer } from "effect";
import type { DateTime } from "effect/DateTime";

import { Ayanamsa, HouseSystem } from "../../src/astro-params/model.js";
import { CircleAngle, Houses, Longitude } from "../../src/chart/model.js";
import {
  CelestialBody,
  type HouseData,
  JulianDay,
  type PlanetaryPosition,
} from "../../src/ephemeris/model.js";
import { Ephemeris } from "../../src/ephemeris/service.js";

export const planetaryPosition: {
  (longitudeSpeed: number): (longitude: number) => PlanetaryPosition;
  (longitude: number, longitudeSpeed: number): PlanetaryPosition;
} = Function.dual(2, (longitude: number, longitudeSpeed: number): PlanetaryPosition => ({
  longitude,
  latitude: 0,
  distance: 1,
  longitudeSpeed,
  latitudeSpeed: 0,
  distanceSpeed: 0,
  flags: 0,
}));

/** Twelve whole-sign cusps from 0° Aries, one per house in order. */
export const WHOLE_SIGN_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

/** Domain house evidence from twelve cusps in house order; the ascendant is the first cusp. */
export const houseData: {
  (houseSystem: HouseSystem): (cusps: ReadonlyArray<number>) => HouseData;
  (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData;
} = Function.dual(2, (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData => {
  if (cusps.length !== Houses.literals.length) {
    throw new Error(`Expected twelve cusps, received ${cusps.length}`);
  }
  const angle = (value: number) => CircleAngle.make(value);
  const byHouse = {} as { [House in Houses]: Longitude };
  for (const house of Houses.literals) {
    byHouse[house] = Longitude.make(cusps[house - 1]!);
  }
  return {
    houseSystem,
    cusps: byHouse,
    angles: {
      ascendant: angle(cusps[0]!),
      mc: angle(270),
      armc: angle(270),
      vertex: angle(90),
      equatorialAscendant: angle(0),
      coAscendant1: angle(0),
      coAscendant2: angle(0),
      polarAscendant: angle(0),
    },
  };
});

export interface EphemerisTestOptions {
  /** Twelve cusps in house order; defaults to whole signs from 0° Aries. */
  readonly cusps?: ReadonlyArray<number>;
  /** Sidereal longitude per body; unlisted bodies sit at 30° times their index. */
  readonly longitudes?: Partial<Record<CelestialBody, number>>;
  /** Bodies reported with negative longitude speed. */
  readonly retrograde?: ReadonlyArray<CelestialBody>;
}

/** In-memory Ephemeris adapter returning fixed positions and house evidence. */
export function ephemerisTestLayer(options: EphemerisTestOptions = {}) {
  const cusps = options.cusps ?? WHOLE_SIGN_CUSPS;
  const retrograde = new Set(options.retrograde ?? []);
  function positionAt(body: CelestialBody): PlanetaryPosition {
    const longitude = options.longitudes?.[body] ?? CelestialBody.literals.indexOf(body) * 30;
    return planetaryPosition(longitude, retrograde.has(body) ? -1 : 1);
  }
  return Layer.succeed(
    Ephemeris,
    Ephemeris.of({
      dateToJulianDay: (_date: DateTime) => Effect.succeed(JulianDay.make(2_451_545)),
      calculatePosition: (_julianDay: JulianDay, body: CelestialBody, _ayanamsa: Ayanamsa) =>
        Effect.succeed(positionAt(body)),
      calculateHouses: (
        _julianDay: JulianDay,
        _latitude: number,
        _longitude: number,
        houseSystem: HouseSystem,
        _ayanamsa: Ayanamsa,
      ) => Effect.succeed(houseData(cusps, houseSystem)),
    }),
  );
}

export const EphemerisTestLayer = ephemerisTestLayer();
