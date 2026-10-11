/**
 * Shared helpers, one file per concern (agents: list this directory first).
 * - `./zodiac.js` — sign/index/longitude conversions and wheel arithmetic (pure).
 * - `./position.js` — validated coordinate parsing (fallible `Effect`).
 * - `./placement.js` — exactly-once planet placement lookup.
 * - `./operation-error.js` — curried `mapError` helper for operation-labeled boundary errors.
 */
export * as Placement from "./placement.js";
export * as Position from "./position.js";
export * as Zodiac from "./zodiac.js";
export { operationError } from "./operation-error.js";
