import { describe, expect, it } from "@effect/vitest";
import { Effect, Equal } from "effect";

import { getDivisionalTarget } from "../src/chart/divisional-mapping/index.js";
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
