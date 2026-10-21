import { Schema } from "effect";

import { Planets } from "./model.js";

export class ChartCalculationError extends Schema.TaggedError<ChartCalculationError>()(
  "ChartCalculationError",
  {
    stage: Schema.Literals(["validation", "placements", "mapping"]),
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

export class MissingPlacementError extends Schema.TaggedError<MissingPlacementError>()(
  "MissingPlacementError",
  {
    placement: Planets,
  },
) {}
