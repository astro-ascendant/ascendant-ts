import {
  Array,
  Config,
  ConfigProvider,
  Console,
  DateTime,
  Effect,
  FileSystem,
  Match,
  Option,
  Order,
  Path,
  RegExp,
  Schema,
  pipe,
} from "effect";
import { Prompt } from "effect/cli";

import type { Moment } from "../src/chart/index.js";
import { AstroParams, Chart } from "../src/index.js";
import { chartExample } from "./chart.js";
import { dashaExample } from "./dasha.js";
import { jaiminiExample } from "./jaimini.js";
import { savExample } from "./sav.js";
import { transitExample } from "./transit.js";

export interface ExampleInput {
  readonly moment: Moment;
  readonly latitude: number;
  readonly longitude: number;
}

const DATE_PATTERN = new RegExp.RegExp("^\\d{2}/\\d{2}/\\d{4}$");
const TIME_PATTERN = new RegExp.RegExp("^(?:[01]\\d|2[0-3]):[0-5]\\d$");
const ENVIRONMENT_INPUT_ERROR = Array.join(
  [
    "Could not load a complete moment from the environment.",
    "Set MOMENT_DATE (an ISO 8601 date and time), LATITUDE (-90 to 90), and LONGITUDE (-180 to 180).",
    "Optionally set AYANAMSA and HOUSE_SYSTEM; they default to Lahiri and WholeSign.",
    "Values are read in this order: process environment, .env.local, .env, then config.json.",
    "Continue by entering the moment manually.",
  ],
  "\n",
);
const PRECOMPUTED_LOCATIONS = [
  { name: "Agra", latitude: 27.1767, longitude: 78.0081 },
  { name: "Bangalore", latitude: 12.9716, longitude: 77.5946 },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707 },
  { name: "Coimbatore", latitude: 11.0168, longitude: 76.9558 },
  { name: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
  { name: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { name: "Madurai", latitude: 9.9252, longitude: 78.1198 },
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  { name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { name: "Trichy", latitude: 10.7905, longitude: 78.7047 },
] as const;

const timeZoneOrder = Order.make<string>((left, right) => {
  if (left === "Asia/Kolkata") return -1;
  if (right === "Asia/Kolkata") return 1;
  const compared = left.localeCompare(right);
  return compared < 0 ? -1 : compared > 0 ? 1 : 0;
});

const TIME_ZONE_CHOICES = pipe(
  ["Asia/Kolkata", "UTC", ...Intl.supportedValuesOf("timeZone")],
  Array.sort(timeZoneOrder),
  Array.map((timeZone) => ({ title: timeZone, value: timeZone })),
);
const DEFAULT_ASTRO_PARAMS = AstroParams.Options.make({
  ayanamsa: "Lahiri",
  houseSystem: "WholeSign",
});

const makeMomentFromEnvironment = (value: string) =>
  Option.match(DateTime.make(value), {
    onNone: () => Effect.fail("MOMENT_DATE must be a valid ISO 8601 date and time"),
    onSome: (date) => Effect.succeed(Chart.Moment.make({ date })),
  });

const validateCoordinate = (
  value: number,
  name: "LATITUDE" | "LONGITUDE",
  minimum: number,
  maximum: number,
) =>
  Match.value(value >= minimum && value <= maximum).pipe(
    Match.when(true, () => Effect.succeed(value)),
    Match.when(false, () => Effect.fail(`${name} must be between ${minimum} and ${maximum}`)),
    Match.exhaustive,
  );

const validateDate = (value: string) =>
  Match.value(DATE_PATTERN.test(value)).pipe(
    Match.when(true, () => Effect.succeed(value)),
    Match.when(false, () => Effect.fail("Enter a date in DD/MM/YYYY format")),
    Match.exhaustive,
  );

const validateTime = (value: string) =>
  Match.value(TIME_PATTERN.test(value)).pipe(
    Match.when(true, () => Effect.succeed(value)),
    Match.when(false, () => Effect.fail("Enter a 24-hour time in HH:MM format")),
    Match.exhaustive,
  );

const makeAstroParams = (ayanamsa: string, houseSystem: string) =>
  Schema.decodeUnknownEffect(AstroParams.Options)({ ayanamsa, houseSystem }).pipe(
    Effect.mapError(
      () =>
        `AYANAMSA must be one of: ${Array.join(AstroParams.Ayanamsa.literals, ", ")}. ` +
        `HOUSE_SYSTEM must be one of: ${Array.join(AstroParams.HouseSystem.literals, ", ")}.`,
    ),
  );

const promptCoordinates = Effect.fn(function* () {
  const latitude = yield* Prompt.Number({
    message: "Latitude",
    min: -90,
    max: 90,
    precision: 6,
  });
  const longitude = yield* Prompt.Number({
    message: "Longitude",
    min: -180,
    max: 180,
    precision: 6,
  });
  return { latitude, longitude };
});

const selectLocation = Effect.fn(function* () {
  const location = yield* Prompt.Select<
    { readonly latitude: number; readonly longitude: number } | "manual"
  >({
    message: "Location",
    choices: [
      ...Array.map(PRECOMPUTED_LOCATIONS, (precomputedLocation) => ({
        title: precomputedLocation.name,
        description: `${precomputedLocation.latitude}, ${precomputedLocation.longitude}`,
        value: {
          latitude: precomputedLocation.latitude,
          longitude: precomputedLocation.longitude,
        },
      })),
      {
        title: "Enter coordinates manually",
        description: "Provide latitude and longitude",
        value: "manual",
      },
    ],
  });
  return yield* Match.value(location).pipe(
    Match.when("manual", () => promptCoordinates()),
    Match.orElse((coordinates) => Effect.succeed(coordinates)),
  );
});

function makeMomentFromInput(
  date: string,
  time: string,
  timeZone: string,
): Effect.Effect<Chart.Moment, string> {
  const localDateTime = `${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}T${time}:00`;
  return Option.match(
    DateTime.makeZoned(localDateTime, {
      timeZone,
      adjustForTimeZone: true,
      disambiguation: "reject",
    }),
    {
      onNone: () => Effect.fail("Enter an existing local date and time"),
      onSome: (dateTime) => Effect.succeed(Chart.Moment.make({ date: DateTime.toUtc(dateTime) })),
    },
  );
}

const addDotEnvProvider = Effect.fn(function* (
  provider: ConfigProvider.ConfigProvider,
  path: string,
  exists: boolean,
) {
  return yield* Match.value(exists).pipe(
    Match.when(true, () =>
      ConfigProvider.fromDotEnv({ path }).pipe(
        Effect.map((dotEnv) => ConfigProvider.orElse(dotEnv, provider)),
      ),
    ),
    Match.when(false, () => Effect.succeed(provider)),
    Match.exhaustive,
  );
});

class JsonConfigError extends Schema.TaggedError<JsonConfigError>()("JsonConfigError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

const addJsonConfigProvider = Effect.fn(function* (
  provider: ConfigProvider.ConfigProvider,
  path: string,
  exists: boolean,
) {
  return yield* Match.value(exists).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const content = yield* fileSystem.readFileString(path);
        const value = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown))(
          content,
        ).pipe(
          Effect.mapError((cause) =>
            JsonConfigError.make({ message: `Could not parse ${path}`, cause }),
          ),
        );
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return yield* JsonConfigError.make({
            message: `${path} must contain a JSON object`,
            cause: value,
          });
        }
        return ConfigProvider.orElse(ConfigProvider.fromUnknown(value), provider);
      }),
    ),
    Match.when(false, () => Effect.succeed(provider)),
    Match.exhaustive,
  );
});

