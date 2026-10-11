import { Array, Effect, HashMap, Option, Order, Record, Schema } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import type { HouseData } from "../ephemeris/model.js";
import { chartProjection } from "../provenance.js";
import { EPS_CIRCLE, normalizeLongitude, signStartOf } from "../utils/position.js";
import type { MappedPositions } from "./charts.js";
import { angularDistance, distributePlanets, forwardDistance } from "./cusp.js";
import { getDivisionalTarget } from "./divisional-mapping/calculate.js";
import { ChartCalculationError } from "./error.js";
import { starOf, subLordOf, subSubLordOf } from "./helper.js";
import { SIGN_LORDS } from "./internal/constants.js";
import { dayLord, signAt, signLordOf } from "./internal/position.js";
import {
  ChartAngles,
  Chart,
  ChartHouses,
  CircleAngle,
  type Division,
  HouseSignificators,
  House,
  Houses,
  type Lagna,
  Longitude,
  HOUSE_SIGNIFICATIONS,
  type Planet,
  PlanetSignification,
  Planets,
} from "./model.js";

const PLANET_NAMES = Planets.literals;

function houseOfPlanet(planet: Planets, houses: readonly House[]): Houses {
  const index = houses.findIndex((house) => house.planets.some((item) => item.name === planet));
  return (index + 1) as Houses;
}

const ownedHouses = Effect.fn("astro-ascendant/chart/ownedHouses")(
  (planet: Planets, houses: readonly House[]) =>
    Effect.forEach(houses, (house, index) =>
      signAt(house.cusp).pipe(
        Effect.map((sign) => (SIGN_LORDS[sign] === planet ? [(index + 1) as Houses] : [])),
      ),
    ).pipe(Effect.map((groups) => groups.flat())),
);

const planetsInStarOf = Effect.fn("astro-ascendant/chart/planetsInStarOf")(function* (
  starLord: Planets,
  planets: readonly Planet[],
) {
  const names: Array<Planets> = [];
  for (const planet of planets) {
    if ((yield* starOf(planet.longitude)).lord === starLord) {
      names.push(planet.name);
    }
  }
  return names;
});

const agentOf = Effect.fn("astro-ascendant/chart/agentOf")(function* (
  planet: Planet,
  houses: readonly House[],
) {
  if (planet.name !== "Rahu" && planet.name !== "Ketu") {
    return yield* ChartCalculationError.make({
      message: `${planet.name} has no agent; only Rahu and Ketu do`,
      stage: "mapping",
      cause: planet.name,
    });
  }

  const house = houses.find((item) => item.planets.some(({ name }) => name === planet.name));

  const conjunction =
    house === undefined
      ? undefined
      : Array.sort(
          house.planets.filter((item) => item.name !== planet.name),
          Order.mapInput(Order.Number, (candidate: Planet) =>
            angularDistance(candidate.longitude, planet.longitude),
          ),
        )[0];

  return conjunction?.name ?? planet.sign.lord;
});

const planetSignificationOf = Effect.fn("astro-ascendant/chart/planetSignificationOf")(function* (
  planet: Planets,
  byName: HashMap.HashMap<Planets, Planet>,
  allHouses: readonly House[],
) {
  const item = HashMap.get(byName, planet);

  const agent: Option.Option<Planets> =
    Option.isSome(item) && (planet === "Rahu" || planet === "Ketu")
      ? Option.some(yield* agentOf(item.value, allHouses))
      : Option.none();

  // Star lord always comes from the planet's own longitude. Using the
  // agent's longitude here would attribute the agent's nakshatra to the
  // node instead of the node's own star (e.g. Rahu in Krittika/Sun).
  const starLord = Option.isSome(item)
    ? Option.some((yield* starOf(item.value.longitude)).lord)
    : Option.none();

  // AstroSage parity: ownership levels use the lord itself with no
  // node-agent expansion. Rahu/Ketu own no signs, so level3 is empty
  // when the star lord is a node and level4 is empty when the planet
  // itself is a node. The agent is still recorded on the result.
  const level1 = Option.isSome(starLord) ? [houseOfPlanet(starLord.value, allHouses)] : [];
  const level2 = [houseOfPlanet(planet, allHouses)];
  const level3 = Option.isSome(starLord) ? yield* ownedHouses(starLord.value, allHouses) : [];
  const level4 = yield* ownedHouses(planet, allHouses);

  return [
    planet,
    PlanetSignification.make({
      planet,
      ...(Option.isSome(agent) ? { agent: agent.value } : {}),
      level1,
      level2,
      level3,
      level4,
    }),
  ] as const;
});

