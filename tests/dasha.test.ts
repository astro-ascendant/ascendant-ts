import { describe, expect, it } from "@effect/vitest";
import { Array, DateTime, Effect, Equal } from "effect";

import * as Model from "../src/chart/index.js";
import * as Dasha from "../src/dasha/index.js";
import { fixtures } from "./support/fixtures.js";

function placementsWithMoonStar(name: Model.Stars, lord: Model.Planets, pada: 1 | 2 | 3 | 4) {
  const base = fixtures.placementsFromLongitudes();
  return Model.Placements.make({
    lagna: base.lagna,
    planets: base.planets.map((planet) =>
      planet.name === "Moon"
        ? Model.SourcePlanet.make({
            name: planet.name,
            longitude: planet.longitude,
            is_retrograde: planet.is_retrograde,
            star: Model.Star.make({ name, lord, pada }),
          })
        : planet,
    ),
  });
}

describe("Dasha", () => {
  it.effect("derives nine ordered Mahadashas with typed UTC intervals", () =>
    Effect.gen(function* () {
      const timeline = yield* Dasha.calculate(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Moon: 40 }),
      );

      expect(
        Equal.equals(
          timeline.map(({ mahadasha }) => mahadasha),
          ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"],
        ),
      ).toBe(true);
      expect(
        timeline.every(({ start, end }) => start.epochMilliseconds < end.epochMilliseconds),
      ).toBe(true);
    }),
  );

  it.effect("starts Mahadasha and Antardasha sequences from the Moon's nakshatra lord", () =>
    Effect.gen(function* () {
      const venus = yield* Dasha.calculate(
        fixtures.moment(),
        placementsWithMoonStar("Bharani", "Venus", 4),
      );
      const rahu = yield* Dasha.calculate(
        fixtures.moment(),
        placementsWithMoonStar("Ardra", "Rahu", 1),
      );

      expect(venus.map(({ mahadasha }) => mahadasha)).toEqual([
        "Venus",
        "Sun",
        "Moon",
        "Mars",
        "Rahu",
        "Jupiter",
        "Saturn",
        "Mercury",
        "Ketu",
      ]);
      expect(rahu.map(({ mahadasha }) => mahadasha)).toEqual([
        "Rahu",
        "Jupiter",
        "Saturn",
        "Mercury",
        "Ketu",
        "Venus",
        "Sun",
        "Moon",
        "Mars",
      ]);
      expect(venus[0]?.antardashas.map(({ antardasha }) => antardasha)).toEqual([
        "Venus",
        "Sun",
        "Moon",
        "Mars",
        "Rahu",
        "Jupiter",
        "Saturn",
        "Mercury",
        "Ketu",
      ]);
      expect(rahu[0]?.antardashas.map(({ antardasha }) => antardasha)).toEqual([
        "Rahu",
        "Jupiter",
        "Saturn",
        "Mercury",
        "Ketu",
        "Venus",
        "Sun",
        "Moon",
        "Mars",
      ]);
    }),
  );

  it.effect("reports a typed calculation error when the Moon evidence is absent", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        Dasha.calculate(
          fixtures.moment(),
          fixtures.placementsFromLongitudes({}, { omit: ["Moon"] }),
        ),
      );

      expect(exit._tag).toBe("Failure");
      if (exit._tag === "Failure") expect(String(exit.cause)).toContain("DashaCalculationError");
    }),
  );

  it.effect("finds the active periods using half-open UTC intervals", () =>
    Effect.gen(function* () {
      const timeline = yield* Dasha.calculate(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Moon: 40 }),
      );
      const first = Array.getUnsafe(timeline, 0);
      const current = yield* Dasha.at(timeline, first.start);
      const atEnd = yield* Dasha.at(timeline, Array.getUnsafe(timeline, timeline.length - 1).end);

      expect(current?.mahadasha.mahadasha).toBe(first.mahadasha);
      expect(current?.antardasha.antardasha).toBe(first.antardashas[0]?.antardasha);
      expect(atEnd).toBeNull();
    }),
  );

  it.effect("calculates forward and reverse Chara sign sequences from Lagna", () =>
    Effect.gen(function* () {
      const forward = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes(),
      );
      const reverse = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({}, { lagnaLongitude: 90 }),
      );

      expect(forward.mahadashas.map(({ mahadasha }) => mahadasha)).toEqual([
        "Aries",
        "Taurus",
        "Gemini",
        "Cancer",
        "Leo",
        "Virgo",
        "Libra",
        "Scorpio",
        "Sagittarius",
        "Capricorn",
        "Aquarius",
        "Pisces",
      ]);
      expect(reverse.mahadashas.slice(0, 4).map(({ mahadasha }) => mahadasha)).toEqual([
        "Cancer",
        "Gemini",
        "Taurus",
        "Aries",
      ]);
      expect(forward.mahadashas[0]?.antardashas.map(({ antardasha }) => antardasha)).toEqual([
        "Taurus",
        "Gemini",
        "Cancer",
        "Leo",
        "Virgo",
        "Libra",
        "Scorpio",
        "Sagittarius",
        "Capricorn",
        "Aquarius",
        "Pisces",
        "Aries",
      ]);
      expect(forward.mahadashas[0]?.end.epochMilliseconds).toBe(Date.UTC(2002, 0, 1, 12));
    }),
  );

  it.effect("applies the explicit Scorpio and corrected Aquarius co-lord rules", () =>
    Effect.gen(function* () {
      const bothScorpio = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Mars: 215, Ketu: 225 }),
      );
      const bothAquarius = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Saturn: 305, Rahu: 315 }),
      );
      const oneScorpio = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Mars: 215, Ketu: 250 }),
      );
      const scorpio = bothScorpio.mahadashas.find(({ mahadasha }) => mahadasha === "Scorpio");
      const aquarius = bothAquarius.mahadashas.find(({ mahadasha }) => mahadasha === "Aquarius");
      const oneScorpioPeriod = oneScorpio.mahadashas.find(
        ({ mahadasha }) => mahadasha === "Scorpio",
      );

      if (scorpio === undefined || aquarius === undefined || oneScorpioPeriod === undefined) {
        return yield* Effect.die("Expected Scorpio and Aquarius test periods");
      }
      expect(scorpio.end.epochMilliseconds - scorpio.start.epochMilliseconds).toBeGreaterThan(
        11 * 365 * 24 * 60 * 60 * 1000,
      );
      expect(aquarius.end.epochMilliseconds - aquarius.start.epochMilliseconds).toBeGreaterThan(
        11 * 365 * 24 * 60 * 60 * 1000,
      );
      expect(oneScorpioPeriod.end.epochMilliseconds).toBe(
        DateTime.add(oneScorpioPeriod.start, { years: 1 }).epochMilliseconds,
      );
    }),
  );

  it.effect("resolves Chara co-lords by association count, then exact degree", () =>
    Effect.gen(function* () {
      const associationWinner = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Saturn: 62, Rahu: 31, Moon: 100 }),
      );
      const degreeWinner = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Saturn: 62, Rahu: 35 }),
      );
      const marsAssociationWinner = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Mars: 62, Ketu: 250, Venus: 64 }),
      );
      const ketuDegreeWinner = yield* Dasha.calculateChara(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({ Mars: 62, Ketu: 255 }),
      );
      const associationAquarius = associationWinner.mahadashas.find(
        ({ mahadasha }) => mahadasha === "Aquarius",
      );
      const degreeAquarius = degreeWinner.mahadashas.find(
        ({ mahadasha }) => mahadasha === "Aquarius",
      );
      const associationScorpio = marsAssociationWinner.mahadashas.find(
        ({ mahadasha }) => mahadasha === "Scorpio",
      );
      const degreeScorpio = ketuDegreeWinner.mahadashas.find(
        ({ mahadasha }) => mahadasha === "Scorpio",
      );
      if (
        associationAquarius === undefined ||
        degreeAquarius === undefined ||
        associationScorpio === undefined ||
        degreeScorpio === undefined
      ) {
        return yield* Effect.die("Expected Scorpio and Aquarius Chara periods");
      }
      expect(associationAquarius.end.epochMilliseconds).toBe(
        DateTime.add(associationAquarius.start, { years: 8 }).epochMilliseconds,
      );
      expect(degreeAquarius.end.epochMilliseconds).toBe(
        DateTime.add(degreeAquarius.start, { years: 9 }).epochMilliseconds,
      );
      expect(associationScorpio.end.epochMilliseconds).toBe(
        DateTime.add(associationScorpio.start, { years: 7 }).epochMilliseconds,
      );
      expect(degreeScorpio.end.epochMilliseconds).toBe(
        DateTime.add(degreeScorpio.start, { years: 1 }).epochMilliseconds,
      );
    }),
  );

  it.effect("rejects duplicate planet evidence before sign-strength scoring", () =>
    Effect.gen(function* () {
      const chara = yield* Effect.flip(
        Dasha.calculateChara(
          fixtures.moment(),
          fixtures.placementsFromLongitudes({}, { duplicate: "Moon" }),
        ),
      );
      const sthira = yield* Effect.flip(
        Dasha.calculateSthira(
          fixtures.moment(),
          fixtures.placementsFromLongitudes({}, { duplicate: "Moon" }),
        ),
      );

      expect(chara._tag).toBe("DashaEvidenceError");
      expect(sthira._tag).toBe("DashaEvidenceError");
      if (chara._tag === "DashaEvidenceError") expect(chara.placement).toBe("Moon");
      if (sthira._tag === "DashaEvidenceError") expect(sthira.placement).toBe("Moon");
    }),
  );

  it.effect("calculates Sthira from the deterministic Brahma strength scorecard", () =>
    Effect.gen(function* () {
      const timeline = yield* Dasha.calculateSthira(
        fixtures.moment(),
        fixtures.placementsFromLongitudes(),
      );
      const first = timeline.mahadashas[0];

      expect(timeline.brahma.planet).toBe("Mercury");
      expect(timeline.brahma.sign).toBe("Cancer");
      expect(timeline.brahma.selection.referenceSign).toBe("Aries");
      expect(timeline.brahma.selection.atmakaraka).toEqual({
        planet: "Sun",
        sign: "Aries",
        resolution: "natural-strength-on-exact-degree-tie",
      });
      expect(timeline.brahma.selection.rashiBalas).toEqual([
        {
          sign: "Aries",
          charaBala: 15,
          sthiraBala: 60,
          drishtiBala: 60,
          planetCount: 1,
          aspectingPlanets: ["Jupiter"],
          total: 135,
        },
        {
          sign: "Libra",
          charaBala: 15,
          sthiraBala: 60,
          drishtiBala: 60,
          planetCount: 1,
          aspectingPlanets: ["Jupiter"],
          total: 135,
        },
      ]);
      expect(
        timeline.brahma.selection.candidates.map(({ planet, total }) => ({ planet, total })),
      ).toEqual([
        { planet: "Mercury", total: 127.5 },
        { planet: "Jupiter", total: 112.5 },
        { planet: "Mars", total: 82.5 },
      ]);
      expect(timeline.mahadashas.slice(0, 3).map(({ mahadasha }) => mahadasha)).toEqual([
        "Cancer",
        "Leo",
        "Virgo",
      ]);
      expect(first?.end.epochMilliseconds).toBe(Date.UTC(2007, 0, 1, 12));
      expect(first?.antardashas.map(({ antardasha }) => antardasha)).toEqual([
        "Cancer",
        "Leo",
        "Virgo",
        "Libra",
        "Scorpio",
        "Sagittarius",
        "Capricorn",
        "Aquarius",
        "Pisces",
        "Aries",
        "Taurus",
        "Gemini",
      ]);
      expect(first?.antardashas[0]?.end.epochMilliseconds).toBe(Date.UTC(2000, 7, 1, 12));
    }),
  );

  it.effect("uses exact degree and natural strength as deterministic Brahma tie-breakers", () =>
    Effect.gen(function* () {
      const degreeWinner = yield* Dasha.calculateSthira(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({
          Sun: 10,
          Moon: 40,
          Mars: 160,
          Mercury: 41,
          Jupiter: 190,
          Venus: 70,
          Saturn: 220,
        }),
      );
      const naturalWinner = yield* Dasha.calculateSthira(
        fixtures.moment(),
        fixtures.placementsFromLongitudes({
          Sun: 10,
          Moon: 40,
          Mars: 160,
          Mercury: 40,
          Jupiter: 130,
          Venus: 70,
          Saturn: 220,
        }),
      );

      expect(degreeWinner.brahma.planet).toBe("Mercury");
      expect(naturalWinner.brahma.planet).toBe("Jupiter");
    }),
  );

  it.effect("keeps sign periods contiguous and queries them as half-open intervals", () =>
    Effect.gen(function* () {
      const timeline = yield* Dasha.calculateSthira(
        fixtures.moment(),
        fixtures.placementsFromLongitudes(),
      );
      const first = Array.getUnsafe(timeline.mahadashas, 0);
      const last = Array.getUnsafe(timeline.mahadashas, timeline.mahadashas.length - 1);
      const current = yield* Dasha.atRashi(timeline, first.start);
      const atEnd = yield* Dasha.atRashi(timeline, last.end);

      expect(
        timeline.mahadashas.every(
          (period, index) =>
            index === 0 ||
            timeline.mahadashas[index - 1]?.end.epochMilliseconds ===
              period.start.epochMilliseconds,
        ),
      ).toBe(true);
      expect(
        timeline.mahadashas.every(
          (period) =>
            period.antardashas.length === 12 &&
            period.antardashas[11]?.end.epochMilliseconds === period.end.epochMilliseconds,
        ),
      ).toBe(true);
      expect(current?.system).toBe("Sthira");
      expect(current?.mahadasha.mahadasha).toBe("Cancer");
      expect(current?.antardasha.antardasha).toBe("Cancer");
      expect(atEnd).toBeNull();
    }),
  );
});
