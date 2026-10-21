import { Schema } from "effect";

export const CalculationProvenance = Schema.Struct({
  school: Schema.String,
  method: Schema.String,
  version: Schema.Union([Schema.String, Schema.Int]),
});
export interface CalculationProvenance extends Schema.Schema.Type<typeof CalculationProvenance> {}

export const MethodStep = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
});
export interface MethodStep extends Schema.Schema.Type<typeof MethodStep> {}

export const MethodSpecification = Schema.Struct({
  provenance: CalculationProvenance,
  steps: Schema.NonEmptyArray(MethodStep),
  verification: Schema.NonEmptyArray(Schema.String),
});
export interface MethodSpecification extends Schema.Schema.Type<typeof MethodSpecification> {}

export const ChartProjectionProvenance = Schema.Struct({
  school: Schema.Literal("Ascendant"),
  method: Schema.Literal("ascendant-divisional-mapping"),
  version: Schema.Literal(1),
});
export interface ChartProjectionProvenance extends Schema.Schema.Type<
  typeof ChartProjectionProvenance
> {}

export const JaiminiArgalaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("structural-positions"),
  version: Schema.Literal(1),
});
export interface JaiminiArgalaProvenance extends Schema.Schema.Type<
  typeof JaiminiArgalaProvenance
> {}

export const JaiminiArudhaPadaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("plain-projection"),
  version: Schema.Literal(1),
});
export interface JaiminiArudhaPadaProvenance extends Schema.Schema.Type<
  typeof JaiminiArudhaPadaProvenance
> {}

export const JaiminiCharaKarakasProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("exact-degree-shared-roles"),
  version: Schema.Literal(1),
});
export interface JaiminiCharaKarakasProvenance extends Schema.Schema.Type<
  typeof JaiminiCharaKarakasProvenance
> {}

export const JaiminiKarakamshaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("atmakaraka-d9-sign"),
  version: Schema.Literal(1),
});
export interface JaiminiKarakamshaProvenance extends Schema.Schema.Type<
  typeof JaiminiKarakamshaProvenance
> {}

export const JaiminiRashiDrishtiProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("movable-fixed-dual"),
  version: Schema.Literal(1),
});
export interface JaiminiRashiDrishtiProvenance extends Schema.Schema.Type<
  typeof JaiminiRashiDrishtiProvenance
> {}

export const JaiminiUpapadaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("twelfth-house-plain-projection"),
  version: Schema.Literal(1),
});
export interface JaiminiUpapadaProvenance extends Schema.Schema.Type<
  typeof JaiminiUpapadaProvenance
> {}

export const CharaDashaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("kn-rao-co-lord-strength"),
  version: Schema.Literal(2),
});
export interface CharaDashaProvenance extends Schema.Schema.Type<typeof CharaDashaProvenance> {}

export const SthiraDashaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("bv-raman-koch-brahma-strength"),
  version: Schema.Literal(2),
});
export interface SthiraDashaProvenance extends Schema.Schema.Type<typeof SthiraDashaProvenance> {}

export const TransitSearchProvenance = Schema.Struct({
  school: Schema.Literal("Ascendant"),
  method: Schema.Literal("transit-sample-bisect"),
  version: Schema.Literal(1),
});
export interface TransitSearchProvenance extends Schema.Schema.Type<
  typeof TransitSearchProvenance
> {}

