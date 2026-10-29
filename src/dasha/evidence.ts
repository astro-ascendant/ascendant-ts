import { Effect } from "effect";

import type { Placements, Planets } from "../chart/model.js";
import { Placement } from "../utils/index.js";
import { DashaEvidenceError } from "./error.js";

export const placementOf = Effect.fnUntraced(function* (
  placements: Placements,
  planet: Planets,
  context: string,
) {
  return yield* Placement.exactlyOnce(placements, planet, (actual) =>
    DashaEvidenceError.make({ placement: planet, expected: 1, actual, context }),
  );
});

export const validateRequiredPlacements = Effect.fnUntraced(function* (
  placements: Placements,
  required: ReadonlyArray<Planets>,
  context: string,
) {
  return yield* Placement.requireEach(placements, required, (placement, actual) =>
    DashaEvidenceError.make({ placement, expected: 1, actual, context }),
  );
});
