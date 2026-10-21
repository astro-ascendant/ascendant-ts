import { Console, DateTime, Effect } from "effect";
import { Prompt } from "effect/cli";

import { Chart, Transit } from "../src/index.js";
import type { ExampleInput } from "./input.js";

export const transitExample = Effect.fn(function* ({ moment, latitude, longitude }: ExampleInput) {
  const planet = yield* Prompt.Select<Chart.Planets>({
    message: "Graha",
    choices: Chart.Planets.literals.map((name) => ({ title: name, value: name })),
  });
  const direction = yield* Prompt.Select<Transit.TransitDirection>({
    message: "Direction",
    choices: [
      { title: "Next transits", value: "forward" },
      { title: "Previous transits", value: "backward" },
    ],
  });

  const events = yield* Transit.findTransits({
    planet,
    from: Chart.LocatedMoment.make({ moment, latitude, longitude }),
    count: 3,
    direction,
    kinds: ["sign-ingress"],
    maxYears: 12,
  });

  yield* Console.log(`${planet} sign ingresses`);
  yield* Console.table(
    events.map((event) => ({
      Moment: DateTime.toDate(event.moment).toISOString(),
      Longitude: Number(event.longitude).toFixed(3),
      Sign: event.sign ?? "-",
      Retrograde: event.is_retrograde ? "yes" : "no",
    })),
  );
});
