import { Effect } from "effect";

/**
 * Shared curried `mapError` helper for boundary errors with operation labels.
 * Prefer this over hand-writing wrappers in every module.
 *
 * ```ts
 * const ephemerisError = operationError(EphemerisError.make);
 * const position = yield* rawPosition.pipe(ephemerisError("swisseph.calculatePosition"));
 * ```
 */
export function operationError<Error>(
  make: (args: { readonly operation: string; readonly cause: unknown }) => Error,
): (operation: string) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, Error, R> {
  return (operation: string) =>
    <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, Error, R> =>
      Effect.mapError(self, (cause) => make({ operation, cause }));
}