const environmentConfigProvider = Effect.fn(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const examplesDirectory = path.dirname(yield* path.fromFileUrl(new URL(import.meta.url)));
  const dotEnvPath = path.join(examplesDirectory, ".env");
  const dotEnvLocalPath = path.join(examplesDirectory, ".env.local");
  const configJsonPath = path.join(examplesDirectory, "config.json");
  const hasDotEnv = yield* fileSystem.exists(dotEnvPath);
  const hasDotEnvLocal = yield* fileSystem.exists(dotEnvLocalPath);
  const hasConfigJson = yield* fileSystem.exists(configJsonPath);

  const withConfigJson = yield* addJsonConfigProvider(
    ConfigProvider.fromUnknown({}),
    configJsonPath,
    hasConfigJson,
  );
  const withDotEnv = yield* addDotEnvProvider(withConfigJson, dotEnvPath, hasDotEnv);
  const withDotEnvLocal = yield* addDotEnvProvider(withDotEnv, dotEnvLocalPath, hasDotEnvLocal);

  return ConfigProvider.orElse(ConfigProvider.fromEnv(), withDotEnvLocal);
});

const inputFromEnvironment = Effect.fn(function* () {
  const provider = yield* environmentConfigProvider();
  const date = yield* Config.String("MOMENT_DATE").parse(provider);
  const latitude = yield* Config.Number("LATITUDE").parse(provider);
  const longitude = yield* Config.Number("LONGITUDE").parse(provider);
  const ayanamsa = yield* Config.withDefault(
    Config.String("AYANAMSA"),
    DEFAULT_ASTRO_PARAMS.ayanamsa,
  ).parse(provider);
  const houseSystem = yield* Config.withDefault(
    Config.String("HOUSE_SYSTEM"),
    DEFAULT_ASTRO_PARAMS.houseSystem,
  ).parse(provider);
  const moment = yield* makeMomentFromEnvironment(date);
  const validLatitude = yield* validateCoordinate(latitude, "LATITUDE", -90, 90);
  const validLongitude = yield* validateCoordinate(longitude, "LONGITUDE", -180, 180);
  const astroParams = yield* makeAstroParams(ayanamsa, houseSystem);
  return { moment, latitude: validLatitude, longitude: validLongitude, astroParams };
});

