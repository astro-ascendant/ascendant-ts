import { Schema } from "effect";

export class DivisionalMappingError extends Schema.TaggedError<
  DivisionalMappingError,
  { readonly brand: unique symbol }
>()("DivisionalMappingError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}
