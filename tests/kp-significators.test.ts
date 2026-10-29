import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import { ephemerisTestLayer } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";

// Minimal KP-Placidus layout mirroring the audit chart (cusp-aware):
// Ketu in 1, Mars in 4, Moon in 6, Rahu/Saturn in 7/8, rest in 10.
const CUSPS = [
  207.85, 236.83, 266.36, 297.43, 329.47, 0.13, 27.85, 56.83, 86.36, 117.43, 149.47, 180.13,
];

// Ketu is derived opposite the mean node, landing at 210.93 (Vishakha -> Jupiter).
const AUDIT_LAYER = Layer.merge(
  AstroParams.layer({ ayanamsa: "Krishnamurti", houseSystem: "Placidus" }),
  ephemerisTestLayer({
    cusps: CUSPS,
    longitudes: {
      Sun: 121.97, // Magha -> Ketu
      Moon: 23.67, // Bharani -> Venus
      Mars: 313.55, // Shatabhisha -> Rahu
      Mercury: 148.81, // Uttara Phalguni -> Sun
      Jupiter: 124.32, // Magha -> Ketu
      Venus: 122.12, // Magha -> Ketu
      Saturn: 75.48, // Ardra -> Rahu
      MeanNode: 30.93, // Krittika -> Sun
    },
    retrograde: ["Mars"],
  }),
);

const AUDIT_MOMENT = fixtures.locatedMoment("2003-08-19T06:25:00.000Z");

describe("KP significators with node star lords", () => {
  it.layer(AUDIT_LAYER)((it) => {
    it.effect("leaves level3 empty when the star lord is a node (AstroSage parity)", () =>
      Effect.gen(function* () {
        const [chart] = (yield* Chart.generate(AUDIT_MOMENT)).charts;
        const sig = (name: Chart.Planets) => chart.planetSignifications[name];

        // Sun -> Ketu (nodes own nothing): occupancy only, no Mars ownership.
        expect(sig("Sun").level1).toEqual([1]);
        expect(sig("Sun").level2).toEqual([10]);
        expect(sig("Sun").level3).toEqual([]);
        expect(sig("Sun").level4).toEqual([11]);

        // Mars -> Rahu (nodes own nothing): no Venus ownership in level3.
        expect(sig("Mars").level1).toEqual([7]);
        expect(sig("Mars").level2).toEqual([4]);
        expect(sig("Mars").level3).toEqual([]);
        expect(sig("Mars").level4).toEqual([2, 6, 7]);

        // Jupiter/Venus share Sun's Ketu star lord: level3 empty, own ownership kept.
        expect(sig("Jupiter").level1).toEqual([1]);
        expect(sig("Jupiter").level3).toEqual([]);
        expect(sig("Jupiter").level4).toEqual([3]);
        expect(sig("Venus").level1).toEqual([1]);
        expect(sig("Venus").level3).toEqual([]);
        expect(sig("Venus").level4).toEqual([1, 8, 12]);
      }),
    );

    it.effect("derives node occupancy from the node itself with empty node ownership", () =>
      Effect.gen(function* () {
        const [chart] = (yield* Chart.generate(AUDIT_MOMENT)).charts;
        const sig = (name: Chart.Planets) => chart.planetSignifications[name];

        // Rahu in Krittika (Sun): occupancy is Rahu's own house 7, not the
        // agent Venus' house 10; star occupancy follows Sun (house 10).
        // Nodes own nothing, so level4 is empty despite agent Venus.
        expect(sig("Rahu").agent).toBe("Venus");
        expect(sig("Rahu").level1).toEqual([10]);
        expect(sig("Rahu").level2).toEqual([7]);
        expect(sig("Rahu").level3).toEqual([11]);
        expect(sig("Rahu").level4).toEqual([]);

        // Ketu in Vishakha (Jupiter): occupancy is Ketu's own house 1 and
        // Jupiter's house 10; ownership ignores agent Mars.
        expect(sig("Ketu").agent).toBe("Mars");
        expect(sig("Ketu").level1).toEqual([10]);
        expect(sig("Ketu").level2).toEqual([1]);
        expect(sig("Ketu").level3).toEqual([3]);
        expect(sig("Ketu").level4).toEqual([]);
      }),
    );
  });
});
