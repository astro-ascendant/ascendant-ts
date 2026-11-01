import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import * as Chart from "../src/chart/index.js";
import * as Swisseph from "../src/swisseph/index.js";
import * as Transit from "../src/transit/index.js";
import { transitFixtures } from "./support/transit.js";

const {
  FIRST_STATION,
  FROM_ISO,
  SECOND_STATION,
  astroLayer,
  distanceToBoundary,
  expectedMoment,
  jupiterLayer,
  linearLayer,
  locatedMoment,
  marsLayer,
  marsLongitude,
  minutesBetween,
  rootsOf,
} = transitFixtures;

describe("Transit search over linear motion", () => {
  it.layer(Layer.merge(astroLayer, jupiterLayer))((it) => {
    it.effect("finds the next sign-ingress forward", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["sign-ingress"],
        });

        expect(event?.kind).toBe("sign-ingress");
        expect(Number(event?.longitude)).toBeCloseTo(90, 2);
        expect(event?.sign).toBe("Cancer");
        expect(event?.is_retrograde).toBe(false);
        expect(event?.direction).toBe("forward");
        expect(event?.provenance).toEqual({
          school: "Parashari",
          method: "transit-sample-bisect",
          version: "2026-11-01",
        });
        if (event !== undefined) {
          expect(minutesBetween(event.moment, expectedMoment((90 - 68.4) / 0.14))).toBeLessThan(2);
        }
      }),
    );

    it.effect("finds the previous sign-ingress backward", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "backward",
          kinds: ["sign-ingress"],
        });

        expect(Number(event?.longitude)).toBeCloseTo(60, 2);
        expect(event?.sign).toBe("Taurus");
        expect(event?.direction).toBe("backward");
        if (event !== undefined) {
          expect(minutesBetween(event.moment, expectedMoment(-(68.4 - 60) / 0.14))).toBeLessThan(2);
        }
      }),
    );

    it.effect("hits an exact target longitude", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(100),
        });

        expect(event?.kind).toBe("longitude-hit");
        expect(Number(event?.longitude)).toBeCloseTo(100, 2);
        if (event !== undefined) {
          expect(minutesBetween(event.moment, expectedMoment((100 - 68.4) / 0.14))).toBeLessThan(2);
        }
      }),
    );

    it.effect("does not report the point opposite a target longitude", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(100),
        });

        expect(events).toHaveLength(2);
        for (const event of events) {
          expect(Number(event.longitude)).toBeCloseTo(100, 2);
        }
        expect(minutesBetween(events[0]!.moment, expectedMoment((100 - 68.4) / 0.14))).toBeLessThan(
          2,
        );
        expect(minutesBetween(events[1]!.moment, expectedMoment((460 - 68.4) / 0.14))).toBeLessThan(
          2,
        );
      }),
    );

    it.effect("does not report the point opposite a house cusp", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["cusp-crossing"],
          house: 7,
        });

        expect(events).toHaveLength(2);
        for (const event of events) {
          expect(Number(event.longitude)).toBeCloseTo(180, 2);
        }
      }),
    );

    it.effect("crosses a natal house cusp", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["cusp-crossing"],
          house: 7,
        });

        expect(event?.kind).toBe("cusp-crossing");
        expect(Number(event?.longitude)).toBeCloseTo(180, 2);
      }),
    );

    it.effect("attaches charts only when requested", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["sign-ingress"],
          includeCharts: [1],
        });

        expect(event?.calculation?.charts[0]?.division).toBe(1);

        const [bare] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["sign-ingress"],
        });

        expect(bare?.calculation).toBeUndefined();
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, linearLayer(359, 1)))((it) => {
    it.effect("wraps across 0 degrees Aries", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Sun",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["sign-ingress"],
        });

        expect(distanceToBoundary(Number(event?.longitude ?? Number.NaN))).toBeCloseTo(0, 1);
        expect(event?.sign).toBe("Aries");
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, marsLayer))((it) => {
    it.effect("counts every retrograde crossing in time order", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 3,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(100),
          maxYears: 1,
        });

        const expected = rootsOf((t) => marsLongitude(t) - 100);
        expect(expected).toHaveLength(3);
        expect(events).toHaveLength(3);
        for (const [index, event] of events.entries()) {
          expect(Number(event.longitude)).toBeCloseTo(100, 2);
          expect(minutesBetween(event.moment, expectedMoment(expected[index]!))).toBeLessThan(2);
        }
        expect(events.map((event) => event.is_retrograde)).toEqual([false, true, false]);
      }),
    );

    it.effect("finds both crossings of a target just under a retrograde station", () =>
      Effect.gen(function* () {
        // Longitude peaks at the first station; a target 0.0005 degrees below it is crossed
        // up and down under a day apart.
        const target = marsLongitude(FIRST_STATION) - 0.0005;
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(target),
          maxYears: 1,
        });

        const expected = rootsOf((t) => marsLongitude(t) - target);
        expect(expected.length).toBeGreaterThanOrEqual(2);
        expect(expected[1]! - expected[0]!).toBeLessThan(1);
        expect(events).toHaveLength(2);
        for (const [index, event] of events.entries()) {
          expect(minutesBetween(event.moment, expectedMoment(expected[index]!))).toBeLessThan(2);
        }
      }),
    );

    it.effect("finds stations where speed changes sign", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["station"],
          maxYears: 1,
        });

        expect(events).toHaveLength(2);
        expect(events.every((event) => event.kind === "station")).toBe(true);
        expect(minutesBetween(events[0]!.moment, expectedMoment(FIRST_STATION))).toBeLessThan(3);
        expect(minutesBetween(events[1]!.moment, expectedMoment(SECOND_STATION))).toBeLessThan(3);
      }),
    );

    it.effect("reports the motion after a station as its retrograde state", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Mars",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["station"],
          maxYears: 1,
        });

        expect(events.map((event) => event.is_retrograde)).toEqual([true, false]);
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, linearLayer(0, 0.01)))((it) => {
    it.effect("fails typed instead of returning a short list", () =>
      Effect.gen(function* () {
        const failure = yield* Effect.flip(
          Transit.findTransits({
            planet: "Saturn",
            from: locatedMoment(),
            count: 5,
            direction: "forward",
            kinds: ["sign-ingress"],
            maxYears: 1,
          }),
        );

        expect(failure._tag).toBe("TransitSearchExhausted");
        if (failure._tag === "TransitSearchExhausted") {
          expect(failure.found.length).toBeLessThan(5);
        }
      }),
    );
  });

  it.layer(Layer.merge(astroLayer, jupiterLayer))((it) => {
    it.effect("rejects invalid requests", () =>
      Effect.gen(function* () {
        const cases = [
          Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 0,
            direction: "forward",
            kinds: ["sign-ingress"],
          }),
          Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 1,
            direction: "forward",
            kinds: ["longitude-hit"],
          }),
          Transit.findTransits({
            planet: "Jupiter",
            from: locatedMoment(),
            count: 1,
            direction: "forward",
            kinds: ["cusp-crossing"],
          }),
        ];
        for (const request of cases) {
          const failure = yield* Effect.flip(request);
          expect(failure._tag).toBe("TransitValidationError");
        }
      }),
    );
  });
});

describe("Transit search over Swiss Ephemeris", () => {
  it.layer(Layer.merge(astroLayer, Swisseph.SwissephLayer))((it) => {
    it.effect("resolves a real Jupiter ingress onto a boundary", () =>
      Effect.gen(function* () {
        const [event] = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 1,
          direction: "forward",
          kinds: ["sign-ingress"],
          maxYears: 6,
        });

        expect(event?.kind).toBe("sign-ingress");
        const longitude = Number(event?.longitude ?? Number.NaN);
        expect(distanceToBoundary(longitude)).toBeCloseTo(0, 1);
        expect(DateTime.toDate(event!.moment).getTime()).toBeGreaterThan(Date.parse(FROM_ISO));
        expect(event?.sign).toBe(Chart.Rashis.literals[Math.round(longitude / 30) % 12]);
      }),
    );
  });
});
