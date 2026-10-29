import { Schema } from "effect";

export class ChartCalculationError extends Schema.TaggedError<
  ChartCalculationError,
  { readonly brand: unique symbol }
>()("ChartCalculationError", {
  stage: Schema.Literals(["validation", "placements", "houses", "mapping"]),
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

export class LocatedMomentValidationError extends Schema.TaggedError<
  LocatedMomentValidationError,
  { readonly brand: unique symbol }
>()("LocatedMomentValidationError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}
