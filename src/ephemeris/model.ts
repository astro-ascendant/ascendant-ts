import { Schema } from "effect";

import { HouseSystem } from "../astro-params/model.js";

export const JulianDay = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1e7 })).pipe(
  Schema.brand("JulianDay"),
);

export type JulianDay = typeof JulianDay.Type;

export const CelestialBody = Schema.Literals([
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Venus",
  "Jupiter",
  "Saturn",
  "TrueNode",
  "MeanNode",
]);

export type CelestialBody = typeof CelestialBody.Type;

export const PlanetaryPosition = Schema.Struct({
  longitude: Schema.Finite,
  latitude: Schema.Finite,
  distance: Schema.Finite,
  longitudeSpeed: Schema.Finite,
  latitudeSpeed: Schema.Finite,
  distanceSpeed: Schema.Finite,
  flags: Schema.Int,
});
export interface PlanetaryPosition extends Schema.Schema.Type<typeof PlanetaryPosition> {}

export const HouseData = Schema.Struct({
  cusps: Schema.Array(Schema.Finite),
  ascendant: Schema.Finite,
  mc: Schema.Finite,
  armc: Schema.Finite,
  vertex: Schema.Finite,
  equatorialAscendant: Schema.Finite,
  coAscendant1: Schema.Finite,
  coAscendant2: Schema.Finite,
  polarAscendant: Schema.Finite,
  houseSystem: HouseSystem,
});
export interface HouseData extends Schema.Schema.Type<typeof HouseData> {}

/**
 * Native `@swisseph/node` payloads, decoded at the adapter boundary before
 * entering domain types. Only consumed fields are modeled: the vendor house
 * system enum is ignored in favor of our validated `AstroParams` input, and
 * tropical longitudes flow into `normalizeLongitude` downstream.
 */
export const NativePlanetaryPosition = Schema.Struct({
  longitude: Schema.Finite,
  latitude: Schema.Finite,
  distance: Schema.Finite,
  longitudeSpeed: Schema.Finite,
  latitudeSpeed: Schema.Finite,
  distanceSpeed: Schema.Finite,
  flags: Schema.Finite,
});
export interface NativePlanetaryPosition extends Schema.Schema.Type<
  typeof NativePlanetaryPosition
> {}

export const NativeHouseData = Schema.Struct({
  cusps: Schema.Array(Schema.Finite),
  ascendant: Schema.Finite,
  mc: Schema.Finite,
  armc: Schema.Finite,
  vertex: Schema.Finite,
  equatorialAscendant: Schema.Finite,
  coAscendant1: Schema.Finite,
  coAscendant2: Schema.Finite,
  polarAscendant: Schema.Finite,
});
export interface NativeHouseData extends Schema.Schema.Type<typeof NativeHouseData> {}
