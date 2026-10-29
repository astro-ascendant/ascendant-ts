/**
 * The dasha period timeline shared by every system: Mahadashas laid end to
 * end, each subdivided into Antardashas by its share of the cycle, and the
 * lookup of the periods active at an instant. A system supplies only its
 * sequence, its durations, and the calendar step it counts years in.
 */
import { type DateTime, Function } from "effect";

import type { CalendarStep } from "./calendar.js";
import { contains, type DashaPeriod } from "./query.js";

/** One period in a sequence: what it is named for and how many years it lasts. */
export interface Share<Label> {
  readonly label: Label;
  readonly years: number;
}

/** A labelled period with its half-open `[start, end)` interval. */
export interface Placed<Label> extends DashaPeriod {
  readonly label: Label;
}

/** A period that holds its subperiods. */
export interface Nested extends DashaPeriod {
  readonly antardashas: ReadonlyArray<DashaPeriod>;
}

/** The Mahadasha and Antardasha active at one instant. */
export interface Active<Parent extends Nested> {
  readonly mahadasha: Parent;
  readonly antardasha: Parent["antardashas"][number];
}

/** Lays shares end to end from `start`; each period ends its own years after it begins. */
export const sequence = Function.dual<
  <Label>(
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ) => (start: DateTime.Utc) => ReadonlyArray<Placed<Label>>,
  <Label>(
    start: DateTime.Utc,
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ) => ReadonlyArray<Placed<Label>>
>(
  3,
  <Label>(
    start: DateTime.Utc,
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ): ReadonlyArray<Placed<Label>> => {
    const periods: Array<Placed<Label>> = [];
    let cursor = start;
    for (const { label, years } of shares) {
      const end = step(cursor, years);
      periods.push({ label, start: cursor, end });
      cursor = end;
    }
    return periods;
  },
);

/**
 * Subdivides a parent period: each child ends at the parent's start stepped by
 * the years of every child so far, and the last child ends exactly at the
 * parent's end, so children never gap or overrun.
 */
export const subdivide = Function.dual<
  <Label>(
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ) => (parent: DashaPeriod) => ReadonlyArray<Placed<Label>>,
  <Label>(
    parent: DashaPeriod,
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ) => ReadonlyArray<Placed<Label>>
>(
  3,
  <Label>(
    parent: DashaPeriod,
    shares: ReadonlyArray<Share<Label>>,
    step: CalendarStep,
  ): ReadonlyArray<Placed<Label>> => {
    const periods: Array<Placed<Label>> = [];
    let cursor = parent.start;
    let elapsed = 0;
    for (const [index, { label, years }] of shares.entries()) {
      elapsed += years;
      const end = index === shares.length - 1 ? parent.end : step(parent.start, elapsed);
      periods.push({ label, start: cursor, end });
      cursor = end;
    }
    return periods;
  },
);

/** The Mahadasha and Antardasha whose intervals contain an instant; null outside the timeline. */
export const activeAt = Function.dual<
  (
    instant: DateTime.Utc,
  ) => <Parent extends Nested>(mahadashas: ReadonlyArray<Parent>) => Active<Parent> | null,
  <Parent extends Nested>(
    mahadashas: ReadonlyArray<Parent>,
    instant: DateTime.Utc,
  ) => Active<Parent> | null
>(
  2,
  <Parent extends Nested>(
    mahadashas: ReadonlyArray<Parent>,
    instant: DateTime.Utc,
  ): Active<Parent> | null => {
    const mahadasha = mahadashas.find((period) => contains(period, instant));
    const antardasha = mahadasha?.antardashas.find((period) => contains(period, instant));
    return mahadasha === undefined || antardasha === undefined ? null : { mahadasha, antardasha };
  },
);
