import { DateTime } from "effect";

interface CalendarDuration {
  readonly years: number;
  readonly months: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_MONTH = 30 * MINUTES_PER_DAY;
const MINUTES_PER_YEAR = 12 * MINUTES_PER_MONTH;

/**
 * Splits decimal years into calendar units on whole minutes. Truncating the
 * floating-point remainders directly loses a minute (or, at a month boundary,
 * most of a month) to noise such as 80 months arriving as 79.99999999999999.
 */
function calendarDuration(decimalYears: number): CalendarDuration {
  const total = Math.round(decimalYears * MINUTES_PER_YEAR);
  const years = Math.floor(total / MINUTES_PER_YEAR);
  const afterYears = total - years * MINUTES_PER_YEAR;
  const months = Math.floor(afterYears / MINUTES_PER_MONTH);
  const afterMonths = afterYears - months * MINUTES_PER_MONTH;
  const days = Math.floor(afterMonths / MINUTES_PER_DAY);
  const afterDays = afterMonths - days * MINUTES_PER_DAY;
  const hours = Math.floor(afterDays / MINUTES_PER_HOUR);
  const minutes = afterDays - hours * MINUTES_PER_HOUR;
  return { years, months, days, hours, minutes };
}

/** Moves a date forward by a number of years under one calendar convention. */
export type CalendarStep = (date: DateTime.Utc, years: number) => DateTime.Utc;

/**
 * Shifts a date by decimal years, decomposed into whole years and months, then
 * the remainder as 30-day months, days, hours and minutes.
 */
function shiftDate(date: DateTime.Utc, decimalYears: number, direction: 1 | -1): DateTime.Utc {
  const duration = calendarDuration(decimalYears);
  const months = duration.years * 12 + duration.months;
  const shiftedMonth = DateTime.add(date, {
    months: direction * months,
  });
  return DateTime.add(shiftedMonth, {
    days: direction * duration.days,
    hours: direction * duration.hours,
    minutes: direction * duration.minutes,
  });
}

/** Vimshottari's convention: decimal years through 30-day months, days, hours and minutes. */
function decimalYears(date: DateTime.Utc, years: number): DateTime.Utc {
  return shiftDate(date, years, 1);
}

/** The Rashi dashas' convention: every period is a whole number of calendar months. */
function wholeMonths(date: DateTime.Utc, years: number): DateTime.Utc {
  return DateTime.add(date, { months: Math.round(years * 12) });
}

export const Calendar = { shiftDate, decimalYears, wholeMonths };
