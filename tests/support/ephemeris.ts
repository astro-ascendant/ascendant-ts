import { DateTime, Effect, Function, Layer } from "effect";

import type { Ayanamsa, HouseSystem } from "../../src/astro-params/model.js";
import { CircleAngle, Houses, Longitude, type Planets } from "../../src/chart/model.js";
import type { EphemerisError } from "../../src/ephemeris/error.js";
import { type HouseData, JulianDay, type PlanetaryPosition } from "../../src/ephemeris/model.js";
import { Ephemeris } from "../../src/ephemeris/service.js";

const JD_UNIX_EPOCH = 2_440_587.5;
const MS_PER_DAY = 86_400_000;

function normalized(longitude: number): Longitude {
  return Longitude.make(((longitude % 360) + 360) % 360);
}

/** A position on the ecliptic plane at unit distance, with any longitude wrapped into [0, 360). */
export const planetaryPosition: {
  (longitudeSpeed: number): (longitude: number) => PlanetaryPosition;
  (longitude: number, longitudeSpeed: number): PlanetaryPosition;
} = Function.dual(2, (longitude: number, longitudeSpeed: number): PlanetaryPosition => ({
  longitude: normalized(longitude),
  latitude: 0,
  distance: 1,
  longitudeSpeed,
  latitudeSpeed: 0,
  distanceSpeed: 0,
}));

/** Twelve whole-sign cusps from 0° Aries, one per house in order. */
export const WHOLE_SIGN_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

/** Domain house evidence from twelve cusps in house order; the ascendant is the first cusp. */
export const houseData: {
  (houseSystem: HouseSystem): (cusps: ReadonlyArray<number>) => HouseData;
  (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData;
} = Function.dual(2, (cusps: ReadonlyArray<number>, houseSystem: HouseSystem): HouseData => {
  if (cusps.length !== Houses.literals.length) {
    throw new Error(`Expected twelve cusps, received ${cusps.length}`);
  }
  const angle = (value: number) => CircleAngle.make(value);
  const byHouse = {} as { [House in Houses]: Longitude };
  for (const house of Houses.literals) {
    byHouse[house] = Longitude.make(cusps[house - 1]!);
  }
  return {
    houseSystem,
    cusps: byHouse,
    angles: {
      ascendant: angle(cusps[0]!),
      mc: angle(270),
      armc: angle(270),
      vertex: angle(90),
      equatorialAscendant: angle(0),
      coAscendant1: angle(0),
      coAscendant2: angle(0),
      polarAscendant: angle(0),
    },
  };
});

/** Default sidereal longitudes: thirty degrees apart from the Sun, with Rahu in Sagittarius. */
const DEFAULT_LONGITUDES: Record<Exclude<Planets, "Ketu">, number> = {
  Sun: 0,
  Moon: 30,
  Mars: 60,
  Mercury: 90,
  Venus: 120,
  Jupiter: 150,
  Saturn: 180,
  Rahu: 240,
};

export interface EphemerisTestOptions {
  /** Twelve cusps in house order; defaults to whole signs from 0° Aries. */
  readonly cusps?: ReadonlyArray<number>;
  /** Fixed sidereal longitude per planet; Ketu defaults to the point opposite Rahu. */
  readonly longitudes?: Partial<Record<Planets, number>>;
  /** Planets reported with negative longitude speed. */
  readonly retrograde?: ReadonlyArray<Planets>;
  /** Replaces fixed longitudes with any position lookup, e.g. motion over time or failures. */
  readonly position?: (
    julianDay: JulianDay,
    planet: Planets,
  ) => Effect.Effect<PlanetaryPosition, EphemerisError>;
  /** Replaces the fixed house evidence, e.g. to count calls. */
  readonly houses?: (houseSystem: HouseSystem) => Effect.Effect<HouseData, EphemerisError>;
}

/**
 * The in-memory Ephemeris adapter for tests: fixed or scripted positions, fixed house
 * evidence, and the real Julian Day conversion for dates.
 */
export function ephemerisTestLayer(options: EphemerisTestOptions = {}) {
  const cusps = options.cusps ?? WHOLE_SIGN_CUSPS;
  const retrograde = new Set(options.retrograde ?? []);
  function longitudeOf(planet: Planets): number {
    const fixed = options.longitudes?.[planet];
    if (fixed !== undefined) return fixed;
    if (planet === "Ketu") return longitudeOf("Rahu") + 180;
    return DEFAULT_LONGITUDES[planet];
  }
  function fixedPosition(_julianDay: JulianDay, planet: Planets) {
    return Effect.succeed(planetaryPosition(longitudeOf(planet), retrograde.has(planet) ? -1 : 1));
  }
  const position = options.position ?? fixedPosition;
  const houses =
    options.houses ?? ((houseSystem: HouseSystem) => Effect.succeed(houseData(cusps, houseSystem)));

  return Layer.succeed(
    Ephemeris,
    Ephemeris.of({
      dateToJulianDay: (date: DateTime.DateTime) =>
        Effect.succeed(JulianDay.make(DateTime.toEpochMillis(date) / MS_PER_DAY + JD_UNIX_EPOCH)),
      calculatePosition: (julianDay: JulianDay, planet: Planets, _ayanamsa: Ayanamsa) =>
        position(julianDay, planet),
      calculateHouses: (
        _julianDay: JulianDay,
        _latitude: number,
        _longitude: number,
        houseSystem: HouseSystem,
        _ayanamsa: Ayanamsa,
      ) => houses(houseSystem),
    }),
  );
}

export const EphemerisTestLayer = ephemerisTestLayer();
