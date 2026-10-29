import { Schema } from "effect";

export class SAVCalculationError extends Schema.TaggedError<
  SAVCalculationError,
  { readonly brand: unique symbol }
>()("SAVCalculationError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}
