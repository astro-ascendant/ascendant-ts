import { describe, expect, it } from "@effect/vitest";
import * as Native from "@swisseph/node";
import { DateTime, Effect } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
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
        const rahu = yield* ephemeris.calculatePosition(julianDay, "Rahu", "Lahiri");
        const ketu = yield* ephemeris.calculatePosition(julianDay, "Ketu", "Lahiri");
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
        expect((rahu.longitude + 180) % 360).toBeCloseTo(ketu.longitude, 9);
        expect(ketu.longitudeSpeed).toBe(rahu.longitudeSpeed);
        expect(ketu.latitude).toBe(-rahu.latitude);
        expect(houses.cusps[1]).toBe(Math.floor(houses.angles.ascendant / 30) * 30);
      }),
    );

    it.effect("subtracts the same ayanamsa from houses as from planets", () =>
      Effect.gen(function* () {
        const ephemeris = yield* Ephemeris.Ephemeris;
        const date = DateTime.makeUnsafe("2024-06-01T12:00:00.000Z");
        const julianDay = yield* ephemeris.dateToJulianDay(date);
        const [latitude, longitude] = [12.9716, 77.5946];
        const sun = yield* ephemeris.calculatePosition(julianDay, "Sun", "Lahiri");
        const houses = yield* ephemeris.calculateHouses(
          julianDay,
          latitude,
          longitude,
          "Placidus",
          "Lahiri",
        );
        // The ayanamsa the planets carry is the tropical minus sidereal Sun longitude.
        const tropicalSun = Native.calculatePosition(julianDay, Native.Planet.Sun).longitude;
        const ayanamsa = tropicalSun - sun.longitude;
        const tropicalAscendant = Native.calculateHouses(
          julianDay,
          latitude,
          longitude,
          Native.HouseSystem.Placidus,
        ).ascendant;

        expect(houses.angles.ascendant).toBeCloseTo((tropicalAscendant - ayanamsa + 360) % 360, 9);
      }),
    );
  });

  it.layer(Swisseph.SwissephLayer)((it) => {
    it.effect(
      "fails typed for Placidus and Koch beyond the polar circle but not for other systems",
      () =>
        Effect.gen(function* () {
          const ephemeris = yield* Ephemeris.Ephemeris;
          const julianDay = yield* ephemeris.dateToJulianDay(
            DateTime.makeUnsafe("2000-01-01T12:00:00.000Z"),
          );
          const housesAt = (
            latitude: number,
            houseSystem: "Placidus" | "Koch" | "Porphyrius" | "WholeSign",
          ) => ephemeris.calculateHouses(julianDay, latitude, 25, houseSystem, "Lahiri");

          expect((yield* housesAt(60, "Placidus")).houseSystem).toBe("Placidus");
          expect((yield* housesAt(60, "Koch")).houseSystem).toBe("Koch");
          for (const houseSystem of ["Placidus", "Koch"] as const) {
            const failure = yield* Effect.flip(housesAt(70, houseSystem));
            expect(failure._tag).toBe("EphemerisError");
          }
          expect((yield* housesAt(70, "Porphyrius")).houseSystem).toBe("Porphyrius");
          expect((yield* housesAt(70, "WholeSign")).houseSystem).toBe("WholeSign");
        }),
    );
  });

  it.layer(Swisseph.SwissephLayer)((it) => {
    it.effect("selects a distinct native sidereal mode for every Ayanamsa", () =>
      Effect.gen(function* () {
        const ephemeris = yield* Ephemeris.Ephemeris;
        const julianDay = yield* ephemeris.dateToJulianDay(
          DateTime.makeUnsafe("2000-01-01T12:00:00.000Z"),
        );
        const longitudes = yield* Effect.forEach(AstroParams.Ayanamsa.literals, (ayanamsa) =>
          Effect.map(ephemeris.calculatePosition(julianDay, "Sun", ayanamsa), ({ longitude }) =>
            Number.isFinite(longitude) ? longitude : Number.NaN,
          ),
        );

        expect(longitudes.some(Number.isNaN)).toBe(false);
        expect(new Set(longitudes).size).toBe(AstroParams.Ayanamsa.literals.length);
      }),
    );
  });
});
