import * as Swisseph from "@swisseph/node";
import { Schema } from "effect";

import { type Ayanamsa, type HouseSystem } from "../astro-params/model.js";
import { type CelestialBody } from "../ephemeris/model.js";

export const SIDEREAL_MODE: Record<Ayanamsa, Swisseph.SiderealMode> = {
  FaganBradley: Swisseph.SiderealMode.FaganBradley,
  Lahiri: Swisseph.SiderealMode.Lahiri,
  DeLuce: Swisseph.SiderealMode.DeLuce,
  Raman: Swisseph.SiderealMode.Raman,
  Ushashashi: Swisseph.SiderealMode.Ushashashi,
  Krishnamurti: Swisseph.SiderealMode.Krishnamurti,
  DjwhalKhul: Swisseph.SiderealMode.DjwhalKhul,
  Yukteshwar: Swisseph.SiderealMode.Yukteshwar,
  JNBhasin: Swisseph.SiderealMode.JNBhasin,
  BabylKugler1: Swisseph.SiderealMode.BabylKugler1,
  BabylKugler2: Swisseph.SiderealMode.BabylKugler2,
  BabylKugler3: Swisseph.SiderealMode.BabylKugler3,
  BabylHuber: Swisseph.SiderealMode.BabylHuber,
  BabylEtPSC: Swisseph.SiderealMode.BabylEtPSC,
  Aldebaran15Tau: Swisseph.SiderealMode.Aldebaran15Tau,
  Hipparchos: Swisseph.SiderealMode.Hipparchos,
  Sassanian: Swisseph.SiderealMode.Sassanian,
  GalacticCenter0Sag: Swisseph.SiderealMode.GalacticCenter0Sag,
  J2000: Swisseph.SiderealMode.J2000,
  J1900: Swisseph.SiderealMode.J1900,
  B1950: Swisseph.SiderealMode.B1950,
  SuryaSiddhanta: Swisseph.SiderealMode.SuryaSiddhanta,
  SuryaSiddhantaMeanSun: Swisseph.SiderealMode.SuryaSiddhantaMeanSun,
  Aryabhata: Swisseph.SiderealMode.Aryabhata,
  AryabhataMeanSun: Swisseph.SiderealMode.AryabhataMeanSun,
  SSRevati: Swisseph.SiderealMode.SSRevati,
  SSCitra: Swisseph.SiderealMode.SSCitra,
  TrueCitra: Swisseph.SiderealMode.TrueCitra,
  TrueRevati: Swisseph.SiderealMode.TrueRevati,
  TruePushya: Swisseph.SiderealMode.TruePushya,
  GalacticCenterGilBrand: Swisseph.SiderealMode.GalacticCenterGilBrand,
  GalacticEquatorIAU1958: Swisseph.SiderealMode.GalacticEquatorIAU1958,
  GalacticEquator: Swisseph.SiderealMode.GalacticEquator,
  GalacticEquatorMidMula: Swisseph.SiderealMode.GalacticEquatorMidMula,
  Skydram: Swisseph.SiderealMode.Skydram,
  TrueMula: Swisseph.SiderealMode.TrueMula,
  DhruvaGalCenterMulaWilhelm: Swisseph.SiderealMode.DhruvaGalCenterMulaWilhelm,
  Aryabhata522: Swisseph.SiderealMode.Aryabhata522,
  BabylBritton: Swisseph.SiderealMode.BabylBritton,
  // IDs 39-46: supported natively, missing from @swisseph/node TS enum
  TrueSheoran: 39 as Swisseph.SiderealMode,
  GalacticCenterCochrane: 40 as Swisseph.SiderealMode,
  GalacticEquatorFiorenza: 41 as Swisseph.SiderealMode,
  ValensMoon: 42 as Swisseph.SiderealMode,
  Lahiri1940: 43 as Swisseph.SiderealMode,
  LahiriVP285: 44 as Swisseph.SiderealMode,
  KrishnamurtiVP291: 45 as Swisseph.SiderealMode,
  LahiriICRC: 46 as Swisseph.SiderealMode,
};

export const CELESTIAL_BODY: Record<CelestialBody, Swisseph.CelestialBody> = {
  Sun: Swisseph.Planet.Sun,
  Moon: Swisseph.Planet.Moon,
  Mars: Swisseph.Planet.Mars,
  Mercury: Swisseph.Planet.Mercury,
  Venus: Swisseph.Planet.Venus,
  Jupiter: Swisseph.Planet.Jupiter,
  Saturn: Swisseph.Planet.Saturn,
  MeanNode: Swisseph.LunarPoint.MeanNode,
  TrueNode: Swisseph.LunarPoint.TrueNode,
};

export const HOUSE_SYSTEM: Record<HouseSystem, Swisseph.HouseSystem> = {
  Placidus: Swisseph.HouseSystem.Placidus,
  Koch: Swisseph.HouseSystem.Koch,
  Porphyrius: Swisseph.HouseSystem.Porphyrius,
  Regiomontanus: Swisseph.HouseSystem.Regiomontanus,
  Campanus: Swisseph.HouseSystem.Campanus,
  Equal: Swisseph.HouseSystem.Equal,
  VehlowEqual: Swisseph.HouseSystem.VehlowEqual,
  WholeSign: Swisseph.HouseSystem.WholeSign,
  Meridian: Swisseph.HouseSystem.Meridian,
  Azimuthal: Swisseph.HouseSystem.Azimuthal,
  PolichPage: Swisseph.HouseSystem.PolichPage,
  Alcabitus: Swisseph.HouseSystem.Alcabitus,
  Morinus: Swisseph.HouseSystem.Morinus,
};

/**
 * Native `@swisseph/node` payloads, decoded at the adapter boundary before
 * entering domain types. Only consumed fields are modeled: the vendor house
 * system enum is ignored in favor of our validated `AstroParams` input, and
 * tropical longitudes are normalized before they leave the adapter.
 */
export const NativePlanetaryPosition = Schema.Struct({
  longitude: Schema.Finite,
  latitude: Schema.Finite,
  distance: Schema.Finite,
  longitudeSpeed: Schema.Finite,
  latitudeSpeed: Schema.Finite,
  distanceSpeed: Schema.Finite,
  flags: Schema.Finite,
});
export interface NativePlanetaryPosition extends Schema.Schema.Type<
  typeof NativePlanetaryPosition
> {}

/** Native house payload; `cusps` has thirteen slots and slot 0 is unused. */
export const NativeHouseData = Schema.Struct({
  cusps: Schema.Array(Schema.Finite),
  ascendant: Schema.Finite,
  mc: Schema.Finite,
  armc: Schema.Finite,
  vertex: Schema.Finite,
  equatorialAscendant: Schema.Finite,
  coAscendant1: Schema.Finite,
  coAscendant2: Schema.Finite,
  polarAscendant: Schema.Finite,
});
export interface NativeHouseData extends Schema.Schema.Type<typeof NativeHouseData> {}
