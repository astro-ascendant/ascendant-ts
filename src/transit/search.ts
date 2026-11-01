import { Effect } from "effect";

import { Ayanamsa } from "../astro-params/model.js";
import { Longitude, type Rashis } from "../chart/model.js";
import { JulianDay } from "../ephemeris/model.js";
import { Ephemeris } from "../ephemeris/service.js";
import { Zodiac } from "../utils/index.js";
import { EPS_BOUNDARY } from "../utils/position.js";
import { TransitValidationError } from "./error.js";
import { type Planets, type TransitDirection, type TransitKind } from "./model.js";

export const MINUTES_PER_DAY = 1440;
export const DEFAULT_MAX_YEARS = 30;
export const DEFAULT_PRECISION_MINUTES = 1;
const DAYS_PER_YEAR = 365.25;

/**
 * Physical limits that let the sweep leap instead of stepping at a fixed rate. Both are
 * the largest values seen sampling 1900-2100 with the Swiss Ephemeris, plus a margin of
 * about 30%:
 *
 * - `maxSpeed`: a ceiling on |longitude speed|, in degrees a day.
 * - `maxAcceleration`: a ceiling on |change of longitude speed|, in degrees a day squared,
 *   taken from second differences of longitude (the reported speeds have rare jumps).
 *
 * From a sample with speed `v`, a graha cannot have closed a gap `d` before `L` days have
 * passed if `d` exceeds `v*L + a*L^2/2` (and `maxSpeed*L`), and its speed cannot reach
 * zero before `|v| / a` days. So no crossing and no station can fall inside a leap.
 *
 * `stationGapDays` is a quarter of the shortest time between two consecutive stations
 * (Mercury's retrograde lasts about 21 days, Venus's 40, Mars's 60, Jupiter's 120,
 * Saturn's 138). A station search never leaps less than that: one station inside a leap
 * shows as a speed sign change, and a pair cannot fit. Grahas that never station use 0.
 */
export const MOTION_LIMITS: Record<
  Planets,
  {
    readonly maxSpeed: number;
    readonly maxAcceleration: number;
    readonly stationGapDays: number;
  }
> = {
  Sun: { maxSpeed: 1.3, maxAcceleration: 0.001, stationGapDays: 0 },
  Moon: { maxSpeed: 20, maxAcceleration: 0.7, stationGapDays: 0 },
  Mars: { maxSpeed: 1, maxAcceleration: 0.02, stationGapDays: 15 },
  Mercury: { maxSpeed: 2.8, maxAcceleration: 0.26, stationGapDays: 5 },
  Venus: { maxSpeed: 1.6, maxAcceleration: 0.055, stationGapDays: 10 },
  Jupiter: { maxSpeed: 0.31, maxAcceleration: 0.01, stationGapDays: 30 },
  Saturn: { maxSpeed: 0.17, maxAcceleration: 0.011, stationGapDays: 34 },
  Rahu: { maxSpeed: 0.07, maxAcceleration: 0.001, stationGapDays: 0 },
  Ketu: { maxSpeed: 0.07, maxAcceleration: 0.001, stationGapDays: 0 },
};

/** The shortest leap, so a graha sitting on a target does not shrink the step to nothing. */
const MIN_LEAP_DAYS = 1 / 24;
/** The longest leap, so a slow graha far from every target is still sampled now and then. */
const MAX_LEAP_DAYS = 400;
/**
 * A leap never covers more than this many degrees at the speed ceiling. Crossing tests
 * compare the signed difference to a target across a step, which aliases beyond a
 * half circle of motion.
 */
const MAX_LEAP_DEGREES = 170;

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

