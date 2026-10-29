import { Array as Arr, Effect, HashSet, Order, pipe } from "effect";

import { inSignStatus } from "../../chart/helper.js";
import type { Moment, Placements, Planets, Rashis } from "../../chart/model.js";
import { calculate as calculateCharaKarakas } from "../../jaimini/chara-karakas/calculate.js";
import { ClassicalPlanets, type Role } from "../../jaimini/chara-karakas/model.js";
import { targetsOf } from "../../jaimini/rashi-drishti/index.js";
import { sthiraDasha } from "../../provenance.js";
import { ExactDegree, Zodiac } from "../../utils/index.js";
import { DashaCalculationError, DashaEvidenceError } from "../error.js";
import { placementOf, validateRequiredPlacements } from "../evidence.js";
import type {
  BrahmaCandidateScore,
  EligibleBrahmaPlanet,
  RashiBala,
  RashiMahaDasha,
} from "../model.js";
import { SthiraDasha } from "../model.js";
import { RashiInternal } from "../rashi-internal.js";
import {
  CHARA_BALA,
  DIGNITY_BALA,
  ELIGIBLE_BRAHMA_PLANETS,
  KARAKA_BALA,
  KENDRADI_BALA,
  NATURAL_STRENGTH,
  SIGN_DURATION,
} from "./constants.js";

type Karakas = Effect.Success<ReturnType<typeof calculateCharaKarakas>>;
type Scored = BrahmaCandidateScore & { readonly exactDegree: ExactDegree.ExactDegree };

/** Brahma must be a luminary or a benefic/malefic classical planet — never Saturn, Rahu, or Ketu. */
function isEligibleBrahma(planet: Planets): planet is EligibleBrahmaPlanet {
  return HashSet.has(ELIGIBLE_BRAHMA_PLANETS, planet as EligibleBrahmaPlanet);
}

/** Orders Brahma contenders by total bala, then exact degree, then natural strength — all descending. */

const byTotalDescending = Order.mapInput(Order.Number, (scored: Scored) => -scored.total);
const byExactDegreeDescending = Order.make<Scored>((left, right) => {
  const compared = ExactDegree.compare(right.exactDegree, left.exactDegree);
  return compared < 0 ? -1 : compared > 0 ? 1 : 0;
});
const byNaturalStrengthDescending = Order.mapInput(
  Order.Number,
  (scored: Scored) => -scored.naturalStrength,
);
const byStrength: Order.Order<Scored> = Order.combine(
  byTotalDescending,
  Order.combine(byExactDegreeDescending, byNaturalStrengthDescending),
);

/** Rashi strength as Chara Bala (movability) + Sthira Bala (occupancy) + Drishti Bala (aspect). */
const rashiBalaOf = Effect.fn("astro-ascendant/dasha/sthira/rashiBalaOf")(function* (
  placements: Placements,
  sign: Rashis,
) {
  // Dedupe handles the case where the lord is Jupiter or Mercury
  const aspectingPlanets = yield* Effect.filter(
    Arr.dedupe([Zodiac.lordOf(sign), "Jupiter", "Mercury"] as const),
    (planet) =>
      placementOf(placements, planet, "Rashi Bala drishti").pipe(
        Effect.map((found) => targetsOf(Zodiac.signOfLongitude(found.longitude)).includes(sign)),
      ),
  );
  const planetCount = placements.planets.filter(
    ({ longitude }) => Zodiac.signOfLongitude(longitude) === sign,
  ).length;
  const charaBala = CHARA_BALA[sign];
  const sthiraBala = planetCount === 0 ? 0 : 45 + 15 * planetCount;
  const drishtiBala = aspectingPlanets.length * 60;
  return {
    sign,
    charaBala,
    sthiraBala,
    drishtiBala,
    planetCount,
    aspectingPlanets: [...aspectingPlanets],
    total: charaBala + sthiraBala + drishtiBala,
  } satisfies RashiBala;
});

