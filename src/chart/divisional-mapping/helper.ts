import { Array, Effect, Function } from "effect";

import { EPS_PART, signIndexOf } from "../../utils/position.js";
import { Degree, type Division, Longitude } from "../model.js";
import type { SourcePosition, Subdivision } from "./model.js";

export const sourcePositionOf = Effect.fn(
  "astro-ascendant/chart/divisional-mapping/sourcePositionOf",
)(function* (longitude: Longitude) {
  const signIndex = yield* signIndexOf(longitude);
  return {
    longitude,
    signIndex,
    degree: Degree.make(longitude % 30),
  };
});

/**
 * Locates a degree within one of a division's equal subdivisions. Exact internal
 * boundaries belong to the following subdivision, while 30 degrees remains in
 * the final subdivision despite floating-point representation noise.
 */
export const subdivisionOf = Function.dual<
  (division: Division) => (degree: number) => Subdivision,
  (degree: number, division: Division) => Subdivision
>(2, (degree, division) => {
  const partSize = 30 / division;
  const scaledPart = degree / partSize;
  const nearestPart = Math.round(scaledPart);

  const partPosition =
    nearestPart < division && Math.abs(scaledPart - nearestPart) < EPS_PART
      ? nearestPart
      : scaledPart;

  const partIndex = Math.min(division - 1, Math.floor(partPosition));

  return {
    partIndex,
    degree: (partPosition - partIndex) * 30,
  };
});

export const targetSignOf = Function.dual<
  (subdivision: Subdivision, division: Exclude<Division, 1>) => (source: SourcePosition) => number,
  (source: SourcePosition, subdivision: Subdivision, division: Exclude<Division, 1>) => number
>(3, (source, subdivision, division) => {
  const { signIndex: sourceSignIndex, degree: degreeInSourceSign } = source;

  const { partIndex } = subdivision;

  const oddRashi = sourceSignIndex % 2 === 0;
  const movable = sourceSignIndex % 3 === 0;
  const fixed = sourceSignIndex % 3 === 1;

  switch (division) {
    case 2:
      return sourceSignIndex <= 5
        ? sourceSignIndex * 2 + partIndex
        : (sourceSignIndex - 6) * 2 + partIndex;

    case 3:
      return (sourceSignIndex + Array.getUnsafe([0, 4, 8], partIndex)) % 12;

    case 4:
      return (sourceSignIndex + Array.getUnsafe([0, 3, 6, 9], partIndex)) % 12;

    case 7:
      return (sourceSignIndex + (oddRashi ? 0 : 6) + partIndex) % 12;

    case 9: {
      const start = movable ? sourceSignIndex : fixed ? sourceSignIndex + 8 : sourceSignIndex + 4;

      return (start + partIndex) % 12;
    }

    case 10: {
      const start = oddRashi ? sourceSignIndex : sourceSignIndex + 8;

      return (start + partIndex) % 12;
    }

    case 12:
      return (sourceSignIndex + partIndex) % 12;

    case 16:
      return ((movable ? 0 : fixed ? 4 : 8) + partIndex) % 12;

    case 20:
      return ((movable ? 0 : fixed ? 8 : 4) + partIndex) % 12;

    case 24:
      return ((oddRashi ? 4 : 3) + partIndex) % 12;

    case 27: {
      const start =
        sourceSignIndex % 4 === 0
          ? 0
          : sourceSignIndex % 4 === 1
            ? 3
            : sourceSignIndex % 4 === 2
              ? 6
              : 9;

      return (start + partIndex) % 12;
    }

    case 30: {
      const targets = oddRashi ? [0, 10, 8, 2, 6] : [1, 5, 11, 9, 7];

      const edges = oddRashi ? [5, 10, 18, 25] : [5, 12, 20, 25];

      const band = edges.findIndex((edge) => degreeInSourceSign < edge);

      return Array.getUnsafe(targets, band === -1 ? targets.length - 1 : band);
    }

    case 40:
      return ((oddRashi ? 0 : 6) + partIndex) % 12;

    case 45:
      return ((movable ? 0 : fixed ? 4 : 8) + partIndex) % 12;

    case 60:
      return (sourceSignIndex + partIndex) % 12;
  }
});
