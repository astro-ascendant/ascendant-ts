import { Cache, Duration, Effect, Exit, Layer, Schema } from "effect";

import { Ayanamsa } from "../astro-params/model.js";
import { Planets } from "../chart/model.js";
import { EphemerisError } from "./error.js";
import { JulianDay } from "./model.js";
import { Ephemeris } from "./service.js";

export interface PositionCacheOptions {
  readonly capacity?: number | undefined;
  readonly timeToLive?: Duration.Input | undefined;
}

const DEFAULT_CAPACITY = 10_000;
const DEFAULT_TTL: Duration.Input = "10 minutes";

/**
 * Joins validated lookup components into the cache key. Keys are only ever
 * built here from schema-validated inputs; the lookup parses them back
 * through the same schemas instead of casting.
 */
function positionCacheKey(julianDay: JulianDay, planet: Planets, ayanamsa: Ayanamsa): string {
  return `${Number(julianDay)}|${planet}|${ayanamsa}`;
}

const parseCacheKey = Effect.fnUntraced(function* (key: string) {
  const [julianDayText, planetText, ayanamsaText] = key.split("|");
  const julianDay = yield* JulianDay.makeEffect(Number(julianDayText));
  const planet = yield* Schema.decodeUnknownEffect(Planets)(planetText);
  const ayanamsa = yield* Schema.decodeUnknownEffect(Ayanamsa)(ayanamsaText);
  return { julianDay, planet, ayanamsa } as const;
});

/**
 * Decorates any `Ephemeris` layer with a `calculatePosition` memoization
 * cache. Transits sample the same `(julianDay, planet, ayanamsa)` repeatedly
 * across coarse scans and bisection refinement; concurrent identical lookups
 * share one pending call (dedupe is built into `Cache`).
 *
 * Successful lookups are cached with `timeToLive`; failures are never cached
 * (`Duration.zero`) so transient native errors stay retryable. Only
 * `calculatePosition` is cached: `calculateHouses` and `dateToJulianDay` run
 * once per chart and gain nothing from memoization.
 *
 * Provide the backend with `Layer.provide`:
 *
 * ```ts
 * import { Layer } from "effect";
 * import { withPositionCache } from "astro-ascendant/ephemeris";
 * import { SwissephLayer } from "astro-ascendant/swisseph";
 *
 * export const Live = withPositionCache().pipe(Layer.provide(SwissephLayer));
 * ```
 */
export const withPositionCache = (options?: PositionCacheOptions) =>
  Layer.effect(
    Ephemeris,
    Effect.gen(function* () {
      const underlying = yield* Ephemeris;
      const timeToLive = options?.timeToLive ?? DEFAULT_TTL;
      const cache = yield* Cache.makeWith(
        (key: string) =>
          parseCacheKey(key).pipe(
            Effect.flatMap(({ julianDay, planet, ayanamsa }) =>
              underlying.calculatePosition(julianDay, planet, ayanamsa),
            ),
            Effect.mapError((cause) =>
              Schema.is(EphemerisError)(cause)
                ? cause
                : EphemerisError.make({ operation: "calculatePosition", cause }),
            ),
          ),
        {
          capacity: options?.capacity ?? DEFAULT_CAPACITY,
          timeToLive: (exit) => (Exit.isSuccess(exit) ? timeToLive : Duration.zero),
        },
      );
      return Ephemeris.of({
        dateToJulianDay: (date) => underlying.dateToJulianDay(date),
        calculatePosition: (julianDay, planet, ayanamsa) =>
          Cache.get(cache, positionCacheKey(julianDay, planet, ayanamsa)),
        calculateHouses: (julianDay, latitude, longitude, houseSystem, ayanamsa) =>
          underlying.calculateHouses(julianDay, latitude, longitude, houseSystem, ayanamsa),
      });
    }),
  );
