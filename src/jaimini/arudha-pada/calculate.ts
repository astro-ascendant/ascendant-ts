import { Array, Effect } from "effect";

import { RASHIS, SIGN_LORDS } from "../../chart/internal/constants.js";
import { Houses, type Placements } from "../../chart/model.js";
import { jaiminiArudhaPada } from "../../provenance.js";
import { Placement, Zodiac } from "../../utils/index.js";
import { signIndexOf } from "../../utils/position.js";
import type { Result } from "./model.js";
import { EvidenceError } from "./model.js";

/** Plain Arudha projection only; exceptional adjustments are excluded per ADR-0004. */
export const calculate = Effect.fn("astro-ascendant/jaimini/arudha-pada/calculate")(function* (
  placements: Placements,
  house: Houses,
) {
  const lagnaSignIndex = yield* signIndexOf(placements.lagna.longitude);
  const sourceSign = Zodiac.houseSignOf(lagnaSignIndex, house);
  const lord = SIGN_LORDS[sourceSign];

  const lordPlacement = yield* Placement.exactlyOnce(placements, lord, (actual) =>
    EvidenceError.make({ placement: lord, expected: 1, actual }),
  );

  const lordSignIndex = yield* signIndexOf(lordPlacement.longitude);
  const distance = Zodiac.distanceBetween(lordSignIndex, lagnaSignIndex + house - 1);
  const lordSign = Array.getUnsafe(RASHIS, lordSignIndex);
  const sign = Zodiac.signAt(Zodiac.wrapIndex(lordSignIndex + distance));

  return {
    provenance: jaiminiArudhaPada.provenance,
    house,
    sourceSign,
    lord,
    lordSign,
    sign,
  } satisfies Result;
});