const houseSignificatorsOf = Effect.fn("astro-ascendant/chart/houseSignificatorsOf")(function* (
  house: Houses,
  chartHouse: House,
  planets: readonly Planet[],
) {
  const occupants = chartHouse.planets.map((planet) => planet.name);
  const owner = SIGN_LORDS[yield* signAt(chartHouse.cusp)];
  const level1 = (yield* Effect.forEach(occupants, (o) => planetsInStarOf(o, planets))).flat();
  const level3 = yield* planetsInStarOf(owner, planets);

  return [
    String(house),
    HouseSignificators.make({ house, level1, level2: occupants, level3, level4: [owner] }),
  ] as const;
});

const calculateSignifications = Effect.fn("astro-ascendant/chart/calculateSignifications")(
  function* (houses: Readonly<Record<Houses, House>>, lagna: Lagna, date: DateTimeType) {
    const houseEntries = Houses.literals.map((house) => [house, houses[house]] as const);
    const allHouses = houseEntries.map(([, house]) => house);
    const planets = allHouses.flatMap((house) => house.planets);
    const byName = HashMap.fromIterable(planets.map((planet) => [planet.name, planet] as const));

    const significations = yield* Effect.forEach(PLANET_NAMES, (planet) =>
      planetSignificationOf(planet, byName, allHouses),
    );
    const houseSignificators = yield* Effect.forEach(houseEntries, ([house, chartHouse]) =>
      houseSignificatorsOf(house, chartHouse, planets),
    );

    const moon = HashMap.get(byName, "Moon");
    const ascendantStarLord = (yield* starOf(lagna.longitude)).lord;
    const ascendantSignLord = SIGN_LORDS[lagna.sign.name];
    const moonStarLord = Option.isSome(moon)
      ? (yield* starOf(moon.value.longitude)).lord
      : ascendantStarLord;
    const moonSignLord = Option.match(moon, {
      onNone: () => ascendantSignLord,
      onSome: (m) => m.sign.lord,
    });
    const dayLordOfDate = dayLord(date);

    return {
      planetSignifications: Record.fromEntries(significations) as Record<
        Planets,
        PlanetSignification
      >,
      houseSignificators: Record.fromEntries(houseSignificators) as Record<
        Houses,
        HouseSignificators
      >,
      rulingPlanets: [
        ascendantStarLord,
        ascendantSignLord,
        moonStarLord,
        moonSignLord,
        dayLordOfDate,
      ] as [Planets, Planets, Planets, Planets, Planets],
    };
  },
);

export const chartFromHouseData = Effect.fn("astro-ascendant/chart/chartFromHouseData")(function* (
  houses: HouseData,
  positions: MappedPositions,
  date: DateTimeType,
) {
  const { rawCusps } = yield* validateHouseInputs(houses);
  const { division, lagna, planets, sex } = positions;

  const { cusps, spans } = yield* mapCusps(rawCusps, houses.houseSystem, division, lagna);
  const chartHouses = yield* buildHouses(cusps, spans, planets, lagna);
  const significations = yield* calculateSignifications(chartHouses, lagna, date);
  const angles = yield* buildAngles(houses);

  return Chart.make({
    ...(sex === undefined ? {} : { sex }),
    provenance: chartProjection.provenance,
    division,
    houses: chartHouses,
    angles,
    ...significations,
  });
});

const validateHouseInputs = Effect.fn("astro-ascendant/chart/validateHouseInputs")(function* (
  houses: HouseData,
) {
  const rawCusps = houses.cusps.slice(1, 13);
  const rawAngles = [
    houses.ascendant,
    houses.mc,
    houses.armc,
    houses.vertex,
    houses.equatorialAscendant,
    houses.coAscendant1,
    houses.coAscendant2,
    houses.polarAscendant,
  ];

  if (
    rawCusps.length !== Houses.literals.length ||
    rawCusps.some((cusp) => !Number.isFinite(cusp)) ||
    rawAngles.some((angle) => !Number.isFinite(angle))
  ) {
    return yield* ChartCalculationError.make({
      stage: "mapping",
      message: "Could not calculate chart",
      cause: houses,
    });
  }

  return { rawCusps } as const;
});

