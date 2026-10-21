import { DateTime } from "effect";

import type { Rashis } from "../chart/model.js";
import { Zodiac } from "../utils/index.js";
import { Calendar } from "./calendar.js";
import { RashiAntarDasha, RashiMahaDasha } from "./model.js";

export type Direction = 1 | -1;

const sequenceFrom = Zodiac.sequenceFrom;

/** The final child clamps to the parent end; fractional years must not gap or overrun. */
function makeRashiMahaDasha(
  mahadasha: Rashis,
  start: DateTime.Utc,
  years: number,
  antardashaSequence: readonly Rashis[],
): RashiMahaDasha {
  const end = Calendar.shiftDate(start, years, 1);
  let antardashaStart = start;
  const antardashas = antardashaSequence.map((antardasha, index) => {
    const antardashaEnd =
      index === antardashaSequence.length - 1
        ? end
        : DateTime.add(start, { months: years * (index + 1) });
    const period = RashiAntarDasha.make({
      mahadasha,
      antardasha,
      start: antardashaStart,
      end: antardashaEnd,
    });
    antardashaStart = antardashaEnd;
    return period;
  });

  return RashiMahaDasha.make({
    mahadasha,
    start,
    end,
    antardashas,
  });
}

export const RashiInternal = { makeRashiMahaDasha, sequenceFrom };
