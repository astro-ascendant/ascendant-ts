import { Schema } from "effect";

import { TransitEvent } from "./model.js";

export class TransitValidationError extends Schema.TaggedError<TransitValidationError>()(
  "TransitValidationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class TransitSearchExhausted extends Schema.TaggedError<TransitSearchExhausted>()(
  "TransitSearchExhausted",
  {
    message: Schema.String,
    found: Schema.Array(TransitEvent),
    searchedUntil: Schema.DateTimeUtc,
  },
) {}
