import { Schema } from "effect";

export class EphemerisError extends Schema.TaggedError<EphemerisError>()("EphemerisError", {
  operation: Schema.String,
  cause: Schema.Defect(),
}) {}
