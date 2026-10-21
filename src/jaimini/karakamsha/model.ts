import { Schema } from "effect";

import { Rashis } from "../../chart/model.js";
import { JaiminiKarakamshaProvenance } from "../../provenance.js";
import { ClassicalPlanets } from "../chara-karakas/model.js";

export { JaiminiKarakamshaProvenance as Provenance } from "../../provenance.js";

export const Placement = Schema.Struct({
  planet: ClassicalPlanets,
  sign: Rashis,
});
export interface Placement extends Schema.Schema.Type<typeof Placement> {}

export const Result = Schema.Struct({
  provenance: JaiminiKarakamshaProvenance,
  placements: Schema.NonEmptyArray(Placement),
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

export class EvidenceError extends Schema.TaggedError<EvidenceError>()("KarakamshaEvidenceError", {
  placement: ClassicalPlanets,
  expected: Schema.Literal(1),
  actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}) {}

export class CalculationError extends Schema.TaggedError<CalculationError>()(
  "KarakamshaCalculationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}
