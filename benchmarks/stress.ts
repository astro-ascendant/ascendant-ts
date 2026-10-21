import { performance } from "node:perf_hooks";

import { BunRuntime } from "@effect/platform-bun";
import { Config, Console, DateTime, Effect, Layer, Option } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import * as Swisseph from "../src/swisseph/index.js";
import * as Transit from "../src/transit/index.js";

export interface StressOptions {
  readonly full: boolean;
  readonly iterations: number | undefined;
}

export interface ScenarioResult {
  readonly scenario: string;
  readonly backend: string;
  readonly iterations: number;
  readonly totalMs: number;
  readonly meanMs: number;
  readonly minMs: number;
  readonly opsPerSec: number;
}

/**
 * Benchmark scripts are startup boundaries: runtime knobs are read once here
 * through Effect `Config` (default provider reads the environment), never
 * via direct `process.env` access or inside library code.
 */
export const readOptions = Effect.fn("Benchmarks.stress.readOptions")(function* () {
  const full = yield* Config.Boolean("STRESS_FULL").pipe(Config.withDefault(false));
  const iters = yield* Config.option(Config.Int("STRESS_ITERS"));
  return { full, iterations: Option.getOrUndefined(iters) } satisfies StressOptions;
});

const MOMENT_ISO = "2003-08-19T06:25:00.000Z";
const LATITUDE = 13.0827;
const LONGITUDE = 80.2707;
const DAY_MS = 86_400_000;

const ASTRO_LAYER = AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" });
const UNCACHED = Layer.mergeAll(ASTRO_LAYER, Swisseph.SwissephLayer);
const CACHED = Layer.mergeAll(ASTRO_LAYER, Swisseph.SwissephCachedLayer);
const ALL_DIVISIONS = [...Chart.Division.literals];

export function locatedMomentAt(dateIso: string): Chart.LocatedMoment {
  return locatedMomentAtDate(DateTime.makeUnsafe(dateIso));
}

function locatedMomentAtDate(date: DateTime.Utc): Chart.LocatedMoment {
  return Chart.LocatedMoment.make({
    moment: Chart.Moment.make({ date }),
    latitude: LATITUDE,
    longitude: LONGITUDE,
  });
}

export function spreadMoments(count: number): ReadonlyArray<Chart.LocatedMoment> {
  const base = DateTime.makeUnsafe(MOMENT_ISO);
  return Array.from({ length: count }, (_, index) =>
    locatedMomentAtDate(DateTime.mapEpochMillis(base, (millis) => millis + index * 7 * DAY_MS)),
  );
}

const displayMs = (value: number): number => Number(value.toFixed(2));

export const measure = Effect.fn("Benchmarks.stress.measure")(function* <A, E>(
  scenario: string,
  backend: string,
  iterations: number,
  run: Effect.Effect<A, E>,
) {
  yield* run;
  const durations: Array<number> = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    yield* run;
    durations.push(performance.now() - start);
  }
  const totalMs = durations.reduce((total, duration) => total + duration, 0);
  const meanMs = totalMs / durations.length;
  return {
    scenario,
    backend,
    iterations,
    totalMs: displayMs(totalMs),
    meanMs: displayMs(meanMs),
    minMs: displayMs(Math.min(...durations)),
    opsPerSec: displayMs(1000 / meanMs),
  } satisfies ScenarioResult;
});

export const measureLive = Effect.fn("Benchmarks.stress.measureLive")(function* <A, E, R>(
  scenario: string,
  backend: string,
  iterations: number,
  layer: Layer.Layer<R, E, never>,
  run: Effect.Effect<A, E, R>,
) {
  const context = yield* Effect.scoped(Layer.build(layer));
  return yield* measure(scenario, backend, iterations, Effect.provide(run, context));
});

export const report = Effect.fn("Benchmarks.stress.report")(function* (
  results: ReadonlyArray<ScenarioResult>,
) {
  yield* Console.log("");
  yield* Console.log("Stress results (wall ms; warmup excluded)");
  yield* Console.table(
    results.map((result) => ({
      Scenario: result.scenario,
      Backend: result.backend,
      Iters: result.iterations,
      "Total ms": result.totalMs,
      "Mean ms": result.meanMs,
      "Min ms": result.minMs,
      "Ops/s": result.opsPerSec,
    })),
  );

  const pairs = results.filter((result) => result.backend === "cached");
  if (pairs.length > 0) {
    yield* Console.log("Cached vs uncached speedup (mean)");
    yield* Console.table(
      pairs.flatMap((cached) => {
        const uncached = results.find(
          (result) => result.backend === "uncached" && result.scenario === cached.scenario,
        );
        return uncached === undefined
          ? []
          : [
              {
                Scenario: cached.scenario,
                "Uncached mean ms": uncached.meanMs,
                "Cached mean ms": cached.meanMs,
                Speedup: `${displayMs(uncached.meanMs / cached.meanMs)}x`,
              },
            ];
      }),
    );
  }
});

