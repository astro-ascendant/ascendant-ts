import { Schema } from "effect";

import { CLASSICAL_PLANETS } from "../../chart/internal/constants.js";
import { Degree } from "../../chart/model.js";
import { JaiminiCharaKarakasProvenance } from "../../provenance.js";

export { JaiminiCharaKarakasProvenance as Provenance } from "../../provenance.js";

export const ClassicalPlanets = Schema.Literals(CLASSICAL_PLANETS);
export type ClassicalPlanets = typeof ClassicalPlanets.Type;

export const Roles = Schema.Literals([
  "Atmakaraka",
  "Amatyakaraka",
  "Bhratrikaraka",
  "Matrikaraka",
  "Putrakaraka",
  "Gnatikaraka",
  "Darakaraka",
] as const);
export type Role = typeof Roles.Type;

export const Holder = Schema.Struct({
  planet: ClassicalPlanets,
  degree: Degree,
});
export interface Holder extends Schema.Schema.Type<typeof Holder> {}

export interface ExactDegree {
  readonly coefficient: bigint;
  readonly scale: number;
  readonly value: Degree;
}

export interface RankedHolder extends Holder {
  readonly exactDegree: ExactDegree;
}

export const Assignments = Schema.Record(Roles, Schema.NonEmptyArray(Holder));
export interface Assignments extends Schema.Schema.Type<typeof Assignments> {}

export const Result = Schema.Struct({
  provenance: JaiminiCharaKarakasProvenance,
  assignments: Assignments,
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

export class EvidenceError extends Schema.TaggedError<EvidenceError>()(
  "CharaKarakasEvidenceError",
  {
    placement: ClassicalPlanets,
    expected: Schema.Literal(1),
    actual: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  },
) {}

export class ParseError extends Schema.TaggedError<ParseError>()("CharaKarakasParseError", {
  message: Schema.String,
}) {}
