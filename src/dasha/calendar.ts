import { DateTime } from "effect";

interface CalendarDuration {
  readonly years: number;
  readonly months: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
}

function calendarDuration(decimalYears: number): CalendarDuration {
  const years = Math.trunc(decimalYears);

  const monthsValue = (decimalYears - years) * 12;
  const months = Math.trunc(monthsValue);

  const daysValue = (monthsValue - months) * 30;
  const days = Math.trunc(daysValue);

  const hoursValue = (daysValue - days) * 24;
  const hours = Math.trunc(hoursValue);

  const minutes = Math.trunc((hoursValue - hours) * 60);
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
