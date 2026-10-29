import { describe, expect, it } from "@effect/vitest";
import { Effect, Equal, Layer, Schema } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import * as Dasha from "../src/dasha/index.js";
import * as Argala from "../src/jaimini/argala/index.js";
import * as ArudhaPada from "../src/jaimini/arudha-pada/index.js";
import * as CharaKarakas from "../src/jaimini/chara-karakas/index.js";
import * as Karakamsha from "../src/jaimini/karakamsha/index.js";
import * as RashiDrishti from "../src/jaimini/rashi-drishti/index.js";
import * as Upapada from "../src/jaimini/upapada/index.js";
import * as Provenance from "../src/provenance.js";
import { EphemerisTestLayer } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";

describe("Astrology method provenance", () => {
  it("requires every registered methodology to carry a valid, versioned specification", () => {
    for (const specification of Object.values(Provenance.methods)) {
      expect(Schema.is(Provenance.MethodSpecification)(specification)).toBe(true);
      expect(
        specification.steps.every(({ id, description }) => id.length > 0 && description.length > 0),
      ).toBe(true);
      expect(specification.verification.every((check) => check.length > 0)).toBe(true);
    }
  });

  it("gives each method a distinct provenance identity", () => {
    const identities = Object.values(Provenance.methods).map(({ provenance }) =>
      JSON.stringify(provenance),
    );

    expect(new Set(identities).size).toBe(identities.length);
  });

  it.effect("binds every provenance-bearing calculation to its registry specification", () =>
    Effect.gen(function* () {
      const placements = fixtures.placementsFromLongitudes();
      const { charts } = yield* Chart.generate(fixtures.locatedMoment(), [9]).pipe(
        Effect.provide(Layer.merge(AstroParams.DefaultAstroParams, EphemerisTestLayer)),
      );
      const [d1, d9] = charts;
      const chara = yield* Dasha.calculateChara(fixtures.moment(), placements);
      const sthira = yield* Dasha.calculateSthira(fixtures.moment(), placements);
      const argala = yield* Argala.calculate(placements, { kind: "Sign", sign: "Aries" });
      const arudha = yield* ArudhaPada.calculate(placements, 1);
      const karakas = yield* CharaKarakas.calculate(placements);
      const karakamsha = yield* Karakamsha.calculate(placements);
      const drishti = yield* RashiDrishti.calculate("Aries");
      const upapada = yield* Upapada.calculate(placements);

      expect(
        Equal.equals(
          [
            d1.provenance,
            d9?.provenance,
            argala.provenance,
            arudha.provenance,
            karakas.provenance,
            karakamsha.provenance,
            drishti.provenance,
            upapada.provenance,
            chara.provenance,
            sthira.provenance,
          ],
          [
            Provenance.methods.rashiChartProjection.provenance,
            Provenance.methods.divisionalChartProjection.provenance,
            Provenance.methods.jaiminiArgala.provenance,
            Provenance.methods.jaiminiArudhaPada.provenance,
            Provenance.methods.jaiminiCharaKarakas.provenance,
            Provenance.methods.jaiminiKarakamsha.provenance,
            Provenance.methods.jaiminiRashiDrishti.provenance,
            Provenance.methods.jaiminiUpapada.provenance,
            Provenance.methods.charaDasha.provenance,
            Provenance.methods.sthiraDasha.provenance,
          ],
        ),
      ).toBe(true);
    }),
  );
});