/** Picks the stronger of the Lagna and 7th signs as the Brahma reference; Lagna wins ties. */
const referenceOf = Effect.fn("astro-ascendant/dasha/sthira/referenceOf")(function* (
  placements: Placements,
) {
  const lagnaSign = Zodiac.signOfLongitude(placements.lagna.longitude);
  const seventhSign = Zodiac.houseSignOf(Zodiac.rashiIndexOf(lagnaSign), 7);
  const [lagnaRashiBala, seventhRashiBala] = yield* Effect.all([
    rashiBalaOf(placements, lagnaSign),
    rashiBalaOf(placements, seventhSign),
  ]);
  return {
    lagnaRashiBala,
    seventhRashiBala,
    referenceSign: lagnaRashiBala.total >= seventhRashiBala.total ? lagnaSign : seventhSign,
  };
});

/** Lords of the 5th, 7th, and 11th from the reference sign, filtered to eligible Brahma planets and deduped. */
function candidatesOf(referenceSign: Rashis): ReadonlyArray<EligibleBrahmaPlanet> {
  const start = Zodiac.rashiIndexOf(referenceSign);
  return pipe(
    [5, 7, 11],
    Arr.map((offset) => Zodiac.lordOf(Zodiac.signAt(start + offset))),
    Arr.filter((candidate) => isEligibleBrahma(candidate)),
    Arr.dedupe,
  );
}

/** Chara Karaka assignments plus the resolved Atmakaraka and its placement for Kendradi Bala. */
const karakasOf = Effect.fn("astro-ascendant/dasha/sthira/karakasOf")(function* (
  placements: Placements,
) {
  const karakas = yield* calculateCharaKarakas(placements).pipe(
    Effect.mapError((error) =>
      error._tag === "CharaKarakasEvidenceError"
        ? DashaEvidenceError.make({
            placement: error.placement,
            expected: 1,
            actual: error.actual,
            context: "Brahma Chara Karaka Bala",
          })
        : DashaEvidenceError.make({
            placement: "Lagna",
            expected: 1,
            actual: 0,
            context: `Brahma Chara Karaka Bala: ${error.message}`,
          }),
    ),
  );
  const atmakaraka = karakas.assignments.Atmakaraka.reduce((strongest, holder) =>
    NATURAL_STRENGTH[holder.planet] > NATURAL_STRENGTH[strongest.planet] ? holder : strongest,
  );
  const atmakarakaPlacement = yield* placementOf(
    placements,
    atmakaraka.planet,
    "Brahma Kendradi Bala Atmakaraka",
  );
  const atmakarakaSignIndex = Zodiac.indexOfLongitude(atmakarakaPlacement.longitude);
  const atmakarakaSign = Zodiac.signAt(atmakarakaSignIndex);
  return { karakas, atmakaraka, atmakarakaSign, atmakarakaSignIndex };
});

/** Scores one Brahma contender on dignity, Chara Karaka, and Kendradi-from-Atmakaraka balas. */
const scoreCandidate = Effect.fn("astro-ascendant/dasha/sthira/scoreCandidate")(function* (
  candidate: EligibleBrahmaPlanet,
  placements: Placements,
  karakas: Karakas,
  atmakarakaSignIndex: Zodiac.RashiIndex,
) {
  const placement = yield* placementOf(placements, candidate, "Brahma Graha Bala");
  const [dignity] = inSignStatus(candidate, placement.longitude);
  if (dignity === undefined) {
    return yield* DashaCalculationError.make({
      message: `Missing dignity for ${candidate}`,
      cause: candidate,
    });
  }
  const charaKarakaRoles = pipe(
    Object.entries(karakas.assignments) as Array<
      [Role, ReadonlyArray<{ readonly planet: Planets }>]
    >,
    Arr.filter(([, holders]) => holders.some((holder) => holder.planet === candidate)),
    Arr.map(([role]) => role),
  );
  const charaKarakaBala = Math.max(...charaKarakaRoles.map((role) => KARAKA_BALA[role]));
  const signIndex = Zodiac.indexOfLongitude(placement.longitude);
  const kendradiHouseFromAtmakaraka = Zodiac.houseDistance(atmakarakaSignIndex, signIndex);
  const kendradiBala = KENDRADI_BALA[kendradiHouseFromAtmakaraka];
  const exactDegree = ExactDegree.of(placement.longitude);
  const sign = Zodiac.signAt(signIndex);
  return {
    planet: candidate,
    sign,
    dignity,
    dignityBala: DIGNITY_BALA[dignity],
    charaKarakaRoles,
    charaKarakaBala,
    kendradiHouseFromAtmakaraka,
    kendradiBala,
    exactDegreeWithinSign: exactDegree.value,
    naturalStrength: NATURAL_STRENGTH[candidate],
    total: DIGNITY_BALA[dignity] + charaKarakaBala + kendradiBala,
    exactDegree,
  } satisfies Scored;
});

