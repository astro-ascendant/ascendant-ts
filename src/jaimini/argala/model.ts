import { Schema } from "effect";

import { Planets, Rashis } from "../../chart/model.js";
import { JaiminiArgalaProvenance } from "../../provenance.js";

export { JaiminiArgalaProvenance as Provenance } from "../../provenance.js";

export const SignReference = Schema.Struct({
  kind: Schema.Literal("Sign"),
  sign: Rashis,
});
export interface SignReference extends Schema.Schema.Type<typeof SignReference> {}

export const KetuReference = Schema.Struct({
  kind: Schema.Literal("Ketu"),
});
export interface KetuReference extends Schema.Schema.Type<typeof KetuReference> {}

export const Reference = Schema.Union([SignReference, KetuReference]);
export type Reference = typeof Reference.Type;

export const Positions = Schema.Literals([2, 4, 11, 12, 10, 3, 5, 9] as const);

export const Relation = Schema.Struct({
  position: Positions,
  sign: Rashis,
  planets: Schema.Array(Planets),
});
export interface Relation extends Schema.Schema.Type<typeof Relation> {}

export const Result = Schema.Struct({
  provenance: JaiminiArgalaProvenance,
  reference: Reference,
  referenceSign: Rashis,
  direction: Schema.Literals(["forward", "reverse"] as const),
  supporting: Schema.Tuple([Relation, Relation, Relation]),
  obstructing: Schema.Tuple([Relation, Relation, Relation]),
  secondarySupporting: Relation,
  secondaryObstructing: Relation,
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

export class EvidenceError extends Schema.TaggedError<EvidenceError>()("ArgalaEvidenceError", {
  placement: Planets,
  expected: Schema.Literal(1),
  actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}) {}

export class CalculationError extends Schema.TaggedError<CalculationError>()(
  "ArgalaCalculationError",
  {
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}
