import { describe, expect, it } from "@effect/vitest";
import { Effect, Record } from "effect";

import * as SAV from "../src/sav/index.js";
import * as SAV_CONSTANTS from "../src/sav/constants.js";
import { fixtures } from "./support/fixtures.js";

describe("SAV", () => {
  it.effect("returns the complete classical Parashari result", () =>
    Effect.gen(function* () {
      const result = yield* SAV.calculate(fixtures.placementsFromLongitudes());

      expect(Record.size(result.bhinna)).toBe(8);
      expect(Record.size(result.reduced)).toBe(7);
      expect(Record.size(result.shodhya_pinda)).toBe(7);
      expect(result.totals.sarva).toBe(337);
      expect(Record.size(result.sarva)).toBe(12);
    }),
  );

  it.effect("ignores Rahu and Ketu while rejecting duplicate classical evidence", () =>
    Effect.gen(function* () {
      const withNodes = yield* SAV.calculate(fixtures.placementsFromLongitudes());
      const duplicate = yield* Effect.exit(
        SAV.calculate(fixtures.placementsFromLongitudes({}, { duplicate: "Sun" })),
      );

      expect(withNodes.bhinna).not.toHaveProperty("Rahu");
      expect(withNodes.bhinna).not.toHaveProperty("Ketu");
      expect(duplicate._tag).toBe("Failure");
      if (duplicate._tag === "Failure")
        expect(String(duplicate.cause)).toContain("SAVCalculationError");
    }),
  );

  it("uses the BPHS 69.2-4 Gunakara multipliers", () => {
    expect(SAV_CONSTANTS.RASHI_GUNAKAR).toEqual([7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]);
    expect(SAV_CONSTANTS.GRAHA_GUNAKAR).toEqual({
      Sun: 5,
      Moon: 5,
      Mars: 8,
      Mercury: 5,
      Jupiter: 10,
      Venus: 7,
      Saturn: 5,
    });
  });

  it.effect("weights each reduced sign score by its Rashi multiplier", () =>
    Effect.gen(function* () {
      const result = yield* SAV.calculate(fixtures.placementsFromLongitudes());
      const multipliers = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];

      for (const planet of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const) {
        const scores = Object.values(result.reduced[planet]);
        const expected = scores.reduce((sum, score, index) => sum + score * multipliers[index]!, 0);
        expect(result.shodhya_pinda[planet].rashi_pinda).toBe(expected);
      }
    }),
  );
});
