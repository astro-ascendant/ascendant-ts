import { describe, expect, it } from "@effect/vitest";
import { Effect, Equal } from "effect";

import { getDivisionalTarget } from "../src/chart/divisional-mapping/index.js";
import { subdivisionOf } from "../src/chart/divisional-mapping/helper.js";
import { normalizeLongitude } from "../src/utils/position.js";

describe("divisional mapping", () => {
  it.effect("normalizes negative and wrapped longitudes", () =>
    Effect.gen(function* () {
      expect(yield* normalizeLongitude(-1)).toBe(359);
      expect(yield* normalizeLongitude(721)).toBe(1);
    }),
  );

  it.effect("keeps D1 as an identity mapping", () =>
    Effect.gen(function* () {
      expect(
        Equal.equals(yield* getDivisionalTarget(42.5, 1), {
          signIndex: 1,
          degree: 12.5,
          longitude: 42.5,
        }),
      ).toBe(true);
    }),
  );

  it.effect("maps Navamsha boundaries with half-open intervals", () =>
    Effect.gen(function* () {
      const atBoundary = yield* getDivisionalTarget(10, 9);
      const justBefore = yield* getDivisionalTarget(10 - 1e-8, 9);

      expect(atBoundary.signIndex).not.toBe(justBefore.signIndex);
    }),
  );

  it.effect("returns a typed error for non-finite longitudes", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(getDivisionalTarget(Number.NaN, 9));

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure") expect(String(exit.cause)).toContain("DivisionalMappingError");
    }),
  );
});

describe("divisional mapping at floating-point edges", () => {
  it.effect("keeps a longitude just below a sign edge in its own sign", () =>
    Effect.gen(function* () {
      const target = yield* getDivisionalTarget(359.99999999999994, 1);

      expect(target.signIndex).toBe(11);
      expect(target.degree).toBeGreaterThan(29.9999);
      expect(target.degree).toBeLessThan(30);
    }),
  );

  it.effect("never fails or returns a degree of 30 just below a sign edge", () =>
    Effect.gen(function* () {
      for (const division of [2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60] as const) {
        for (const longitude of [29.999999999999996, 59.99999999999999, 359.99999999999994]) {
          const target = yield* getDivisionalTarget(longitude, division);
          expect(target.degree).toBeGreaterThanOrEqual(0);
          expect(target.degree).toBeLessThan(30);
        }
      }
    }),
  );

  it("keeps the subdivision degree inside [0, 30)", () => {
    const subdivision = subdivisionOf(29.999999999999996, 45);

    expect(subdivision.partIndex).toBe(44);
    expect(subdivision.degree).toBeLessThan(30);
  });
});
