import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import * as AstroParams from "../src/astro-params/index.js";
import { Ayanamsa, HouseSystem } from "../src/astro-params/model.js";
import * as Chart from "../src/chart/index.js";
import {
  CelestialBody,
  type HouseData,
  JulianDay,
  type PlanetaryPosition,
} from "../src/ephemeris/model.js";
import { Ephemeris } from "../src/ephemeris/service.js";
import * as Swisseph from "../src/swisseph/index.js";
import * as Transit from "../src/transit/index.js";
import { planetaryPosition, wholeSignHouses } from "./support/ephemeris.js";
import { fixtures } from "./support/fixtures.js";

const DAY_MS = 86_400_000;
const FROM_ISO = "2026-01-01T00:00:00.000Z";
const JD0 = Date.parse(FROM_ISO) / DAY_MS + Transit.JD_UNIX_EPOCH;

function locatedMoment(): Chart.LocatedMoment {
  return fixtures.locatedMoment(FROM_ISO);
}

interface MotionSegment {
  readonly untilJulianDay: number;
  readonly rate: number;
}

function motionAt(
  base: number,
  jd0: number,
  segments: ReadonlyArray<MotionSegment>,
  julianDay: number,
): { longitude: number; speed: number } {
  let cursor = jd0;
  let longitude = base;
  for (const segment of segments) {
    if (julianDay <= segment.untilJulianDay) {
      return { longitude: longitude + segment.rate * (julianDay - cursor), speed: segment.rate };
    }
    longitude += segment.rate * (segment.untilJulianDay - cursor);
    cursor = segment.untilJulianDay;
  }
  const last = segments[segments.length - 1]!;
  return { longitude: longitude + last.rate * (julianDay - cursor), speed: last.rate };
}

function fakeEphemerisLayer(
  base: number,
  segments: ReadonlyArray<MotionSegment>,
  cusps: ReadonlyArray<number> = [0, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
) {
  const dateToJulianDay = (date: DateTimeType) =>
    Effect.succeed(
      JulianDay.make(DateTime.toDate(date).getTime() / DAY_MS + Transit.JD_UNIX_EPOCH),
    );
  const calculatePosition = (
    julianDay: JulianDay,
    _body: CelestialBody,
    _ayanamsa: Ayanamsa,
  ): Effect.Effect<PlanetaryPosition, never> => {
    const { longitude, speed } = motionAt(base, JD0, segments, Number(julianDay));
    return Effect.succeed(planetaryPosition(Transit.normalize360(longitude), speed));
  };
  const calculateHouses = (
    _julianDay: JulianDay,
    _latitude: number,
    _longitude: number,
    houseSystem: HouseSystem,
    _ayanamsa: Ayanamsa,
  ): Effect.Effect<HouseData, never> => Effect.succeed(wholeSignHouses(cusps, houseSystem));
  return Layer.succeed(
    Ephemeris,
    Ephemeris.of({ dateToJulianDay, calculatePosition, calculateHouses }),
  );
}

const astroLayer = AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" });
const linearLayer = (base: number, rate: number) =>
  fakeEphemerisLayer(base, [{ untilJulianDay: Number.POSITIVE_INFINITY, rate }]);
const jupiterLayer = linearLayer(68.4, 0.14);

function minutesBetween(a: DateTimeType, b: DateTimeType): number {
  return Math.abs(DateTime.toDate(a).getTime() - DateTime.toDate(b).getTime()) / 60_000;
}

function distanceToBoundary(longitude: number): number {
  const remainder = Transit.normalize360(longitude) % 30;
  return Math.min(remainder, 30 - remainder);
}

function expectedMoment(daysAfterJd0: number) {
  return DateTime.makeUnsafe(Date.parse(FROM_ISO) + daysAfterJd0 * DAY_MS);
}

describe("Transit angle helpers", () => {
  it("normalizes and wraps circle angles", () => {
    expect(Transit.normalize360(360)).toBe(0);
    expect(Transit.normalize360(-0.5)).toBeCloseTo(359.5, 10);
    expect(Transit.wrap180(359.9)).toBeCloseTo(-0.1, 10);
    expect(Transit.wrap180(181)).toBeCloseTo(-179, 10);
    expect(Transit.millisFromJd(Transit.JD_UNIX_EPOCH)).toBe(0);
  });
});

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
          school: "Ascendant",
          method: "transit-sample-bisect",
          version: 1,
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

  it.layer(
    Layer.merge(
      astroLayer,
      fakeEphemerisLayer(80, [
        { untilJulianDay: JD0 + 10, rate: 0.5 },
        { untilJulianDay: JD0 + 30, rate: -0.5 },
        { untilJulianDay: Number.POSITIVE_INFINITY, rate: 0.5 },
      ]),
    ),
  )((it) => {
    it.effect("counts every retrograde crossing in time order", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 3,
          direction: "forward",
          kinds: ["longitude-hit"],
          targetLongitude: Chart.Longitude.make(84),
          maxYears: 1,
        });

        expect(events).toHaveLength(3);
        for (const event of events) {
          expect(Number(event.longitude)).toBeCloseTo(84, 2);
        }
        const times = events.map((event) => DateTime.toDate(event.moment).getTime());
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        expect(minutesBetween(events[0]!.moment, expectedMoment(8))).toBeLessThan(3);
        expect(minutesBetween(events[1]!.moment, expectedMoment(12))).toBeLessThan(3);
        expect(minutesBetween(events[2]!.moment, expectedMoment(48))).toBeLessThan(3);
        expect(events[1]!.is_retrograde).toBe(true);
      }),
    );

    it.effect("finds stations where speed changes sign", () =>
      Effect.gen(function* () {
        const events = yield* Transit.findTransits({
          planet: "Jupiter",
          from: locatedMoment(),
          count: 2,
          direction: "forward",
          kinds: ["station"],
          maxYears: 1,
        });

        expect(events).toHaveLength(2);
        expect(events.every((event) => event.kind === "station")).toBe(true);
        expect(minutesBetween(events[0]!.moment, expectedMoment(10))).toBeLessThan(3);
        expect(minutesBetween(events[1]!.moment, expectedMoment(30))).toBeLessThan(3);
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
