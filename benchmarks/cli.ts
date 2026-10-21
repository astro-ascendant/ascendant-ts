import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer, Match } from "effect";
import { Command, Prompt } from "effect/cli";

import { selectInput } from "../examples/input.js";
import * as Swisseph from "../src/swisseph/index.js";
import { stressBenchmark } from "./stress.js";
import { sublordBenchmark } from "./sublord.js";

const cliLayer = Layer.mergeAll(BunServices.layer, Swisseph.SwissephLayer);

const validateIters = (value: string) =>
  Match.value(value === "" || /^\d+$/.test(value)).pipe(
    Match.when(true, () => Effect.succeed(value)),
    Match.when(false, () =>
      Effect.fail("Enter a non-negative integer, or leave blank for defaults"),
    ),
    Match.exhaustive,
  );

const promptStressOptions = Effect.fn(function* () {
  const mode = yield* Prompt.Select<"quick" | "full">({
    message: "Which stress workload?",
    choices: [
      {
        title: "Quick",
        description: "Core scenarios, under 2 seconds",
        value: "quick",
      },
      {
        title: "Full",
        description: "Extended workloads: Moon scan, full-window scan, contention",
        value: "full",
      },
    ],
  });
  const iterations = yield* Prompt.String({
    message: "Iterations per scenario (blank for defaults)",
    validate: validateIters,
  });
  return {
    full: mode === "full",
    iterations: iterations === "" ? undefined : Number.parseInt(iterations, 10),
  };
});

const runSublord = Effect.fn(function* () {
  const input = yield* selectInput();
  yield* sublordBenchmark(input);
});

const runStress = Effect.fn(function* () {
  const options = yield* promptStressOptions();
  yield* stressBenchmark(options);
});

const benchmarksCommand = Command.make("benchmarks", {}, () =>
  Effect.gen(function* () {
    const suite = yield* Prompt.Select<"sublord" | "stress">({
      message: "Which benchmark suite?",
      choices: [
        {
          title: "Sublord",
          description: "Compare sublord deviation across ayanamsa/house-system combinations",
          value: "sublord",
        },
        {
          title: "Stress",
          description: "Run library stress/performance benchmarks (wall-clock timings)",
          value: "stress",
        },
      ],
    });
    yield* Match.value(suite).pipe(
      Match.when("sublord", () => runSublord()),
      Match.when("stress", () => runStress()),
      Match.exhaustive,
    );
  }),
).pipe(Command.withDescription("Run ascendant benchmarks (interactive)"));

const cli = benchmarksCommand.pipe(Command.run({ version: "5.0.0" }));

BunRuntime.runMain(cli.pipe(Effect.provide(cliLayer)));
