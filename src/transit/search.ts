import { DateTime, Effect } from "effect";

import { Ayanamsa } from "../astro-params/model.js";
import { Longitude, Rashis } from "../chart/model.js";
import { JulianDay } from "../ephemeris/model.js";
import { Ephemeris } from "../ephemeris/service.js";
import { Zodiac } from "../utils/index.js";
import { EPS_BOUNDARY } from "../utils/position.js";
import { type Planets, type TransitDirection, type TransitKind } from "./model.js";

export const JD_UNIX_EPOCH = 2_440_587.5;
export const MS_PER_DAY = 86_400_000;
export const MINUTES_PER_DAY = 1440;
export const DEFAULT_MAX_YEARS = 30;
export const DEFAULT_PRECISION_MINUTES = 1;
const DAYS_PER_YEAR = 365.25;

export function normalize360(degrees: number): Longitude {
  return Longitude.make(((degrees % 360) + 360) % 360);
}

export function wrap180(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

export function millisFromJd(julianDay: number): number {
  return (julianDay - JD_UNIX_EPOCH) * MS_PER_DAY;
}

export function dateTimeFromJd(julianDay: number) {
  return DateTime.makeUnsafe(millisFromJd(julianDay));
}

export const COARSE_STEP_DAYS: Record<Planets, number> = {
  Sun: 1,
  Moon: 0.25,
  Mars: 2,
  Mercury: 1,
  Venus: 1,
  Jupiter: 5,
  Saturn: 7,
  Rahu: 3,
  Ketu: 3,
};

export interface LongitudeSample {
  readonly julianDay: number;
  readonly longitude: Longitude;
  readonly speed: number;
}

export interface FixedTarget {
  readonly kind: "longitude-hit" | "cusp-crossing";
  readonly longitude: Longitude;
}

export interface SearchOptions {
  readonly planet: Planets;
  readonly fromJulianDay: number;
  readonly direction: TransitDirection;
  readonly count: number;
  readonly includeIngress: boolean;
  readonly includeStations: boolean;
  readonly fixedTargets: ReadonlyArray<FixedTarget>;
  readonly ayanamsa: Ayanamsa;
  readonly stepDays?: number;
  readonly precisionMinutes?: number;
  readonly maxYears?: number;
}

export interface RawHit {
  readonly julianDay: number;
  readonly longitude: Longitude;
  readonly speed: number;
  readonly kind: TransitKind;
  readonly sign: Rashis;
}

export interface SearchOutcome {
  readonly hits: ReadonlyArray<RawHit>;
  readonly complete: boolean;
  readonly endJulianDay: number;
}

export const sampleAt = Effect.fn("astro-ascendant/transit/sampleAt")(function* (
  julianDay: number,
  planet: Planets,
  ayanamsa: Ayanamsa,
) {
  const ephemeris = yield* Ephemeris;
  const julianDayValue = yield* JulianDay.makeEffect(julianDay);
  const position = yield* ephemeris.calculatePosition(julianDayValue, planet, ayanamsa);
  return {
    julianDay,
    longitude: position.longitude,
    speed: position.longitudeSpeed,
  } satisfies LongitudeSample;
});

function enteredSign(
  boundary: number,
  direction: TransitDirection,
  longitudeRising: boolean,
): Rashis {
  const index = Math.round(normalize360(boundary) / 30) % 12;
  const rising = direction === "forward" ? longitudeRising : !longitudeRising;
  return rising ? Zodiac.signAt(index) : Zodiac.signAt(index - 1);
}

function isBoundaryTarget(target: number): boolean {
  return normalize360(target) % 30 === 0;
}

function crossedBoundary(
  earlier: number,
  later: number,
): { boundary: number; rising: boolean } | null {
  if (
    Zodiac.indexOfLongitude(normalize360(earlier)) === Zodiac.indexOfLongitude(normalize360(later))
  )
    return null;
  const low = Math.min(earlier, later);
  const high = Math.max(earlier, later);
  if (high - low > 180) return { boundary: 0, rising: earlier > later };
  const boundary = (Math.ceil(low / 30 - EPS_BOUNDARY) * 30) % 360;
  if (boundary > high + EPS_BOUNDARY) return null;
  return { boundary, rising: later > earlier };
}

const refineValue = Effect.fn("astro-ascendant/transit/refineValue")(function* (
  low: LongitudeSample,
  high: LongitudeSample,
  planet: Planets,
  ayanamsa: Ayanamsa,
  precisionMinutes: number,
  valueOf: (sample: LongitudeSample) => number,
) {
  let lower = low;
  let upper = high;
  let lowValue = valueOf(lower);
  for (let iteration = 0; iteration < 60; iteration += 1) {
    if ((upper.julianDay - lower.julianDay) * MINUTES_PER_DAY <= precisionMinutes) break;
    const midDay = (lower.julianDay + upper.julianDay) / 2;
    const mid = yield* sampleAt(midDay, planet, ayanamsa);
    const midValue = valueOf(mid);
    if (Math.sign(midValue) === Math.sign(lowValue) && midValue !== 0) {
      lower = mid;
      lowValue = midValue;
    } else {
      upper = mid;
    }
  }
  return yield* sampleAt((lower.julianDay + upper.julianDay) / 2, planet, ayanamsa);
});

const refineLongitude = Effect.fn("astro-ascendant/transit/refineLongitude")(function* (
  low: LongitudeSample,
  high: LongitudeSample,
  planet: Planets,
  ayanamsa: Ayanamsa,
  precisionMinutes: number,
  target: number,
) {
  return yield* refineValue(low, high, planet, ayanamsa, precisionMinutes, (sample) =>
    wrap180(sample.longitude - target),
  );
});

const refineStation = Effect.fn("astro-ascendant/transit/refineStation")(function* (
  low: LongitudeSample,
  high: LongitudeSample,
  planet: Planets,
  ayanamsa: Ayanamsa,
  precisionMinutes: number,
) {
  return yield* refineValue(
    low,
    high,
    planet,
    ayanamsa,
    precisionMinutes,
    (sample) => sample.speed,
  );
});

interface RefinedHit {
  readonly sample: LongitudeSample;
  readonly kind: TransitKind;
  readonly sign: Rashis;
}

function pushDedup(hits: Array<RawHit>, hit: RefinedHit, precision: number): void {
  const previous = hits[hits.length - 1];
  if (
    previous !== undefined &&
    previous.kind === hit.kind &&
    Math.abs(hit.sample.julianDay - previous.julianDay) * MINUTES_PER_DAY < precision
  ) {
    return;
  }
  hits.push({
    julianDay: hit.sample.julianDay,
    longitude: hit.sample.longitude,
    speed: hit.sample.speed,
    kind: hit.kind,
    sign: hit.sign,
  });
}

const ingressHit = Effect.fn("astro-ascendant/transit/ingressHit")(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
  precision: number,
) {
  const crossed = crossedBoundary(earlier.longitude, later.longitude);
  if (crossed === null) return null;
  const refined = yield* refineLongitude(
    earlier,
    later,
    options.planet,
    options.ayanamsa,
    precision,
    crossed.boundary,
  );
  const hit: RefinedHit = {
    sample: refined,
    kind: "sign-ingress",
    sign: enteredSign(crossed.boundary, options.direction, crossed.rising),
  };
  return hit;
});

