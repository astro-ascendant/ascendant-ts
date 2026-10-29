/**
 * Validated coordinate parsing: the fallible `Effect` edge where raw angles
 * enter and leave as branded Longitudes. All sign arithmetic on those
 * Longitudes is total and lives in `./zodiac.js`.
 */
import { Effect, Schema } from "effect";

import { Longitude } from "../chart/model.js";

export const EPS_CIRCLE = 1e-7;
export const EPS_BOUNDARY = 1e-9;
export const EPS_PART = 1e-12;

export class LongitudeError extends Schema.TaggedError<LongitudeError>()("LongitudeError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

// Converts an angle into branded Longitude in the range of [0, 360)
export const normalizeLongitude = Effect.fn("astro-ascendant/utils/normalizeLongitude")(function* (
  longitude: number,
) {
  const finite = yield* Schema.Finite.makeEffect(longitude).pipe(
    Effect.mapError(() =>
      LongitudeError.make({
        message: "Longitude must be finite",
        cause: longitude,
      }),
    ),
  );

  return yield* Longitude.makeEffect(((finite % 360) + 360) % 360).pipe(
    Effect.mapError(() =>
      LongitudeError.make({
        message: "Normalized longitude is outside [0, 360)",
        cause: longitude,
      }),
    ),
  );
});
