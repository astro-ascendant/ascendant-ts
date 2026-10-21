import { describe, expect, it } from "@effect/vitest";
import { Effect, Record } from "effect";

import * as SAV from "../src/sav/index.js";
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
});
