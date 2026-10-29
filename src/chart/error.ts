import { Schema } from "effect";

export class ChartCalculationError extends Schema.TaggedError<ChartCalculationError>()(
  "ChartCalculationError",
  {
    stage: Schema.Literals(["validation", "placements", "houses", "mapping"]),
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class LocatedMomentValidationError extends Schema.TaggedError<LocatedMomentValidationError>()(
  "LocatedMomentValidationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}
