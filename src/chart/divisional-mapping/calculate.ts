import { Effect } from "effect";

import { normalizeLongitude } from "../../utils/position.js";
import type { Division } from "../model.js";
import { Degree, Longitude } from "../model.js";
import { DivisionalMappingError } from "./error.js";
import { sourcePositionOf, subdivisionOf, targetSignOf } from "./helper.js";
import type { DivisionalTarget } from "./model.js";

export const getDivisionalTarget = Effect.fn(
  "astro-ascendant/chart/divisional-mapping/getDivisionalTarget",
)(function* (longitude: number, division: Division) {
  const normalizedLongitude = yield* normalizeLongitude(longitude).pipe(
    Effect.mapError((cause) =>
      DivisionalMappingError.make({ message: "Invalid longitude for divisional mapping", cause }),
    ),
  );
  const source = yield* sourcePositionOf(normalizedLongitude);

  if (division === 1) {
    return source;
  }

  const subdivision = subdivisionOf(source.degree, division);
  const signIndex = targetSignOf(source, subdivision, division);

  return {
    signIndex,
    degree: Degree.make(subdivision.degree),
    longitude: Longitude.make(signIndex * 30 + subdivision.degree),
  } satisfies DivisionalTarget;
});
