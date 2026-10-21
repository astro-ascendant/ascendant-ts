import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect } from "effect";

import * as Ephemeris from "../src/ephemeris/index.js";
import * as Swisseph from "../src/swisseph/index.js";

describe("Swiss Ephemeris adapter", () => {
  it.layer(Swisseph.SwissephLayer)((it) => {
    it.effect("implements the public Ephemeris seam", () =>
      Effect.gen(function* () {
        const ephemeris = yield* Ephemeris.Ephemeris;
        const julianDay = yield* ephemeris.dateToJulianDay(
          DateTime.makeUnsafe("2000-01-01T12:00:00.000Z"),
        );
        const sun = yield* ephemeris.calculatePosition(julianDay, "Sun", "Lahiri");
        const houses = yield* ephemeris.calculateHouses(
          julianDay,
          12.9716,
          77.5946,
          "WholeSign",
          "Lahiri",
        );

        expect(julianDay).toBe(2_451_545);
        expect(sun.longitude).toBeGreaterThanOrEqual(0);
        expect(sun.longitude).toBeLessThan(360);
        expect(houses.cusps[1]).toBe(Math.floor(houses.ascendant / 30) * 30);
      }),
    );
  });
});
