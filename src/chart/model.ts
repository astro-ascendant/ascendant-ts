import { Schema } from "effect";

import { Options as AstroParamsOptions } from "../astro-params/model.js";
import { ChartProjectionProvenance } from "../provenance.js";
import { PLANETS, CLASSICAL_PLANETS, RASHIS, STARS, PLANET_DIGNITY } from "./internal/constants.js";

export const Planets = Schema.Literals(PLANETS);
export type Planets = typeof Planets.Type;

export const Rashis = Schema.Literals(RASHIS);
export type Rashis = typeof Rashis.Type;

export const LagnaName = Schema.Literal("Lagna");
export type LagnaName = typeof LagnaName.Type;

export const PlanetsLagna = Schema.Union([Planets, LagnaName]);
export type PlanetsLagna = typeof PlanetsLagna.Type;

export const Houses = Schema.Literals([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const);
export type Houses = typeof Houses.Type;

export const RashiLords = Schema.Literals(CLASSICAL_PLANETS);
export type RashiLords = typeof RashiLords.Type;

export const Stars = Schema.Literals(STARS);
export type Stars = typeof Stars.Type;

export const Pada = Schema.Literals([1, 2, 3, 4] as const);
export type Pada = typeof Pada.Type;

export const PlanetDignity = Schema.Literals(PLANET_DIGNITY);
export type PlanetDignity = typeof PlanetDignity.Type;

export const Division = Schema.Literals([
  1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60,
] as const);
export type Division = typeof Division.Type;

export const Longitude = Schema.Finite.check(
  Schema.isBetween({ minimum: 0, maximum: 360, exclusiveMaximum: true }),
).pipe(Schema.brand("Longitude"));
export type Longitude = typeof Longitude.Type;

export const CircleAngle = Schema.Finite.check(
  Schema.isBetween({ minimum: 0, maximum: 360, exclusiveMaximum: true }),
).pipe(Schema.brand("CircleAngle"));
export type CircleAngle = typeof CircleAngle.Type;

export const Degree = Schema.Finite.check(
  Schema.isBetween({ minimum: 0, maximum: 30, exclusiveMaximum: true }),
).pipe(Schema.brand("Degree"));
export type Degree = typeof Degree.Type;

export const Star = Schema.Struct({
  name: Stars,
  lord: Planets,
  pada: Pada,
});
export interface Star extends Schema.Schema.Type<typeof Star> {}

export const Sign = Schema.Struct({
  name: Rashis,
  lord: RashiLords,
});
export interface Sign extends Schema.Schema.Type<typeof Sign> {}

export const Planet = Schema.Struct({
  name: Planets,
  longitude: Longitude,
  degree: Degree,
  is_retrograde: Schema.Boolean,
  in_sign: Schema.Array(PlanetDignity),
  sign: Sign,
});
export interface Planet extends Schema.Schema.Type<typeof Planet> {}

export const Lagna = Schema.Struct({
  name: LagnaName,
  longitude: Longitude,
  degree: Degree,
  sign: Sign,
});
export interface Lagna extends Schema.Schema.Type<typeof Lagna> {}

export const House = Schema.Struct({
  sign: Rashis,
  cusp: Longitude,
  signLord: PlanetsLagna,
  starLord: PlanetsLagna,
  subLord: PlanetsLagna,
  subSubLord: PlanetsLagna,
  significations: Schema.Array(Schema.String),
  planets: Schema.Array(Planet),
  lagna: Schema.NullOr(Lagna),
});
export interface House extends Schema.Schema.Type<typeof House> {}

export const ChartHouses = Schema.Record(Houses, House);

export const SourcePlanet = Schema.Struct({
  name: Planets,
  longitude: Longitude,
  is_retrograde: Schema.Boolean,
  star: Star,
});
export interface SourcePlanet extends Schema.Schema.Type<typeof SourcePlanet> {}

export const SourceLagna = Schema.Struct({
  name: LagnaName,
  longitude: Longitude,
  star: Star,
});
export interface SourceLagna extends Schema.Schema.Type<typeof SourceLagna> {}

export const Placements = Schema.Struct({
  lagna: SourceLagna,
  planets: Schema.Array(SourcePlanet),
});
export interface Placements extends Schema.Schema.Type<typeof Placements> {}

export { ChartProjectionProvenance as Provenance } from "../provenance.js";

export const Sex = Schema.Literals(["Male", "Female"]);
export type Sex = typeof Sex.Type;

export const HOUSE_SIGNIFICATIONS = {
  1: ["birth", "head", "physical body", "limbs", "physical features", "livelihood"],
  2: ["wealth", "food", "right eye", "face", "speech", "family", "property"],
  3: ["courage", "firmness", "right ear", "younger siblings", "heroism", "mental strength"],
  4: ["house", "home", "land", "mother", "vehicle", "happiness", "learning"],
  5: ["intellect", "children", "son", "belly", "traditional law", "virtuous acts"],
  6: ["debt", "wounds", "disease", "enemy", "sin", "fear", "humiliation"],
  7: ["desire", "love", "passion", "cohabitation", "partner", "public", "marriage"],
  8: ["life", "longevity", "mental pain", "defeat", "sorrow", "scandal", "death", "obstacle"],
  9: ["guru", "father", "worship", "virtue", "spiritual initiation", "fortune"],
  10: ["livelihood", "work", "commerce", "business", "rank", "honor", "occupation"],
  11: ["profit", "gain", "income", "receipt", "fulfillment", "elder siblings", "friends"],
  12: ["disappearance", "bondage", "loss", "bed", "poverty", "decline", "left eye", "leg"],
} as const satisfies Record<Houses, readonly string[]>;

export const PlanetSignification = Schema.Struct({
  planet: Planets,
  agent: Schema.optionalKey(Planets),
  level1: Schema.Array(Houses),
  level2: Schema.Array(Houses),
  level3: Schema.Array(Houses),
  level4: Schema.Array(Houses),
});
export interface PlanetSignification extends Schema.Schema.Type<typeof PlanetSignification> {}

export const HouseSignificators = Schema.Struct({
  house: Houses,
  level1: Schema.Array(Planets),
  level2: Schema.Array(Planets),
  level3: Schema.Array(Planets),
  level4: Schema.Array(Planets),
});
export interface HouseSignificators extends Schema.Schema.Type<typeof HouseSignificators> {}

export const ChartAngles = Schema.Struct({
  ascendant: CircleAngle,
  mc: CircleAngle,
  armc: CircleAngle,
  vertex: CircleAngle,
  equatorialAscendant: CircleAngle,
  coAscendant1: CircleAngle,
  coAscendant2: CircleAngle,
  polarAscendant: CircleAngle,
});
export interface ChartAngles extends Schema.Schema.Type<typeof ChartAngles> {}

export const Chart = Schema.Struct({
  sex: Schema.optionalKey(Sex),
  provenance: ChartProjectionProvenance,
  division: Division,
  houses: ChartHouses,
  angles: Schema.optionalKey(ChartAngles),
  planetSignifications: Schema.optionalKey(Schema.Record(Planets, PlanetSignification)),
  houseSignificators: Schema.optionalKey(Schema.Record(Houses, HouseSignificators)),
  rulingPlanets: Schema.optionalKey(Schema.Tuple([Planets, Planets, Planets, Planets, Planets])),
});
export interface Chart extends Schema.Schema.Type<typeof Chart> {}

export const CalculationCharts = Schema.NonEmptyArray(Chart).check(
  Schema.makeFilter((charts) => charts[0].division === 1, {
    expected: "A non-empty Chart collection beginning with D1",
  }),
);

export const ChartCalculation = Schema.Struct({
  placements: Placements,
  charts: CalculationCharts,
  astroParams: AstroParamsOptions,
});
export interface ChartCalculation extends Schema.Schema.Type<typeof ChartCalculation> {}

export const Moment = Schema.Struct({
  date: Schema.DateTimeUtc,
});
export interface Moment extends Schema.Schema.Type<typeof Moment> {}

export const LocatedMoment = Schema.Struct({
  moment: Moment,
  latitude: Schema.Finite,
  longitude: Schema.Finite,
});
export interface LocatedMoment extends Schema.Schema.Type<typeof LocatedMoment> {}

export const ChartParams = Schema.Struct({
  ...LocatedMoment.fields,
  sex: Chart.fields.sex,
});
export interface ChartParams extends Schema.Schema.Type<typeof ChartParams> {}
