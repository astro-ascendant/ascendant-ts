import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { Calendar } from "../src/dasha/calendar.js";
import * as Timeline from "../src/dasha/timeline.js";

const START = DateTime.makeUnsafe("2000-01-31T00:00:00.000Z");

function iso(date: DateTime.Utc): string {
  return DateTime.formatIso(date);
}

describe("Dasha timeline", () => {
  it("lays periods end to end, each starting where the previous one ended", () => {
    const periods = Timeline.sequence(
      START,
      [
        { label: "a", years: 1 },
        { label: "b", years: 2 },
        { label: "c", years: 0.5 },
      ],
      Calendar.wholeMonths,
    );

    expect(periods.map(({ label }) => label)).toEqual(["a", "b", "c"]);
    expect(iso(periods[0]!.start)).toBe(iso(START));
    for (const [index, period] of periods.slice(1).entries()) {
      expect(iso(period.start)).toBe(iso(periods[index]!.end));
    }
    expect(iso(periods[2]!.end)).toBe("2003-07-31T00:00:00.000Z");
  });

  it("subdivides without gaps and clamps the last child to the parent end", () => {
    const parent = { start: START, end: Calendar.decimalYears(START, 7) };
    // Shares that do not sum exactly to the parent's years still end on its end.
    const shares = [1 / 3, 1 / 3, 1 / 3].map((third, index) => ({
      label: index,
      years: 7 * third,
    }));
    const children = Timeline.subdivide(parent, shares, Calendar.decimalYears);

    expect(iso(children[0]!.start)).toBe(iso(parent.start));
    for (const [index, child] of children.slice(1).entries()) {
      expect(iso(child.start)).toBe(iso(children[index]!.end));
    }
    expect(iso(children[2]!.end)).toBe(iso(parent.end));
  });

  it("counts whole calendar months or decimal years by the system's convention", () => {
    expect(iso(Calendar.wholeMonths(START, 1 / 12))).toBe("2000-02-29T00:00:00.000Z");
    expect(iso(Calendar.decimalYears(START, 1.5))).toBe("2001-07-31T00:00:00.000Z");
    expect(iso(Calendar.decimalYears(START, 1 / 24))).toBe("2000-02-15T00:00:00.000Z");
  });

  it("finds the active periods on half-open intervals", () => {
    const parent = { start: START, end: Calendar.wholeMonths(START, 1) };
    const antardashas = Timeline.subdivide(
      parent,
      [
        { label: "first", years: 0.5 },
        { label: "second", years: 0.5 },
      ],
      Calendar.wholeMonths,
    );
    const timeline = [{ ...parent, antardashas }];
    const boundary = antardashas[1]!.start;

    expect(Timeline.activeAt(timeline, boundary)?.antardasha).toBe(antardashas[1]);
    expect(Timeline.activeAt(timeline, START)?.antardasha).toBe(antardashas[0]);
    expect(Timeline.activeAt(timeline, parent.end)).toBeNull();
  });
});
