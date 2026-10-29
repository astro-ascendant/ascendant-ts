/**
 * Chart projection: turns Placements and the D1 house evidence into the
 * requested Charts. D1 houses begin at the House system's cusps and carry the
 * KP evidence; divisional houses are whole Signs counted from the mapped
 * Lagna (ADR-0008).
 */
import { Array, Effect, HashMap, Option, Order, pipe, Record, Schema } from "effect";
import type { DateTime as DateTimeType } from "effect/DateTime";

import type { HouseData } from "../ephemeris/model.js";
import { divisionalChartProjection, d1ChartProjection } from "../provenance.js";
import { Zodiac } from "../utils/index.js";
import { EPS_CIRCLE } from "../utils/position.js";
import { getDivisionalTarget } from "./divisional-mapping/calculate.js";
import { ChartCalculationError } from "./error.js";
import { inSignStatus, starOf, subLordOf, subSubLordOf } from "./helper.js";
import { dayLord } from "./internal/position.js";
import {
  type Division,
  DivisionalChart,
  DivisionalDivision,
  DivisionalHouse,
  DivisionalHouses,
  HOUSE_SIGNIFICATIONS,
  HouseSignificators,
  Houses,
  Lagna,
  type Longitude,
  type Placements,
  Planet,
  PlanetSignification,
  Planets,
  D1Chart,
  D1House,
  D1Houses,
  type Sex,
  Sign,
} from "./model.js";

interface MappedPoints {
  readonly lagna: Lagna;
  readonly planets: readonly Planet[];
}

function signOfIndex(signIndex: number): Sign {
  const name = Zodiac.signAt(signIndex);
  return Sign.make({ name, lord: Zodiac.lordOf(name) });
}

/** Maps the Lagna and planets into a Division, keeping source retrograde state. */
const mapPoints = Effect.fn("astro-ascendant/chart/mapPoints")(
  function* (placements: Placements, division: Division) {
    const mappedLagna = yield* getDivisionalTarget(placements.lagna.longitude, division);
    const lagna = Lagna.make({
      name: "Lagna",
      longitude: mappedLagna.longitude,
      degree: mappedLagna.degree,
      sign: signOfIndex(mappedLagna.signIndex),
    });
    const planets = yield* Effect.forEach(placements.planets, (source) =>
      Effect.map(getDivisionalTarget(source.longitude, division), (mapped) =>
        Planet.make({
          name: source.name,
          longitude: mapped.longitude,
          degree: mapped.degree,
          is_retrograde: source.is_retrograde,
          in_sign: inSignStatus(source.name, mapped.longitude),
          sign: signOfIndex(mapped.signIndex),
        }),
      ),
    );

    return { lagna, planets } satisfies MappedPoints;
  },
  Effect.mapError((cause) =>
    ChartCalculationError.make({
      stage: "mapping",
      message: "Could not map one or more requested Divisions",
      cause,
    }),
  ),
);

/** Forward span of each D1 house, failing when the cusps do not partition the circle. */
const houseSpans = Effect.fn("astro-ascendant/chart/houseSpans")(function* (
  cusps: ReadonlyArray<Longitude>,
) {
  const spans = cusps.map((cusp, index) =>
    Zodiac.forwardArc(cusp, Array.getUnsafe(cusps, (index + 1) % cusps.length)),
  );
  const fullCircle = spans.reduce((total, span) => total + span, 0);
  if (spans.some((span) => span === 0) || Math.abs(fullCircle - 360) > EPS_CIRCLE) {
    return yield* ChartCalculationError.make({
      stage: "houses",
      message: "House system cusps do not divide the circle into twelve houses",
      cause: cusps,
    });
  }
  return spans;
});

function planetsInCuspHouses(
  planets: readonly Planet[],
  cusps: ReadonlyArray<Longitude>,
  spans: ReadonlyArray<number>,
): ReadonlyArray<readonly Planet[]> {
  const houseIndexOf = (planet: Planet) =>
    cusps.findIndex(
      (cusp, index) => Zodiac.forwardArc(cusp, planet.longitude) < Array.getUnsafe(spans, index),
    );
  return cusps.map((_, index) => planets.filter((planet) => houseIndexOf(planet) === index));
}

