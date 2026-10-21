/**
 * Pure zodiac wheel math shared by all service modules.
 *
 * Three representations interconvert, and this module covers every direction:
 * longitudes resolve to a wheel position, positions resolve to signs, signs
 * resolve back to positions, and a position expands to the full twelve-sign
 * sequence.
 *
 * `RashiIndex` is the 0-based sign position (0 = Aries … 11 = Pisces). It is
 * branded because `Houses` (1–12) previously leaked into sign-index slots.
 * Fallible parsing lives in `./position.js`; everything here is total for
 * integer inputs.
 */
import { Array as Arr, Function, Schema } from "effect";

import { RASHIS } from "../chart/internal/constants.js";
import type { Houses, Longitude, Rashis } from "../chart/model.js";

export const RashiIndex = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 11 })).pipe(
  Schema.brand("RashiIndex"),
);
export type RashiIndex = typeof RashiIndex.Type;

/** Wraps any integer onto the 0–11 sign wheel. */
export function wrapIndex(index: number): RashiIndex {
  return RashiIndex.make(((index % RASHIS.length) + RASHIS.length) % RASHIS.length);
}

/** 0-based wheel position of a sign. */
export function rashiIndexOf(sign: Rashis): RashiIndex {
  return RashiIndex.make(RASHIS.indexOf(sign));
}

/** Sign at a wheel position; any integer wraps. */
export function signAt(index: number): Rashis {
  return Arr.getUnsafe(RASHIS, wrapIndex(index));
}

/** 0-based index of the sign containing a normalized longitude. */
export function indexOfLongitude(longitude: Longitude): RashiIndex {
  return RashiIndex.make(Math.floor(longitude / 30));
}

/** Signs forward from `fromIndex` to `toIndex` (0–11). */
export const distanceBetween = Function.dual<
  (toIndex: number) => (fromIndex: number) => number,
  (fromIndex: number, toIndex: number) => number
>(2, (fromIndex: number, toIndex: number): number => wrapIndex(toIndex - fromIndex));

/** 1-based house count from `fromIndex` to `toIndex` (1–12). */
export const houseDistance = Function.dual<
  (toIndex: number) => (fromIndex: number) => Houses,
  (fromIndex: number, toIndex: number) => Houses
>(
  2,
  (fromIndex: number, toIndex: number): Houses => (wrapIndex(toIndex - fromIndex) + 1) as Houses,
);

/** Sign of the `house`-th house from a lagna wheel position (`house` is 1-based). */
export const houseSignOf = Function.dual<
  (house: number) => (lagnaIndex: number) => Rashis,
  (lagnaIndex: number, house: number) => Rashis
>(2, (lagnaIndex: number, house: number): Rashis => signAt(lagnaIndex + house - 1));

/** Twelve signs from a start position, zodiacal (1) or reverse (-1). */
export const sequenceFrom = Function.dual<
  (direction: 1 | -1) => (startIndex: number) => readonly Rashis[],
  (startIndex: number, direction: 1 | -1) => readonly Rashis[]
>(2, (startIndex: number, direction: 1 | -1): readonly Rashis[] =>
  globalThis.Array.from({ length: RASHIS.length }, (_, offset) =>
    signAt(startIndex + offset * direction),
  ),
);
