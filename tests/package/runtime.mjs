import * as AstroAscendant from "astro-ascendant";
import { Equal, HashSet, Record } from "effect";

const exports = HashSet.fromIterable(Record.keys(AstroAscendant));
const expectedExports = HashSet.make(
  "Argala",
  "ArudhaPada",
  "AstroParams",
  "Chart",
  "CharaKarakas",
  "Dasha",
  "Ephemeris",
  "Karakamsha",
  "Provenance",
  "RashiDrishti",
  "Runtime",
  "SAV",
  "Swisseph",
  "Transit",
  "Upapada",
);
if (!Equal.equals(exports, expectedExports)) {
  throw new Error("Unexpected root exports");
}

const focused = await import("astro-ascendant/chara-karakas");
if (typeof focused.calculate !== "function") {
  throw new Error("The focused Jaimini subpath is not available");
}

const provenance = await import("astro-ascendant/provenance");
if (provenance.methods.sthiraDasha?.provenance.method !== "bv-raman-koch-brahma-strength") {
  throw new Error("The focused provenance registry is not available");
}

const dasha = await import("astro-ascendant/dasha");
if (
  typeof dasha.calculate !== "function" ||
  typeof dasha.at !== "function" ||
  typeof dasha.calculateChara !== "function" ||
  typeof dasha.calculateSthira !== "function" ||
  typeof dasha.atRashi !== "function"
) {
  throw new Error("The focused Dasha interface is not available");
}
