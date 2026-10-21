import { Schema } from "effect";

import { Houses, RashiLords, Rashis } from "../../chart/model.js";
import { JaiminiArudhaPadaProvenance } from "../../provenance.js";

export { JaiminiArudhaPadaProvenance as Provenance } from "../../provenance.js";

export const Result = Schema.Struct({
  provenance: JaiminiArudhaPadaProvenance,
  house: Houses,
  sourceSign: Rashis,
  lord: RashiLords,
  lordSign: Rashis,
  sign: Rashis,
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

export class EvidenceError extends Schema.TaggedError<EvidenceError>()("ArudhaPadaEvidenceError", {
  placement: RashiLords,
  expected: Schema.Literal(1),
  actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}) {}
