import { Console, Effect } from "effect";

import { AstroParams, Chart } from "../src/index.js";
import { printChartCalculation } from "./chart-calculation-table.js";
import type { ExampleInput } from "./input.js";

export const chartExample = Effect.fn(function* ({ moment, latitude, longitude }: ExampleInput) {
  const located = Chart.LocatedMoment.make({
    moment,
    latitude,
    longitude,
  });
  const vedicParams = AstroParams.Options.make({
    ayanamsa: "Lahiri",
    houseSystem: "WholeSign",
  });
  const kpParams = AstroParams.Options.make({
    ayanamsa: "KrishnamurtiVP291",
    houseSystem: "Placidus",
  });

  const vedicCalculation = yield* Effect.provideService(
    Chart.generate(located, [9]),
    AstroParams.AstroParams,
    AstroParams.AstroParams.of(vedicParams),
  );
  yield* Console.log("Vedic D1 and D9 (Lahiri + WholeSign)");
  yield* printChartCalculation(vedicCalculation, {
    includeSignificators: false,
    includeRulingPlanets: false,
  });

  const kpCalculation = yield* Effect.provideService(
    Chart.generate(located, []),
    AstroParams.AstroParams,
    AstroParams.AstroParams.of(kpParams),
  );
  yield* Console.log("");
  yield* Console.log("KP Chart D1 (KrishnamurtiVP291 + Placidus)");
  yield* printChartCalculation(kpCalculation);
});
