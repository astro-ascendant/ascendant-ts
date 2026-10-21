import { Schema } from "effect";

export class DivisionalMappingError extends Schema.TaggedError<DivisionalMappingError>()(
  "DivisionalMappingError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}
