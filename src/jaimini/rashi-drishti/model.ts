import { Schema } from "effect";

import { Rashis } from "../../chart/model.js";
import { JaiminiRashiDrishtiProvenance } from "../../provenance.js";

export { JaiminiRashiDrishtiProvenance as Provenance } from "../../provenance.js";

export const Result = Schema.Struct({
  provenance: JaiminiRashiDrishtiProvenance,
  reference: Rashis,
  targets: Schema.Tuple([Rashis, Rashis, Rashis]),
});
export interface Result extends Schema.Schema.Type<typeof Result> {}
