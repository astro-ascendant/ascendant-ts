import { Schema } from "effect";

import { RashiLords, Rashis } from "../../chart/model.js";
import { JaiminiUpapadaProvenance } from "../../provenance.js";

export { JaiminiUpapadaProvenance as Provenance } from "../../provenance.js";

export const Result = Schema.Struct({
  provenance: JaiminiUpapadaProvenance,
  house: Schema.Literal(12),
  sourceSign: Rashis,
  lord: RashiLords,
  lordSign: Rashis,
  sign: Rashis,
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

export class UpapadaEvidenceError extends Schema.TaggedError<
  UpapadaEvidenceError,
  { readonly brand: unique symbol }
>()("UpapadaEvidenceError", {
  placement: RashiLords,
  expected: Schema.Literal(1),
  actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}) {}

/** @deprecated Use `UpapadaEvidenceError`; the unprefixed name collides across Jaimini modules. */
export const EvidenceError = UpapadaEvidenceError;
export type EvidenceError = UpapadaEvidenceError;
