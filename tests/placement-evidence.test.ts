import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import type * as Chart from "../src/chart/index.js";
import * as Dasha from "../src/dasha/index.js";
import * as Argala from "../src/jaimini/argala/index.js";
import * as ArudhaPada from "../src/jaimini/arudha-pada/index.js";
import * as CharaKarakas from "../src/jaimini/chara-karakas/index.js";
import * as Karakamsha from "../src/jaimini/karakamsha/index.js";
import * as Upapada from "../src/jaimini/upapada/index.js";
import * as SAV from "../src/sav/index.js";
import { fixtures } from "./support/fixtures.js";

interface EvidenceCase {
  readonly name: string;
  /** A planet this calculation requires; the fixture Lagna is in Aries. */
  readonly required: Chart.Planets;
  readonly tag: string;
  readonly run: (placements: Chart.Placements) => Effect.Effect<object, { readonly _tag: string }>;
}

// ADR-0003: each calculation rejects missing or duplicate required evidence with its own error.
const CASES: ReadonlyArray<EvidenceCase> = [
  {
    name: "Vimshottari Dasha",
    required: "Moon",
    tag: "DashaEvidenceError",
    run: (placements) => Dasha.calculate(fixtures.moment(), placements),
  },
  {
    name: "Chara Dasha",
    required: "Moon",
    tag: "DashaEvidenceError",
    run: (placements) => Dasha.calculateChara(fixtures.moment(), placements),
  },
  {
    name: "Sthira Dasha",
    required: "Moon",
    tag: "DashaEvidenceError",
    run: (placements) => Dasha.calculateSthira(fixtures.moment(), placements),
  },
  {
    name: "Chara Karakas",
    required: "Moon",
    tag: "CharaKarakasEvidenceError",
    run: (placements) => CharaKarakas.calculate(placements),
  },
  {
    name: "Karakamsha",
    required: "Moon",
    tag: "KarakamshaEvidenceError",
    run: (placements) => Karakamsha.calculate(placements),
  },
  {
    name: "Argala",
    required: "Ketu",
    tag: "ArgalaEvidenceError",
    run: (placements) => Argala.calculate(placements, { kind: "Sign", sign: "Leo" }),
  },
  {
    name: "Arudha Pada of the first house (lord Mars)",
    required: "Mars",
    tag: "ArudhaPadaEvidenceError",
    run: (placements) => ArudhaPada.calculate(placements, 1),
  },
  {
    name: "Upapada (twelfth-house lord Jupiter)",
    required: "Jupiter",
    tag: "UpapadaEvidenceError",
    run: (placements) => Upapada.calculate(placements),
  },
  {
    name: "Sarvashtakavarga",
    required: "Sun",
    tag: "SAVCalculationError",
    run: (placements) => SAV.calculate(placements),
  },
];

describe("Placements evidence", () => {
  for (const { name, required, tag, run } of CASES) {
    it.effect(`${name} rejects a missing ${required}`, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          run(fixtures.placementsFromLongitudes({}, { omit: [required] })),
        );
        expect(error._tag).toBe(tag);
        if ("placement" in error) expect(error.placement).toBe(required);
      }),
    );

    it.effect(`${name} rejects a duplicated ${required}`, () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          run(fixtures.placementsFromLongitudes({}, { duplicate: required })),
        );
        expect(error._tag).toBe(tag);
        if ("placement" in error) expect(error.placement).toBe(required);
      }),
    );
  }
});
