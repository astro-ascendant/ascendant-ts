import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, Equal, Layer, Record, Schema } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import * as Provenance from "../src/provenance.js";
import { EphemerisTestLayer, ephemerisTestLayer } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";

// Placidus cusps from the KP audit chart: unequal houses beginning in Libra.
const PLACIDUS_CUSPS = [
  207.85, 236.83, 266.36, 297.43, 329.47, 0.13, 27.85, 56.83, 86.36, 117.43, 149.47, 180.13,
];

function layerWith(
  houseSystem: AstroParams.Options["houseSystem"],
  ephemeris = EphemerisTestLayer,
) {
  return Layer.merge(AstroParams.layer({ ayanamsa: "Raman", houseSystem }), ephemeris);
}

function planetsOf(chart: Chart.Chart): readonly Chart.Planet[] {
  return Record.values(chart.houses).flatMap(({ planets }) => planets);
}

function houseOf(chart: Chart.Chart, planet: Chart.Planets): Chart.Houses | undefined {
  return Chart.Houses.literals.find((house) =>
    chart.houses[house].planets.some(({ name }) => name === planet),
  );
}

describe("Chart parameters", () => {
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
});

describe("Chart calculation", () => {
  it.layer(layerWith("Placidus"))((it) => {
    it.effect("preserves sex through generated charts and chart schema round trips", () =>
      Effect.gen(function* () {
        for (const sex of Chart.Sex.literals) {
          const { moment, latitude, longitude } = fixtures.locatedMoment();
          const input = Chart.ChartParams.make({ moment, latitude, longitude, sex });
          const { charts } = yield* Chart.generate(input, [9, 10]);
          expect(charts.map((chart) => chart.sex)).toEqual([sex, sex, sex]);
          for (const chart of charts) {
            const encoded = yield* Schema.encodeEffect(Chart.Chart)(chart);
            expect(encoded.sex).toBe(sex);
            const decoded = yield* Schema.decodeEffect(Chart.Chart)(encoded);
            expect(decoded.sex).toBe(sex);
            expect(
              yield* Effect.flip(
                Schema.decodeUnknownEffect(Chart.Chart)({ ...encoded, sex: "Unknown" }),
              ),
            ).toBeInstanceOf(Schema.SchemaError);
          }
        }
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);
        for (const chart of charts) {
          expect(chart).not.toHaveProperty("sex");
          const encoded = yield* Schema.encodeEffect(Chart.Chart)(chart);
          expect(yield* Schema.decodeEffect(Chart.Chart)(encoded)).not.toHaveProperty("sex");
        }
      }),
    );

    it.effect("returns requested divisions exactly once, D1 first, in stable order", () =>
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
          const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [...requested]);

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

    it.effect("records the calculation's AstroParams and the D1 KP evidence", () =>
      Effect.gen(function* () {
        const calculation = yield* Chart.generate(fixtures.locatedMoment());
        const [d1] = calculation.charts;

        expect(
          Equal.equals(
            calculation.astroParams,
            AstroParams.Options.make({ ayanamsa: "Raman", houseSystem: "Placidus" }),
          ),
        ).toBe(true);
        expect(d1.houses[1].significations).toContain("physical body");
        expect(d1.houses[1].cusp).toBe(0);
        expect(d1.houses[1].signLord).toBe("Mars");
        expect(d1.houses[1].starLord).toBe("Ketu");
        expect(d1.houses[1].subLord).toBe("Ketu");
        expect(d1.houses[1].subSubLord).toBe("Ketu");
        expect(d1.planetSignifications.Sun.level2).toEqual([1]);
        expect(d1.houseSignificators[1].level4).toEqual(["Mars"]);
        expect(d1.rulingPlanets).toHaveLength(5);
        expect(d1.planetSignifications.Rahu.agent).toBeDefined();
        expect(d1.planetSignifications.Ketu.agent).toBeDefined();
        expect(d1.angles.mc).toBe(270);
      }),
    );

    it.effect("derives D1 as an identity projection of Placements", () =>
      Effect.gen(function* () {
        const { placements, charts } = yield* Chart.generate(fixtures.locatedMoment());
        const [d1] = charts;

        expect(d1.division).toBe(1);
        expect(d1.houses[1].lagna?.sign.name).toBe("Aries");
        expect(d1.houses[1].lagna?.longitude).toBe(placements.lagna.longitude);
        for (const source of placements.planets) {
          const planet = planetsOf(d1).find(({ name }) => name === source.name);
          expect(planet?.longitude).toBe(source.longitude);
        }
      }),
    );

    it.effect("names the projection method on each Chart's provenance", () =>
      Effect.gen(function* () {
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);

        expect(charts.map(({ provenance }) => provenance)).toEqual([
          Provenance.methods.d1ChartProjection.provenance,
          Provenance.methods.divisionalChartProjection.provenance,
        ]);
      }),
    );

    it.effect("keeps KP lords, angles and significations off divisional charts", () =>
      Effect.gen(function* () {
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);
        const d9 = charts[1];
        if (d9 === undefined) return yield* Effect.die("Expected a D9 chart");

        for (const key of ["angles", "planetSignifications", "houseSignificators", "rulingPlanets"])
          expect(d9).not.toHaveProperty(key);
        for (const house of Record.values(d9.houses)) {
          expect(house).not.toHaveProperty("starLord");
          expect(house).not.toHaveProperty("subLord");
          expect(house).not.toHaveProperty("subSubLord");
        }
      }),
    );
  });

  it.layer(layerWith("Placidus", ephemerisTestLayer({ cusps: PLACIDUS_CUSPS })))((it) => {
    it.effect("places D1 planets by the House system's cusps, not by Sign", () =>
      Effect.gen(function* () {
        const [d1] = (yield* Chart.generate(fixtures.locatedMoment())).charts;

        // Venus at 120° is in Leo, the 11th Sign from a Libra Lagna, but it
        // precedes the 11th cusp at 149.47°, so Placidus puts it in house 10.
        expect(d1.houses[1].lagna?.sign.name).toBe("Libra");
        expect(houseOf(d1, "Venus")).toBe(10);
        expect(d1.houses[10].cusp).toBe(117.43);
      }),
    );

    it.effect("counts divisional houses as whole Signs from the mapped Lagna", () =>
      Effect.gen(function* () {
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);
        const d9 = charts[1];
        if (d9 === undefined) return yield* Effect.die("Expected a D9 chart");
        const lagnaSign = d9.houses[1].lagna?.sign.name;
        if (lagnaSign === undefined) return yield* Effect.die("Expected a D9 Lagna");
        const lagnaIndex = Chart.Rashis.literals.indexOf(lagnaSign);

        for (const house of Chart.Houses.literals) {
          const sign = Array.getUnsafe(Chart.Rashis.literals, (lagnaIndex + house - 1) % 12);
          expect(d9.houses[house].sign).toBe(sign);
          expect(d9.houses[house].cusp).toBe(Chart.Rashis.literals.indexOf(sign) * 30);
          expect(d9.houses[house].planets.every((planet) => planet.sign.name === sign)).toBe(true);
        }
        expect(planetsOf(d9)).toHaveLength(Chart.Planets.literals.length);
      }),
    );
  });

  it.layer(
    layerWith(
      "Placidus",
      ephemerisTestLayer({ cusps: [0, 0, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] }),
    ),
  )((it) => {
    it.effect("fails instead of substituting houses when D1 cusps are degenerate", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Chart.generate(fixtures.locatedMoment()));

        expect(error._tag).toBe("ChartCalculationError");
        expect(error._tag === "ChartCalculationError" && error.stage).toBe("houses");
      }),
    );
  });

  it.layer(
    layerWith(
      "WholeSign",
      ephemerisTestLayer({
        cusps: [180, 210, 240, 270, 300, 330, 0, 30, 60, 90, 120, 150],
        longitudes: { Rahu: 31.003451 },
      }),
    ),
  )((it) => {
    it.effect("keeps point sign lords distinct from the house cusp sign lord", () =>
      Effect.gen(function* () {
        const [d1] = (yield* Chart.generate(fixtures.locatedMoment())).charts;
        const ketu = planetsOf(d1).find(({ name }) => name === "Ketu");
        const lagna = d1.houses[1].lagna;

        expect(lagna?.sign.name).toBe("Libra");
        expect(lagna?.sign.lord).toBe("Venus");
        expect(ketu?.longitude).toBeCloseTo(211.003451, 9);
        expect(ketu?.sign.name).toBe("Scorpio");
        expect(ketu?.sign.lord).toBe("Mars");
        expect(ketu?.sign.lord).not.toBe(lagna?.sign.lord);
      }),
    );
  });

  it.layer(
    layerWith(
      "WholeSign",
      ephemerisTestLayer({ longitudes: { Saturn: 190, Jupiter: 95 }, retrograde: ["Saturn"] }),
    ),
  )((it) => {
    it.effect("keeps source retrograde state while remapping longitude and sign", () =>
      Effect.gen(function* () {
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);
        const d9 = charts[1];
        if (d9 === undefined) return yield* Effect.die("Expected a D9 chart");
        const saturn = planetsOf(d9).find(({ name }) => name === "Saturn");
        const jupiter = planetsOf(d9).find(({ name }) => name === "Jupiter");

        expect(saturn?.is_retrograde).toBe(true);
        expect(jupiter?.is_retrograde).toBe(false);
      }),
    );

    it.effect("derives dignity from each division's mapped sign", () =>
      Effect.gen(function* () {
        const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]);
        const jupiters = charts.map((chart) =>
          planetsOf(chart).find(({ name }) => name === "Jupiter"),
        );

        expect(jupiters[0]?.sign.name).toBe("Cancer");
        expect(jupiters[0]?.in_sign).toEqual(["EXALTED"]);
        expect(jupiters[1]?.sign.name).toBe("Leo");
        expect(jupiters[1]?.in_sign).toEqual(["FRIEND"]);
      }),
    );
  });
});
