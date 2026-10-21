import { Effect, Function, Layer } from "effect";
import type { DateTime } from "effect/DateTime";

import { Ayanamsa, HouseSystem } from "../../src/astro-params/model.js";
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

export const wholeSignHouses: {
  (houseSystem: HouseSystem): (cusps: ReadonlyArray<number>) => HouseData;
  (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData;
} = Function.dual(2, (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData => ({
  cusps: [...cusps],
  ascendant: 0,
  mc: 270,
  armc: 270,
  vertex: 90,
  equatorialAscendant: 0,
  coAscendant1: 0,
  coAscendant2: 0,
  polarAscendant: 0,
  houseSystem,
}));

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
  return Effect.succeed(
    wholeSignHouses([0, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], houseSystem),
  );
}

export const EphemerisTestLayer = Layer.succeed(
  Ephemeris,
  Ephemeris.of({
    dateToJulianDay,
    calculatePosition,
    calculateHouses,
  }),
);
