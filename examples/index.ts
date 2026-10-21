import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";

import { runSelectedExample } from "./input.js";
import { runtimeLayer } from "./runtime.js";

const MainLive = Layer.effectDiscard(runSelectedExample).pipe(Layer.provide(runtimeLayer));

const examples = Effect.scoped(Layer.build(MainLive));

BunRuntime.runMain(examples);
