import { DateTime } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { CLASSICAL_PLANETS } from "./constants.js";

/** The planet ruling the UTC weekday of a date, Sunday first. */
export function dayLord(date: DateTimeType): (typeof CLASSICAL_PLANETS)[number] {
  return CLASSICAL_PLANETS[DateTime.toDate(date).getUTCDay()]!;
}