export const chartScenarios = Effect.fn("Benchmarks.stress.chartScenarios")(function* (
  options: StressOptions,
  moments: ReadonlyArray<Chart.LocatedMoment>,
) {
  const d1Iters = options.iterations ?? (options.full ? 100 : 20);
  const allDivIters = options.iterations ?? (options.full ? 20 : 5);
  const [first] = moments;
  if (first === undefined) return [];
  const generateD1 = Chart.generate(first);
  const generateAll = Chart.generate(first, ALL_DIVISIONS);
  const throughput = Effect.forEach(moments, (moment) => Chart.generate(moment));
  return [
    yield* measure(
      "chart:generate-d1",
      "uncached",
      d1Iters,
      generateD1.pipe(Effect.provide(UNCACHED)),
    ),
    yield* measureLive("chart:generate-d1", "cached", d1Iters, CACHED, generateD1),
    yield* measureLive("chart:generate-all-divisions", "cached", allDivIters, CACHED, generateAll),
    yield* measureLive(
      `throughput:${moments.length}-moments`,
      "cached",
      options.iterations ?? 2,
      CACHED,
      throughput,
    ),
  ];
});

export const transitScenarios = Effect.fn("Benchmarks.stress.transitScenarios")(function* (
  options: StressOptions,
  from: Chart.LocatedMoment,
) {
  const saturn = Transit.findTransits({
    planet: "Saturn",
    from,
    count: options.full ? 5 : 3,
    direction: "forward",
    kinds: ["sign-ingress"],
  });
  const saturnIters = options.iterations ?? (options.full ? 5 : 3);
  const results = [
    yield* measure(
      "transit:saturn-ingress-30y",
      "uncached",
      saturnIters,
      saturn.pipe(Effect.provide(UNCACHED)),
    ),
    yield* measureLive("transit:saturn-ingress-30y", "cached", saturnIters, CACHED, saturn),
  ];

  const jupiter = Transit.findTransits({
    planet: "Jupiter",
    from,
    count: 2,
    direction: "forward",
    kinds: ["sign-ingress"],
    includeCharts: [1, 9],
  });
  const jupiterIters = options.iterations ?? 3;
  results.push(
    yield* measureLive("transit:jupiter-with-charts", "cached", jupiterIters, CACHED, jupiter),
  );

  if (options.full) {
    // Moon ingresses ~monthly: count 100 scans ~230 days (~1k samples).
    const moon = Transit.findTransits({
      planet: "Moon",
      from,
      count: 100,
      direction: "forward",
      kinds: ["sign-ingress"],
    });
    // Saturn ingresses ~12 times in 30 years, so count 100 exhausts the
    // window: a full 30-year coarse scan through the public path. The search
    // fails typed with TransitSearchExhausted; Effect.exit times the scan.
    const saturnFull = Transit.findTransits({
      planet: "Saturn",
      from,
      count: 100,
      direction: "forward",
      kinds: ["sign-ingress"],
    }).pipe(Effect.exit);
    results.push(
      yield* measure(
        "transit:moon-ingress-count-100",
        "uncached",
        options.iterations ?? 2,
        moon.pipe(Effect.provide(UNCACHED)),
      ),
      yield* measureLive(
        "transit:moon-ingress-count-100",
        "cached",
        options.iterations ?? 2,
        CACHED,
        moon,
      ),
      yield* measure(
        "transit:saturn-full-window-scan",
        "uncached",
        options.iterations ?? 1,
        saturnFull.pipe(Effect.provide(UNCACHED)),
      ),
      yield* measureLive(
        "transit:saturn-full-window-scan",
        "cached",
        options.iterations ?? 2,
        CACHED,
        saturnFull,
      ),
    );
  }

  return results;
});

export const contentionScenario = Effect.fn("Benchmarks.stress.contentionScenario")(function* (
  options: StressOptions,
  moments: ReadonlyArray<Chart.LocatedMoment>,
) {
  if (!options.full) return [];
  const burst = Effect.forEach(moments.slice(0, 8), (moment) => Chart.generate(moment), {
    concurrency: "unbounded",
  });
  return [
    yield* measureLive(
      "contention:8-parallel-charts",
      "cached",
      options.iterations ?? 5,
      CACHED,
      burst,
    ),
  ];
});

export const stressBenchmark = Effect.fn("Benchmarks.stress")(function* (options: StressOptions) {
  const from = locatedMomentAt(MOMENT_ISO);
  const moments = spreadMoments(options.full ? 50 : 25);

  yield* Console.log(
    `Stress suite (${options.full ? "full" : "quick"}): ${MOMENT_ISO} at ${LATITUDE}, ${LONGITUDE}`,
  );
  yield* Console.log(
    "Cached rows share one layer for the whole scenario (warm steady state, first warmup run excluded).",
  );
  const results = [
    ...(yield* chartScenarios(options, moments)),
    ...(yield* transitScenarios(options, from)),
    ...(yield* contentionScenario(options, moments)),
  ];
  yield* report(results);
});

// Direct runs (`bun run benchmarks/stress.ts`) execute the suite; imports
// (e.g. benchmarks/cli.ts) only pick up the exports below.
const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].replace(/\\/g, "/").endsWith("benchmarks/stress.ts");
if (invokedDirectly) {
  BunRuntime.runMain(readOptions().pipe(Effect.flatMap((options) => stressBenchmark(options))));
}
