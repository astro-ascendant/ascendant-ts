import { Console, Effect, Record } from "effect";

import { Chart, SAV } from "../src/index.js";
import type { ExampleInput } from "./input.js";

const printSAV = Effect.fn(function* (result: SAV.AshtakavargaResult) {
  yield* Console.log("Bhinnashtakavarga and Sarvashtakavarga");
  yield* Console.table(
    Record.keys(result.sarva).map((rashi) => ({
      Rashi: rashi,
      Sun: result.bhinna.Sun[rashi],
      Moon: result.bhinna.Moon[rashi],
      Mars: result.bhinna.Mars[rashi],
      Mercury: result.bhinna.Mercury[rashi],
      Jupiter: result.bhinna.Jupiter[rashi],
      Venus: result.bhinna.Venus[rashi],
      Saturn: result.bhinna.Saturn[rashi],
      Lagna: result.bhinna.Lagna[rashi],
      SAV: result.sarva[rashi],
    })),
  );

  yield* Console.log("Reduced Bhinnashtakavarga");
  yield* Console.table(
    Record.keys(result.sarva).map((rashi) => ({
      Rashi: rashi,
      Sun: result.reduced.Sun[rashi],
      Moon: result.reduced.Moon[rashi],
      Mars: result.reduced.Mars[rashi],
      Mercury: result.reduced.Mercury[rashi],
      Jupiter: result.reduced.Jupiter[rashi],
      Venus: result.reduced.Venus[rashi],
      Saturn: result.reduced.Saturn[rashi],
    })),
  );

  yield* Console.log("Shodhya Pinda");
  yield* Console.table(
    SAV.AshtakavargaPlanets.literals.map((planet) => ({
      Planet: planet,
      "Rashi Pinda": result.shodhya_pinda[planet].rashi_pinda,
      "Graha Pinda": result.shodhya_pinda[planet].graha_pinda,
      "Shodhya Pinda": result.shodhya_pinda[planet].shodhya_pinda,
    })),
  );

  yield* Console.log("Classical checksums");
  yield* Console.table([result.totals]);
});

export const savExample = Effect.fn(function* ({ moment, latitude, longitude }: ExampleInput) {
  const calculation = yield* Chart.generate(
    Chart.LocatedMoment.make({
      moment,
      latitude,
      longitude,
    }),
  );
  yield* SAV.calculate(calculation.placements).pipe(Effect.tap(printSAV));
});
