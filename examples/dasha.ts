import { Console, DateTime, Effect, Match } from "effect";
import { Prompt } from "effect/cli";

import { Chart, Dasha } from "../src/index.js";
import type { ExampleInput } from "./input.js";

const DASHA_CHOICES = [
  {
    title: "Chara",
    description: "Calculate the Jaimini Chara sign timeline",
    value: "chara" as const,
  },
  {
    title: "Sthira",
    description: "Calculate the Jaimini Sthira sign timeline",
    value: "sthira" as const,
  },
  {
    title: "Vimshottari",
    description: "Calculate the Vimshottari planetary timeline",
    value: "vimshottari" as const,
  },
] as const;

const printVimshottariDasha = Effect.fn(function* (timeline: Dasha.VimshottariDasha) {
  yield* Console.log("Vimshottari Mahadashas");
  yield* Console.table(
    timeline.map((period) => ({
      Mahadasha: period.mahadasha,
      Start: DateTime.formatIso(period.start),
      End: DateTime.formatIso(period.end),
    })),
  );

  for (const period of timeline) {
    yield* Console.log(
      `${period.mahadasha} Mahadasha Antardashas (${DateTime.formatIso(period.start)} to ${DateTime.formatIso(period.end)})`,
    );
    yield* Console.table(
      period.antardashas.map((antardasha) => ({
        Antardasha: antardasha.antardasha,
        Start: DateTime.formatIso(antardasha.start),
        End: DateTime.formatIso(antardasha.end),
      })),
    );
  }
});

const printRashiDasha = Effect.fn(function* (timeline: Dasha.RashiDasha) {
  const brahma = Match.value(timeline).pipe(
    Match.when(
      { system: "Sthira" },
      ({ brahma }) => `${brahma.planet} in ${brahma.sign} (${brahma.source})`,
    ),
    Match.orElse(() => "Not applicable"),
  );

  yield* Console.log(`${timeline.system} Mahadashas`);
  yield* Console.table([
    {
      School: timeline.provenance.school,
      Method: timeline.provenance.method,
      Version: timeline.provenance.version,
      Brahma: brahma,
    },
  ]);
  if (timeline.system === "Sthira") {
    yield* Console.log(`Brahma reference sign: ${timeline.brahma.selection.referenceSign}`);
    yield* Console.log(
      `Atmakaraka: ${timeline.brahma.selection.atmakaraka.planet} in ${timeline.brahma.selection.atmakaraka.sign} (${timeline.brahma.selection.atmakaraka.resolution})`,
    );
    yield* Console.table(
      timeline.brahma.selection.rashiBalas.map((score) => ({
        Sign: score.sign,
        Chara: score.charaBala,
        Sthira: score.sthiraBala,
        Drishti: score.drishtiBala,
        Planets: score.planetCount,
        Aspecting: score.aspectingPlanets.join(", ") || "—",
        Total: score.total,
      })),
    );
    yield* Console.table(
      timeline.brahma.selection.candidates.map((score) => ({
        Planet: score.planet,
        Sign: score.sign,
        Dignity: `${score.dignity} (${score.dignityBala})`,
        Karaka: `${score.charaKarakaRoles.join(", ")} (${score.charaKarakaBala})`,
        Kendradi: `H${score.kendradiHouseFromAtmakaraka} (${score.kendradiBala})`,
        Degree: score.exactDegreeWithinSign,
        Natural: score.naturalStrength,
        Total: score.total,
      })),
    );
  }
  yield* Console.table(
    timeline.mahadashas.map((period) => ({
      Mahadasha: period.mahadasha,
      Start: DateTime.formatIso(period.start),
      End: DateTime.formatIso(period.end),
    })),
  );

  for (const period of timeline.mahadashas) {
    yield* Console.log(
      `${period.mahadasha} Mahadasha Antardashas (${DateTime.formatIso(period.start)} to ${DateTime.formatIso(period.end)})`,
    );
    yield* Console.table(
      period.antardashas.map((antardasha) => ({
        Antardasha: antardasha.antardasha,
        Start: DateTime.formatIso(antardasha.start),
        End: DateTime.formatIso(antardasha.end),
      })),
    );
  }
});

const calculateChara = Effect.fn(function* (moment: Chart.Moment, placements: Chart.Placements) {
  return yield* Dasha.calculateChara(moment, placements);
});

const calculateSthira = Effect.fn(function* (moment: Chart.Moment, placements: Chart.Placements) {
  return yield* Dasha.calculateSthira(moment, placements);
});

export const dashaExample = Effect.fn(function* ({ moment, latitude, longitude }: ExampleInput) {
  const calculation = yield* Chart.generate(
    Chart.LocatedMoment.make({ moment, latitude, longitude }),
  );
  const dasha = yield* Prompt.Select<(typeof DASHA_CHOICES)[number]["value"]>({
    message: "Choose a Dasha system",
    choices: DASHA_CHOICES,
  });

  yield* Match.value(dasha).pipe(
    Match.when("chara", () =>
      calculateChara(moment, calculation.placements).pipe(
        Effect.flatMap((timeline) => printRashiDasha(timeline)),
      ),
    ),
    Match.when("sthira", () =>
      calculateSthira(moment, calculation.placements).pipe(
        Effect.flatMap((timeline) => printRashiDasha(timeline)),
      ),
    ),
    Match.when("vimshottari", () =>
      Dasha.calculate(moment, calculation.placements).pipe(
        Effect.flatMap((timeline) => printVimshottariDasha(timeline)),
      ),
    ),
    Match.exhaustive,
  );
});
