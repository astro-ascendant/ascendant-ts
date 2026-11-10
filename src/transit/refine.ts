/**
 * Root refinement as an explicit state machine. Refining narrows a bracket whose ends
 * differ in sign until it stops in one of four final states, each naming why:
 *
 * - `ExactRoot`: a bracket end or a probe landed exactly on zero.
 * - `Narrowed`: the bracket is no wider than the precision; the end nearer zero wins.
 * - `Settled`: two probes in a row fell within half the precision of each other.
 * - `IterationCapped`: the probe budget ran out; the end nearer zero wins.
 *
 * Each probe has an explicit step mode: a `Newton` step when the derivative at the
 * anchor is known and non-zero, a `Secant` step otherwise, and `Bisection` whenever
 * that step leaves the bracket or the bracket has not halved over the last two probes.
 *
 * The machine is pure. `refineValue` in `search.ts` samples the ephemeris at each probe
 * and feeds the observation back through `recordProbe`.
 */
import { Data, Function } from "effect";

import type { LongitudeSample } from "./search.js";
import { MINUTES_PER_DAY } from "./sweep.js";

/** The probe budget of one refinement. */
export const MAX_REFINE_ITERATIONS = 60;

export interface RefineBounds {
  readonly precisionMinutes: number;
  readonly maxIterations: number;
}

/** The two ends of the starting bracket, with the value of each. */
export interface RefineEnds {
  readonly low: LongitudeSample;
  readonly lowValue: number;
  readonly high: LongitudeSample;
  readonly highValue: number;
}

export type StepMode = "Newton" | "Secant" | "Bisection";

/** Where to sample next, and how that day was chosen. */
export interface Probe {
  readonly mode: StepMode;
  readonly day: number;
}

/** A probe after sampling: the sample taken at its day and the value there. */
export interface Observation {
  readonly probe: Probe;
  readonly sample: LongitudeSample;
  readonly value: number;
}

interface Stopped {
  readonly sample: LongitudeSample;
}

export type RefineState = Data.TaggedEnum<{
  Bracketing: {
    readonly lower: LongitudeSample;
    readonly lowValue: number;
    readonly upper: LongitudeSample;
    readonly upValue: number;
    /** The previous probe's day; `NaN` before the first probe. */
    readonly previousDay: number;
    /** The bracket width two probes ago, to tell a stalled bracket from a halving one. */
    readonly widthBefore: number;
    readonly iteration: number;
  };
  ExactRoot: Stopped;
  Narrowed: Stopped;
  Settled: Stopped;
  IterationCapped: Stopped;
}>;

export const RefineState = Data.taggedEnum<RefineState>();

type Bracketing = Data.TaggedEnum.Value<RefineState, "Bracketing">;

/** A final state's tag: why refinement stopped. */
export type RefineStop = Exclude<RefineState["_tag"], "Bracketing">;

function widthOf(state: Bracketing): number {
  return state.upper.julianDay - state.lower.julianDay;
}

function nearerZero(state: Bracketing): LongitudeSample {
  return Math.abs(state.lowValue) <= Math.abs(state.upValue) ? state.lower : state.upper;
}

/** Moves a `Bracketing` state to a final state once it is narrow enough or out of probes. */
function settle(state: Bracketing, bounds: RefineBounds): RefineState {
  if (widthOf(state) * MINUTES_PER_DAY <= bounds.precisionMinutes) {
    return RefineState.Narrowed({ sample: nearerZero(state) });
  }
  if (state.iteration >= bounds.maxIterations) {
    return RefineState.IterationCapped({ sample: nearerZero(state) });
  }
  return state;
}

/** The settled first state; a bracket end exactly on zero is the root straight away. */
export const startRefine = Function.dual<
  (bounds: RefineBounds) => (ends: RefineEnds) => RefineState,
  (ends: RefineEnds, bounds: RefineBounds) => RefineState
>(2, (ends: RefineEnds, bounds: RefineBounds): RefineState => {
  if (ends.lowValue === 0) return RefineState.ExactRoot({ sample: ends.low });
  if (ends.highValue === 0) return RefineState.ExactRoot({ sample: ends.high });
  return settle(
    RefineState.Bracketing({
      lower: ends.low,
      lowValue: ends.lowValue,
      upper: ends.high,
      upValue: ends.highValue,
      previousDay: Number.NaN,
      widthBefore: ends.high.julianDay - ends.low.julianDay,
      iteration: 0,
    }),
    bounds,
  );
});

/**
 * The next probe: a Newton step from the end nearer zero when `slopeOf` gives a
 * non-zero slope there, else a secant step across the bracket, falling back to
 * bisection when the step leaves the bracket or the bracket stalled (checked every
 * second probe).
 */
export const nextProbe = Function.dual<
  (slopeOf: ((sample: LongitudeSample) => number) | undefined) => (state: Bracketing) => Probe,
  (state: Bracketing, slopeOf: ((sample: LongitudeSample) => number) | undefined) => Probe
>(2, (state: Bracketing, slopeOf: ((sample: LongitudeSample) => number) | undefined): Probe => {
  const { lower, upper, lowValue, upValue } = state;
  const width = widthOf(state);
  const nearLower = Math.abs(lowValue) <= Math.abs(upValue);
  const anchor = nearLower ? lower : upper;
  const anchorValue = nearLower ? lowValue : upValue;
  const slope = slopeOf?.(anchor) ?? 0;
  const step: Probe =
    slope === 0
      ? { mode: "Secant", day: lower.julianDay + (width * lowValue) / (lowValue - upValue) }
      : { mode: "Newton", day: anchor.julianDay - anchorValue / slope };
  const stalled = state.iteration % 2 === 1 && width > state.widthBefore / 2;
  const inside = step.day > lower.julianDay && step.day < upper.julianDay;
  return inside && !stalled
    ? step
    : { mode: "Bisection", day: (lower.julianDay + upper.julianDay) / 2 };
});

/** Records a sampled probe: replaces the bracket end on its side of zero, then settles. */
export const recordProbe = Function.dual<
  (observation: Observation, bounds: RefineBounds) => (state: Bracketing) => RefineState,
  (state: Bracketing, observation: Observation, bounds: RefineBounds) => RefineState
>(3, (state: Bracketing, observation: Observation, bounds: RefineBounds): RefineState => {
  const { probe, sample, value } = observation;
  if (value === 0) return RefineState.ExactRoot({ sample });
  const settled =
    Math.abs(probe.day - state.previousDay) * MINUTES_PER_DAY <= bounds.precisionMinutes / 2;
  if (settled) return RefineState.Settled({ sample });
  const sameSideAsLower = Math.sign(value) === Math.sign(state.lowValue);
  return settle(
    RefineState.Bracketing({
      lower: sameSideAsLower ? sample : state.lower,
      lowValue: sameSideAsLower ? value : state.lowValue,
      upper: sameSideAsLower ? state.upper : sample,
      upValue: sameSideAsLower ? state.upValue : value,
      previousDay: probe.day,
      widthBefore: state.iteration % 2 === 1 ? widthOf(state) : state.widthBefore,
      iteration: state.iteration + 1,
    }),
    bounds,
  );
});
