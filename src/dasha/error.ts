import { Schema } from "effect";

import { Planets } from "../chart/model.js";

export class DashaCalculationError extends Schema.TaggedError<DashaCalculationError>()(
  "DashaCalculationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class DashaEvidenceError extends Schema.TaggedError<DashaEvidenceError>()(
  "DashaEvidenceError",
  {
    placement: Schema.Union([Planets, Schema.Literal("Lagna")]),
    expected: Schema.Literal(1),
    actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    context: Schema.String,
  },
) {}
