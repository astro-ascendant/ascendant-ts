import { Console, Effect, Record as EffectRecord } from "effect";

import { starOf, subLordOf, subSubLordOf } from "../src/chart/helper.js";
import type { ChartCalculation, Chart } from "../src/chart/index.js";

type TableValue = string | number | boolean;
type TableRow = Readonly<Record<string, TableValue>>;

function displayLongitude(longitude: number): number {
  return Number(longitude.toFixed(6));
}

function displayOptionalLongitude(longitude: number | undefined): TableValue {
  return longitude === undefined ? "—" : displayLongitude(longitude);
}

const houseRows = Effect.fn(function* (chart: Chart) {
  const rows: TableRow[] = [];

  for (const [houseNumber, houseData] of EffectRecord.toEntries(chart.houses)) {
    const house = Number(houseNumber);
    const cusp = displayOptionalLongitude(houseData.cusp);
    const before = rows.length;

    if (houseData.lagna !== null) {
      const lagna = houseData.lagna;
      rows.push({
        House: house,
        Cusp: cusp,
        Point: lagna.name,
        "Sign Lord": lagna.sign.lord,
        "Star Lord": (yield* starOf(lagna.longitude)).lord,
        "Sub Lord": yield* subLordOf(lagna.longitude),
        "Sub-Sub Lord": yield* subSubLordOf(lagna.longitude),
        Longitude: displayLongitude(lagna.longitude),
        Degree: displayLongitude(lagna.degree),
        Sign: lagna.sign.name,
        Dignity: "—",
        Retrograde: "—",
      });
    }

    for (const planet of houseData.planets) {
      rows.push({
        House: house,
        Cusp: cusp,
        Point: planet.name,
        "Sign Lord": planet.sign.lord,
        "Star Lord": (yield* starOf(planet.longitude)).lord,
        "Sub Lord": yield* subLordOf(planet.longitude),
        "Sub-Sub Lord": yield* subSubLordOf(planet.longitude),
        Longitude: displayLongitude(planet.longitude),
        Degree: displayLongitude(planet.degree),
        Sign: planet.sign.name,
        Dignity: planet.in_sign.join(", ") || "—",
        Retrograde: planet.is_retrograde,
      });
    }

    if (rows.length === before) {
      rows.push({
        House: house,
        Cusp: cusp,
        Point: "—",
        "Sign Lord": houseData.signLord ?? "—",
        "Star Lord": houseData.starLord ?? "—",
        "Sub Lord": houseData.subLord ?? "—",
        "Sub-Sub Lord": houseData.subSubLord ?? "—",
        Longitude: "—",
        Degree: "—",
        Sign: "—",
        Dignity: "—",
        Retrograde: "—",
      });
    }
  }

  return rows;
});

function significationRows(chart: Chart): readonly TableRow[] {
  return EffectRecord.toEntries(chart.houses).map(([houseNumber, houseData]) => ({
    House: Number(houseNumber),
    Cusp: displayOptionalLongitude(houseData.cusp),
    "Sign Lord": houseData.signLord ?? "—",
    "Star Lord": houseData.starLord ?? "—",
    "Sub Lord": houseData.subLord ?? "—",
    "Sub-Sub Lord": houseData.subSubLord ?? "—",
    Significations: houseData.significations?.join(", ") ?? "—",
  }));
}

function planetSignificationRows(chart: Chart): readonly TableRow[] {
  if (chart.planetSignifications === undefined) return [];

  return EffectRecord.toEntries(chart.planetSignifications).map(([planet, signification]) => ({
    Planet: planet,
    "Level 1": signification.level1.join(", ") || "—",
    "Level 2": signification.level2.join(", ") || "—",
    "Level 3": signification.level3.join(", ") || "—",
    "Level 4": signification.level4.join(", ") || "—",
  }));
}

function houseSignificatorRows(chart: Chart): readonly TableRow[] {
  if (chart.houseSignificators === undefined) return [];

  return EffectRecord.toEntries(chart.houseSignificators).map(([houseNumber, significators]) => ({
    House: Number(houseNumber),
    "Level 1": significators.level1.join(", ") || "—",
    "Level 2": significators.level2.join(", ") || "—",
    "Level 3": significators.level3.join(", ") || "—",
    "Level 4": significators.level4.join(", ") || "—",
  }));
}

export interface PrintChartOptions {
  readonly includeSignificators?: boolean;
  readonly includeRulingPlanets?: boolean;
}

export const printChartCalculation = Effect.fn(function* (
  calculation: ChartCalculation,
  options: PrintChartOptions = {},
) {
  const { includeSignificators = true, includeRulingPlanets = true } = options;

  for (const chart of calculation.charts) {
    const division = `D${chart.division}`;

    yield* Console.log("");
    yield* Console.log(`========== ${division} ==========`);
    yield* Console.log(
      `Chart ${division} (${calculation.astroParams.houseSystem}, ${calculation.astroParams.ayanamsa})`,
    );
    yield* Console.table(yield* houseRows(chart));

    if (includeSignificators) {
      yield* Console.log("House Significations");
      yield* Console.table(significationRows(chart));

      yield* Console.log("Planet Significations");
      yield* Console.table(planetSignificationRows(chart));

      yield* Console.log("House Significators");
      yield* Console.table(houseSignificatorRows(chart));
    }

    if (includeRulingPlanets) {
      yield* Console.log("Ruling Planets");
      yield* Console.table(
        (chart.rulingPlanets ?? []).map((planet, index) => ({
          Rank: index + 1,
          Planet: planet,
        })),
      );
    }
  }
});
