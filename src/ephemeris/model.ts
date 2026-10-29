import { DateTime, Schema } from "effect";

import { HouseSystem } from "../astro-params/model.js";
import { ChartAngles, Houses, Longitude } from "../chart/model.js";

export const JulianDay = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1e7 })).pipe(
  Schema.brand("JulianDay"),
);

export type JulianDay = typeof JulianDay.Type;

/** Julian Day of the Unix epoch, 1970-01-01T00:00Z, on the UT time scale. */
const JD_UNIX_EPOCH = 2_440_587.5;
const MS_PER_DAY = 86_400_000;

/** The UTC instant of a Julian Day, treating the day as UT. */
export function dateTimeOfJulianDay(julianDay: number): DateTime.Utc {
  return DateTime.makeUnsafe((julianDay - JD_UNIX_EPOCH) * MS_PER_DAY);
}

/** The UT Julian Day of an instant: the inverse of `dateTimeOfJulianDay`. */
export function julianDayOfDateTime(date: DateTime.DateTime): number {
  return DateTime.toEpochMillis(date) / MS_PER_DAY + JD_UNIX_EPOCH;
}

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
