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

export const Calendar = { shiftDate };
