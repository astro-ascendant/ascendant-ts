import { DateTime, Effect } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import * as AstroParams from "../../src/astro-params/index.js";
import * as Chart from "../../src/chart/index.js";
import { julianDayOfDateTime } from "../../src/ephemeris/model.js";
import { ephemerisTestLayer, planetaryPosition } from "./ephemeris.js";
import { fixtures } from "./fixtures.js";

const DAY_MS = 86_400_000;
const FROM_ISO = "2026-01-01T00:00:00.000Z";
const JD0 = julianDayOfDateTime(DateTime.makeUnsafe(FROM_ISO));

function locatedMoment(): Chart.LocatedMoment {
  return fixtures.locatedMoment(FROM_ISO);
}

export interface MotionSegment {
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

function fakeEphemerisLayer(base: number, segments: ReadonlyArray<MotionSegment>) {
  return ephemerisTestLayer({
    position: (julianDay) => {
      const { longitude, speed } = motionAt(base, JD0, segments, Number(julianDay));
      return Effect.succeed(planetaryPosition(longitude, speed));
    },
  });
}

const astroLayer = AstroParams.layer({ ayanamsa: "Lahiri", houseSystem: "WholeSign" });
const linearLayer = (base: number, rate: number) =>
  fakeEphemerisLayer(base, [{ untilJulianDay: Number.POSITIVE_INFINITY, rate }]);
const jupiterLayer = linearLayer(68.4, 0.14);

// Smooth Mars-like motion inside the library's physical limits (speed under 1 degree a day,
// acceleration under 0.02): longitude 80 + 0.2 t + 15.2 sin(2 pi t / 200). It turns retrograde
// at the first station and direct again at the second, about 72 days later.
const MARS_PERIOD_DAYS = 200;
const MARS_SPEED_SWING = 15.2 * ((2 * Math.PI) / MARS_PERIOD_DAYS);
const MARS_MEAN_SPEED = 0.2;
const marsLongitude = (t: number) =>
  80 + MARS_MEAN_SPEED * t + 15.2 * Math.sin((2 * Math.PI * t) / MARS_PERIOD_DAYS);
const marsSpeed = (t: number) =>
  MARS_MEAN_SPEED + MARS_SPEED_SWING * Math.cos((2 * Math.PI * t) / MARS_PERIOD_DAYS);
const STATION_PHASE = Math.acos(-MARS_MEAN_SPEED / MARS_SPEED_SWING);
const FIRST_STATION = (STATION_PHASE * MARS_PERIOD_DAYS) / (2 * Math.PI);
const SECOND_STATION = ((2 * Math.PI - STATION_PHASE) * MARS_PERIOD_DAYS) / (2 * Math.PI);
const marsLayer = ephemerisTestLayer({
  position: (julianDay) => {
    const t = Number(julianDay) - JD0;
    return Effect.succeed(planetaryPosition(marsLongitude(t), marsSpeed(t)));
  },
});

/** Days after JD0, over one year, where a function changes sign; found by a dense scan, not by the search under test. */
function rootsOf(f: (t: number) => number): ReadonlyArray<number> {
  const roots: Array<number> = [];
  const dt = 0.0005;
  let previous = f(0);
  for (let t = dt; t <= 365; t += dt) {
    const value = f(t);
    if (Math.sign(value) !== Math.sign(previous)) roots.push(t - dt / 2);
    previous = value;
  }
  return roots;
}

function minutesBetween(a: DateTimeType, b: DateTimeType): number {
  return Math.abs(DateTime.toDate(a).getTime() - DateTime.toDate(b).getTime()) / 60_000;
}

function distanceToBoundary(longitude: number): number {
  const remainder = Chart.Longitude.normalize(longitude) % 30;
  return Math.min(remainder, 30 - remainder);
}

function expectedMoment(daysAfterJd0: number) {
  return DateTime.makeUnsafe(Date.parse(FROM_ISO) + daysAfterJd0 * DAY_MS);
}

/** Shared fixtures for the transit tests: fake ephemeris motion and expected-time helpers. */
export const transitFixtures = {
  DAY_MS,
  FROM_ISO,
  JD0,
  locatedMoment,
  motionAt,
  fakeEphemerisLayer,
  astroLayer,
  linearLayer,
  jupiterLayer,
  MARS_PERIOD_DAYS,
  MARS_SPEED_SWING,
  MARS_MEAN_SPEED,
  marsLongitude,
  marsSpeed,
  STATION_PHASE,
  FIRST_STATION,
  SECOND_STATION,
  marsLayer,
  rootsOf,
  minutesBetween,
  distanceToBoundary,
  expectedMoment,
};
