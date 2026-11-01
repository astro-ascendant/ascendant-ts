import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import * as AstroParams from "../src/astro-params/index.js";
import * as Chart from "../src/chart/index.js";
import { Ephemeris } from "../src/ephemeris/service.js";
import * as Swisseph from "../src/swisseph/index.js";
import * as Transit from "../src/transit/index.js";
import { fixtures } from "./support/fixtures.js";

const FROM = "2026-11-01T00:00:00.000Z";
const YEARS = 3;
const SCAN_STEP_DAYS = 1 / 24;
const TARGET = 100;

const layer = Layer.merge(
  AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" }),
  Swisseph.SwissephLayer,
);

function wrapSigned(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** Julian days where a dense hourly scan of the real ephemeris sees each kind of event. */
const denseScan = Effect.fnUntraced(function* (planet: Chart.Planets) {
  const ephemeris = yield* Ephemeris;
  const start = yield* ephemeris.dateToJulianDay(DateTime.makeUnsafe(FROM));
  const hits = {
    "sign-ingress": [] as number[],
    station: [] as number[],
    "longitude-hit": [] as number[],
  };
  let previous = yield* ephemeris.calculatePosition(start, planet, "Lahiri");
  for (let day = SCAN_STEP_DAYS; day <= YEARS * 365.25; day += SCAN_STEP_DAYS) {
    const jd = start + day;
    const current = yield* ephemeris.calculatePosition(jd as typeof start, planet, "Lahiri");
    const crossed = Math.floor(previous.longitude / 30) !== Math.floor(current.longitude / 30);
    if (crossed && Math.abs(wrapSigned(current.longitude - previous.longitude)) < 30) {
      hits["sign-ingress"].push(jd);
    }
    if (Math.sign(previous.longitudeSpeed) !== Math.sign(current.longitudeSpeed)) {
      hits.station.push(jd);
    }
    const before = wrapSigned(previous.longitude - TARGET);
    const after = wrapSigned(current.longitude - TARGET);
    if (Math.sign(before) !== Math.sign(after) && Math.abs(after - before) < 180) {
      hits["longitude-hit"].push(jd);
    }
    previous = current;
  }
  return hits;
});

// An independent oracle for the sweep: sampling every hour finds every crossing and station
// of these grahas, so the search must find the same number of events, in the same places.
describe("Transit search against a dense scan of the Swiss Ephemeris", () => {
  it.layer(layer)((it) => {
    for (const planet of ["Mercury", "Venus", "Mars", "Jupiter", "Sun"] as const) {
      it.effect(`finds every event a dense scan sees for ${planet}`, () =>
        Effect.gen(function* () {
          const ephemeris = yield* Ephemeris;
          const reference = yield* denseScan(planet);

          for (const kind of ["sign-ingress", "station", "longitude-hit"] as const) {
            const expected = reference[kind];
            if (expected.length === 0) continue;
            const events = yield* Transit.findTransits({
              planet,
              from: fixtures.locatedMoment(FROM),
              count: expected.length,
              direction: "forward",
              kinds: [kind],
              maxYears: YEARS,
              ...(kind === "longitude-hit"
                ? { targetLongitude: Chart.Longitude.make(TARGET) }
                : {}),
            });

            const found = yield* Effect.forEach(events, (event) =>
              ephemeris.dateToJulianDay(event.moment),
            );
            expect(found).toHaveLength(expected.length);
            for (const [index, jd] of found.entries()) {
              expect(Math.abs(jd - expected[index]!)).toBeLessThanOrEqual(SCAN_STEP_DAYS);
            }
          }
        }),
      );
    }
  });
});
