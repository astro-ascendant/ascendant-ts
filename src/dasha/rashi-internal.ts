import type { DateTime } from "effect";

import type { Rashis } from "../chart/model.js";
import { Calendar } from "./calendar.js";
import { RashiAntarDasha, RashiMahaDasha } from "./model.js";
import * as Timeline from "./timeline.js";

export type Direction = 1 | -1;

/** One Rashi Mahadasha to lay out: its Sign, its years, and its Antardasha Signs in order. */
export interface RashiMahaDashaSpec {
  readonly mahadasha: Rashis;
  readonly years: number;
  readonly antardashas: readonly Rashis[];
}

/** Lays Rashi Mahadashas end to end from `start`, each split evenly among its Antardasha Signs. */
function rashiMahaDashas(
  start: DateTime.Utc,
  specs: ReadonlyArray<RashiMahaDashaSpec>,
): ReadonlyArray<RashiMahaDasha> {
  const placed = Timeline.sequence(
    start,
    specs.map(({ mahadasha, years }) => ({ label: mahadasha, years })),
    Calendar.wholeMonths,
  );
  return specs.map(({ years, antardashas }, index) => {
    const period = placed[index]!;
    const shares = antardashas.map((sign) => ({ label: sign, years: years / antardashas.length }));
    return RashiMahaDasha.make({
      mahadasha: period.label,
      start: period.start,
      end: period.end,
      antardashas: Timeline.subdivide(period, shares, Calendar.wholeMonths).map((child) =>
        RashiAntarDasha.make({
          mahadasha: period.label,
          antardasha: child.label,
          start: child.start,
          end: child.end,
        }),
      ),
    });
  });
}

export const RashiInternal = { rashiMahaDashas };