function houseOfPlanet(planet: Planets, houses: readonly D1House[]): Houses {
  const index = houses.findIndex((house) => house.planets.some((item) => item.name === planet));
  return (index + 1) as Houses;
}

function ownedHouses(planet: Planets, houses: readonly D1House[]): readonly Houses[] {
  return Houses.literals.filter(
    (house) => Zodiac.lordOf(Zodiac.signOfLongitude(Array.getUnsafe(houses, house - 1).cusp)) === planet,
  );
}

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

/** A node's agent: its nearest conjunct planet in the same house, else its Sign lord. */
function agentOf(node: Planet, houses: readonly D1House[]): Planets {
  const house = houses.find((item) => item.planets.some(({ name }) => name === node.name));
  const conjunction =
    house === undefined
      ? undefined
      : Array.sort(
          house.planets.filter((item) => item.name !== node.name),
          Order.mapInput(Order.Number, (candidate: Planet) =>
            Zodiac.separation(candidate.longitude, node.longitude),
          ),
        )[0];

  return conjunction?.name ?? node.sign.lord;
}

const planetSignificationOf = Effect.fn("astro-ascendant/chart/planetSignificationOf")(function* (
  planet: Planets,
  byName: HashMap.HashMap<Planets, Planet>,
  allHouses: readonly D1House[],
) {
  const item = HashMap.get(byName, planet);

  const agent: Option.Option<Planets> =
    Option.isSome(item) && (planet === "Rahu" || planet === "Ketu")
      ? Option.some(agentOf(item.value, allHouses))
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
  const level3 = Option.isSome(starLord) ? ownedHouses(starLord.value, allHouses) : [];
  const level4 = ownedHouses(planet, allHouses);

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
  chartHouse: D1House,
  planets: readonly Planet[],
) {
  const occupants = chartHouse.planets.map((planet) => planet.name);
  const owner = Zodiac.lordOf(Zodiac.signOfLongitude(chartHouse.cusp));
  const level1 = (yield* Effect.forEach(occupants, (o) => planetsInStarOf(o, planets))).flat();
  const level3 = yield* planetsInStarOf(owner, planets);

  return [
    String(house),
    HouseSignificators.make({ house, level1, level2: occupants, level3, level4: [owner] }),
  ] as const;
});

const significationsOf = Effect.fn("astro-ascendant/chart/significationsOf")(function* (
  houses: D1Houses,
  lagna: Lagna,
  date: DateTimeType,
) {
  const allHouses = Houses.literals.map((house) => houses[house]);
  const planets = allHouses.flatMap((house) => house.planets);
  const byName = HashMap.fromIterable(planets.map((planet) => [planet.name, planet] as const));

  const significations = yield* Effect.forEach(Planets.literals, (planet) =>
    planetSignificationOf(planet, byName, allHouses),
  );
  const houseSignificators = yield* Effect.forEach(Houses.literals, (house) =>
    houseSignificatorsOf(house, houses[house], planets),
  );

  const moon = HashMap.get(byName, "Moon");
  const ascendantStarLord = (yield* starOf(lagna.longitude)).lord;
  const ascendantSignLord = Zodiac.lordOf(lagna.sign.name);
  const moonStarLord = Option.isSome(moon)
    ? (yield* starOf(moon.value.longitude)).lord
    : ascendantStarLord;
  const moonSignLord = Option.match(moon, {
    onNone: () => ascendantSignLord,
    onSome: (m) => m.sign.lord,
  });

  return {
    planetSignifications: Record.fromEntries(significations),
    houseSignificators: Record.fromEntries(houseSignificators),
    rulingPlanets: [
      ascendantStarLord,
      ascendantSignLord,
      moonStarLord,
      moonSignLord,
      dayLord(date),
    ] as const,
  };
});

