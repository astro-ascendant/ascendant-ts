import { Console, Effect } from "effect";

import * as Chart from "../src/chart/index.js";
import * as Argala from "../src/jaimini/argala/index.js";
import * as ArudhaPada from "../src/jaimini/arudha-pada/index.js";
import * as CharaKarakas from "../src/jaimini/chara-karakas/index.js";
import * as Karakamsha from "../src/jaimini/karakamsha/index.js";
import * as RashiDrishti from "../src/jaimini/rashi-drishti/index.js";
import * as Upapada from "../src/jaimini/upapada/index.js";
import type { ExampleInput } from "./input.js";

export const jaiminiExample = Effect.fn(function* ({ moment, latitude, longitude }: ExampleInput) {
  const calculation = yield* Chart.generate(
    Chart.LocatedMoment.make({
      moment,
      latitude,
      longitude,
    }),
    [9],
  );
  const placements = calculation.placements;
  const lagnaSign = calculation.charts[0].houses[1].sign;

  const charaKarakaResult = yield* CharaKarakas.calculate(placements);
  const rashiDrishtiResult = yield* RashiDrishti.calculate(lagnaSign);
  const karakamshaResult = yield* Karakamsha.calculate(placements);
  const arudhaLagnaResult = yield* ArudhaPada.calculate(placements, 1);
  const upapadaResult = yield* Upapada.calculate(placements);
  const argalaResult = yield* Argala.calculate(placements, {
    kind: "Sign",
    sign: lagnaSign,
  });

  yield* Console.log("Chara Karakas");
  yield* Console.table(
    CharaKarakas.Roles.literals.map((role) => ({
      Role: role,
      Planet: charaKarakaResult.assignments[role].map(({ planet }) => planet).join(", "),
      Degree: charaKarakaResult.assignments[role].map(({ degree }) => `${degree}°`).join(", "),
    })),
  );

  yield* Console.log("Named sign results");
  yield* Console.table([
    {
      Calculation: "Rashi Drishti from D1 Lagna",
      Result: rashiDrishtiResult.targets.join(", "),
    },
    {
      Calculation: "Karakamsha",
      Result: karakamshaResult.placements
        .map(({ planet, sign }) => `${planet}: ${sign}`)
        .join(", "),
    },
    { Calculation: "Arudha Lagna (A1)", Result: arudhaLagnaResult.sign },
    { Calculation: "Upapada (A12)", Result: upapadaResult.sign },
  ]);

  yield* Console.log(`Argala from ${argalaResult.referenceSign}`);
  yield* Console.table([
    ...argalaResult.supporting.map((relation) => ({
      Kind: "Supporting",
      Position: relation.position,
      Sign: relation.sign,
      Planets: relation.planets.join(", "),
    })),
    ...argalaResult.obstructing.map((relation) => ({
      Kind: "Obstructing",
      Position: relation.position,
      Sign: relation.sign,
      Planets: relation.planets.join(", "),
    })),
    {
      Kind: "Secondary supporting",
      Position: argalaResult.secondarySupporting.position,
      Sign: argalaResult.secondarySupporting.sign,
      Planets: argalaResult.secondarySupporting.planets.join(", "),
    },
    {
      Kind: "Secondary obstructing",
      Position: argalaResult.secondaryObstructing.position,
      Sign: argalaResult.secondaryObstructing.sign,
      Planets: argalaResult.secondaryObstructing.planets.join(", "),
    },
  ]);
});
