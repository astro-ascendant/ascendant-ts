import { Schema } from "effect";

import { HouseSystem } from "../astro-params/model.js";
import { ChartAngles, Houses, Longitude } from "../chart/model.js";

export const JulianDay = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1e7 })).pipe(
  Schema.brand("JulianDay"),
);

export type JulianDay = typeof JulianDay.Type;

/**
 * A graha's sidereal position in domain terms. Adapters resolve Rahu and Ketu
 * to their own lunar-node conventions, so Ketu is a position like any other.
 */
export const PlanetaryPosition = Schema.Struct({
  longitude: Longitude,
  latitude: Schema.Finite,
  distance: Schema.Finite,
  longitudeSpeed: Schema.Finite,
  latitudeSpeed: Schema.Finite,
  distanceSpeed: Schema.Finite,
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
