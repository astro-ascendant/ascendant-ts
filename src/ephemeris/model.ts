import { Schema } from "effect";

import { HouseSystem } from "../astro-params/model.js";
import { ChartAngles, Houses, Longitude } from "../chart/model.js";

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

/**
 * House evidence in domain terms: twelve sidereal cusps keyed by house and
 * the chart angles. Adapters own any native layout (index-0-unused cusp
 * arrays, tropical offsets, the WholeSign convention) before returning this.
 */
export const HouseData = Schema.Struct({
  houseSystem: HouseSystem,
  cusps: Schema.Record(Houses, Longitude),
  angles: ChartAngles,
});
export interface HouseData extends Schema.Schema.Type<typeof HouseData> {}