const fixedTargetHit = Effect.fn("astro-ascendant/transit/fixedTargetHit")(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
  precision: number,
  target: FixedTarget,
) {
  const early = wrap180(earlier.longitude - target.longitude);
  const late = wrap180(later.longitude - target.longitude);
  if (early !== 0 && late !== 0 && Math.sign(early) === Math.sign(late)) return null;
  const refined = yield* refineLongitude(
    earlier,
    later,
    options.planet,
    options.ayanamsa,
    precision,
    target.longitude,
  );
  const rising = wrap180(later.longitude - earlier.longitude) > 0;
  const hit: RefinedHit = {
    sample: refined,
    kind: target.kind,
    sign: isBoundaryTarget(target.longitude)
      ? enteredSign(target.longitude, options.direction, rising)
      : Zodiac.signAt(Zodiac.indexOfLongitude(normalize360(refined.longitude))),
  };
  return hit;
});

const stationHit = Effect.fn("astro-ascendant/transit/stationHit")(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
  precision: number,
) {
  const earlySpeed = earlier.speed;
  const lateSpeed = later.speed;
  if (earlySpeed !== 0 && lateSpeed !== 0 && earlySpeed < 0 === lateSpeed < 0) return null;
  const refined = yield* refineStation(earlier, later, options.planet, options.ayanamsa, precision);
  const hit: RefinedHit = {
    sample: refined,
    kind: "station",
    sign: Zodiac.signAt(Zodiac.indexOfLongitude(normalize360(refined.longitude))),
  };
  return hit;
});