export const sampleAt = Effect.fnUntraced(function* (
  julianDay: number,
  planet: Planets,
  ayanamsa: Ayanamsa,
) {
  const ephemeris = yield* Ephemeris;
  // A search window can run past the supported Julian Day range (0 to 1e7); that is a
  // request problem, so it fails as a `TransitValidationError` and not a bare schema issue.
  const julianDayValue = yield* JulianDay.makeEffect(julianDay).pipe(
    Effect.mapError((cause) =>
      TransitValidationError.make({
        message: "The search window leaves the supported Julian Day range",
        cause,
      }),
    ),
  );
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
  const index = Math.round(Longitude.normalize(boundary) / 30) % 12;
  const rising = direction === "forward" ? longitudeRising : !longitudeRising;
  return rising ? Zodiac.signAt(index) : Zodiac.signAt(index - 1);
}

function isBoundaryTarget(target: number): boolean {
  return Longitude.normalize(target) % 30 === 0;
}

function crossedBoundary(
  earlier: number,
  later: number,
): { boundary: number; rising: boolean } | null {
  if (
    Zodiac.indexOfLongitude(Longitude.normalize(earlier)) ===
    Zodiac.indexOfLongitude(Longitude.normalize(later))
  )
    return null;
  const low = Math.min(earlier, later);
  const high = Math.max(earlier, later);
  if (high - low > 180) return { boundary: 0, rising: earlier > later };
  const boundary = (Math.ceil(low / 30 - EPS_BOUNDARY) * 30) % 360;
  if (boundary > high + EPS_BOUNDARY) return null;
  return { boundary, rising: later > earlier };
}

/**
 * Finds the zero of `valueOf` inside a bracket whose ends differ in sign, to within
 * `precisionMinutes`. Each step is a Newton step when the derivative is known (a
 * longitude's derivative is its speed) and a secant step otherwise, falling back to
 * bisection whenever the step leaves the bracket or the bracket stops halving. That
 * takes about four ephemeris calls where bisecting a day-wide bracket takes eleven.
 */
const refineValue = Effect.fnUntraced(function* (
  low: LongitudeSample,
  high: LongitudeSample,
  planet: Planets,
  ayanamsa: Ayanamsa,
  precisionMinutes: number,
  valueOf: (sample: LongitudeSample) => number,
  derivativeOf?: (sample: LongitudeSample) => number,
) {
  let lower = low;
  let upper = high;
  let lowValue = valueOf(lower);
  let upValue = valueOf(upper);
  if (lowValue === 0) return lower;
  if (upValue === 0) return upper;

  let previousDay = Number.NaN;
  let widthBefore = upper.julianDay - lower.julianDay;
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const width = upper.julianDay - lower.julianDay;
    if (width * MINUTES_PER_DAY <= precisionMinutes) break;

    const nearLower = Math.abs(lowValue) <= Math.abs(upValue);
    const anchor = nearLower ? lower : upper;
    const anchorValue = nearLower ? lowValue : upValue;
    const slope = derivativeOf?.(anchor) ?? 0;
    let day =
      slope === 0
        ? lower.julianDay + (width * lowValue) / (lowValue - upValue)
        : anchor.julianDay - anchorValue / slope;
    // Bisect when the step leaves the bracket, or the bracket has not halved in two steps.
    const stalled = iteration % 2 === 1 && width > widthBefore / 2;
    if (!(day > lower.julianDay && day < upper.julianDay) || stalled) {
      day = (lower.julianDay + upper.julianDay) / 2;
    }
    if (iteration % 2 === 1) widthBefore = width;

    const sample = yield* sampleAt(day, planet, ayanamsa);
    const value = valueOf(sample);
    if (value === 0) return sample;
    const settled = Math.abs(day - previousDay) * MINUTES_PER_DAY <= precisionMinutes / 2;
    previousDay = day;
    if (Math.sign(value) === Math.sign(lowValue)) {
      lower = sample;
      lowValue = value;
    } else {
      upper = sample;
      upValue = value;
    }
    if (settled) return sample;
  }
  return Math.abs(lowValue) <= Math.abs(upValue) ? lower : upper;
});

const refineLongitude = Effect.fnUntraced(function* (
  low: LongitudeSample,
  high: LongitudeSample,
  planet: Planets,
  ayanamsa: Ayanamsa,
  precisionMinutes: number,
  target: number,
) {
  return yield* refineValue(
    low,
    high,
    planet,
    ayanamsa,
    precisionMinutes,
    (sample) => Zodiac.wrapSigned(sample.longitude - target),
    (sample) => sample.speed,
  );
});

