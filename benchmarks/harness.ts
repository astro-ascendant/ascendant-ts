import { DateTime, Effect, Layer, ManagedRuntime } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import * as Swisseph from "../src/swisseph/index.js";
import * as Transit from "../src/transit/index.js";

const MOMENT_ISO = "2003-08-19T06:25:00.000Z";
const LAT = 13.0827;
const LON = 80.2707;
const DAY_MS = 86_400_000;
const ALL_DIVISIONS = [...Chart.Division.literals] as const;

const baseDate = DateTime.makeUnsafe(MOMENT_ISO);
const baseMoment = Chart.LocatedMoment.make({
  moment: Chart.Moment.make({ date: baseDate }),
  latitude: LAT,
  longitude: LON,
});

function spread(count: number): ReadonlyArray<Chart.LocatedMoment> {
  return Array.from({ length: count }, (_, i) =>
    Chart.LocatedMoment.make({
      moment: Chart.Moment.make({
        date: DateTime.mapEpochMillis(baseDate, (ms) => ms + i * 7 * DAY_MS),
      }),
      latitude: LAT,
      longitude: LON,
    }),
  );
}

const astroLayer = AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" });
const cachedRuntime = ManagedRuntime.make(Layer.mergeAll(astroLayer, Swisseph.SwissephCachedLayer));
const uncachedRuntime = ManagedRuntime.make(Layer.mergeAll(astroLayer, Swisseph.SwissephLayer));

const moments25 = spread(25);
const moments50 = spread(50);

export function chartD1Uncached(): Promise<unknown> {
  return uncachedRuntime.runPromise(Chart.generate(baseMoment));
}

export function chartD1(): Promise<unknown> {
  return cachedRuntime.runPromise(Chart.generate(baseMoment));
}

export function chartAllDivisions(): Promise<unknown> {
  return cachedRuntime.runPromise(Chart.generate(baseMoment, [...ALL_DIVISIONS]));
}

export function throughput25(): Promise<unknown> {
  return cachedRuntime.runPromise(Effect.forEach(moments25, (m) => Chart.generate(m)));
}

export function throughput50(): Promise<unknown> {
  return cachedRuntime.runPromise(Effect.forEach(moments50, (m) => Chart.generate(m)));
}

export function transitSaturn(): Promise<unknown> {
  return cachedRuntime.runPromise(
    Transit.findTransits({
      planet: "Saturn",
      from: baseMoment,
      count: 3,
      direction: "forward",
      kinds: ["sign-ingress"],
    }),
  );
}

export function transitJupiterWithCharts(): Promise<unknown> {
  return cachedRuntime.runPromise(
    Transit.findTransits({
      planet: "Jupiter",
      from: baseMoment,
      count: 2,
      direction: "forward",
      kinds: ["sign-ingress"],
      includeCharts: [1, 9],
    }),
  );
}

export function transitMoon100(): Promise<unknown> {
  return cachedRuntime.runPromise(
    Transit.findTransits({
      planet: "Moon",
      from: baseMoment,
      count: 100,
      direction: "forward",
      kinds: ["sign-ingress"],
    }),
  );
}

export function transitSaturnFullScan(): Promise<unknown> {
  return cachedRuntime.runPromise(
    Transit.findTransits({
      planet: "Saturn",
      from: baseMoment,
      count: 100,
      direction: "forward",
      kinds: ["sign-ingress"],
    }).pipe(Effect.exit),
  );
}

export function parallel8(): Promise<unknown> {
  return cachedRuntime.runPromise(
    Effect.forEach(moments25.slice(0, 8), (m) => Chart.generate(m), { concurrency: "unbounded" }),
  );
}
