import { Array as Arr, Effect, pipe } from "effect";

import {
  STAR_LORD_CYCLE,
  VIMSHOTTARI_CYCLE_YEARS,
  VIMSHOTTARI_YEARS,
} from "../../chart/internal/constants.js";
import type { Moment, Placements, SourcePlanet } from "../../chart/model.js";
import { Calendar } from "../calendar.js";
import { DashaCalculationError } from "../error.js";
import { AntarDasha, MahaDasha } from "../model.js";

/** Minutes of arc in one nakshatra (13°20′). */
const STAR_ARC_MINUTES = 800;

type StarLord = (typeof STAR_LORD_CYCLE)[number];

/** Finds the natal Moon; Vimshottari starts from its nakshatra, so its absence is a calculation error. */
const moonOf = Effect.fn("astro-ascendant/dasha/vimshottari/moonOf")(function* (
  placements: Placements,
) {
  const moon = placements.planets.find((planet) => planet.name === "Moon");
  if (moon === undefined) {
    return yield* DashaCalculationError.make({
      message: "Placements must contain the Moon",
      cause: placements,
    });
  }
  return moon;
});

/** Derives the Mahadasha order from the Moon's nakshatra lord and the balance of its period left at birth. */
function rotateLeft<A>(sequence: ReadonlyArray<A>, index: number): Array<A> {
  const start = ((index % sequence.length) + sequence.length) % sequence.length;
  return [...sequence.slice(start), ...sequence.slice(0, start)];
}

/** Derives the Mahadasha order from the Moon's nakshatra lord and the balance of its period left at birth. */
function balanceOf(moon: SourcePlanet) {
  return pipe(
    moon,
    (placement) => ({
      sequence: rotateLeft(STAR_LORD_CYCLE, STAR_LORD_CYCLE.indexOf(placement.star.lord)),
      elapsedArcMinutes:
        Math.round(placement.longitude * 60 * 100) / 100 -
        Math.floor(placement.longitude / (360 / 27)) * STAR_ARC_MINUTES,
      lordYears: VIMSHOTTARI_YEARS[placement.star.lord],
    }),
    ({ sequence, elapsedArcMinutes, lordYears }) => ({
      sequence,
      elapsedYears:
        lordYears - (lordYears / STAR_ARC_MINUTES) * (STAR_ARC_MINUTES - elapsedArcMinutes),
    }),
  );
}

/** Builds the nine Antardashas within one Mahadasha, proportional to the 120-year cycle; the last clamps to the parent end. */
function antardashasOf(
  mahadasha: StarLord,
  mahadashaStart: Moment["date"],
  sequence: readonly StarLord[],
) {
  const mahadashaYears = VIMSHOTTARI_YEARS[mahadasha];
  const mahadashaEnd = Calendar.shiftDate(mahadashaStart, mahadashaYears, 1);
  const antardashaSequence = rotateLeft(sequence, sequence.indexOf(mahadasha));
  return pipe(
    antardashaSequence,
    Arr.reduce(
      { start: mahadashaStart, elapsed: 0, periods: [] as Array<AntarDasha> },
      ({ start, elapsed, periods }, antardasha, index) => {
        const years =
          elapsed + (mahadashaYears * VIMSHOTTARI_YEARS[antardasha]) / VIMSHOTTARI_CYCLE_YEARS;
        const end =
          index === antardashaSequence.length - 1
            ? mahadashaEnd
            : Calendar.shiftDate(mahadashaStart, years, 1);
        const period = AntarDasha.make({ mahadasha, antardasha, start, end });
        return { start: end, elapsed: years, periods: [...periods, period] };
      },
    ),
    ({ periods }) => ({ end: mahadashaEnd, antardashas: periods }),
  );
}

/** Builds the nine Mahadashas from the birth sequence start, chaining each period's end to the next start. */
function mahadashasFrom(sequence: readonly StarLord[], start: Moment["date"]) {
  return pipe(
    sequence,
    Arr.reduce({ start, periods: [] as Array<MahaDasha> }, ({ start, periods }, mahadasha) => {
      const { end, antardashas } = antardashasOf(mahadasha, start, sequence);
      const period = MahaDasha.make({ mahadasha, start, end, antardashas });
      return { start: end, periods: [...periods, period] };
    }),
    ({ periods }) => periods,
  );
}

/** Calculates the full Vimshottari Dasha timeline from the natal Moon's nakshatra position. */
export const calculate = Effect.fn("astro-ascendant/dasha/vimshottari/calculate")(
  function* (moment: Moment, placements: Placements) {
    const moon = yield* moonOf(placements);
    const { sequence, elapsedYears } = balanceOf(moon);
    return mahadashasFrom(sequence, Calendar.shiftDate(moment.date, elapsedYears, -1));
  },
  Effect.mapError((cause) =>
    DashaCalculationError.make({
      message: "Could not calculate Vimshottari Dasha",
      cause,
    }),
  ),
);
