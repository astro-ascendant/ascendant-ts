import { Effect } from "effect";

import type { Placements } from "../../chart/model.js";
import { jaiminiUpapada } from "../../provenance.js";
import { calculate as calculateArudhaPada } from "../arudha-pada/calculate.js";
import type {
  EvidenceError as ArudhaPadaEvidenceError,
  Result as ArudhaPadaResult,
} from "../arudha-pada/model.js";
import { EvidenceError, type Result } from "./model.js";

export const calculate = Effect.fn("astro-ascendant/jaimini/upapada/calculate")(function* (
  placements: Placements,
) {
  const arudhaPada: ArudhaPadaResult = yield* calculateArudhaPada(placements, 12).pipe(
    Effect.catchTag(
      "ArudhaPadaEvidenceError",
      (error: ArudhaPadaEvidenceError): Effect.Effect<never, EvidenceError> =>
        Effect.fail(
          EvidenceError.make({ placement: error.placement, expected: 1, actual: error.actual }),
        ),
    ),
  );

  return {
    provenance: jaiminiUpapada.provenance,
    house: 12 as const,
    sourceSign: arudhaPada.sourceSign,
    lord: arudhaPada.lord,
    lordSign: arudhaPada.lordSign,
    sign: arudhaPada.sign,
  } satisfies Result;
});
