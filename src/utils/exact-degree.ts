/**
 * Exact Degree comparison (ADR-0005): a longitude's position within its Sign,
 * read from the stored decimal digits rather than binary arithmetic, so two
 * planets at the same printed position compare as tied instead of splitting
 * on a remainder artifact.
 */
import { Function } from "effect";

import { Degree, type Longitude } from "../chart/model.js";

/** A Degree as an exact decimal: `coefficient × 10^-scale`, with `value` its Degree. */
export interface ExactDegree {
  readonly coefficient: bigint;
  readonly scale: number;
  readonly value: Degree;
}

function powerOfTen(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/** The exact Degree within its Sign of a stored longitude. */
export function of(longitude: Longitude): ExactDegree {
  // A finite number always prints as digits with an optional fraction and exponent.
  const [mantissa = "0", exponentText] = longitude.toString().toLowerCase().split("e");
  const [whole = "0", fraction = ""] = mantissa.split(".");

  const exponent = exponentText === undefined ? 0 : Number.parseInt(exponentText, 10);
  let coefficient = BigInt(`${whole}${fraction}`);
  let scale = fraction.length - exponent;
  if (scale < 0) {
    coefficient *= powerOfTen(-scale);
    scale = 0;
  }

  coefficient %= 30n * powerOfTen(scale);
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }

  return {
    coefficient,
    scale,
    value: Degree.make(Number(`${coefficient.toString()}e-${scale}`)),
  };
}

/** Orders two exact Degrees: negative when `left` is lower, zero only on an exact tie. */
export const compare = Function.dual<
  (right: ExactDegree) => (left: ExactDegree) => number,
  (left: ExactDegree, right: ExactDegree) => number
>(2, (left, right) => {
  const commonScale = Math.max(left.scale, right.scale);
  const leftCoefficient = left.coefficient * powerOfTen(commonScale - left.scale);
  const rightCoefficient = right.coefficient * powerOfTen(commonScale - right.scale);
  return leftCoefficient < rightCoefficient ? -1 : leftCoefficient > rightCoefficient ? 1 : 0;
});
