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

function positionAt(body: CelestialBody): PlanetaryPosition {
  return planetaryPosition(CelestialBody.literals.indexOf(body) * 30, 1);
}

function dateToJulianDay(_date: DateTime) {
  return Effect.succeed(JulianDay.make(2_451_545));
}

function calculatePosition(_julianDay: JulianDay, body: CelestialBody, _ayanamsa: Ayanamsa) {
  return Effect.succeed(positionAt(body));
}

function calculateHouses(
  _julianDay: JulianDay,
  _latitude: number,
  _longitude: number,
  houseSystem: HouseSystem,
  _ayanamsa: Ayanamsa,
) {
  return Effect.succeed(houseData(WHOLE_SIGN_CUSPS, houseSystem));
}

export const EphemerisTestLayer = Layer.succeed(
  Ephemeris,
  Ephemeris.of({
    dateToJulianDay,
    calculatePosition,
    calculateHouses,
  }),
);
