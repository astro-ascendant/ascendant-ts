import { HashSet, Record } from "effect";

import type { Houses, PlanetDignity, Rashis } from "../../chart/model.js";
import type { ClassicalPlanets, Role } from "../../jaimini/chara-karakas/index.js";
import { EligibleBrahmaPlanets } from "../model.js";

export const ELIGIBLE_BRAHMA_PLANETS = HashSet.fromIterable(EligibleBrahmaPlanets.literals);

export const DIGNITY_BALA: Record.ReadonlyRecord<PlanetDignity, number> = {
  EXALTED: 60,
  MOOLA_TRIKONA: 45,
  OWN: 30,
  FRIEND: 22.5,
  NEUTRAL: 15,
  ENEMY: 7.5,
  DEBILITATED: 3.75,
};

export const KARAKA_BALA: Record.ReadonlyRecord<Role, number> = {
  Atmakaraka: 60,
  Amatyakaraka: 45,
  Bhratrikaraka: 30,
  Matrikaraka: 22.5,
  Putrakaraka: 15,
  Gnatikaraka: 7.5,
  Darakaraka: 3.75,
};

export const NATURAL_STRENGTH: Record.ReadonlyRecord<ClassicalPlanets, number> = {
  Sun: 7,
  Moon: 6,
  Venus: 5,
  Jupiter: 4,
  Mercury: 3,
  Mars: 2,
  Saturn: 1,
};

export const KENDRADI_BALA = {
  1: 60,
  4: 60,
  7: 60,
  10: 60, // Kendra
  2: 30,
  5: 30,
  8: 30,
  11: 30, // Panapara
  3: 15,
  6: 15,
  9: 15,
  12: 15, // Apoklima
} as const satisfies { readonly [H in Houses]: 60 | 30 | 15 };

export const CHARA_BALA = {
  Aries: 15,
  Cancer: 15,
  Libra: 15,
  Capricorn: 15, // Movable
  Taurus: 30,
  Leo: 30,
  Scorpio: 30,
  Aquarius: 30, // Fixed
  Gemini: 60,
  Virgo: 60,
  Sagittarius: 60,
  Pisces: 60, // Dual
} as const satisfies { readonly [S in Rashis]: 15 | 30 | 60 };

export const SIGN_DURATION = {
  Aries: 7,
  Cancer: 7,
  Libra: 7,
  Capricorn: 7, // Movable
  Taurus: 8,
  Leo: 8,
  Scorpio: 8,
  Aquarius: 8, // Fixed
  Gemini: 9,
  Virgo: 9,
  Sagittarius: 9,
  Pisces: 9, // Dual
} as const satisfies { readonly [S in Rashis]: 7 | 8 | 9 };
