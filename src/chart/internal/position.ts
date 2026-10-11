import { Array, DateTime, Effect } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { Zodiac } from "../../utils/index.js";
import { signIndexOf } from "../../utils/position.js";
import type { Longitude, Rashis } from "../model.js";
import { CLASSICAL_PLANETS, RASHIS, SIGN_LORDS } from "./constants.js";

/** Returns true if the sign is movable (Aries, Cancer, Libra, Capricorn). */
export function isMovableSign(sign: Rashis): boolean {
  return Zodiac.rashiIndexOf(sign) % 3 === 0;
}

/** Returns true if the sign is fixed (Taurus, Leo, Scorpio, Aquarius). */
export function isFixedSign(sign: Rashis): boolean {
  return Zodiac.rashiIndexOf(sign) % 3 === 1;
}

/** Returns true if the sign is dual (Gemini, Virgo, Sagittarius, Pisces). */
export function isDualSign(sign: Rashis): boolean {
  return Zodiac.rashiIndexOf(sign) % 3 === 2;
}

export const signAt = Effect.fn("astro-ascendant/chart/signAt")(function* (longitude: Longitude) {
  const index = yield* signIndexOf(longitude);
  return Array.getUnsafe(RASHIS, index);
});

export const signLordOf = Effect.fn("astro-ascendant/chart/signLordOf")(function* (
  longitude: Longitude,
) {
  const sign = yield* signAt(longitude);
  return SIGN_LORDS[sign];
});

export function dayLord(date: DateTimeType): (typeof CLASSICAL_PLANETS)[number] {
  return CLASSICAL_PLANETS[DateTime.toDate(date).getUTCDay()]!;
}
