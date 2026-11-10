/**
 * The transit sweep as an explicit state machine. A sweep is `Sweeping` until it stops
 * in one of three final states, and each final state names why:
 *
 * - `Complete`: the requested count of hits was found.
 * - `WindowExhausted`: the cursor reached the end of the search window first.
 * - `IterationCapped`: the step budget ran out first (a guard; leaps make it unreachable
 *   in practice).
 *
 * The machine is pure. `searchRawHits` samples the ephemeris and feeds each step back
 * through `recordStep`; every transition settles straight away, checking the stop
 * conditions in the order above.
 */
import { Data, Function } from "effect";

import type { LongitudeSample, RawHit } from "./search.js";

export const MINUTES_PER_DAY = 1440;

/** The fixed limits of one sweep, decided before it starts. */
export interface SweepBounds {
  readonly forward: boolean;
  /** The Julian Day the window ends at. */
  readonly limit: number;
  readonly count: number;
  readonly precisionMinutes: number;
  readonly maxIterations: number;
}

/** One sampled step: the new sample, the signed days stepped, and the hits refined inside it. */
export interface SweepStep {
  readonly next: LongitudeSample;
  readonly stride: number;
  readonly stepHits: ReadonlyArray<RawHit>;
}

interface Stopped {
  readonly cursor: number;
  readonly hits: ReadonlyArray<RawHit>;
}

export type SweepState = Data.TaggedEnum<{
  Sweeping: {
    readonly cursor: number;
    readonly previous: LongitudeSample;
    readonly hits: ReadonlyArray<RawHit>;
    readonly iteration: number;
  };
  Complete: Stopped;
  WindowExhausted: Stopped;
  IterationCapped: Stopped;
}>;

export const SweepState = Data.taggedEnum<SweepState>();

type Sweeping = Data.TaggedEnum.Value<SweepState, "Sweeping">;

/** A final state's tag: why the sweep stopped. */
export type SweepStop = Exclude<SweepState["_tag"], "Sweeping">;

/**
 * Two hits of one kind are the same crossing when they are within one
 * refinement bracket. A bracket can be exactly `precision` wide, so equality
 * counts (with float slack): a sample landing on the target is refined from
 * both neighbouring steps, and the two midpoints sit one bracket apart.
 */
export const isSameCrossing = Function.dual<
  (julianDay: number, precision: number) => (previous: RawHit) => boolean,
  (previous: RawHit, julianDay: number, precision: number) => boolean
>(
  3,
  (previous: RawHit, julianDay: number, precision: number): boolean =>
    Math.abs(julianDay - previous.julianDay) * MINUTES_PER_DAY <= precision * (1 + 1e-9),
);

/** Appends a step's hits up to `count`, dropping a repeat of the last accepted crossing. */
function acceptHits(
  hits: ReadonlyArray<RawHit>,
  stepHits: ReadonlyArray<RawHit>,
  bounds: SweepBounds,
): ReadonlyArray<RawHit> {
  const accepted = [...hits];
  for (const hit of stepHits) {
    if (accepted.length >= bounds.count) break;
    const last = accepted[accepted.length - 1];
    if (
      last !== undefined &&
      last.kind === hit.kind &&
      isSameCrossing(last, hit.julianDay, bounds.precisionMinutes)
    ) {
      continue;
    }
    accepted.push(hit);
  }
  return accepted;
}

/** Moves a `Sweeping` state to the first final state whose condition holds, else keeps it. */
function settle(bounds: SweepBounds, state: Sweeping): SweepState {
  const stopped = { cursor: state.cursor, hits: state.hits };
  if (state.hits.length >= bounds.count) return SweepState.Complete(stopped);
  const windowEnded = bounds.forward ? state.cursor >= bounds.limit : state.cursor <= bounds.limit;
  if (windowEnded) return SweepState.WindowExhausted(stopped);
  if (state.iteration >= bounds.maxIterations) return SweepState.IterationCapped(stopped);
  return state;
}

/** The settled first state: the start sample, plus an ingress at the start instant if one was found. */
export const startSweep = Function.dual<
  (startHit: RawHit | null, bounds: SweepBounds) => (start: LongitudeSample) => SweepState,
  (start: LongitudeSample, startHit: RawHit | null, bounds: SweepBounds) => SweepState
>(3, (start: LongitudeSample, startHit: RawHit | null, bounds: SweepBounds): SweepState =>
  settle(
    bounds,
    SweepState.Sweeping({
      cursor: start.julianDay,
      previous: start,
      hits: startHit === null ? [] : [startHit],
      iteration: 0,
    }),
  ),
);

/** Records one sampled step and settles. */
export const recordStep = Function.dual<
  (step: SweepStep, bounds: SweepBounds) => (state: Sweeping) => SweepState,
  (state: Sweeping, step: SweepStep, bounds: SweepBounds) => SweepState
>(3, (state: Sweeping, step: SweepStep, bounds: SweepBounds): SweepState =>
  settle(
    bounds,
    SweepState.Sweeping({
      cursor: state.cursor + step.stride,
      previous: step.next,
      hits: acceptHits(state.hits, step.stepHits, bounds),
      iteration: state.iteration + 1,
    }),
  ),
);
