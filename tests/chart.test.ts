import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, Equal, Layer, Record, Schema } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import { EphemerisTestLayer } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";

describe("Chart projections", () => {
  it.effect("validates optional sex on chart parameters", () =>
    Effect.gen(function* () {
      const input = fixtures.locatedMoment();
      expect(Chart.ChartParams.make(input)).not.toHaveProperty("sex");
      for (const sex of Chart.Sex.literals) {
        expect(
          Chart.ChartParams.make({
            moment: input.moment,
            latitude: input.latitude,
            longitude: input.longitude,
            sex,
          }).sex,
        ).toBe(sex);
      }
      const decode = Schema.decodeUnknownEffect(Chart.ChartParams);
      const values = { moment: input.moment, latitude: input.latitude, longitude: input.longitude };
      expect(yield* Effect.flip(decode({ ...values, sex: "Unknown" }))).toBeInstanceOf(
        Schema.SchemaError,
      );
      expect(yield* Effect.flip(decode({ ...values, sex: null }))).toBeInstanceOf(
        Schema.SchemaError,
      );
    }),
  );

  it.effect("preserves sex through direct projection and chart schema round trips", () =>
    Effect.gen(function* () {
      for (const sex of Chart.Sex.literals) {
        const charts = yield* Chart.project(fixtures.placementsFromLongitudes(), [9, 10], sex);
        for (const chart of charts) {
          const encoded = yield* Schema.encodeEffect(Chart.Chart)(chart);
          expect(encoded.sex).toBe(sex);
          const decoded = yield* Schema.decodeEffect(Chart.Chart)(encoded);
          expect(decoded.sex).toBe(sex);
          expect(
            yield* Effect.flip(
              Schema.decodeUnknownEffect(Chart.Chart)({
                provenance: encoded.provenance,
                division: encoded.division,
                houses: encoded.houses,
                sex: "Unknown",
              }),
            ),
          ).toBeInstanceOf(Schema.SchemaError);
        }
      }
      const [legacy] = yield* Chart.project(fixtures.placementsFromLongitudes());
      const encoded = yield* Schema.encodeEffect(Chart.Chart)(legacy);
      expect(encoded).not.toHaveProperty("sex");
      expect(yield* Schema.decodeEffect(Chart.Chart)(encoded)).not.toHaveProperty("sex");
    }),
  );

  it.effect("returns requested divisions exactly once and in stable order", () =>
    Effect.gen(function* () {
      for (const [requested, expected] of [
        [
          [1, 9, 10],
          [1, 9, 10],
        ],
        [
          [10, 9, 9, 1],
          [1, 9, 10],
        ],
      ] as const) {
        const charts = yield* Chart.project(fixtures.placementsFromLongitudes(), [...requested]);

        expect(
          Equal.equals(
            charts.map(({ division }) => division),
            [...expected],
          ),
        ).toBe(true);
        expect(charts.every(({ houses }) => Record.size(houses) === 12)).toBe(true);
      }
    }),
  );

  it.layer(
    Layer.merge(
      AstroParams.layer({ ayanamsa: "Raman", houseSystem: "Placidus" }),
      EphemerisTestLayer,
    ),
  )((it) => {
    it.effect("copies supplied sex into every generated chart", () =>
      Effect.gen(function* () {
        for (const sex of Chart.Sex.literals) {
          const moment = fixtures.locatedMoment();
          const input = Chart.ChartParams.make({
            moment: moment.moment,
            latitude: moment.latitude,
            longitude: moment.longitude,
            sex,
          });
          const calculation = yield* Chart.generate(input, [9, 10]);
          expect(calculation.charts.map((chart) => chart.sex)).toEqual([sex, sex, sex]);
        }
      }),
    );

    it.effect("generates one atomic calculation through the public interface", () =>
      Effect.gen(function* () {
        const calculation = yield* Chart.generate(fixtures.locatedMoment(), [9, 9]);
        for (const chart of calculation.charts) {
          expect(chart).not.toHaveProperty("sex");
        }

        expect(
          Equal.equals(
            calculation.charts.map(({ division }) => division),
            [1, 9],
          ),
        ).toBe(true);
        const d1 = calculation.charts[0];
        expect(d1.houses[1]?.significations).toContain("physical body");
        expect(d1.planetSignifications?.Sun.level2).toEqual([1]);
        expect(d1.houseSignificators?.[1].level4).toEqual(["Mars"]);
        expect(d1.rulingPlanets).toHaveLength(5);
        expect(d1.planetSignifications?.Rahu.agent).toBeDefined();
        expect(d1.planetSignifications?.Ketu.agent).toBeDefined();
        expect(d1.houses[1]?.starLord).toBe("Ketu");
        expect(d1.houses[1]?.subLord).toBe("Ketu");
        expect(d1.houses[1]?.subSubLord).toBe("Ketu");
        expect(d1.houses[1]?.signLord).toBe("Mars");
        expect(
          Equal.equals(
            calculation.astroParams,
            AstroParams.Options.make({ ayanamsa: "Raman", houseSystem: "Placidus" }),
          ),
        ).toBe(true);
        expect(calculation.charts[0].houses[1]?.cusp).toBe(0);
      }),
    );
  });

  it.effect("derives D1 as an identity projection from Placements", () =>
    Effect.gen(function* () {
      const [chart] = yield* Chart.project(fixtures.placementsFromLongitudes());

      expect(chart.division).toBe(1);
      expect(chart.houses[1]?.lagna?.sign.name).toBe("Aries");
      expect(Array.contains(chart.houses[1]?.planets.map(({ name }) => name) ?? [], "Sun")).toBe(
        true,
      );
    }),
  );

  it.effect("keeps point sign lords distinct from the house cusp sign lord", () =>
    Effect.gen(function* () {
      const [chart] = yield* Chart.project(
        fixtures.placementsFromLongitudes({ Ketu: 211.003451 }, { lagnaLongitude: 207.94356 }),
      );
      const ketu = Record.values(chart.houses)
        .flatMap(({ planets }) => planets)
        .find(({ name }) => name === "Ketu");
      const lagna = chart.houses[1]?.lagna;

      // Ephemeris arithmetic preserves the input only up to floating-point noise.
      expect(lagna?.longitude).toBeCloseTo(207.94356, 9);
      expect(lagna?.sign.name).toBe("Libra");
      expect(lagna?.sign.lord).toBe("Venus");
      expect(ketu?.longitude).toBeCloseTo(211.003451, 9);
      expect(ketu?.sign.name).toBe("Scorpio");
      expect(ketu?.sign.lord).toBe("Mars");
      expect(ketu?.sign.lord).not.toBe(lagna?.sign.lord);
    }),
  );

  it.effect("keeps source retrograde state while remapping longitude and sign", () =>
    Effect.gen(function* () {
      const placements = fixtures.placementsFromLongitudes(
        { Saturn: 190 },
        { retrograde: ["Saturn"] },
      );
      const charts = yield* Chart.project(placements, [9]);
      const chart = charts[1];
      if (chart === undefined) return yield* Effect.die("Expected a D9 chart");
      const planets = Record.values(chart.houses).flatMap(({ planets }) => planets);
      const saturn = planets.find(({ name }) => name === "Saturn");
      const jupiter = planets.find(({ name }) => name === "Jupiter");

      expect(saturn?.is_retrograde).toBe(true);
      expect(jupiter?.is_retrograde).toBe(false);
    }),
  );

  it.effect("derives dignity from each division's mapped sign", () =>
    Effect.gen(function* () {
      const charts = yield* Chart.project(fixtures.placementsFromLongitudes({ Jupiter: 95 }), [9]);
      const jupiters = charts.map((chart) =>
        Record.values(chart.houses)
          .flatMap(({ planets }) => planets)
          .find(({ name }) => name === "Jupiter"),
      );

      expect(jupiters[0]?.sign.name).toBe("Cancer");
      expect(jupiters[0]?.in_sign).toEqual(["EXALTED"]);
      expect(jupiters[1]?.sign.name).toBe("Leo");
      expect(jupiters[1]?.in_sign).toEqual(["FRIEND"]);
    }),
  );
});
