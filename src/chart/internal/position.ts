import { Array, DateTime, Function } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { CLASSICAL_PLANETS } from "./constants.js";

const MILLIS_PER_DEGREE = 3_600_000 / 15;

type DayLord = (typeof CLASSICAL_PLANETS)[number];

/**
 * The planet ruling the weekday at the birthplace, on local mean time (UTC shifted
 * by the longitude); `weekDay` counts from Sunday, as the lords do.
 */
export const dayLord: {
  (longitude: number): (date: DateTimeType) => DayLord;
  (date: DateTimeType, longitude: number): DayLord;
} = Function.dual(2, (date: DateTimeType, longitude: number): DayLord => {
  const local = DateTime.makeUnsafe(
    DateTime.toEpochMillis(date) + Math.round(longitude * MILLIS_PER_DEGREE),
  );
  return Array.getUnsafe(CLASSICAL_PLANETS, DateTime.getPartUtc(local, "weekDay"));
});
