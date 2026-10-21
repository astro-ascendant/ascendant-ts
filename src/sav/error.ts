import { Schema } from "effect";

export class SAVCalculationError extends Schema.TaggedError<SAVCalculationError>()(
  "SAVCalculationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}
