import * as Swisseph from "@swisseph/node";
import { DateTime, Effect, Schema, Semaphore } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { type Ayanamsa, type HouseSystem } from "../astro-params/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import {
  NativeHouseData,
  NativePlanetaryPosition,
  type CelestialBody,
  JulianDay,
} from "../ephemeris/model.js";
import { operationError } from "../utils/operation-error.js";
import { normalizeLongitude } from "../utils/position.js";
import { siderealModeOf, celestialBodyOf, houseSystemOf, wholeSignCusps } from "./helper.js";

const NATIVE_SIDEREAL_MODE_LOCK = Semaphore.makeUnsafe(1);

const ephemerisError = operationError((args) => EphemerisError.make(args));

export const dateToJulianDay = Effect.fn("astro-ascendant/swisseph/dateToJulianDay")(function* (
  date: DateTimeType,
) {
  const raw = yield* Effect.try(() => Swisseph.dateToJulianDay(DateTime.toDate(date))).pipe(
    ephemerisError("dateToJulianDay"),
  );

  return yield* JulianDay.makeEffect(raw).pipe(ephemerisError("dateToJulianDay"));
});

export const calculatePosition = Effect.fn("astro-ascendant/swisseph/calculatePosition")(function* (
  julianDay: number,
  body: CelestialBody,
  ayanamsa: Ayanamsa,
) {
  const mode = siderealModeOf(ayanamsa);
  const cb = yield* celestialBodyOf(body);
  return yield* NATIVE_SIDEREAL_MODE_LOCK.withPermit(
    Effect.try(() => {
      Swisseph.setSiderealMode(mode);
      return Swisseph.calculatePosition(
        julianDay,
        cb,
        Swisseph.CalculationFlag.Sidereal | Swisseph.CalculationFlag.Speed,
      );
    }).pipe(
      Effect.flatMap((raw) => Schema.decodeEffect(NativePlanetaryPosition)(raw)),
      ephemerisError("calculatePosition"),
    ),
  );
});

export const calculateHouses = Effect.fn("astro-ascendant/swisseph/calculateHouses")(function* (
  julianDay: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystem,
  ayanamsa: Ayanamsa,
) {
  const mode = siderealModeOf(ayanamsa);
  const nativeHouseSystem = yield* houseSystemOf(houseSystem);
  const { houses, offset } = yield* NATIVE_SIDEREAL_MODE_LOCK.withPermit(
    Effect.try(() => {
      Swisseph.setSiderealMode(mode);
      return {
        houses: Swisseph.calculateHouses(julianDay, latitude, longitude, nativeHouseSystem),
        offset: Swisseph.getAyanamsa(julianDay),
      };
    }).pipe(
      Effect.flatMap(({ houses: rawHouses, offset }) =>
        Schema.decodeEffect(NativeHouseData)(rawHouses).pipe(
          Effect.map((houses) => ({ houses, offset })),
        ),
      ),
      ephemerisError("calculateHouses"),
    ),
  );
  return yield* Effect.gen(function* () {
    const ascendant = yield* normalizeLongitude(houses.ascendant - offset);
    const cusps =
      houseSystem === "WholeSign"
        ? yield* wholeSignCusps(houses, ascendant)
        : yield* Effect.forEach(houses.cusps, (cusp) => normalizeLongitude(cusp - offset));

    return {
      cusps,
      ascendant,
      mc: yield* normalizeLongitude(houses.mc - offset),
      armc: yield* normalizeLongitude(houses.armc),
      vertex: yield* normalizeLongitude(houses.vertex - offset),
      equatorialAscendant: yield* normalizeLongitude(houses.equatorialAscendant - offset),
      coAscendant1: yield* normalizeLongitude(houses.coAscendant1 - offset),
      coAscendant2: yield* normalizeLongitude(houses.coAscendant2 - offset),
      polarAscendant: yield* normalizeLongitude(houses.polarAscendant - offset),
      houseSystem,
    };
  }).pipe(ephemerisError("calculateHouses"));
});
