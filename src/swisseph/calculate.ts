import * as Swisseph from "@swisseph/node";
import { DateTime, Effect, Schema, Semaphore } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import { type Ayanamsa, type HouseSystem } from "../astro-params/model.js";
import { ChartAngles, CircleAngle, Houses, Longitude, type Planets } from "../chart/model.js";
import { EphemerisError } from "../ephemeris/error.js";
import { HouseData, JulianDay, PlanetaryPosition } from "../ephemeris/model.js";
import { Zodiac } from "../utils/index.js";
import { operationError } from "../utils/operation-error.js";
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

export const calculatePosition = Effect.fnUntraced(function* (
  julianDay: number,
  planet: Planets,
  ayanamsa: Ayanamsa,
) {
  const mode = siderealModeOf(ayanamsa);
  const cb = yield* celestialBodyOf(planet);
  const native = yield* NATIVE_SIDEREAL_MODE_LOCK.withPermit(
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
  // Ketu is the point opposite Rahu: same speed along the ecliptic, mirrored latitude.
  const opposite = planet === "Ketu";
  return PlanetaryPosition.make({
    longitude: Longitude.normalize(native.longitude + (opposite ? 180 : 0)),
    latitude: opposite ? -native.latitude : native.latitude,
    distance: native.distance,
    longitudeSpeed: native.longitudeSpeed,
    latitudeSpeed: opposite ? -native.latitudeSpeed : native.latitudeSpeed,
    distanceSpeed: native.distanceSpeed,
  });
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
    const sidereal = (angle: number) => CircleAngle.normalize(angle - offset);
    const ascendant = Longitude.normalize(houses.ascendant - offset);
    const signStart = Zodiac.signStartOf(Zodiac.signOfLongitude(ascendant));
    const cusps = yield* Effect.forEach(Houses.literals, (house) =>
      Effect.gen(function* () {
        const cusp =
          houseSystem === "WholeSign"
            ? signStart + (house - 1) * 30
            : (yield* nativeCuspOf(houses, house)) - offset;
        return [house, Longitude.normalize(cusp)] as const;
      }),
    );
    const angles = ChartAngles.make({
      ascendant: CircleAngle.make(ascendant),
      mc: sidereal(houses.mc),
      armc: CircleAngle.normalize(houses.armc),
      vertex: sidereal(houses.vertex),
      equatorialAscendant: sidereal(houses.equatorialAscendant),
      coAscendant1: sidereal(houses.coAscendant1),
      coAscendant2: sidereal(houses.coAscendant2),
      polarAscendant: sidereal(houses.polarAscendant),
    });

    return yield* Schema.decodeUnknownEffect(HouseData)({
      houseSystem,
      cusps: Object.fromEntries(cusps),
      angles,
    });
  }).pipe(ephemerisError("calculateHouses"));
});
