/**
 * The dasha period timeline shared by every system: Mahadashas laid end to
 * end, each subdivided into Antardashas by its share of the cycle, deeper
 * levels split by their share of the parent's span, and the lookup of the
 * periods active at an instant. A system supplies only its
 * sequence, its durations, and the calendar step it counts years in.
 */
import { DateTime, Function } from "effect";

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
    let elapsedYears = 0;
    for (const { label, years } of shares) {
      elapsedYears += years;
      // Step from the start by the cumulative years: chaining from the previous
      // end clamps a Feb 29 or 31st start and the clamp carries into every later period.
      const end = step(start, elapsedYears);
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

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * Subdivides a parent period by each child's share of the parent's actual
 * span, with boundaries a whole number of minutes after its start and the
 * last child ending at the parent's end. Calendar stepping is not monotonic below a month: from a
 * 31st, a slightly longer step can land earlier once whole months clamp to the
 * month's end, so periods shorter than a month must not be stepped that way.
 */
export const subdivideProportionally = Function.dual<
  <Label>(
    shares: ReadonlyArray<Share<Label>>,
  ) => (parent: DashaPeriod) => ReadonlyArray<Placed<Label>>,
  <Label>(parent: DashaPeriod, shares: ReadonlyArray<Share<Label>>) => ReadonlyArray<Placed<Label>>
>(
  2,
  <Label>(
    parent: DashaPeriod,
    shares: ReadonlyArray<Share<Label>>,
  ): ReadonlyArray<Placed<Label>> => {
    const startMs = parent.start.epochMilliseconds;
    const spanMs = parent.end.epochMilliseconds - startMs;
    const totalYears = shares.reduce((sum, { years }) => sum + years, 0);
    const periods: Array<Placed<Label>> = [];
    let cursor = parent.start;
    let elapsed = 0;
    for (const [index, { label, years }] of shares.entries()) {
      elapsed += years;
      const offsetMinutes = Math.round((spanMs * elapsed) / totalYears / MILLISECONDS_PER_MINUTE);
      const end =
        index === shares.length - 1
          ? parent.end
          : DateTime.makeUnsafe(startMs + offsetMinutes * MILLISECONDS_PER_MINUTE);
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
