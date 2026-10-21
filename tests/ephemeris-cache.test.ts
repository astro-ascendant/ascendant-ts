import { describe, expect, it } from "@effect/vitest";
import { Context, Effect, Layer, Ref } from "effect";

import type { Ayanamsa } from "../src/astro-params/model.js";
import { withPositionCache } from "../src/ephemeris/cached.js";
import { EphemerisError } from "../src/ephemeris/error.js";
import { type CelestialBody, JulianDay, type PlanetaryPosition } from "../src/ephemeris/model.js";
import { Ephemeris } from "../src/ephemeris/service.js";
import { planetaryPosition, wholeSignHouses } from "./support/ephemeris.js";

const JULIAN_DAY = JulianDay.make(2_460_000);

function succeedBackend(calls: Ref.Ref<number>, houseCalls?: Ref.Ref<number>) {
  return Layer.succeed(
    Ephemeris,
    Ephemeris.of({
      dateToJulianDay: () => Effect.succeed(JulianDay.make(2_451_545)),
      calculatePosition: (
        _julianDay: JulianDay,
        _body: CelestialBody,
        _ayanamsa: Ayanamsa,
      ): Effect.Effect<PlanetaryPosition, EphemerisError> =>
        Effect.as(
          Ref.update(calls, (count) => count + 1),
          planetaryPosition(100, 1),
        ),
      calculateHouses: (_julianDay, _latitude, _longitude, houseSystem, _ayanamsa) =>
        (houseCalls === undefined
          ? Effect.void
          : Ref.update(houseCalls, (count) => count + 1)
        ).pipe(
          Effect.as(
            wholeSignHouses([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], houseSystem),
          ),
        ),
    }),
  );
}

function buildCached(backend: Layer.Layer<Ephemeris>) {
  return Effect.scoped(Layer.build(withPositionCache().pipe(Layer.provide(backend)))).pipe(
    Effect.map((context) => Context.get(context, Ephemeris)),
  );
}

describe("Ephemeris position cache", () => {
  it.effect("shares one pending lookup across concurrent identical requests", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const backend = succeedBackend(calls);
      const cached = yield* buildCached(backend);

      const positions = yield* Effect.all(
        Array.from({ length: 10 }, () => cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri")),
        { concurrency: "unbounded" },
      );

      expect(yield* calls.pipe(Ref.get)).toBe(1);
      expect(positions.map((position) => position.longitude)).toEqual(
        Array.from({ length: 10 }, () => 100),
      );
    }),
  );

  it.effect("caches repeats while separating distinct keys", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const backend = succeedBackend(calls);
      const cached = yield* buildCached(backend);

      yield* cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri");
      yield* cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri");
      yield* cached.calculatePosition(JULIAN_DAY, "Moon", "Lahiri");
      expect(yield* calls.pipe(Ref.get)).toBe(2);

      yield* cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri");
      yield* cached.calculatePosition(JULIAN_DAY, "Moon", "Lahiri");
      expect(yield* calls.pipe(Ref.get)).toBe(2);
    }),
  );

  it.effect("does not cache failures", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const failNext = yield* Ref.make(true);
      const flaky = Layer.succeed(
        Ephemeris,
        Ephemeris.of({
          dateToJulianDay: () => Effect.succeed(JulianDay.make(2_451_545)),
          calculatePosition: (
            _julianDay: JulianDay,
            _body: CelestialBody,
            _ayanamsa: Ayanamsa,
          ): Effect.Effect<PlanetaryPosition, EphemerisError> =>
            Ref.update(calls, (count) => count + 1).pipe(
              Effect.andThen(Ref.getAndSet(failNext, false)),
              Effect.flatMap((shouldFail) =>
                shouldFail
                  ? Effect.fail(
                      EphemerisError.make({ operation: "test", cause: new Error("boom") }),
                    )
                  : Effect.succeed(planetaryPosition(100, 1)),
              ),
            ),
          calculateHouses: (_julianDay, _latitude, _longitude, houseSystem, _ayanamsa) =>
            Effect.succeed(wholeSignHouses([0], houseSystem)),
        }),
      );
      const cached = yield* buildCached(flaky);

      const first = yield* Effect.flip(cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri"));
      expect(first._tag).toBe("EphemerisError");
      const second = yield* cached.calculatePosition(JULIAN_DAY, "Sun", "Lahiri");
      expect(second.longitude).toBe(100);
      expect(yield* calls.pipe(Ref.get)).toBe(2);
    }),
  );

  it.effect("delegates dates and houses to the backend without caching them", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make(0);
      const houseCalls = yield* Ref.make(0);
      const backend = succeedBackend(calls, houseCalls);
      const cached = yield* buildCached(backend);

      const first = yield* cached.calculateHouses(JULIAN_DAY, 0, 0, "WholeSign", "Lahiri");
      const second = yield* cached.calculateHouses(JULIAN_DAY, 0, 0, "WholeSign", "Lahiri");
      expect(first.cusps).toEqual(second.cusps);
      expect(first.houseSystem).toBe("WholeSign");
      expect(yield* houseCalls.pipe(Ref.get)).toBe(2);
      expect(yield* calls.pipe(Ref.get)).toBe(0);
    }),
  );
});
