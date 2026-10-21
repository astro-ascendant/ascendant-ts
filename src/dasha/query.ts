import { type DateTime, Function } from "effect";

export interface DashaPeriod {
  readonly start: DateTime.Utc;
  readonly end: DateTime.Utc;
}

export const contains: {
  (instant: DateTime.Utc): (period: DashaPeriod) => boolean;
  (period: DashaPeriod, instant: DateTime.Utc): boolean;
} = Function.dual(
  2,
  (period: DashaPeriod, instant: DateTime.Utc): boolean =>
    period.start.epochMilliseconds <= instant.epochMilliseconds &&
    instant.epochMilliseconds < period.end.epochMilliseconds,
);
