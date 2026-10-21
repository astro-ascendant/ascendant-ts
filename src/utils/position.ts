/**
 * Validated coordinate parsing: the fallible `Effect` half of the conversion
 * hub. Raw angles enter here and leave as branded coordinates; total lookups
 * live in `./zodiac.js`.
 */
import { Effect, Schema } from "effect";

import type { Planets, Rashis } from "../chart/model.js";
import { Longitude } from "../chart/model.js";
import type { CelestialBody } from "../ephemeris/model.js";
import { indexOfLongitude, rashiIndexOf, wrapIndex } from "./zodiac.js";

export const EPS_CIRCLE = 1e-7;
export const EPS_BOUNDARY = 1e-9;
export const EPS_PART = 1e-12;

const PLANET_BODY: Record<Planets, CelestialBody> = {
  Sun: "Sun",
  Moon: "Moon",
  Mars: "Mars",
  Mercury: "Mercury",
  Venus: "Venus",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Rahu: "MeanNode",
  Ketu: "MeanNode",
};

export class LongitudeError extends Schema.TaggedError<LongitudeError>()("LongitudeError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

export class SignIndexError extends Schema.TaggedError<SignIndexError>()("SignIndexError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Ephemeris body backing a planet (nodes share the mean node). */
export function planetBodyOf(planet: Planets): CelestialBody {
  return PLANET_BODY[planet];
}

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

// Converts an angle into the signed range [-180, 180)
export const wrap180 = Effect.fn("astro-ascendant/utils/wrap180")(function* (degrees: number) {
  return (yield* normalizeLongitude(degrees + 180)) - 180;
});

/** 0-based wheel position of the sign containing a longitude. */
export const signIndexOf = Effect.fn("astro-ascendant/utils/signIndexOf")(function* (
  longitude: Longitude,
) {
  const normalized = yield* normalizeLongitude(longitude);
  return indexOfLongitude(normalized);
});

/** Wraps any integer onto the 0–11 sign wheel, rejecting non-integers. */
export const signAtIndex = Effect.fn("astro-ascendant/utils/signAtIndex")(function* (
  index: number,
) {
  const finite = yield* Schema.Finite.makeEffect(index).pipe(
    Effect.mapError(() =>
      SignIndexError.make({
        message: "Sign index must be finite",
        cause: index,
      }),
    ),
  );

  const integer = yield* Schema.Int.makeEffect(finite).pipe(
    Effect.mapError(() =>
      SignIndexError.make({
        message: "Sign index must be an integer",
        cause: index,
      }),
    ),
  );

  return wrapIndex(integer);
});

/** 0-based wheel position of a sign. */
export function indexOfSign(sign: Rashis): number {
  return rashiIndexOf(sign);
}

// Returns the start longitude (0, 30, ..., 330) of the zodiac sign containing the given longitude
export const signStartOf = Effect.fn("astro-ascendant/utils/signStartOf")(function* (
  longitude: number,
) {
  const normalized = yield* normalizeLongitude(longitude);
  return yield* Longitude.makeEffect(Math.floor(normalized / 30) * 30).pipe(
    Effect.mapError(() =>
      LongitudeError.make({
        message: "Sign start longitude failed validation",
        cause: longitude,
      }),
    ),
  );
});

/** Ketu sits exactly opposite Rahu. */
export const ketuFromRahu = Effect.fn("astro-ascendant/utils/ketuFromRahu")(function* (
  rahuLongitude: number,
) {
  return yield* normalizeLongitude(rahuLongitude + 180);
});
