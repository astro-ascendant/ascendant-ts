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
    description: "Calculate the Vimshottari timeline, down to the current Sookshma",
    value: "vimshottari" as const,
  },
] as const;

/** The ISO start and end of a period, for a table row. */
function spanOf(period: { readonly start: DateTime.Utc; readonly end: DateTime.Utc }) {
  return { Start: DateTime.formatIso(period.start), End: DateTime.formatIso(period.end) };
}

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

  const current = yield* Dasha.at(timeline);
  if (current === null) {
    yield* Console.log("Now is outside the Vimshottari timeline");
    return;
  }
  yield* Console.log("Vimshottari periods active now");
  yield* Console.table([
    { Level: "Mahadasha", Lord: current.mahadasha.mahadasha, ...spanOf(current.mahadasha) },
    { Level: "Antardasha", Lord: current.antardasha.antardasha, ...spanOf(current.antardasha) },
    {
      Level: "Pratyantardasha",
      Lord: current.pratyantardasha.pratyantardasha,
      ...spanOf(current.pratyantardasha),
    },
    { Level: "Sookshma", Lord: current.sookshma.sookshma, ...spanOf(current.sookshma) },
  ]);

  yield* Console.log(
    `${current.mahadasha.mahadasha}-${current.antardasha.antardasha} Pratyantardashas`,
  );
  yield* Console.table(
    Dasha.pratyantardashas(current.antardasha).map((period) => ({
      Pratyantardasha: period.pratyantardasha,
      ...spanOf(period),
    })),
  );

  yield* Console.log(
    `${current.mahadasha.mahadasha}-${current.antardasha.antardasha}-${current.pratyantardasha.pratyantardasha} Sookshmas`,
  );
  yield* Console.table(
    Dasha.sookshmas(current.pratyantardasha).map((period) => ({
      Sookshma: period.sookshma,
      ...spanOf(period),
    })),
  );
});

const printCurrentRashiDasha = Effect.fn(function* (timeline: Dasha.RashiDasha) {
  const current = yield* Dasha.atRashi(timeline);
  if (current === null) {
    yield* Console.log(`Now is outside the ${timeline.system} timeline`);
    return;
  }
  yield* Console.log(`${timeline.system} periods active now`);
  yield* Console.table([
    { Level: "Mahadasha", Sign: current.mahadasha.mahadasha, ...spanOf(current.mahadasha) },
    { Level: "Antardasha", Sign: current.antardasha.antardasha, ...spanOf(current.antardasha) },
  ]);
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

  yield* printCurrentRashiDasha(timeline);
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