/** Scores every contender, ranks by strength, and returns the winner with its selection record. */
const scoredOf = Effect.fn("astro-ascendant/dasha/sthira/scoredOf")(function* (
  candidates: ReadonlyArray<EligibleBrahmaPlanet>,
  placements: Placements,
  karakas: Karakas,
  atmakarakaSignIndex: Zodiac.RashiIndex,
) {
  if (candidates.length === 0) {
    return yield* DashaEvidenceError.make({
      placement: "Lagna",
      expected: 1,
      actual: 0,
      context: "No eligible Brahma candidates remain after excluding Saturn, Rahu, and Ketu",
    });
  }
  const [winner, ...rest] = pipe(
    yield* Effect.forEach(candidates, (candidate) =>
      scoreCandidate(candidate, placements, karakas, atmakarakaSignIndex),
    ),
    (scored) => Arr.sort(scored, byStrength),
  );
  if (winner === undefined) {
    return yield* DashaCalculationError.make({
      message: "Missing scored Brahma candidate",
      cause: candidates,
    });
  }
  return {
    winner,
    candidateScores: pipe(
      [winner, ...rest],
      Arr.map(({ exactDegree: _dropped, ...score }): BrahmaCandidateScore => score),
    ),
  };
});

/** Builds the twelve Rashi Mahadashas from the Brahma sign onward, each lasting its sign duration. */
function mahadashasFrom(winnerSign: Rashis, start: Moment["date"]): ReadonlyArray<RashiMahaDasha> {
  return RashiInternal.rashiMahaDashas(
    start,
    Zodiac.sequenceFrom(Zodiac.rashiIndexOf(winnerSign), 1).map((mahadasha) => ({
      mahadasha,
      years: SIGN_DURATION[mahadasha],
      antardashas: Zodiac.sequenceFrom(Zodiac.rashiIndexOf(mahadasha), 1),
    })),
  );
}

/** Calculates the Sthira Dasha: selects Brahma by Graha strength and lays out its Rashi Mahadashas. */
export const calculateSthira = Effect.fn("astro-ascendant/dasha/sthira/calculateSthira")(function* (
  moment: Moment,
  placements: Placements,
) {
  yield* validateRequiredPlacements(placements, ClassicalPlanets.literals, "Sthira Dasha strength");
  const { lagnaRashiBala, seventhRashiBala, referenceSign } = yield* referenceOf(placements);
  const { karakas, atmakaraka, atmakarakaSign, atmakarakaSignIndex } = yield* karakasOf(placements);
  const { winner, candidateScores } = yield* scoredOf(
    candidatesOf(referenceSign),
    placements,
    karakas,
    atmakarakaSignIndex,
  );
  return SthiraDasha.make({
    system: "Sthira",
    provenance: sthiraDasha.provenance,
    brahma: {
      planet: winner.planet,
      sign: winner.sign,
      source: "strength",
      selection: {
        rashiBalas: [lagnaRashiBala, seventhRashiBala],
        referenceSign,
        referenceTieBreak: "lagna-on-equal-rashi-bala",
        atmakaraka: {
          planet: atmakaraka.planet,
          sign: atmakarakaSign,
          resolution:
            karakas.assignments.Atmakaraka.length === 1
              ? "highest-exact-degree"
              : "natural-strength-on-exact-degree-tie",
        },
        candidates: [candidateScores[0]!, ...candidateScores.slice(1)],
      },
    },
    mahadashas: mahadashasFrom(winner.sign, moment.date),
  });
});
