import { describe, expect, it } from "@effect/vitest";
import { Array, DateTime, Effect } from "effect";

import * as Dasha from "../src/dasha/index.js";
import { fixtures } from "./support/fixtures.js";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const VENUS_ORDER = [
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
  "Ketu",
] as const;

const LORD_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
} as const;

/** Lengths in days of a 120-day parent's children, which equal each lord's Mahadasha years. */
const VENUS_ORDER_DAYS = [20, 6, 10, 7, 18, 16, 19, 17, 7];

function lengthsOf(periods: ReadonlyArray<Dasha.PratyantarDasha | Dasha.SookshmaDasha>) {
  return periods.map(({ start, end }) => end.epochMilliseconds - start.epochMilliseconds);
}

function expectTiles(
  parent: { readonly start: DateTime.Utc; readonly end: DateTime.Utc },
  children: ReadonlyArray<{ readonly start: DateTime.Utc; readonly end: DateTime.Utc }>,
) {
  expect(children).toHaveLength(9);
  expect(children[0]!.start.epochMilliseconds).toBe(parent.start.epochMilliseconds);
  for (const [index, child] of children.entries()) {
    expect(child.start.epochMilliseconds).toBeLessThan(child.end.epochMilliseconds);
    if (index > 0) {
      expect(child.start.epochMilliseconds).toBe(children[index - 1]!.end.epochMilliseconds);
    }
  }
  expect(children[children.length - 1]!.end.epochMilliseconds).toBe(parent.end.epochMilliseconds);
}

describe("Dasha levels", () => {
  it("splits a 120-day Antardasha into Pratyantardashas of each lord's years in days", () => {
    const start = DateTime.makeUnsafe("2000-01-31T00:00:00.000Z");
    const antardasha = Dasha.AntarDasha.make({
      mahadasha: "Jupiter",
      antardasha: "Venus",
      start,
      end: DateTime.makeUnsafe(start.epochMilliseconds + 120 * DAY),
    });

    const periods = Dasha.pratyantardashas(antardasha);

    expect(periods.map(({ pratyantardasha }) => pratyantardasha)).toEqual(VENUS_ORDER);
    expect(lengthsOf(periods)).toEqual(VENUS_ORDER_DAYS.map((days) => days * DAY));
    expect(
      periods.every(
        ({ mahadasha, antardasha }) => mahadasha === "Jupiter" && antardasha === "Venus",
      ),
    ).toBe(true);
    expectTiles(antardasha, periods);
  });

  it("splits a Pratyantardasha into Sookshmas from its own lord", () => {
    const start = DateTime.makeUnsafe("2000-01-31T00:00:00.000Z");
    const pratyantardasha = Dasha.PratyantarDasha.make({
      mahadasha: "Jupiter",
      antardasha: "Saturn",
      pratyantardasha: "Venus",
      start,
      end: DateTime.makeUnsafe(start.epochMilliseconds + 120 * DAY),
    });

    const periods = Dasha.sookshmas(pratyantardasha);

    expect(periods.map(({ sookshma }) => sookshma)).toEqual(VENUS_ORDER);
    expect(lengthsOf(periods)).toEqual(VENUS_ORDER_DAYS.map((days) => days * DAY));
    expect(periods.every(({ pratyantardasha }) => pratyantardasha === "Venus")).toBe(true);
    expectTiles(pratyantardasha, periods);
  });

  it("puts boundaries on whole minutes after the parent's start", () => {
    // 1000 minutes is not a multiple of 120, so interior boundaries round, from a start off the minute.
    const start = DateTime.makeUnsafe("2000-01-01T00:00:30.000Z");
    const antardasha = Dasha.AntarDasha.make({
      mahadasha: "Sun",
      antardasha: "Sun",
      start,
      end: DateTime.makeUnsafe(start.epochMilliseconds + 1000 * MINUTE),
    });

    const periods = Dasha.pratyantardashas(antardasha);

    expect(
      periods.every(
        ({ start: childStart }) =>
          (childStart.epochMilliseconds - start.epochMilliseconds) % MINUTE === 0,
      ),
    ).toBe(true);
    expectTiles(antardasha, periods);
  });

  it.effect("tiles every level without running backwards for month-end and leap-day births", () =>
    Effect.gen(function* () {
      for (const birth of [
        "2000-02-29T12:00:00.000Z",
        "2001-01-31T23:59:00.000Z",
        "1999-12-31T05:30:00.000Z",
      ]) {
        for (const moon of [0, 40, 133.7, 271.25]) {
          const timeline = yield* Dasha.calculate(
            fixtures.moment(birth),
            fixtures.placementsFromLongitudes({ Moon: moon }),
          );
          for (const { antardashas } of timeline) {
            for (const antardasha of antardashas) {
              const pratyantardashas = Dasha.pratyantardashas(antardasha);
              expectTiles(antardasha, pratyantardashas);
              const span = antardasha.end.epochMilliseconds - antardasha.start.epochMilliseconds;
              // Each Pratyantardasha takes its lord's share of the Antardasha to within a minute.
              for (const period of pratyantardashas) {
                const share = LORD_YEARS[period.pratyantardasha] / 120;
                expect(
                  Math.abs(
                    period.end.epochMilliseconds - period.start.epochMilliseconds - span * share,
                  ),
                ).toBeLessThanOrEqual(MINUTE);
                expectTiles(period, Dasha.sookshmas(period));
              }
            }
          }
        }
      }
    }),
  );

  it.effect("finds all four active levels, a shared boundary belonging to the next period", () =>
    Effect.gen(function* () {
      const timeline = yield* Dasha.calculate(
        fixtures.moment("2001-01-31T23:59:00.000Z"),
        fixtures.placementsFromLongitudes({ Moon: 133.7 }),
      );
      const antardasha = Array.getUnsafe(Array.getUnsafe(timeline, 2).antardashas, 4);
      const pratyantardashas = Dasha.pratyantardashas(antardasha);
      const pratyantardasha = Array.getUnsafe(pratyantardashas, 3);
      const sookshmas = Dasha.sookshmas(pratyantardasha);

      const atPratyantar = yield* Dasha.at(timeline, pratyantardasha.start);
      expect(atPratyantar?.antardasha).toEqual(antardasha);
      expect(atPratyantar?.pratyantardasha).toEqual(pratyantardasha);
      expect(atPratyantar?.sookshma).toEqual(sookshmas[0]);

      const sookshma = Array.getUnsafe(sookshmas, 5);
      const atSookshma = yield* Dasha.at(timeline, sookshma.start);
      expect(atSookshma?.pratyantardasha).toEqual(pratyantardasha);
      expect(atSookshma?.sookshma).toEqual(sookshma);

      const justBefore = yield* Dasha.at(
        timeline,
        DateTime.makeUnsafe(sookshma.start.epochMilliseconds - 1),
      );
      expect(justBefore?.sookshma).toEqual(sookshmas[4]);

      const last = Array.getUnsafe(timeline, timeline.length - 1);
      expect(yield* Dasha.at(timeline, last.end)).toBeNull();
    }),
  );
});
