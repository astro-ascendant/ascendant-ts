import { Schema } from "effect";

export class EphemerisError extends Schema.TaggedError<
  EphemerisError,
  { readonly brand: unique symbol }
>()("EphemerisError", {
  operation: Schema.String,
  cause: Schema.Defect(),
}) {}
