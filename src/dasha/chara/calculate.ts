import { Effect, HashSet, Array } from "effect";

import { RASHIS, SIGN_LORDS } from "../../chart/internal/constants.js";
import { Planets, type Moment, type Placements, type Rashis } from "../../chart/model.js";
import { compareExactDegrees, exactDegreeOf } from "../../jaimini/chara-karakas/helper.js";
import { charaDasha } from "../../provenance.js";
import { indexOfSign, signAtIndex, signIndexOf } from "../../utils/position.js";
import { placementOf, validateRequiredPlacements } from "../evidence.js";
import { CharaDasha } from "../model.js";
import { type Direction, RashiInternal } from "../rashi-internal.js";

const SAMA_PADA = HashSet.make<Rashis[]>(
  "Aries",
  "Taurus",
  "Gemini",
  "Libra",
  "Scorpio",
  "Sagittarius",
);

const CO_LORDS = {
  Scorpio: ["Mars", "Ketu"],
  Aquarius: ["Saturn", "Rahu"],
} as const;

function padaDirection(sign: Rashis): Direction {
  return (HashSet.has(SAMA_PADA, sign) ? 1 : -1) as Direction;
}

function distanceInDirection(from: number, to: number, direction: Direction): number {
  return ((to - from) * direction + RASHIS.length) % RASHIS.length;
}

const countAssociations = Effect.fn("astro-ascendant/dasha/chara/countAssociations")(function* (
  placements: Placements,
  exclude: Planets,
  index: number,
) {
  const indexes = yield* Effect.forEach(
    placements.planets.filter((p) => p.name !== exclude),
    (p) => signIndexOf(p.longitude),
  );
  return indexes.filter((i) => i === index).length;
});

/**
 * Resolves the effective lord of Scorpio or Aquarius for Chara Dasha, where
 * two planets share lordship (Mars/Ketu for Scorpio, Saturn/Rahu for Aquarius).
 *
 * Rules are applied in order, stopping at the first that decides:
 * 1. If both candidates sit in the sign itself, there is no lord (`null`).
 * 2. If exactly one candidate sits in the sign, the other one is the lord.
 * 3. Otherwise the candidate with more associations in its own sign wins.
 * 4. If still tied, the candidate at the higher exact degree wins, and on an
 *    exact tie the first (traditional) planet is chosen.
 */
const resolveCoLord = Effect.fn("astro-ascendant/dasha/chara/resolveCoLord")(function* <
  Candidate extends Planets,
>(placements: Placements, sign: "Scorpio" | "Aquarius", [a, b]: readonly [Candidate, Candidate]) {
  const target = indexOfSign(sign);

  const describe = (planet: Candidate) =>
    placementOf(placements, planet, `${sign} co-lord`).pipe(
      Effect.flatMap(({ longitude }) =>
        signIndexOf(longitude).pipe(
          Effect.map((index) => ({ planet, longitude, index, inSign: index === target })),
        ),
      ),
    );

  const [x, y] = yield* Effect.all([describe(a), describe(b)]);

  if (x.inSign && y.inSign) return null;
  if (x.inSign !== y.inSign) return x.inSign ? y.planet : x.planet;

  const [xCount, yCount] = yield* Effect.all([
    countAssociations(placements, x.planet, x.index),
    countAssociations(placements, y.planet, y.index),
  ]);
  if (xCount !== yCount) return xCount > yCount ? x.planet : y.planet;

  const [xDeg, yDeg] = yield* Effect.all([exactDegreeOf(x.longitude), exactDegreeOf(y.longitude)]);
  // Exact tie: `a` is the traditional planet (Mars, Saturn).
  return compareExactDegrees(xDeg, yDeg) < 0 ? y.planet : x.planet;
});

/**
 * Computes the Chara Dasha duration (in years) of a sign.
 *
 * The duration is the count of signs from the given sign to the position of
 * its lord, counted in the sign's pada direction (zodiacal or reverse). For
 * Scorpio and Aquarius the lord is resolved via `resolveCoLord`; all other
 * signs use their single ruler. If the lord sits in the sign itself (distance
 * of 0), or if no co-lord can be resolved, the duration is 12 years.
 */
const durationOf = Effect.fn("astro-ascendant/dasha/chara/durationOf")(function* (
  placements: Placements,
  sign: Rashis,
) {
  const lord =
    sign === "Scorpio" || sign === "Aquarius"
      ? yield* resolveCoLord(placements, sign, CO_LORDS[sign])
      : SIGN_LORDS[sign];

  if (lord === null) return 12;

  const signIndex = indexOfSign(sign);
  const direction = padaDirection(sign);
  const lordIndex = yield* placementOf(placements, lord, `${sign} duration`).pipe(
    Effect.flatMap(({ longitude }) => signIndexOf(longitude)),
  );
  const distance = distanceInDirection(signIndex, lordIndex, direction);

  return distance === 0 ? 12 : distance;
});

/**
 * Calculates the Chara Dasha timeline for a chart.
 *
 * Mahadashas run through all twelve signs, starting from the lagna sign and
 * proceeding in the pada direction of the 9th sign from lagna (zodiacal or
 * reverse). Each mahadasha lasts as many years as `durationOf` gives for that
 * sign, and begins where the previous one ended, with the first starting at
 * the moment's date. Antardashas within each mahadasha begin from the sign
 * next to the mahadasha sign in the same direction.
 *
 * Fails if any required planet placement is missing.
 */
export const calculateChara = Effect.fn("astro-ascendant/dasha/chara/calculateChara")(function* (
  moment: Moment,
  placements: Placements,
) {
  yield* validateRequiredPlacements(placements, Planets.literals, "Chara Dasha co-lord strength");

  const lagnaIndex = yield* signIndexOf(placements.lagna.longitude);

  // Direction is determined by the 9th sign from lagna
  const ninthIndex = yield* signAtIndex(lagnaIndex + 8);
  const direction = padaDirection(Array.getUnsafe(RASHIS, ninthIndex));

  // Effectful phase: resolve duration and sign index for each sign, in order
  const specs = yield* Effect.forEach(
    RashiInternal.sequenceFrom(lagnaIndex, direction),
    (mahadasha) =>
      Effect.map(durationOf(placements, mahadasha), (years) => ({
        mahadasha,
        years,
        mahadashaIndex: indexOfSign(mahadasha),
      })),
  );

  // Pure phase: each period starts where the previous one ended
  const [, mahadashas] = Array.mapAccum(
    specs,
    moment.date,
    (start, { mahadasha, years, mahadashaIndex }) => {
      const period = RashiInternal.makeRashiMahaDasha(
        mahadasha,
        start,
        years,
        RashiInternal.sequenceFrom(mahadashaIndex + direction, direction),
      );
      return [period.end, period] as const;
    },
  );

  return CharaDasha.make({
    system: "Chara",
    provenance: charaDasha.provenance,
    mahadashas,
  });
});