const promptInput = Effect.fn(function* () {
  const date = yield* Prompt.String({
    message: "Date (DD/MM/YYYY)",
    validate: validateDate,
  });
  const time = yield* Prompt.String({
    message: "Time (24-hour HH:MM)",
    validate: validateTime,
  });
  const timeZone = yield* Prompt.AutoComplete<string>({
    message: "Timezone",
    filterLabel: "Search timezone",
    filterPlaceholder: "Type a city or region",
    choices: TIME_ZONE_CHOICES,
  });
  const moment = yield* makeMomentFromInput(date, time, timeZone);
  const coordinates = yield* selectLocation();
  return { moment, ...coordinates, astroParams: DEFAULT_ASTRO_PARAMS };
});

export const selectInput = Effect.fn(function* () {
  const source = yield* Prompt.Select<"environment" | "input">({
    message: "How would you like to provide the moment?",
    choices: [
      {
        title: "Read from environment",
        description: "Use process variables, .env.local, .env, or config.json",
        value: "environment",
      },
      {
        title: "Enter manually",
        description: "Provide date, time, timezone, and coordinates interactively",
        value: "input",
      },
    ],
  });
  return yield* Match.value(source).pipe(
    Match.when("environment", () =>
      inputFromEnvironment().pipe(
        Effect.catch(() =>
          Effect.gen(function* () {
            yield* Console.error(ENVIRONMENT_INPUT_ERROR);
            return yield* promptInput();
          }),
        ),
      ),
    ),
    Match.orElse(() => promptInput()),
  );
});

const transitInput = Effect.fn(function* () {
  const date = yield* DateTime.now;
  const coordinates = yield* selectLocation();
  return {
    moment: Chart.Moment.make({ date }),
    ...coordinates,
    astroParams: DEFAULT_ASTRO_PARAMS,
  };
});

export const runSelectedExample = Effect.gen(function* () {
  const example = yield* Prompt.Select<"chart" | "dasha" | "jaimini" | "sav" | "transit">({
    message: "Choose an example to run",
    choices: [
      {
        title: "Chart",
        description: "Generate D1/D9 (Lahiri + WholeSign) and KP D1 (KrishnamurtiVP291 + Placidus)",
        value: "chart",
      },
      {
        title: "Dasha",
        description: "Calculate a Chara, Sthira, or Vimshottari timeline",
        value: "dasha",
      },
      {
        title: "Jaimini",
        description: "Calculate the named Jaimini results",
        value: "jaimini",
      },
      {
        title: "SAV",
        description: "Calculate Bhinnashtakavarga and Sarvashtakavarga",
        value: "sav",
      },
      {
        title: "Transit",
        description: "Find the next or previous sign ingresses of a graha",
        value: "transit",
      },
    ],
  });

  const input = yield* Match.value(example).pipe(
    Match.when("transit", () => transitInput()),
    Match.orElse(() => selectInput()),
  );

  const program = Match.value(example).pipe(
    Match.when("chart", () => chartExample(input)),
    Match.when("dasha", () => dashaExample(input)),
    Match.when("jaimini", () => jaiminiExample(input)),
    Match.when("sav", () => savExample(input)),
    Match.when("transit", () => transitExample(input)),
    Match.exhaustive,
  );
  yield* Effect.provideService(
    program,
    AstroParams.AstroParams,
    AstroParams.AstroParams.of(input.astroParams),
  );
});
