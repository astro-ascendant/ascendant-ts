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
 * This is the one module for sign arithmetic: Sign lords, modality, sign
 * starts and arcs on the wheel live here too. Everything is total on branded
 * inputs and integers; fallible parsing of raw numbers lives in
 * `./position.js`.
 */
import { Array as Arr, Function, Schema } from "effect";

import { RASHIS, SIGN_LORDS } from "../chart/internal/constants.js";
import { type Houses, Longitude, type RashiLords, type Rashis } from "../chart/model.js";

/** The twelve Signs in zodiacal order from Aries. */
export const SIGNS: readonly Rashis[] = RASHIS;

/** A Sign's modality: Aries is movable, Taurus fixed, Gemini dual, and so on around the wheel. */
export type Modality = "Movable" | "Fixed" | "Dual";
const MODALITIES = ["Movable", "Fixed", "Dual"] as const satisfies readonly Modality[];

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

/** Wraps any finite angle onto the circle as a Longitude in [0, 360). */
export function wrapLongitude(degrees: number): Longitude {
  return Longitude.make(((degrees % 360) + 360) % 360);
}

/** Wraps any finite angle into the signed range [-180, 180). */
export function wrapSigned(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** 0-based index of the sign containing a normalized longitude. */
export function indexOfLongitude(longitude: Longitude): RashiIndex {
  return RashiIndex.make(Math.floor(longitude / 30));
}

/** The Sign containing a longitude. */
export function signOfLongitude(longitude: Longitude): Rashis {
  return signAt(indexOfLongitude(longitude));
}

/** The planet that rules a Sign. */
export function lordOf(sign: Rashis): RashiLords {
  return SIGN_LORDS[sign];
}

/** The modality of a Sign. */
export function modalityOf(sign: Rashis): Modality {
  return Arr.getUnsafe(MODALITIES, rashiIndexOf(sign) % 3);
}

/** The longitude at which a Sign begins. */
export function signStartOf(sign: Rashis): Longitude {
  return Longitude.make(rashiIndexOf(sign) * 30);
}

/** Degrees travelled forward along the zodiac from one angle to another, in [0, 360). */
export const forwardArc = Function.dual<
  (to: number) => (from: number) => number,
  (from: number, to: number) => number
>(2, (from: number, to: number): number => wrapLongitude(to - from));

/** The shorter separation between two angles, in [0, 180]. */
export const separation = Function.dual<
  (second: number) => (first: number) => number,
  (first: number, second: number) => number
>(2, (first: number, second: number): number => {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance);
});

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
