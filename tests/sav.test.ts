import { describe, expect, it } from "@effect/vitest";
import { Effect, Record } from "effect";

import * as SAV from "../src/sav/index.js";
import { Zodiac } from "../src/utils/index.js";
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

  it.effect("weights each reduced sign score by its Rashi multiplier", () =>
    Effect.gen(function* () {
      const result = yield* SAV.calculate(fixtures.placementsFromLongitudes());
      const multipliers = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];

      for (const planet of [
        "Sun",
        "Moon",
        "Mars",
        "Mercury",
        "Jupiter",
        "Venus",
        "Saturn",
      ] as const) {
        const scores = Object.values(result.reduced[planet]);
        const expected = scores.reduce((sum, score, index) => sum + score * multipliers[index]!, 0);
        expect(result.shodhya_pinda[planet].rashi_pinda).toBe(expected);
      }
    }),
  );

  it.effect(
    "scores the Moon's Bhinnashtakavarga by sign from the classical contributor houses",
    () =>
      Effect.gen(function* () {
        // Sun and Lagna in Aries, Moon Taurus, Mars Gemini, Mercury Cancer, Jupiter Leo, Venus
        // Virgo, Saturn Libra. Each sign scores one bindu per contributor whose classical houses
        // (Sun 3 6 7 8 10 11, Moon 1 3 6 7 10 11, Mars 2 3 5 6 9 10 11, Mercury 1 3 4 5 7 8 10 11,
        // Jupiter 1 4 7 8 10 11 12, Venus 3 4 5 7 9 10 11, Saturn 3 5 6 11, Lagna 3 6 10 11)
        // include its house from that contributor.
        const result = yield* SAV.calculate(fixtures.placementsFromLongitudes());

        expect(Zodiac.SIGNS.map((sign) => result.bhinna.Moon[sign])).toEqual([
          2, 4, 4, 5, 3, 3, 4, 6, 2, 4, 7, 5,
        ]);
      }),
  );

  it.effect("reduces dual-lord sign pairs by planet occupancy (BPHS 68.1-5)", () =>
    Effect.gen(function* () {
      // Planets sit in Aries to Libra. Aries/Scorpio has one occupied sign, Taurus/Libra and
      // Gemini/Virgo have both occupied (never reduced), Sagittarius/Pisces and
      // Capricorn/Aquarius have neither (larger keeps the difference). Expected values were
      // worked out by hand from the classical BAV tables, trikona first.
      const result = yield* SAV.calculate(fixtures.placementsFromLongitudes());
      const expected = {
        Sun: [3, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        Moon: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0],
        Mars: [2, 0, 3, 4, 1, 1, 0, 0, 0, 1, 0, 1],
        Mercury: [2, 0, 2, 2, 0, 1, 0, 0, 1, 0, 0, 0],
        Jupiter: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
        Venus: [1, 4, 4, 0, 0, 1, 0, 0, 2, 0, 3, 0],
        Saturn: [1, 2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 2],
      } as const;

      for (const [planet, scores] of Object.entries(expected)) {
        expect(
          Zodiac.SIGNS.map((sign) => result.reduced[planet as keyof typeof expected][sign]),
        ).toEqual(scores);
      }
    }),
  );
});