const mapCusps = Effect.fn("astro-ascendant/chart/mapCusps")(function* (
  rawCusps: ReadonlyArray<number>,
  houseSystem: HouseData["houseSystem"],
  division: Division,
  lagna: Lagna,
) {
  const mappedCusps = yield* Effect.forEach(
    rawCusps,
    (cusp) =>
      normalizeLongitude(cusp).pipe(
        Effect.flatMap((longitude) => getDivisionalTarget(longitude, division)),
        Effect.map(({ longitude }) => longitude),
      ),
    { concurrency: "unbounded" },
  );

  const signStart = yield* signStartOf(lagna.longitude);
  const equalCusps = yield* Effect.forEach(Houses.literals, (_, index) =>
    normalizeLongitude(signStart + index * 30),
  );
  const mappedSpans: Array<number> = [];
  for (const [index, cusp] of mappedCusps.entries()) {
    const nextCusp = mappedCusps[(index + 1) % mappedCusps.length];
    mappedSpans.push(nextCusp === undefined ? Number.NaN : yield* forwardDistance(cusp, nextCusp));
  }
  const mappedFullCircle = mappedSpans.reduce((total, span) => total + span, 0);
  const cusps =
    houseSystem === "WholeSign" ||
    mappedSpans.some((span) => span === 0) ||
    Math.abs(mappedFullCircle - 360) > EPS_CIRCLE
      ? equalCusps
      : mappedCusps;
  const spans: Array<number> = [];
  for (const [index, cusp] of cusps.entries()) {
    const nextCusp = cusps[(index + 1) % cusps.length];
    spans.push(nextCusp === undefined ? Number.NaN : yield* forwardDistance(cusp, nextCusp));
  }
  const fullCircle = spans.reduce((total, span) => total + span, 0);
  if (spans.some((span) => span === 0) || Math.abs(fullCircle - 360) > EPS_CIRCLE) {
    return yield* ChartCalculationError.make({
      stage: "mapping",
      message: "Could not calculate chart",
      cause: rawCusps,
    });
  }

  return { cusps, spans } as const;
});

const buildHouses = Effect.fn("astro-ascendant/chart/buildHouses")(function* (
  cusps: ReadonlyArray<Longitude>,
  spans: ReadonlyArray<number>,
  planets: MappedPositions["planets"],
  lagna: Lagna,
) {
  const planetsByHouse = yield* distributePlanets(planets, cusps, spans);

  const houseEntries: Array<readonly [string, House]> = [];
  for (const [index, houseNumber] of Houses.literals.entries()) {
    const cusp = cusps[index];
    const housePlanets = planetsByHouse[index];
    if (cusp === undefined || housePlanets === undefined) {
      return yield* ChartCalculationError.make({
        stage: "mapping",
        message: "Could not calculate chart",
        cause: cusps,
      });
    }

    const sign = yield* signAt(cusp);
    const signLord = yield* signLordOf(cusp);
    const starLord = (yield* starOf(cusp)).lord;
    const subLord = yield* subLordOf(cusp);
    const subSubLord = yield* subSubLordOf(cusp);

    houseEntries.push([
      String(houseNumber),
      House.make({
        sign,
        cusp,
        signLord,
        starLord,
        subLord,
        subSubLord,
        significations: HOUSE_SIGNIFICATIONS[houseNumber],
        planets: housePlanets,
        lagna: index === 0 ? lagna : null,
      }),
    ]);
  }

  return yield* Schema.decodeUnknownEffect(ChartHouses)(Record.fromEntries(houseEntries)).pipe(
    Effect.mapError((cause) =>
      ChartCalculationError.make({
        stage: "mapping",
        message: "Could not calculate chart",
        cause,
      }),
    ),
  );
});

const buildAngles = Effect.fn("astro-ascendant/chart/buildAngles")(function* (houses: HouseData) {
  const ascendantAngle = yield* normalizeLongitude(houses.ascendant);
  const mcAngle = yield* normalizeLongitude(houses.mc);
  const armcAngle = yield* normalizeLongitude(houses.armc);
  const vertexAngle = yield* normalizeLongitude(houses.vertex);
  const equatorialAscendantAngle = yield* normalizeLongitude(houses.equatorialAscendant);
  const coAscendant1Angle = yield* normalizeLongitude(houses.coAscendant1);
  const coAscendant2Angle = yield* normalizeLongitude(houses.coAscendant2);
  const polarAscendantAngle = yield* normalizeLongitude(houses.polarAscendant);

  return ChartAngles.make({
    ascendant: CircleAngle.make(ascendantAngle),
    mc: CircleAngle.make(mcAngle),
    armc: CircleAngle.make(armcAngle),
    vertex: CircleAngle.make(vertexAngle),
    equatorialAscendant: CircleAngle.make(equatorialAscendantAngle),
    coAscendant1: CircleAngle.make(coAscendant1Angle),
    coAscendant2: CircleAngle.make(coAscendant2Angle),
    polarAscendant: CircleAngle.make(polarAscendantAngle),
  });
});
