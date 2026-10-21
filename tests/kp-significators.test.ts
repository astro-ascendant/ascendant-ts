import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect } from "effect";

import { chartFromHouseData } from "../src/chart/calculate.js";
import { SIGN_LORDS } from "../src/chart/internal/constants.js";
import * as Chart from "../src/chart/model.js";

const RASHIS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

function signOf(longitude: number) {
  const name = RASHIS[Math.floor(longitude / 30) % 12]!;
  return Chart.Sign.make({ name, lord: SIGN_LORDS[name] });
}

function planet(name: Chart.Planets, longitude: number, is_retrograde = false): Chart.Planet {
  return Chart.Planet.make({
    name,
    longitude: Chart.Longitude.make(longitude),
    degree: Chart.Degree.make(longitude % 30),
    is_retrograde,
    in_sign: [],
    sign: signOf(longitude),
  });
}

// Minimal KP-Placidus layout mirroring the audit chart (cusp-aware):
// Ketu in 1, Mars in 4, Moon in 6, Rahu/Saturn in 7/8, rest in 10.
const CUSPS = [
  207.85, 236.83, 266.36, 297.43, 329.47, 0.13, 27.85, 56.83, 86.36, 117.43, 149.47, 180.13,
];
const LONGITUDES: Record<Chart.Planets, number> = {
  Sun: 121.97, // Magha -> Ketu
  Moon: 23.67, // Bharani -> Venus
  Mars: 313.55, // Shatabhisha -> Rahu
  Mercury: 148.81, // Uttara Phalguni -> Sun
  Jupiter: 124.32, // Magha -> Ketu
  Venus: 122.12, // Magha -> Ketu
  Saturn: 75.48, // Ardra -> Rahu
  Rahu: 30.93, // Krittika -> Sun
  Ketu: 210.93, // Vishakha -> Jupiter
};

function input() {
  const houses = {
    cusps: [0, ...CUSPS],
    ascendant: 207.85,
    mc: 117.43,
    armc: 117.43,
    vertex: 90,
    equatorialAscendant: 207.85,
    coAscendant1: 207.85,
    coAscendant2: 207.85,
    polarAscendant: 207.85,
    houseSystem: "Placidus",
  } as const;
  const lagnaLongitude = 207.85;
  const lagna = Chart.Lagna.make({
    name: "Lagna",
    longitude: Chart.Longitude.make(lagnaLongitude),
    degree: Chart.Degree.make(lagnaLongitude % 30),
    sign: signOf(lagnaLongitude),
  });
  const positions = {
    division: 1 as const,
    lagna,
    planets: (Object.keys(LONGITUDES) as Chart.Planets[]).map((name) =>
      planet(name, LONGITUDES[name], name === "Mars"),
    ),
    sex: undefined,
  };
  return { houses, positions };
}

describe("KP significators with node star lords", () => {
  it.effect("leaves level3 empty when the star lord is a node (AstroSage parity)", () =>
    Effect.gen(function* () {
      const { houses, positions } = input();
      const date = DateTime.makeUnsafe("2003-08-19T06:25:00.000Z");
      const chart = yield* chartFromHouseData(houses, positions, date);
      const sig = (name: Chart.Planets) => chart.planetSignifications?.[name];

      // Sun -> Ketu (nodes own nothing): occupancy only, no Mars ownership.
      expect(sig("Sun")?.level1).toEqual([1]);
      expect(sig("Sun")?.level2).toEqual([10]);
      expect(sig("Sun")?.level3).toEqual([]);
      expect(sig("Sun")?.level4).toEqual([11]);

      // Mars -> Rahu (nodes own nothing): no Venus ownership in level3.
      expect(sig("Mars")?.level1).toEqual([7]);
      expect(sig("Mars")?.level2).toEqual([4]);
      expect(sig("Mars")?.level3).toEqual([]);
      expect(sig("Mars")?.level4).toEqual([2, 6, 7]);

      // Jupiter/Venus share Sun's Ketu star lord: level3 empty, own ownership kept.
      expect(sig("Jupiter")?.level1).toEqual([1]);
      expect(sig("Jupiter")?.level3).toEqual([]);
      expect(sig("Jupiter")?.level4).toEqual([3]);
      expect(sig("Venus")?.level1).toEqual([1]);
      expect(sig("Venus")?.level3).toEqual([]);
      expect(sig("Venus")?.level4).toEqual([1, 8, 12]);
    }),
  );

  it.effect("derives node occupancy from the node itself with empty node ownership", () =>
    Effect.gen(function* () {
      const { houses, positions } = input();
      const date = DateTime.makeUnsafe("2003-08-19T06:25:00.000Z");
      const chart = yield* chartFromHouseData(houses, positions, date);
      const sig = (name: Chart.Planets) => chart.planetSignifications?.[name];

      // Rahu in Krittika (Sun): occupancy is Rahu's own house 7, not the
      // agent Venus' house 10; star occupancy follows Sun (house 10).
      // Nodes own nothing, so level4 is empty despite agent Venus.
      expect(sig("Rahu")?.agent).toBe("Venus");
      expect(sig("Rahu")?.level1).toEqual([10]);
      expect(sig("Rahu")?.level2).toEqual([7]);
      expect(sig("Rahu")?.level3).toEqual([11]);
      expect(sig("Rahu")?.level4).toEqual([]);

      // Ketu in Vishakha (Jupiter): occupancy is Ketu's own house 1 and
      // Jupiter's house 10; ownership ignores agent Mars.
      expect(sig("Ketu")?.agent).toBe("Mars");
      expect(sig("Ketu")?.level1).toEqual([10]);
      expect(sig("Ketu")?.level2).toEqual([1]);
      expect(sig("Ketu")?.level3).toEqual([3]);
      expect(sig("Ketu")?.level4).toEqual([]);
    }),
  );
});