const refineStation = Effect.fnUntraced(function* (
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
  /** Overrides the sampled speed when the speed at the hit itself is not meaningful. */
  readonly speed?: number;
  readonly kind: TransitKind;
  readonly sign: Rashis;
}

/**
 * Two hits of one kind are the same crossing when they are within one
 * refinement bracket. A bracket can be exactly `precision` wide, so equality
 * counts (with float slack): a sample landing on the target is refined from
 * both neighbouring steps, and the two midpoints sit one bracket apart.
 */
function isSameCrossing(previous: RawHit, julianDay: number, precision: number): boolean {
  return Math.abs(julianDay - previous.julianDay) * MINUTES_PER_DAY <= precision * (1 + 1e-9);
}

function pushDedup(hits: Array<RawHit>, hit: RefinedHit, precision: number): void {
  const previous = hits[hits.length - 1];
  if (
    previous !== undefined &&
    previous.kind === hit.kind &&
    isSameCrossing(previous, hit.sample.julianDay, precision)
  ) {
    return;
  }
  hits.push({
    julianDay: hit.sample.julianDay,
    longitude: hit.sample.longitude,
    speed: hit.speed ?? hit.sample.speed,
    kind: hit.kind,
    sign: hit.sign,
  });
}

const ingressHit = Effect.fnUntraced(function* (
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

const fixedTargetHit = Effect.fnUntraced(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
  precision: number,
  target: FixedTarget,
) {
  const early = Zodiac.wrapSigned(earlier.longitude - target.longitude);
  const late = Zodiac.wrapSigned(later.longitude - target.longitude);
  if (early !== 0 && late !== 0 && Math.sign(early) === Math.sign(late)) return null;
  // wrapSigned also flips sign at the point opposite the target; that flip is not a crossing.
  if (Math.abs(late - early) > 180) return null;
  const refined = yield* refineLongitude(
    earlier,
    later,
    options.planet,
    options.ayanamsa,
    precision,
    target.longitude,
  );
  const rising = Zodiac.wrapSigned(later.longitude - earlier.longitude) > 0;
  const hit: RefinedHit = {
    sample: refined,
    kind: target.kind,
    sign: isBoundaryTarget(target.longitude)
      ? enteredSign(target.longitude, options.direction, rising)
      : Zodiac.signAt(Zodiac.indexOfLongitude(Longitude.normalize(refined.longitude))),
  };
  return hit;
});

const stationHit = Effect.fnUntraced(function* (
  earlier: LongitudeSample,
  later: LongitudeSample,
  options: SearchOptions,
  precision: number,
) {
  const earlySpeed = earlier.speed;
  const lateSpeed = later.speed;
  if (earlySpeed !== 0 && lateSpeed !== 0 && earlySpeed < 0 === lateSpeed < 0) return null;
  const refined = yield* refineStation(earlier, later, options.planet, options.ayanamsa, precision);
  // The speed at a station is nearly zero, so its sign is noise. Report the
  // motion just after the station in time, taken from the later bracket end.
  const after = earlier.julianDay > later.julianDay ? earlier : later;
  const hit: RefinedHit = {
    sample: refined,
    speed: after.speed,
    kind: "station",
    sign: Zodiac.signAt(Zodiac.indexOfLongitude(Longitude.normalize(refined.longitude))),
  };
  return hit;
});

const refineStep = Effect.fnUntraced(function* (
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

const advanceCursor = Effect.fnUntraced(function* (
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

/**
 * `fromJulianDay` is inclusive: a graha starting exactly on a sign boundary has an
 * ingress at that instant. Stepping alone misses it when the graha moves away from the
 * boundary into the sign whose index the boundary carries, because both step ends then
 * share one sign; every other direction of motion is caught by the first step.
 */
function startingIngress(start: LongitudeSample, options: SearchOptions): RawHit | null {
  if (!options.includeIngress || !isBoundaryTarget(start.longitude)) return null;
  const rising = start.speed >= 0;
  if (options.direction === "forward" ? !rising : rising) return null;
  return {
    julianDay: start.julianDay,
    longitude: start.longitude,
    speed: start.speed,
    kind: "sign-ingress",
    sign: enteredSign(start.longitude, options.direction, rising),
  };
}

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
      isSameCrossing(last, hit.julianDay, precision)
    ) {
      continue;
    }
    hits.push(hit);
  }
}

/**
 * The earliest the graha could reach a point `gap` degrees away, given the signed speed
 * `closing` toward it (negative when moving away): the root of
 * `gap = closing*L + maxAcceleration*L^2/2`, never less than `gap / maxSpeed`.
 */
function leapToReach(gap: number, closing: number, planet: Planets): number {
  const { maxSpeed, maxAcceleration } = MOTION_LIMITS[planet];
  const accelerated =
    (-closing + Math.sqrt(closing * closing + 2 * maxAcceleration * gap)) / maxAcceleration;
  return Math.max(accelerated, gap / maxSpeed);
}

/**
 * How far the sweep can safely advance from a sample: the earliest the graha could reach
 * a sign boundary or target, or its speed could reach zero when stations are wanted.
 * Nothing can happen inside the leap.
 */
function leapDays(sample: LongitudeSample, options: SearchOptions): number {
  let days = Math.min(MAX_LEAP_DAYS, MAX_LEAP_DEGREES / MOTION_LIMITS[options.planet].maxSpeed);
  if (options.includeIngress) {
    const remainder = Longitude.normalize(sample.longitude) % 30;
    days = Math.min(
      days,
      leapToReach(30 - remainder, sample.speed, options.planet),
      leapToReach(remainder, -sample.speed, options.planet),
    );
  }
  for (const target of options.fixedTargets) {
    // The target lies ahead by `ahead` degrees going up the circle and `360 - ahead` going down.
    const ahead = Longitude.normalize(target.longitude - sample.longitude);
    days = Math.min(
      days,
      leapToReach(ahead, sample.speed, options.planet),
      leapToReach(360 - ahead, -sample.speed, options.planet),
    );
  }
  if (options.includeStations) {
    const { maxAcceleration, stationGapDays } = MOTION_LIMITS[options.planet];
    days = Math.min(days, Math.max(Math.abs(sample.speed) / maxAcceleration, stationGapDays));
  }
  return Math.max(days, MIN_LEAP_DAYS);
}

/** Every zero-crossing counts, so retrograde triples yield three hits in time order. */
export const searchRawHits = Effect.fnUntraced(function* (options: SearchOptions) {
  const forward = options.direction === "forward";
  const sign = forward ? 1 : -1;
  const spanDays = (options.maxYears ?? DEFAULT_MAX_YEARS) * DAYS_PER_YEAR * sign;
  const limit = options.fromJulianDay + spanDays;
  const maxIterations = Math.ceil(Math.abs(spanDays) / MIN_LEAP_DAYS) + 2;
  const precision = options.precisionMinutes ?? DEFAULT_PRECISION_MINUTES;

  const hits: Array<RawHit> = [];
  let cursor = options.fromJulianDay;
  let previous = yield* sampleAt(cursor, options.planet, options.ayanamsa);
  let complete = false;

  const startHit = startingIngress(previous, options);
  if (startHit !== null) hits.push(startHit);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (hits.length >= options.count) {
      complete = true;
      break;
    }
    if (forward ? cursor >= limit : cursor <= limit) break;
    // Clamp the last step so no hit lies beyond the requested window.
    const leap = leapDays(previous, options) * sign;
    const stride = forward ? Math.min(leap, limit - cursor) : Math.max(leap, limit - cursor);
    const { next, stepHits } = yield* advanceCursor(cursor, previous, stride, forward, options);
    appendStepHits(hits, stepHits, precision, options.count);
    previous = next;
    cursor += stride;
  }

  if (hits.length >= options.count) complete = true;
  return { hits, complete, endJulianDay: cursor } satisfies SearchOutcome;
});
