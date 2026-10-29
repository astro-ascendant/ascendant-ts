import { Array, Effect, HashMap, Order } from "effect";

import { Placements } from "../../chart/model.js";
import { jaiminiCharaKarakas } from "../../provenance.js";
import { ExactDegree, Placement } from "../../utils/index.js";
import { CLASSICAL_PLANET_ORDER, ROLE_ORDER, assignmentAt } from "./helper.js";
import type { Result, Holder, Role, RankedHolder } from "./model.js";
import { EvidenceError, ParseError } from "./model.js";

const byExactDegreeDescending = Order.make<RankedHolder>((left, right) => {
  const compared = ExactDegree.compare(right.exactDegree, left.exactDegree);
  return compared < 0 ? -1 : compared > 0 ? 1 : 0;
});
const byClassicalPlanetOrder = Order.mapInput(Order.Number, (holder: RankedHolder) =>
  CLASSICAL_PLANET_ORDER.indexOf(holder.planet),
);
const byKarakaRank: Order.Order<RankedHolder> = Order.combine(
  byExactDegreeDescending,
  byClassicalPlanetOrder,
);

export const calculate = Effect.fn("astro-ascendant/jaimini/chara-karakas/calculate")(function* (
  placements: Placements,
) {
  const required = yield* Placement.requireEach(
    placements,
    CLASSICAL_PLANET_ORDER,
    (placement, actual) => EvidenceError.make({ placement, expected: 1, actual }),
  );
  const holders = Array.sort(
    CLASSICAL_PLANET_ORDER.map((planet): RankedHolder => {
      const exactDegree = ExactDegree.of(required[planet].longitude);
      return { planet, degree: exactDegree.value, exactDegree };
    }),
    byKarakaRank,
  );

  let byRole = HashMap.empty<Role, readonly [Holder, ...Holder[]]>();
  let rank = 0;
  while (rank < holders.length) {
    const first = holders[rank];
    if (first === undefined) {
      return yield* ParseError.make({ message: `Missing Chara Karaka holder at rank ${rank}` });
    }

    let nextRank = rank + 1;
    while (true) {
      const candidate = holders[nextRank];
      if (
        candidate === undefined ||
        ExactDegree.compare(candidate.exactDegree, first.exactDegree) !== 0
      )
        break;
      nextRank += 1;
    }
    const tiedRanks = holders.slice(rank, nextRank);
    const canonicalDegree = first.exactDegree.value;
    const tiedHolders = tiedRanks.map((holder): Holder => ({
      planet: holder.planet,
      degree: canonicalDegree,
    }));
    const firstTiedHolder = tiedHolders[0];
    if (firstTiedHolder === undefined) {
      return yield* ParseError.make({ message: `Missing tied holder at rank ${rank}` });
    }
    const nonEmptyTiedHolders: readonly [Holder, ...Holder[]] = [
      firstTiedHolder,
      ...tiedHolders.slice(1),
    ];

    for (let roleIndex = rank; roleIndex < nextRank; roleIndex += 1) {
      const role = ROLE_ORDER[roleIndex];
      if (role === undefined) {
        return yield* ParseError.make({
          message: `Missing Chara Karaka role at rank ${roleIndex}`,
        });
      }
      byRole = HashMap.set(byRole, role, nonEmptyTiedHolders);
    }
    rank = nextRank;
  }

  const Atmakaraka = yield* assignmentAt(byRole, "Atmakaraka");
  const Amatyakaraka = yield* assignmentAt(byRole, "Amatyakaraka");
  const Bhratrikaraka = yield* assignmentAt(byRole, "Bhratrikaraka");
  const Matrikaraka = yield* assignmentAt(byRole, "Matrikaraka");
  const Putrakaraka = yield* assignmentAt(byRole, "Putrakaraka");
  const Gnatikaraka = yield* assignmentAt(byRole, "Gnatikaraka");
  const Darakaraka = yield* assignmentAt(byRole, "Darakaraka");

  return {
    provenance: jaiminiCharaKarakas.provenance,
    assignments: {
      Atmakaraka,
      Amatyakaraka,
      Bhratrikaraka,
      Matrikaraka,
      Putrakaraka,
      Gnatikaraka,
      Darakaraka,
    },
  } satisfies Result;
});
