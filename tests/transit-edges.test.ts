import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import * as Chart from "../src/chart/index.js";
import * as Transit from "../src/transit/index.js";
import { ephemerisTestLayer, planetaryPosition } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";
import { transitFixtures } from "./support/transit.js";

const {
  DAY_MS,
  JD0,
  astroLayer,
  expectedMoment,
  jupiterLayer,
  linearLayer,
  locatedMoment,
  minutesBetween,
} = transitFixtures;

describe("Transit search window and dedup", () => {
  it.layer(Layer.merge(astroLayer, linearLayer(89, 1)))((it) => {
    for (const precisionMinutes of [1, 45, 90, 360]) {
      it.effect(`reports one hit per crossing at ${precisionMinutes} minute precision`, () =>
        Effect.gen(function* () {
          const events = yield* Transit.findTransits({
            planet: "Sun",
            from: locatedMoment(),
            count: 2,
            direction: "forward",
            kinds: ["longitude-hit"],
            targetLongitude: Chart.Longitude.make(92),
            precisionMinutes,
            maxYears: 2,
          });

          expect(events).toHaveLength(2);
          expect(minutesBetween(events[0]!.moment, expectedMoment(3))).toBeLessThan(
            precisionMinutes,
          );
          const gapDays =
            (DateTime.toEpochMillis(events[1]!.moment) -
              DateTime.toEpochMillis(events[0]!.moment)) /
            DAY_MS;
          expect(gapDays).toBeGreaterThan(359);
          expect(gapDays).toBeLessThan(361);
        }),
      );
    }
  });

  it.layer(Layer.merge(astroLayer, jupiterLayer))((it) => {
    it.effect("does not return hits beyond the maxYears window", () =>
      Effect.gen(function* () {
        const failure = yield* Effect.flip(
          Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 1,
            direction: "forward",
            kinds: ["longitude-hit"],
            targetLongitude: Chart.Longitude.make(68.82),
            maxYears: 0.001,
          }),
        );

        expect(failure._tag).toBe("TransitSearchExhausted");
        if (failure._tag === "TransitSearchExhausted") {
          expect(failure.found).toEqual([]);
        }
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, linearLayer(1, -0.5)))((it) => {
    it.effect("finds backward ingresses across 0/360 for a retrograde planet", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 2,
          direction: "backward",
          kinds: ["sign-ingress"],
          maxYears: 1,
        });

        expect(events).toHaveLength(2);
        expect(events.every((event) => event.is_retrograde)).toBe(true);
        const times = events.map((event) => DateTime.toEpochMillis(event.moment));
        expect(times[0]!).toBeGreaterThan(times[1]!);
        expect(minutesBetween(events[0]!.moment, expectedMoment(-58))).toBeLessThan(3);
        expect(minutesBetween(events[1]!.moment, expectedMoment(-118))).toBeLessThan(3);
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, linearLayer(10, -0.053)))((it) => {
    it.effect("never reports stations for the always-retrograde lunar nodes", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Rahu",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["station", "sign-ingress"],
          maxYears: 30,
        });

        expect(events).toHaveLength(2);
        expect(events.every((event) => event.kind === "sign-ingress")).toBe(true);
        expect(events.every((event) => event.is_retrograde)).toBe(true);
      }),
    );
  });
});

describe("Transit search from exactly on a sign boundary", () => {
  // `from` is inclusive: an ingress at the starting instant is reported, in either
  // direction and whichever way the graha is moving.
  for (const [rate, direction, sign] of [
    [0.14, "forward", "Cancer"],
    [0.14, "backward", "Gemini"],
    [-0.14, "forward", "Gemini"],
    [-0.14, "backward", "Cancer"],
  ] as const) {
    it.layer(Layer.merge(astroLayer, linearLayer(90, rate)))((it) => {
      it.effect(`reports the ingress at \`from\` (${direction}, rate ${rate})`, () =>
        Effect.gen(function* () {
          const [event] = yield* Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 1,
            direction,
            kinds: ["sign-ingress"],
          });

          expect(minutesBetween(event!.moment, expectedMoment(0))).toBeLessThan(3);
          expect(event?.sign).toBe(sign);
        }),
      );
    });
  }

  it.layer(Layer.merge(astroLayer, linearLayer(90, 0.14)))((it) => {
    it.effect("does not report the starting ingress twice", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["sign-ingress"],
        });

        expect(events.map((event) => event.sign)).toEqual(["Cancer", "Leo"]);
        expect(minutesBetween(events[1]!.moment, expectedMoment(30 / 0.14))).toBeLessThan(3);
      }),
    );
  });
});

describe("Transit station search from exactly on a station", () => {
  // Retrograde before `from`, direct after, with zero speed at `from` itself.
  const stationAtFrom = ephemerisTestLayer({
    position: (julianDay) => {
      const offset = Number(julianDay) - JD0;
      const speed = offset === 0 ? 0 : offset < 0 ? -0.5 : 0.5;
      return Effect.succeed(planetaryPosition(80 + 0.5 * Math.abs(offset), speed));
    },
  });

  for (const direction of ["forward", "backward"] as const) {
    it.layer(Layer.merge(astroLayer, stationAtFrom))((it) => {
      it.effect(`reports the station at \`from\` (${direction})`, () =>
        Effect.gen(function* () {
          const [event] = yield* Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 1,
            direction,
            kinds: ["station"],
          });

          expect(minutesBetween(event!.moment, expectedMoment(0))).toBeLessThan(3);
        }),
      );
    });
  }
});

describe("Transit search sampling", () => {
  // A performance contract: the sweep leaps toward the target and refinement is Newton-based,
  // so a few crossings of a slow, distant target cost a small multiple of the events found
  // rather than a sample every coarse step.
  let calls = 0;
  const counting = ephemerisTestLayer({
    position: (julianDay) => {
      calls += 1;
      return Effect.succeed(planetaryPosition(100 + 0.5 * (Number(julianDay) - JD0), 0.5));
    },
  });
  it.layer(Layer.merge(astroLayer, counting))((it) => {
    it.effect("refines a crossing in a handful of ephemeris calls", () =>
      Effect.gen(function* () {
        calls = 0;
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 3,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(250),
          maxYears: 6,
        });

        expect(events).toHaveLength(3);
        expect(minutesBetween(events[0]!.moment, expectedMoment(300))).toBeLessThan(1);
        expect(calls).toBeLessThan(80);
      }),
    );
  });
});

describe("Transit search window range", () => {
  it.layer(Layer.merge(astroLayer, linearLayer(10, 0.5)))((it) => {
    it.effect("fails typed when the window runs past the supported Julian Day range", () =>
      Effect.gen(function* () {
        // Julian Day 0 is the year -4712; searching back from just after it leaves the range.
        const failure = yield* Effect.flip(
          Transit.findTransits({
            planet: "Mars",
            from: fixtures.locatedMoment("-004712-01-10T00:00:00.000Z"),
            count: 1,
            direction: "backward",
            kinds: ["sign-ingress"],
            maxYears: 1,
          }),
        );

        expect(failure._tag).toBe("TransitValidationError");
      }),
    );
  });
});
