import { Effect, Schema } from "effect";

import { AstroParams } from "../astro-params/service.js";
import { generate } from "../chart/generate.js";
import { ChartParams, Moment, type Planets } from "../chart/model.js";
import type { JulianDay } from "../ephemeris/model.js";
import { Ephemeris } from "../ephemeris/service.js";
import { normalizeLongitude } from "../utils/position.js";
import { TransitSearchExhausted, TransitValidationError } from "./error.js";
import {
  TransitEvent,
  TransitRequest,
  type Division,
  type LocatedMoment,
  type TransitDirection,
  type TransitKind,
} from "./model.js";
import {
  DEFAULT_MAX_YEARS,
  dateTimeFromJd,
  searchRawHits,
  type FixedTarget,
  type RawHit,
} from "./search.js";

const validateRequest = Effect.fn("astro-ascendant/transit/validateRequest")(function* (
  request: TransitRequest,
) {
  const decoded = yield* Schema.decodeEffect(TransitRequest)(request).pipe(
    Effect.mapError((cause) =>
      TransitValidationError.make({
        message: "Invalid Transit request",
        cause,
      }),
    ),
  );
  if (decoded.kinds.includes("longitude-hit") && decoded.targetLongitude === undefined) {
    return yield* TransitValidationError.make({
      message: "targetLongitude is required for longitude-hit searches",
      cause: decoded.kinds,
    });
  }
  if (decoded.kinds.includes("cusp-crossing") && decoded.house === undefined) {
    return yield* TransitValidationError.make({
      message: "house is required for cusp-crossing searches",
      cause: decoded.kinds,
    });
  }
  return decoded;
});

export const findTransits = Effect.fn("astro-ascendant/transit/findTransits")(function* (
  request: TransitRequest,
) {
  const validated = yield* validateRequest(request);
  const astroParams = yield* AstroParams;
  const ephemeris = yield* Ephemeris;

  const fromJulianDay = yield* ephemeris.dateToJulianDay(validated.from.moment.date);
  const fixedTargets = yield* buildFixedTargets(validated, fromJulianDay);

  const planet: Planets = validated.planet;
  const direction: TransitDirection = validated.direction;
  const outcome = yield* searchRawHits({
    planet,
    fromJulianDay,
    direction,
    count: validated.count,
    includeIngress: validated.kinds.includes("sign-ingress" satisfies TransitKind),
    includeStations: validated.kinds.includes("station" satisfies TransitKind),
    fixedTargets,
    ayanamsa: astroParams.ayanamsa,
    ...(validated.precisionMinutes === undefined
      ? {}
      : { precisionMinutes: validated.precisionMinutes }),
    ...(validated.maxYears === undefined ? {} : { maxYears: validated.maxYears }),
  });

  const events = mapEvents(outcome.hits, planet, direction);

  if (!outcome.complete) {
    return yield* TransitSearchExhausted.make({
      message: `Found ${events.length} of ${validated.count} events within ${validated.maxYears ?? DEFAULT_MAX_YEARS} years`,
      found: events,
      searchedUntil: dateTimeFromJd(outcome.endJulianDay),
    });
  }

  const divisions = validated.includeCharts ?? [];
  if (divisions.length === 0) return events;
  return yield* enrichWithCharts(events, divisions, validated.from);
});

const buildFixedTargets = Effect.fn("astro-ascendant/transit/buildFixedTargets")(function* (
  validated: TransitRequest,
  fromJulianDay: JulianDay,
) {
  const astroParams = yield* AstroParams;
  const ephemeris = yield* Ephemeris;

  const fixedTargets: Array<FixedTarget> = [];
  if (validated.kinds.includes("longitude-hit" satisfies TransitKind)) {
    const target = validated.targetLongitude;
    if (target === undefined) {
      return yield* TransitValidationError.make({
        message: "targetLongitude is required for longitude-hit searches",
        cause: validated.kinds,
      });
    }
    fixedTargets.push({ kind: "longitude-hit", longitude: target });
  }
  if (validated.kinds.includes("cusp-crossing" satisfies TransitKind)) {
    const house = validated.house;
    if (house === undefined) {
      return yield* TransitValidationError.make({
        message: "house is required for cusp-crossing searches",
        cause: validated.kinds,
      });
    }
    const houses = yield* ephemeris.calculateHouses(
      fromJulianDay,
      validated.from.latitude,
      validated.from.longitude,
      astroParams.houseSystem,
      astroParams.ayanamsa,
    );
    const cusp = houses.cusps[house];
    if (cusp === undefined || !Number.isFinite(cusp)) {
      return yield* TransitValidationError.make({
        message: `No cusp found for house ${house}`,
        cause: houses.cusps,
      });
    }
    fixedTargets.push({ kind: "cusp-crossing", longitude: yield* normalizeLongitude(cusp) });
  }

  return fixedTargets;
});

function mapEvents(
  hits: ReadonlyArray<RawHit>,
  planet: Planets,
  direction: TransitDirection,
): ReadonlyArray<TransitEvent> {
  const provenance = {
    school: "Ascendant",
    method: "transit-sample-bisect",
    version: 1,
  } as const;
  return hits.map((hit) =>
    TransitEvent.make({
      planet,
      moment: dateTimeFromJd(hit.julianDay),
      longitude: hit.longitude,
      kind: hit.kind,
      sign: hit.sign,
      is_retrograde: hit.speed < 0,
      direction,
      provenance,
    }),
  );
}

const enrichWithCharts = Effect.fn("astro-ascendant/transit/enrichWithCharts")(function* (
  events: ReadonlyArray<TransitEvent>,
  divisions: ReadonlyArray<Division>,
  from: LocatedMoment,
) {
  return yield* Effect.forEach(
    events,
    (event) =>
      Effect.gen(function* () {
        const input = ChartParams.make({
          moment: Moment.make({ date: event.moment }),
          latitude: from.latitude,
          longitude: from.longitude,
        });
        const calculation = yield* generate(input, divisions);
        return TransitEvent.make({
          planet: event.planet,
          moment: event.moment,
          longitude: event.longitude,
          kind: event.kind,
          ...(event.sign === undefined ? {} : { sign: event.sign }),
          is_retrograde: event.is_retrograde,
          direction: event.direction,
          provenance: event.provenance,
          calculation,
        });
      }),
    { concurrency: "unbounded" },
  );
});
