import { Layer } from "effect";

import { DefaultAstroParams } from "./astro-params/service.js";
import { SwissephCachedLayer } from "./swisseph/service.js";

/**
 * Flat, topologically-sorted runtime layer graph with named subgraphs.
 * Both leaves are independent: `AstroParams` carries computation parameters
 * while `Ephemeris` (via cached `Swisseph`) performs native lookups.
 * Consumers that need the full stack provide `MainLayer`; tests keep
 * building scoped layers with `Layer.merge` / `Layer.succeed` fakes instead.
 */
export const AstroParamsSubgraph = DefaultAstroParams;
export const EphemerisSubgraph = SwissephCachedLayer;

export const MainLayer = Layer.mergeAll(AstroParamsSubgraph, EphemerisSubgraph);