const refineStep = Effect.fn("astro-ascendant/transit/refineStep")(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
) {
  const precision = options.precisionMinutes ?? DEFAULT_PRECISION_MINUTES;
  const candidates: Array<RefinedHit> = [];

  if (options.includeIngress) {
    const hit = yield* ingressHit(earlier, later, options, precision);
    if (hit !== null) candidates.push(hit);
  }

  for (const target of options.fixedTargets) {
    const hit = yield* fixedTargetHit(earlier, later, options, precision, target);
    if (hit !== null) candidates.push(hit);
  }

  if (options.includeStations) {
    const hit = yield* stationHit(earlier, later, options, precision);
    if (hit !== null) candidates.push(hit);
  }

  const hits: Array<RawHit> = [];
  for (const candidate of candidates) {
    pushDedup(hits, candidate, precision);
  }

  return hits.toSorted((first, second) =>
    options.direction === "forward"
      ? first.julianDay - second.julianDay
      : second.julianDay - first.julianDay,
  );
});

const advanceCursor = Effect.fn("astro-ascendant/transit/advanceCursor")(function* (
  cursor: number,
  previous: LongitudeSample,
  step: number,
  forward: boolean,
  options: SearchOptions,
) {
  const next = yield* sampleAt(cursor + step, options.planet, options.ayanamsa);
  const earlier = forward ? previous : next;
  const later = forward ? next : previous;
  const stepHits = yield* refineStep(earlier, later, options);
  return { next, stepHits } as const;
});

function appendStepHits(
  hits: Array<RawHit>,
  stepHits: ReadonlyArray<RawHit>,
  precision: number,
  count: number,
): void {
  for (const hit of stepHits) {
    if (hits.length >= count) break;
    const last = hits[hits.length - 1];
    if (
      last !== undefined &&
      last.kind === hit.kind &&
      Math.abs(hit.julianDay - last.julianDay) * MINUTES_PER_DAY < precision
    ) {
      continue;
    }
    hits.push(hit);
  }
}

/** Every zero-crossing counts, so retrograde triples yield three hits in time order. */
export const searchRawHits = Effect.fn("astro-ascendant/transit/searchRawHits")(function* (
  options: SearchOptions,
) {
  const forward = options.direction === "forward";
  const sign = forward ? 1 : -1;
  const step = (options.stepDays ?? COARSE_STEP_DAYS[options.planet]) * sign;
  const spanDays = (options.maxYears ?? DEFAULT_MAX_YEARS) * DAYS_PER_YEAR * sign;
  const limit = options.fromJulianDay + spanDays;
  const maxIterations = Math.ceil(Math.abs(spanDays / step)) + 2;
  const precision = options.precisionMinutes ?? DEFAULT_PRECISION_MINUTES;

  const hits: Array<RawHit> = [];
  let cursor = options.fromJulianDay;
  let previous = yield* sampleAt(cursor, options.planet, options.ayanamsa);
  let complete = false;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (hits.length >= options.count) {
      complete = true;
      break;
    }
    if (forward ? cursor >= limit : cursor <= limit) break;
    const { next, stepHits } = yield* advanceCursor(cursor, previous, step, forward, options);
    appendStepHits(hits, stepHits, precision, options.count);
    previous = next;
    cursor += step;
  }

  if (hits.length >= options.count) complete = true;
  return { hits, complete, endJulianDay: cursor } satisfies SearchOutcome;
});
