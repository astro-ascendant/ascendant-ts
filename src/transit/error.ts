import { Schema } from "effect";

import { TransitEvent } from "./model.js";

export class TransitValidationError extends Schema.TaggedError<
  TransitValidationError,
  { readonly brand: unique symbol }
>()("TransitValidationError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

export class TransitSearchExhausted extends Schema.TaggedError<
  TransitSearchExhausted,
  { readonly brand: unique symbol }
>()("TransitSearchExhausted", {
  message: Schema.String,
  found: Schema.Array(TransitEvent),
  searchedUntil: Schema.DateTimeUtc,
}) {}
