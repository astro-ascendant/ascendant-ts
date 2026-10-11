import { Schema } from "effect";

import { Degree, PlanetDignity, Planets, Rashis } from "../chart/model.js";
import { Roles } from "../jaimini/chara-karakas/model.js";
import { CharaDashaProvenance, SthiraDashaProvenance } from "../provenance.js";

export { CharaDashaProvenance, SthiraDashaProvenance } from "../provenance.js";

export const AntarDasha = Schema.Struct({
  mahadasha: Planets,
  antardasha: Planets,
  start: Schema.DateTimeUtc,
  end: Schema.DateTimeUtc,
});
export interface AntarDasha extends Schema.Schema.Type<typeof AntarDasha> {}

export const MahaDasha = Schema.Struct({
  mahadasha: Planets,
  start: Schema.DateTimeUtc,
  end: Schema.DateTimeUtc,
  antardashas: Schema.Array(AntarDasha),
});
export interface MahaDasha extends Schema.Schema.Type<typeof MahaDasha> {}

export const VimshottariDasha = Schema.Array(MahaDasha);
export type VimshottariDasha = typeof VimshottariDasha.Type;

export const CurrentDasha = Schema.Struct({
  mahadasha: MahaDasha,
  antardasha: AntarDasha,
});
export interface CurrentDasha extends Schema.Schema.Type<typeof CurrentDasha> {}

export const RashiAntarDasha = Schema.Struct({
  mahadasha: Rashis,
  antardasha: Rashis,
  start: Schema.DateTimeUtc,
  end: Schema.DateTimeUtc,
});
export interface RashiAntarDasha extends Schema.Schema.Type<typeof RashiAntarDasha> {}

export const RashiMahaDasha = Schema.Struct({
  mahadasha: Rashis,
  start: Schema.DateTimeUtc,
  end: Schema.DateTimeUtc,
  antardashas: Schema.Array(RashiAntarDasha),
});
export interface RashiMahaDasha extends Schema.Schema.Type<typeof RashiMahaDasha> {}

export const EligibleBrahmaPlanets = Schema.Literals([
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
] as const);
export type EligibleBrahmaPlanet = typeof EligibleBrahmaPlanets.Type;

export const RashiBala = Schema.Struct({
  sign: Rashis,
  charaBala: Schema.Finite,
  sthiraBala: Schema.Finite,
  drishtiBala: Schema.Finite,
  planetCount: Schema.Int,
  aspectingPlanets: Schema.Array(Planets),
  total: Schema.Finite,
});
export interface RashiBala extends Schema.Schema.Type<typeof RashiBala> {}

export const BrahmaCandidateScore = Schema.Struct({
  planet: EligibleBrahmaPlanets,
  sign: Rashis,
  dignity: PlanetDignity,
  dignityBala: Schema.Finite,
  charaKarakaRoles: Schema.Array(Roles),
  charaKarakaBala: Schema.Finite,
  kendradiHouseFromAtmakaraka: Schema.Int,
  kendradiBala: Schema.Finite,
  exactDegreeWithinSign: Degree,
  naturalStrength: Schema.Int,
  total: Schema.Finite,
});
export interface BrahmaCandidateScore extends Schema.Schema.Type<typeof BrahmaCandidateScore> {}

export const BrahmaSelection = Schema.Struct({
  rashiBalas: Schema.Tuple([RashiBala, RashiBala]),
  referenceSign: Rashis,
  referenceTieBreak: Schema.Literal("lagna-on-equal-rashi-bala"),
  atmakaraka: Schema.Struct({
    planet: Planets,
    sign: Rashis,
    resolution: Schema.Literals([
      "highest-exact-degree",
      "natural-strength-on-exact-degree-tie",
    ] as const),
  }),
  candidates: Schema.NonEmptyArray(BrahmaCandidateScore),
});
export interface BrahmaSelection extends Schema.Schema.Type<typeof BrahmaSelection> {}

export const CharaDasha = Schema.Struct({
  system: Schema.Literal("Chara"),
  provenance: CharaDashaProvenance,
  mahadashas: Schema.Array(RashiMahaDasha),
});
export interface CharaDasha extends Schema.Schema.Type<typeof CharaDasha> {}

export const Brahma = Schema.Struct({
  planet: EligibleBrahmaPlanets,
  sign: Rashis,
  source: Schema.Literal("strength"),
  selection: BrahmaSelection,
});
export interface Brahma extends Schema.Schema.Type<typeof Brahma> {}

export const SthiraDasha = Schema.Struct({
  system: Schema.Literal("Sthira"),
  provenance: SthiraDashaProvenance,
  brahma: Brahma,
  mahadashas: Schema.Array(RashiMahaDasha),
});
export interface SthiraDasha extends Schema.Schema.Type<typeof SthiraDasha> {}

export const RashiDasha = Schema.Union([CharaDasha, SthiraDasha]).pipe(
  Schema.toTaggedUnion("system"),
);
export type RashiDasha = typeof RashiDasha.Type;

export const CurrentRashiDasha = Schema.Struct({
  system: Schema.Literals(["Chara", "Sthira"] as const),
  mahadasha: RashiMahaDasha,
  antardasha: RashiAntarDasha,
});
export interface CurrentRashiDasha extends Schema.Schema.Type<typeof CurrentRashiDasha> {}
