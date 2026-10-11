import { describe, expect, it } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Equal, Layer } from "effect";

import * as AstroParams from "../src/astro-params/index.js";

describe("AstroParams", () => {
  it("rejects unknown methodology values", () => {
    expect(() => AstroParams.Ayanamsa.make("Unknown" as never)).toThrow();
    expect(() => AstroParams.HouseSystem.make("Unknown" as never)).toThrow();
  });

  it.layer(AstroParams.DefaultAstroParams)((it) => {
    it.effect("provides default options through the service boundary", () =>
      Effect.gen(function* () {
        const defaults = yield* AstroParams.AstroParams;

        expect(
          Equal.equals(defaults, { ayanamsa: "KrishnamurtiVP291", houseSystem: "Placidus" }),
        ).toBe(true);
      }),
    );
  });

  it.layer(AstroParams.layer({ ayanamsa: "Raman", houseSystem: "Placidus" }))((it) => {
    it.effect("provides caller-selected options", () =>
      Effect.gen(function* () {
        const configured = yield* AstroParams.AstroParams;

        expect(Equal.equals(configured, { ayanamsa: "Raman", houseSystem: "Placidus" })).toBe(true);
      }),
    );
  });

  it.layer(
    AstroParams.layerConfig({
      ayanamsa: Config.schema(AstroParams.Ayanamsa, "ayanamsa"),
      houseSystem: Config.schema(AstroParams.HouseSystem, "houseSystem"),
    }).pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({ ayanamsa: "Lahiri", houseSystem: "WholeSign" }),
        ),
      ),
    ),
  )((it) => {
    it.effect("provides options decoded from Config", () =>
      Effect.gen(function* () {
        const configured = yield* AstroParams.AstroParams;

        expect(Equal.equals(configured, { ayanamsa: "Lahiri", houseSystem: "WholeSign" })).toBe(
          true,
        );
      }),
    );
  });
});
