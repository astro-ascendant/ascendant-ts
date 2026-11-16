import { Effect, pipe } from "effect";

import {
  STAR_LORD_CYCLE,
  VIMSHOTTARI_CYCLE_YEARS,
  VIMSHOTTARI_YEARS,
} from "../../chart/internal/constants.js";
import type { Moment, Placements, SourcePlanet } from "../../chart/model.js";
import { vimshottariDasha } from "../../provenance.js";
import { Calendar } from "../calendar.js";
import { placementOf } from "../evidence.js";
import { AntarDasha, MahaDasha, PratyantarDasha, SookshmaDasha } from "../model.js";
import * as Timeline from "../timeline.js";

/** Minutes of arc in one nakshatra (13°20′). */
const STAR_ARC_MINUTES = 800;

type StarLord = (typeof STAR_LORD_CYCLE)[number];

/** Rotates a sequence so it begins at `index`. */
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
      // Exact arc travelled in the nakshatra: rounding the longitude to a hundredth of an
      // arcminute shifted the Dasha start by up to a couple of hours.
      elapsedArcMinutes: Math.min(
        STAR_ARC_MINUTES,
        Math.max(
          0,
          placement.longitude * 60 -
            Math.floor(placement.longitude / (360 / 27)) * STAR_ARC_MINUTES,
        ),
      ),
      lordYears: VIMSHOTTARI_YEARS[placement.star.lord],
    }),
    ({ sequence, elapsedArcMinutes, lordYears }) => ({
      sequence,
      elapsedYears:
        lordYears - (lordYears / STAR_ARC_MINUTES) * (STAR_ARC_MINUTES - elapsedArcMinutes),
    }),
  );
}

/**
 * The nine child shares of a period: the lords in cycle order from the
 * period's own lord, each weighted by its share of the 120-year cycle.
 */
function childSharesOf(lord: StarLord, parentYears: number) {
  return rotateLeft(STAR_LORD_CYCLE, STAR_LORD_CYCLE.indexOf(lord)).map((child) => ({
    label: child,
    years: (parentYears * VIMSHOTTARI_YEARS[child]) / VIMSHOTTARI_CYCLE_YEARS,
  }));
}

/** Lays the nine Mahadashas end to end, each split into nine Antardashas by its share of the 120-year cycle. */
function mahadashasFrom(sequence: readonly StarLord[], start: Moment["date"]) {
  const placed = Timeline.sequence(
    start,
    sequence.map((lord) => ({ label: lord, years: VIMSHOTTARI_YEARS[lord] })),
    Calendar.decimalYears,
  );
  return placed.map((period) => {
    const shares = childSharesOf(period.label, VIMSHOTTARI_YEARS[period.label]);
    return MahaDasha.make({
      mahadasha: period.label,
      provenance: vimshottariDasha.provenance,
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

/**
 * Splits an Antardasha into its nine Pratyantardashas (Antara in KP usage),
 * from the Antardasha lord in cycle order, each by its share of the 120-year
 * cycle of the Antardasha's actual span.
 */
export function pratyantardashas(antardasha: AntarDasha): ReadonlyArray<PratyantarDasha> {
  return Timeline.subdivideProportionally(antardasha, childSharesOf(antardasha.antardasha, 1)).map(
    (child) =>
      PratyantarDasha.make({
        mahadasha: antardasha.mahadasha,
        antardasha: antardasha.antardasha,
        pratyantardasha: child.label,
        start: child.start,
        end: child.end,
      }),
  );
}

/**
 * Splits a Pratyantardasha into its nine Sookshma dashas, from the
 * Pratyantardasha lord in cycle order, each by its share of the 120-year cycle
 * of the Pratyantardasha's actual span.
 */
export function sookshmas(pratyantardasha: PratyantarDasha): ReadonlyArray<SookshmaDasha> {
  return Timeline.subdivideProportionally(
    pratyantardasha,
    childSharesOf(pratyantardasha.pratyantardasha, 1),
  ).map((child) =>
    SookshmaDasha.make({
      mahadasha: pratyantardasha.mahadasha,
      antardasha: pratyantardasha.antardasha,
      pratyantardasha: pratyantardasha.pratyantardasha,
      sookshma: child.label,
      start: child.start,
      end: child.end,
    }),
  );
}
