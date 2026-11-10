import { describe, expect, it } from "@effect/vitest";

import { Longitude } from "../src/chart/model.js";
import {
  nextProbe,
  recordProbe,
  RefineState,
  startRefine,
  type RefineBounds,
} from "../src/transit/refine.js";
import type { LongitudeSample } from "../src/transit/search.js";

function sample(julianDay: number): LongitudeSample {
  return { julianDay, longitude: Longitude.make(10), speed: 1 };
}

/** A line through zero at day 3.3, so every probe has a known value. */
function valueOf(at: LongitudeSample): number {
  return at.julianDay - 3.3;
}

const BOUNDS: RefineBounds = { precisionMinutes: 1, maxIterations: 60 };

function start(low: number, high: number, bounds: RefineBounds = BOUNDS): RefineState {
  return startRefine(
    {
      low: sample(low),
      lowValue: valueOf(sample(low)),
      high: sample(high),
      highValue: valueOf(sample(high)),
    },
    bounds,
  );
}

function bracketing(state: RefineState) {
  if (!RefineState.$is("Bracketing")(state))
    throw new Error(`expected Bracketing, got ${state._tag}`);
  return state;
}

function probeOnce(state: RefineState, slopeOf?: (at: LongitudeSample) => number, bounds = BOUNDS) {
  const current = bracketing(state);
  const probe = nextProbe(current, slopeOf);
  const at = sample(probe.day);
  return { probe, next: recordProbe(current, { probe, sample: at, value: valueOf(at) }, bounds) };
}

describe("Transit refinement", () => {
  it("stops as an exact root when a bracket end is already on zero", () => {
    const state = start(3.3, 10);
    expect(state._tag).toBe("ExactRoot");
    expect(RefineState.$is("ExactRoot")(state) && state.sample.julianDay).toBe(3.3);
  });

  it("stops as narrowed when the bracket starts within the precision", () => {
    const state = start(3.3 - 0.2 / 1440, 3.3 + 0.4 / 1440);
    expect(state._tag).toBe("Narrowed");
    // The end nearer zero wins.
    expect(RefineState.$is("Narrowed")(state) && state.sample.julianDay).toBe(3.3 - 0.2 / 1440);
  });

  it("takes a secant step when there is no derivative", () => {
    const { probe } = probeOnce(start(0, 10));
    expect(probe.mode).toBe("Secant");
    expect(probe.day).toBeCloseTo(3.3, 9);
  });

  it("takes a Newton step from the end nearer zero when the slope is known", () => {
    const { probe } = probeOnce(start(0, 10), () => 2);
    expect(probe.mode).toBe("Newton");
    // Anchored at day 0 (|-3.3| < |6.7|): 0 - (-3.3) / 2.
    expect(probe.day).toBeCloseTo(1.65, 9);
  });

  it("bisects when the Newton step leaves the bracket", () => {
    const { probe } = probeOnce(start(0, 10), () => 0.1);
    expect(probe.mode).toBe("Bisection");
    expect(probe.day).toBe(5);
  });

  it("bisects on the second probe when the bracket has not halved", () => {
    // A slope far too steep creeps from the lower end: the bracket barely shrinks.
    const first = probeOnce(start(0, 10), () => 100);
    expect(first.probe.mode).toBe("Newton");
    const second = probeOnce(first.next, () => 100);
    expect(second.probe.mode).toBe("Bisection");
  });

  it("stops as settled when two probes land within half the precision", () => {
    const first = probeOnce(start(0, 10), () => 2);
    const current = bracketing(first.next);
    const probe = { mode: "Secant" as const, day: first.probe.day + 0.1 / 1440 };
    const at = sample(probe.day);
    const state = recordProbe(current, { probe, sample: at, value: valueOf(at) }, BOUNDS);
    expect(state._tag).toBe("Settled");
  });

  it("stops as an exact root when a probe lands on zero", () => {
    const current = bracketing(start(0, 10));
    const probe = { mode: "Bisection" as const, day: 3.3 };
    const state = recordProbe(current, { probe, sample: sample(3.3), value: 0 }, BOUNDS);
    expect(state._tag).toBe("ExactRoot");
  });

  it("stops as iteration-capped when the probe budget runs out first", () => {
    const bounds = { precisionMinutes: 1, maxIterations: 1 };
    const { next } = probeOnce(start(0, 10, bounds), () => 100, bounds);
    expect(next._tag).toBe("IterationCapped");
  });

  it("converges to the root through the machine", () => {
    let state = start(0, 10);
    while (RefineState.$is("Bracketing")(state)) state = probeOnce(state).next;
    expect(state._tag).not.toBe("IterationCapped");
    expect(Math.abs(state.sample.julianDay - 3.3) * 1440).toBeLessThanOrEqual(1);
  });
});