export const chartProjection = {
  provenance: { school: "Ascendant", method: "ascendant-divisional-mapping", version: 1 },
  steps: [
    { id: "map-longitudes", description: "Map Lagna and planets into the requested division." },
    { id: "build-whole-sign-houses", description: "Build twelve houses from the mapped Lagna." },
  ],
  verification: ["D1 is an identity projection.", "Requested divisions are unique and ordered."],
} as const satisfies MethodSpecification;
export const jaiminiArgala = {
  provenance: { school: "Jaimini", method: "structural-positions", version: 1 },
  steps: [
    { id: "validate-placements", description: "Require one placement for every planet." },
    {
      id: "derive-relations",
      description: "Calculate supporting and obstructing sign positions.",
    },
  ],
  verification: [
    "Ketu reference reverses direction.",
    "Supporting and obstructing positions are fixed.",
  ],
} as const satisfies MethodSpecification;
export const jaiminiArudhaPada = {
  provenance: { school: "Jaimini", method: "plain-projection", version: 1 },
  steps: [
    {
      id: "derive-source",
      description: "Find the source sign and its lord for the requested house.",
    },
    { id: "project", description: "Project the lord's distance from the source sign." },
  ],
  verification: ["Exactly one placement is required for the house lord."],
} as const satisfies MethodSpecification;
export const jaiminiCharaKarakas = {
  provenance: { school: "Jaimini", method: "exact-degree-shared-roles", version: 1 },
  steps: [
    { id: "rank", description: "Rank classical planets by exact degree within their signs." },
    { id: "assign", description: "Assign Karaka roles, sharing every role at an exact tie." },
  ],
  verification: ["All seven classical planet placements are required.", "Exact ties share roles."],
} as const satisfies MethodSpecification;
export const jaiminiKarakamsha = {
  provenance: { school: "Jaimini", method: "atmakaraka-d9-sign", version: 1 },
  steps: [
    { id: "select-atmakaraka", description: "Use the Chara Karaka Atmakaraka assignment." },
    { id: "map-d9", description: "Map each Atmakaraka to its D9 sign." },
  ],
  verification: ["Every tied Atmakaraka is reported."],
} as const satisfies MethodSpecification;
export const jaiminiRashiDrishti = {
  provenance: { school: "Jaimini", method: "movable-fixed-dual", version: 1 },
  steps: [
    {
      id: "classify-reference",
      description: "Classify the reference sign as movable, fixed, or dual.",
    },
    { id: "derive-targets", description: "Return the three signs receiving its Rashi Drishti." },
  ],
  verification: ["Every reference sign has exactly three targets."],
} as const satisfies MethodSpecification;
export const jaiminiUpapada = {
  provenance: { school: "Jaimini", method: "twelfth-house-plain-projection", version: 1 },
  steps: [
    { id: "fix-house", description: "Use the twelfth house as the Arudha source." },
    { id: "project", description: "Apply the plain Arudha projection to that source." },
  ],
  verification: ["The result always reports house twelve."],
} as const satisfies MethodSpecification;
export const charaDasha = {
  provenance: { school: "Jaimini", method: "kn-rao-co-lord-strength", version: 2 },
  steps: [
    { id: "derive-direction", description: "Set direction from the ninth sign's pada group." },
    {
      id: "resolve-co-lords",
      description:
        "Resolve Scorpio and Aquarius co-lords by occupation, association count, and exact degree.",
    },
    { id: "build-periods", description: "Build sign periods and equal-twelfth antardashas." },
  ],
  verification: [
    "All twelve sign periods are contiguous.",
    "Scorpio and Aquarius co-lord resolution is deterministic.",
  ],
} as const satisfies MethodSpecification;
export const sthiraDasha = {
  provenance: { school: "Jaimini", method: "bv-raman-koch-brahma-strength", version: 2 },
  steps: [
    { id: "select-reference", description: "Compare Lagna and seventh-sign Rashi Bala." },
    {
      id: "select-brahma",
      description: "Score eligible sixth, eighth, and twelfth lords by Graha Bala.",
    },
    {
      id: "build-periods",
      description: "Start at Brahma's sign and assign 7, 8, or 9 years by modality.",
    },
  ],
  verification: [
    "Brahma scorecards expose all candidate scores.",
    "Exact-degree then natural-strength breaks score ties.",
  ],
} as const satisfies MethodSpecification;
export const transitSearch = {
  provenance: { school: "Ascendant", method: "transit-sample-bisect", version: 1 },
  steps: [
    {
      id: "sample-coarse",
      description: "Step per-planet coarse intervals from the located moment.",
    },
    {
      id: "bisect-brackets",
      description: "Bisect each bracketed crossing to one-minute precision.",
    },
  ],
  verification: [
    "Every zero-crossing counts in strict time order.",
    "Exhausted searches fail typed instead of returning short lists.",
  ],
} as const satisfies MethodSpecification;

export const methods = {
  chartProjection,
  jaiminiArgala,
  jaiminiArudhaPada,
  jaiminiCharaKarakas,
  jaiminiKarakamsha,
  jaiminiRashiDrishti,
  jaiminiUpapada,
  charaDasha,
  sthiraDasha,
  transitSearch,
} as const satisfies Record<string, MethodSpecification>;

export type MethodId = keyof typeof methods;
