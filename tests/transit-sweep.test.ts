import { describe, expect, it } from "@effect/vitest";

import { Longitude } from "../src/chart/model.js";
import type { LongitudeSample, RawHit } from "../src/transit/search.js";
import { recordStep, startSweep, type SweepBounds, type SweepState } from "../src/transit/sweep.js";

function sample(julianDay: number): LongitudeSample {
  return { julianDay, longitude: Longitude.make(10), speed: 1 };
}

function hit(julianDay: number, kind: RawHit["kind"] = "sign-ingress"): RawHit {
  return { julianDay, longitude: Longitude.make(30), speed: 1, kind, sign: "Taurus" };
}

const BOUNDS: SweepBounds = {
  forward: true,
  limit: 100,
  count: 2,
  precisionMinutes: 1,
  maxIterations: 10,
};

function step(state: SweepState, stride: number, stepHits: ReadonlyArray<RawHit> = []): SweepState {
  if (state._tag !== "Sweeping") throw new Error(`stepped a stopped sweep: ${state._tag}`);
  return recordStep(state, { next: sample(state.cursor + stride), stride, stepHits }, BOUNDS);
}

describe("Transit sweep", () => {
  it("completes straight from the start when the start ingress fills the count", () => {
    const state = startSweep(sample(0), hit(0), { ...BOUNDS, count: 1 });
    expect(state._tag).toBe("Complete");
  });

  it("completes once the count is reached, keeping only the requested hits", () => {
    const state = step(startSweep(sample(0), null, BOUNDS), 10, [hit(3), hit(5), hit(7)]);
    expect(state._tag).toBe("Complete");
    expect(state.hits.map(({ julianDay }) => julianDay)).toEqual([3, 5]);
  });

  it("drops a repeat of the last crossing found from the neighbouring step", () => {
    const first = step(startSweep(sample(0), null, BOUNDS), 10, [hit(10)]);
    const second = step(first, 10, [hit(10 + 0.5 / 1440)]);
    expect(second._tag).toBe("Sweeping");
    expect(second.hits).toHaveLength(1);
  });

  it("stops as window-exhausted when the cursor reaches the limit first", () => {
    const state = step(step(startSweep(sample(0), null, BOUNDS), 60, [hit(30)]), 40);
    expect(state._tag).toBe("WindowExhausted");
    expect(state.cursor).toBe(100);
    expect(state.hits).toHaveLength(1);
  });

  it("stops as iteration-capped when the step budget runs out first", () => {
    let state = startSweep(sample(0), null, { ...BOUNDS, maxIterations: 3 });
    for (let index = 0; index < 3; index += 1) {
      if (state._tag !== "Sweeping") break;
      state = recordStep(
        state,
        { next: sample(state.cursor + 1), stride: 1, stepHits: [] },
        { ...BOUNDS, maxIterations: 3 },
      );
    }
    expect(state._tag).toBe("IterationCapped");
    expect(state.cursor).toBe(3);
  });

  it("counts the window end backwards for a backward sweep", () => {
    const bounds = { ...BOUNDS, forward: false, limit: -50 };
    const start = startSweep(sample(0), null, bounds);
    if (start._tag !== "Sweeping") throw new Error("expected a running sweep");
    const state = recordStep(start, { next: sample(-50), stride: -50, stepHits: [] }, bounds);
    expect(state._tag).toBe("WindowExhausted");
  });
});
