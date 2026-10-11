import { Schema } from "effect";

// Ordered by Swiss Ephemeris SE_SIDM numeric ID (0-46).
// Note: this is catalog order, not recency - e.g. J2000 (18) is modern but early in the list.
export const Ayanamsa = Schema.Literals([
  "FaganBradley",
  "Lahiri",
  "DeLuce",
  "Raman",
  "Ushashashi",
  "Krishnamurti",
  "DjwhalKhul",
  "Yukteshwar",
  "JNBhasin",
  "BabylKugler1",
  "BabylKugler2",
  "BabylKugler3",
  "BabylHuber",
  "BabylEtPSC",
  "Aldebaran15Tau",
  "Hipparchos",
  "Sassanian",
  "GalacticCenter0Sag",
  "J2000",
  "J1900",
  "B1950",
  "SuryaSiddhanta",
  "SuryaSiddhantaMeanSun",
  "Aryabhata",
  "AryabhataMeanSun",
  "SSRevati",
  "SSCitra",
  "TrueCitra",
  "TrueRevati",
  "TruePushya",
  "GalacticCenterGilBrand",
  "GalacticEquatorIAU1958",
  "GalacticEquator",
  "GalacticEquatorMidMula",
  "Skydram",
  "TrueMula",
  "DhruvaGalCenterMulaWilhelm",
  "Aryabhata522",
  "BabylBritton",
  "TrueSheoran",
  "GalacticCenterCochrane",
  "GalacticEquatorFiorenza",
  "ValensMoon",
  "Lahiri1940",
  "LahiriVP285",
  "KrishnamurtiVP291",
  "LahiriICRC",
]);

export const HouseSystem = Schema.Literals([
  "Placidus",
  "Koch",
  "Porphyrius",
  "Regiomontanus",
  "Campanus",
  "Equal",
  "VehlowEqual",
  "WholeSign",
  "Meridian",
  "Azimuthal",
  "PolichPage",
  "Alcabitus",
  "Morinus",
]);
export type Ayanamsa = typeof Ayanamsa.Type;
export type HouseSystem = typeof HouseSystem.Type;

export const Options = Schema.Struct({
  ayanamsa: Ayanamsa,
  houseSystem: HouseSystem,
});
export interface Options extends Schema.Schema.Type<typeof Options> {}
