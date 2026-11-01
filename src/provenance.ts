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

export const D1ChartProvenance = Schema.Struct({
  school: Schema.Literal("Universal"),
  method: Schema.Literal("house-system-cusps"),
  version: Schema.Literal("2026-11-01"),
});
export interface D1ChartProvenance extends Schema.Schema.Type<typeof D1ChartProvenance> {}

export const DivisionalChartProvenance = Schema.Struct({
  school: Schema.Literal("Parashari"),
  method: Schema.Literal("whole-sign-from-mapped-lagna"),
  version: Schema.Literal("2026-11-01"),
});
export interface DivisionalChartProvenance extends Schema.Schema.Type<
  typeof DivisionalChartProvenance
> {}

export const JaiminiArgalaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("structural-positions"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiArgalaProvenance extends Schema.Schema.Type<
  typeof JaiminiArgalaProvenance
> {}

export const JaiminiArudhaPadaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("plain-projection"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiArudhaPadaProvenance extends Schema.Schema.Type<
  typeof JaiminiArudhaPadaProvenance
> {}

export const JaiminiCharaKarakasProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("exact-degree-shared-roles"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiCharaKarakasProvenance extends Schema.Schema.Type<
  typeof JaiminiCharaKarakasProvenance
> {}

export const JaiminiKarakamshaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("atmakaraka-d9-sign"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiKarakamshaProvenance extends Schema.Schema.Type<
  typeof JaiminiKarakamshaProvenance
> {}

export const JaiminiRashiDrishtiProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("movable-fixed-dual"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiRashiDrishtiProvenance extends Schema.Schema.Type<
  typeof JaiminiRashiDrishtiProvenance
> {}

export const JaiminiUpapadaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("twelfth-house-plain-projection"),
  version: Schema.Literal("2026-11-01"),
});
export interface JaiminiUpapadaProvenance extends Schema.Schema.Type<
  typeof JaiminiUpapadaProvenance
> {}

export const CharaDashaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("kn-rao-co-lord-strength"),
  version: Schema.Literal("2026-11-01"),
});
export interface CharaDashaProvenance extends Schema.Schema.Type<typeof CharaDashaProvenance> {}

export const SthiraDashaProvenance = Schema.Struct({
  school: Schema.Literal("Jaimini"),
  method: Schema.Literal("bv-raman-koch-brahma-strength"),
  version: Schema.Literal("2026-11-01"),
});
export interface SthiraDashaProvenance extends Schema.Schema.Type<typeof SthiraDashaProvenance> {}

export const TransitSearchProvenance = Schema.Struct({
  school: Schema.Literal("Parashari"),
  method: Schema.Literal("transit-sample-bisect"),
  version: Schema.Literal("2026-11-01"),
});
export interface TransitSearchProvenance extends Schema.Schema.Type<
  typeof TransitSearchProvenance
> {}

export const PlacementsProvenance = Schema.Struct({
  school: Schema.Literal("Parashari"),
  method: Schema.Literal("sidereal-ephemeris-placements"),
  version: Schema.Literal("2026-11-01"),
});
export interface PlacementsProvenance extends Schema.Schema.Type<typeof PlacementsProvenance> {}

export const VimshottariDashaProvenance = Schema.Struct({
  school: Schema.Literal("Parashari"),
  method: Schema.Literal("moon-nakshatra-balance"),
  version: Schema.Literal("2026-11-01"),
});
export interface VimshottariDashaProvenance extends Schema.Schema.Type<
  typeof VimshottariDashaProvenance
> {}

export const AshtakavargaProvenance = Schema.Struct({
  school: Schema.Literal("Parashari"),
  method: Schema.Literal("bphs-bav-trikona-ekadhipatya"),
  version: Schema.Literal("2026-11-01"),
});
export interface AshtakavargaProvenance extends Schema.Schema.Type<typeof AshtakavargaProvenance> {}

export const d1ChartProjection = {
  provenance: { school: "Universal", method: "house-system-cusps", version: "2026-11-01" },
  steps: [
    { id: "place-points", description: "Use the Lagna and planets at their source longitudes." },
    {
      id: "build-cusp-houses",
      description: "Begin each house at the selected House system's cusp.",
    },
    {
      id: "derive-kp",
      description: "Derive KP lords, significations and ruling planets from the cusps.",
    },
  ],
  verification: [
    "D1 is an identity projection.",
    "Planets fall in the house whose cusp span contains them.",
    "Degenerate cusps fail rather than fall back to equal houses.",
  ],
} as const satisfies MethodSpecification;
export const divisionalChartProjection = {
  provenance: {
    school: "Parashari",
    method: "whole-sign-from-mapped-lagna",
    version: "2026-11-01",
  },
  steps: [
    { id: "map-longitudes", description: "Map the Lagna and planets into the Division." },
    {
      id: "build-whole-sign-houses",
      description: "Count twelve whole-sign houses from the mapped Lagna's Sign.",
    },
  ],
  verification: [
    "Requested divisions are unique and ordered after D1.",
    "Each house holds exactly the planets mapped into its Sign.",
  ],
} as const satisfies MethodSpecification;
export const jaiminiArgala = {
  provenance: { school: "Jaimini", method: "structural-positions", version: "2026-11-01" },
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
  provenance: { school: "Jaimini", method: "plain-projection", version: "2026-11-01" },
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
  provenance: { school: "Jaimini", method: "exact-degree-shared-roles", version: "2026-11-01" },
  steps: [
    { id: "rank", description: "Rank classical planets by exact degree within their signs." },
    { id: "assign", description: "Assign Karaka roles, sharing every role at an exact tie." },
  ],
  verification: ["All seven classical planet placements are required.", "Exact ties share roles."],
} as const satisfies MethodSpecification;
export const jaiminiKarakamsha = {
  provenance: { school: "Jaimini", method: "atmakaraka-d9-sign", version: "2026-11-01" },
  steps: [
    { id: "select-atmakaraka", description: "Use the Chara Karaka Atmakaraka assignment." },
    { id: "map-d9", description: "Map each Atmakaraka to its D9 sign." },
  ],
  verification: ["Every tied Atmakaraka is reported."],
} as const satisfies MethodSpecification;
export const jaiminiRashiDrishti = {
  provenance: { school: "Jaimini", method: "movable-fixed-dual", version: "2026-11-01" },
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
  provenance: {
    school: "Jaimini",
    method: "twelfth-house-plain-projection",
    version: "2026-11-01",
  },
  steps: [
    { id: "fix-house", description: "Use the twelfth house as the Arudha source." },
    { id: "project", description: "Apply the plain Arudha projection to that source." },
  ],
  verification: ["The result always reports house twelve."],
} as const satisfies MethodSpecification;
export const charaDasha = {
  provenance: { school: "Jaimini", method: "kn-rao-co-lord-strength", version: "2026-11-01" },
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
  provenance: { school: "Jaimini", method: "bv-raman-koch-brahma-strength", version: "2026-11-01" },
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
export const placements = {
  provenance: {
    school: "Parashari",
    method: "sidereal-ephemeris-placements",
    version: "2026-11-01",
  },
  steps: [
    {
      id: "sample-positions",
      description:
        "Read each graha's sidereal longitude at the moment for the selected ayanamsa; Ketu is opposite Rahu, the mean node.",
    },
    {
      id: "place-lagna",
      description: "Take the Lagna from the ascendant of the selected house system.",
    },
    { id: "assign-stars", description: "Assign each point its nakshatra, pada and star lord." },
  ],
  verification: [
    "Every longitude lies in [0, 360).",
    "Rahu and Ketu are opposite and never flagged retrograde.",
  ],
} as const satisfies MethodSpecification;
export const vimshottariDasha = {
  provenance: { school: "Parashari", method: "moon-nakshatra-balance", version: "2026-11-01" },
  steps: [
    {
      id: "derive-balance",
      description:
        "Find the Moon's nakshatra lord and the exact arc travelled to get the period elapsed at birth.",
    },
    {
      id: "build-mahadashas",
      description:
        "Order the nine lords from the star lord and start the first period before birth by the elapsed part.",
    },
    {
      id: "build-antardashas",
      description: "Split each Mahadasha by the lords' shares of the 120-year cycle.",
    },
  ],
  verification: [
    "The nine Mahadashas are contiguous and span 120 years.",
    "Antardashas tile their Mahadasha and end on its end.",
  ],
} as const satisfies MethodSpecification;
export const ashtakavarga = {
  provenance: {
    school: "Parashari",
    method: "bphs-bav-trikona-ekadhipatya",
    version: "2026-11-01",
  },
  steps: [
    {
      id: "score-bhinna",
      description:
        "Give each planet and the Lagna a bindu per contributor whose classical houses include the sign.",
    },
    { id: "sum-sarva", description: "Add the seven planetary tables into the Sarvashtakavarga." },
    {
      id: "reduce",
      description:
        "Apply Trikona then Ekadhipatya reduction, the latter by planet occupancy of each pair of signs.",
    },
    {
      id: "weigh-pinda",
      description:
        "Weigh the reduced scores by the Rashi and Graha multipliers into Shodhya Pinda.",
    },
  ],
  verification: [
    "Each planetary table totals its classical bindu count and the Sarvashtakavarga totals 337.",
    "Reduction never leaves a negative score.",
  ],
} as const satisfies MethodSpecification;
export const transitSearch = {
  provenance: { school: "Parashari", method: "transit-sample-bisect", version: "2026-11-01" },
  steps: [
    {
      id: "sample-coarse",
      description:
        "Leap from the located moment by the time the graha needs to reach the nearest boundary, target or station, from per-planet speed and acceleration limits.",
    },
    {
      id: "bisect-brackets",
      description:
        "Refine each bracketed crossing to the requested precision with Newton and secant steps kept inside the bracket.",
    },
  ],
  verification: [
    "Every zero-crossing counts in strict time order.",
    "Exhausted searches fail typed instead of returning short lists.",
    "Searches find the events an hourly scan of the ephemeris finds.",
  ],
} as const satisfies MethodSpecification;

export const methods = {
  d1ChartProjection,
  divisionalChartProjection,
  jaiminiArgala,
  jaiminiArudhaPada,
  jaiminiCharaKarakas,
  jaiminiKarakamsha,
  jaiminiRashiDrishti,
  jaiminiUpapada,
  charaDasha,
  sthiraDasha,
  transitSearch,
  placements,
  vimshottariDasha,
  ashtakavarga,
} as const satisfies Record<string, MethodSpecification>;

export type MethodId = keyof typeof methods;
