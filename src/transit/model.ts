import { Schema } from "effect";

import {
  ChartCalculation,
  Division,
  Houses,
  LocatedMoment,
  Longitude,
  Planets,
  Rashis,
} from "../chart/model.js";
import { TransitSearchProvenance } from "../provenance.js";

export const TransitKind = Schema.Literals([
  "sign-ingress",
  "cusp-crossing",
  "longitude-hit",
  "station",
]);
export type TransitKind = typeof TransitKind.Type;

export const TransitDirection = Schema.Literals(["forward", "backward"]);
export type TransitDirection = typeof TransitDirection.Type;

export const TransitEvent = Schema.Struct({
  planet: Planets,
  moment: Schema.DateTimeUtc,
  longitude: Longitude,
  kind: TransitKind,
  sign: Schema.optionalKey(Rashis),
  is_retrograde: Schema.Boolean,
  direction: TransitDirection,
  provenance: TransitSearchProvenance,
  calculation: Schema.optionalKey(ChartCalculation),
});
export interface TransitEvent extends Schema.Schema.Type<typeof TransitEvent> {}

export const TransitRequest = Schema.Struct({
  planet: Planets,
  from: LocatedMoment,
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
  direction: TransitDirection,
  kinds: Schema.NonEmptyArray(TransitKind),
  targetLongitude: Schema.optionalKey(Longitude),
  house: Schema.optionalKey(Houses),
  maxYears: Schema.optionalKey(
    Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 200, exclusiveMinimum: true })),
  ),
  precisionMinutes: Schema.optionalKey(
    Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1440, exclusiveMinimum: true })),
  ),
  includeCharts: Schema.optionalKey(Schema.Array(Division)),
});
export interface TransitRequest extends Schema.Schema.Type<typeof TransitRequest> {}

export { TransitSearchProvenance };
export type { ChartCalculation, Division, Houses, LocatedMoment, Longitude, Planets, Rashis };
