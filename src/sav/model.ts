import { Schema } from "effect";

import { CLASSICAL_PLANETS } from "../chart/internal/constants.js";
import { LagnaName, Rashis } from "../chart/model.js";

export const AshtakavargaPlanets = Schema.Literals(CLASSICAL_PLANETS);
export type AshtakavargaPlanets = typeof AshtakavargaPlanets.Type;

export const AshtakavargaEntities = Schema.Union([AshtakavargaPlanets, LagnaName]);
export type AshtakavargaEntities = typeof AshtakavargaEntities.Type;

export const SignScores = Schema.Record(Rashis, Schema.Int);
export type SignScores = typeof SignScores.Type;

export const BhinnaAshtakavarga = Schema.Record(AshtakavargaEntities, SignScores);
export type BhinnaAshtakavarga = typeof BhinnaAshtakavarga.Type;

export const ReducedAshtakavarga = Schema.Record(AshtakavargaPlanets, SignScores);
export type ReducedAshtakavarga = typeof ReducedAshtakavarga.Type;

export const Pinda = Schema.Struct({
  rashi_pinda: Schema.Int,
  graha_pinda: Schema.Int,
  shodhya_pinda: Schema.Int,
});
export interface Pinda extends Schema.Schema.Type<typeof Pinda> {}

export const ShodhyaPinda = Schema.Record(AshtakavargaPlanets, Pinda);
export type ShodhyaPinda = typeof ShodhyaPinda.Type;

export const AshtakavargaTotals = Schema.Struct({
  Sun: Schema.Int,
  Moon: Schema.Int,
  Mars: Schema.Int,
  Mercury: Schema.Int,
  Jupiter: Schema.Int,
  Venus: Schema.Int,
  Saturn: Schema.Int,
  Lagna: Schema.Int,
  sarva: Schema.Int,
});
export interface AshtakavargaTotals extends Schema.Schema.Type<typeof AshtakavargaTotals> {}

export const AshtakavargaResult = Schema.Struct({
  bhinna: BhinnaAshtakavarga,
  sarva: SignScores,
  reduced: ReducedAshtakavarga,
  shodhya_pinda: ShodhyaPinda,
  totals: AshtakavargaTotals,
});
export interface AshtakavargaResult extends Schema.Schema.Type<typeof AshtakavargaResult> {}
