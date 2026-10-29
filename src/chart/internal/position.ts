import { Array, DateTime } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { CLASSICAL_PLANETS } from "./constants.js";

/** The planet ruling the UTC weekday of a date; `weekDay` counts from Sunday, as the lords do. */
export function dayLord(date: DateTimeType): (typeof CLASSICAL_PLANETS)[number] {
  return Array.getUnsafe(CLASSICAL_PLANETS, DateTime.getPartUtc(date, "weekDay"));
}
