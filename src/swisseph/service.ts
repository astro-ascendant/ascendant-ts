import { Layer } from "effect";

import { withPositionCache } from "../ephemeris/cached.js";
import { Ephemeris } from "../ephemeris/service.js";
import { dateToJulianDay, calculatePosition, calculateHouses } from "./calculate.js";

const layer = Layer.succeed(
  Ephemeris,
  Ephemeris.of({
    dateToJulianDay,
    calculatePosition,
    calculateHouses,
  }),
);

/** `SwissephLayer` with `calculatePosition` memoization; prefer this for transits. */
const cachedLayer = withPositionCache().pipe(Layer.provide(layer));

export { layer as SwissephLayer, cachedLayer as SwissephCachedLayer };