const decodeChart = Effect.fn("astro-ascendant/chart/decodeChart")(function* <A, I>(
  schema: Schema.Codec<A, I>,
  input: unknown,
) {
  return yield* Schema.decodeUnknownEffect(schema)(input).pipe(
    Effect.mapError((cause) =>
      ChartCalculationError.make({ stage: "mapping", message: "Could not build chart", cause }),
    ),
  );
});

const d1Chart = Effect.fn("astro-ascendant/chart/d1Chart")(function* (
  placements: Placements,
  evidence: HouseData,
  date: DateTimeType,
  sex: Sex | undefined,
) {
  const { lagna, planets } = yield* mapPoints(placements, 1);
  const cusps = Houses.literals.map((house) => evidence.cusps[house]);
  const spans = yield* houseSpans(cusps);
  const occupants = planetsInCuspHouses(planets, cusps, spans);

  const entries = yield* Effect.forEach(Houses.literals, (house) =>
    Effect.gen(function* () {
      const cusp = evidence.cusps[house];
      const sign = Zodiac.signOfLongitude(cusp);
      return [
        String(house),
        D1House.make({
          sign,
          cusp,
          signLord: Zodiac.lordOf(sign),
          starLord: (yield* starOf(cusp)).lord,
          subLord: yield* subLordOf(cusp),
          subSubLord: yield* subSubLordOf(cusp),
          significations: HOUSE_SIGNIFICATIONS[house],
          planets: Array.getUnsafe(occupants, house - 1),
          lagna: house === 1 ? lagna : null,
        }),
      ] as const;
    }),
  );
  const houses = yield* decodeChart(D1Houses, Record.fromEntries(entries));
  const significations = yield* significationsOf(houses, lagna, date);

  return yield* decodeChart(D1Chart, {
    ...(sex === undefined ? {} : { sex }),
    provenance: d1ChartProjection.provenance,
    division: 1,
    houses,
    angles: evidence.angles,
    ...significations,
  });
});

const divisionalChart = Effect.fn("astro-ascendant/chart/divisionalChart")(function* (
  placements: Placements,
  division: DivisionalDivision,
  sex: Sex | undefined,
) {
  const { lagna, planets } = yield* mapPoints(placements, division);
  const lagnaIndex = Zodiac.rashiIndexOf(lagna.sign.name);

  const entries = Houses.literals.map((house) => {
    const sign = Zodiac.signAt(lagnaIndex + house - 1);
    return [
      String(house),
      DivisionalHouse.make({
        sign,
        cusp: Zodiac.signStartOf(sign),
        signLord: Zodiac.lordOf(sign),
        significations: HOUSE_SIGNIFICATIONS[house],
        planets: planets.filter((planet) => planet.sign.name === sign),
        lagna: house === 1 ? lagna : null,
      }),
    ] as const;
  });

  return yield* decodeChart(DivisionalChart, {
    ...(sex === undefined ? {} : { sex }),
    provenance: divisionalChartProjection.provenance,
    division,
    houses: yield* decodeChart(DivisionalHouses, Record.fromEntries(entries)),
  });
});

/** The requested divisional Divisions, without D1, each once and in ascending order. */
export function requestedDivisions(divisions: readonly Division[]): readonly DivisionalDivision[] {
  return pipe(
    divisions,
    Array.filter((division): division is DivisionalDivision => division !== 1),
    Array.dedupe,
    Array.sort(Order.Number),
  );
}

/** Projects Placements and D1 house evidence into D1 followed by the requested divisional charts. */
export const projectCharts = Effect.fn("astro-ascendant/chart/projectCharts")(function* (
  placements: Placements,
  houses: HouseData,
  date: DateTimeType,
  divisions: readonly Division[],
  sex: Sex | undefined,
) {
  const [d1, divisional] = yield* Effect.all(
    [
      d1Chart(placements, houses, date, sex),
      Effect.forEach(requestedDivisions(divisions), (division) =>
        divisionalChart(placements, division, sex),
      ),
    ],
    { concurrency: "unbounded" },
  );

  return [d1, ...divisional] as const;
});
