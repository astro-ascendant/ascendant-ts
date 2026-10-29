import * as Swisseph from "@swisseph/node";
import { DateTime, Effect, Schema, Semaphore } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { type Ayanamsa, type HouseSystem } from "../astro-params/model.js";
import { ChartAngles, CircleAngle, Houses } from "../chart/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import { type CelestialBody, HouseData, JulianDay } from "../ephemeris/model.js";
import { operationError } from "../utils/operation-error.js";
import { normalizeLongitude, signStartOf } from "../utils/position.js";
import { siderealModeOf, celestialBodyOf, houseSystemOf, nativeCuspOf } from "./helper.js";
import { NativeHouseData, NativePlanetaryPosition } from "./model.js";

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
    const sidereal = (angle: number) =>
      Effect.map(normalizeLongitude(angle - offset), (longitude) => CircleAngle.make(longitude));
    const ascendant = yield* normalizeLongitude(houses.ascendant - offset);
    const signStart = yield* signStartOf(ascendant);
    const cusps = yield* Effect.forEach(Houses.literals, (house) =>
      Effect.gen(function* () {
        const cusp =
          houseSystem === "WholeSign"
            ? signStart + (house - 1) * 30
            : (yield* nativeCuspOf(houses, house)) - offset;
        return [house, yield* normalizeLongitude(cusp)] as const;
      }),
    );
    const angles = ChartAngles.make({
      ascendant: CircleAngle.make(ascendant),
      mc: yield* sidereal(houses.mc),
      armc: CircleAngle.make(yield* normalizeLongitude(houses.armc)),
      vertex: yield* sidereal(houses.vertex),
      equatorialAscendant: yield* sidereal(houses.equatorialAscendant),
      coAscendant1: yield* sidereal(houses.coAscendant1),
      coAscendant2: yield* sidereal(houses.coAscendant2),
      polarAscendant: yield* sidereal(houses.polarAscendant),
    });

    return yield* Schema.decodeUnknownEffect(HouseData)({
      houseSystem,
      cusps: Object.fromEntries(cusps),
      angles,
    });
  }).pipe(ephemerisError("calculateHouses"));
});
