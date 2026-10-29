import { Effect, pipe } from "effect";

import {
  STAR_LORD_CYCLE,
  VIMSHOTTARI_CYCLE_YEARS,
  VIMSHOTTARI_YEARS,
} from "../../chart/internal/constants.js";
import type { Moment, Placements, SourcePlanet } from "../../chart/model.js";
import { Calendar } from "../calendar.js";
import { placementOf } from "../evidence.js";
import { AntarDasha, MahaDasha } from "../model.js";
import * as Timeline from "../timeline.js";

/** Minutes of arc in one nakshatra (13°20′). */
const STAR_ARC_MINUTES = 800;

type StarLord = (typeof STAR_LORD_CYCLE)[number];

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

/** Lays the nine Mahadashas end to end, each split into nine Antardashas by its share of the 120-year cycle. */
function mahadashasFrom(sequence: readonly StarLord[], start: Moment["date"]) {
  const placed = Timeline.sequence(
    start,
    sequence.map((lord) => ({ label: lord, years: VIMSHOTTARI_YEARS[lord] })),
    Calendar.decimalYears,
  );
  return placed.map((period) => {
    const mahadashaYears = VIMSHOTTARI_YEARS[period.label];
    const shares = rotateLeft(sequence, sequence.indexOf(period.label)).map((lord) => ({
      label: lord,
      years: (mahadashaYears * VIMSHOTTARI_YEARS[lord]) / VIMSHOTTARI_CYCLE_YEARS,
    }));
    return MahaDasha.make({
      mahadasha: period.label,
      start: period.start,
      end: period.end,
      antardashas: Timeline.subdivide(period, shares, Calendar.decimalYears).map((child) =>
        AntarDasha.make({
          mahadasha: period.label,
          antardasha: child.label,
          start: child.start,
          end: child.end,
        }),
      ),
    });
  });
}

/** Calculates the full Vimshottari Dasha timeline from the natal Moon's nakshatra position. */
export const calculate = Effect.fn("astro-ascendant/dasha/vimshottari/calculate")(function* (
  moment: Moment,
  placements: Placements,
) {
  // Vimshottari starts from the natal Moon's nakshatra, so the Moon is its only evidence.
  const moon = yield* placementOf(placements, "Moon", "Vimshottari Moon nakshatra");
  const { sequence, elapsedYears } = balanceOf(moon);
  return mahadashasFrom(sequence, Calendar.shiftDate(moment.date, elapsedYears, -1));
});
