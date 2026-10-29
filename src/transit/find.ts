import { Effect, Schema } from "effect";

import { AstroParams } from "../astro-params/service.js";
import { generate } from "../chart/generate.js";
import { ChartParams, type Houses, type Longitude, Moment, type Planets } from "../chart/model.js";
import { dateTimeOfJulianDay, type JulianDay } from "../ephemeris/model.js";
import { Ephemeris } from "../ephemeris/service.js";
import { transitSearch } from "../provenance.js";
import { TransitSearchExhausted, TransitValidationError } from "./error.js";
import {
  TransitEvent,
  TransitRequest,
  type Division,
  type LocatedMoment,
  type TransitDirection,
  type TransitKind,
} from "./model.js";
import { DEFAULT_MAX_YEARS, searchRawHits, type FixedTarget, type RawHit } from "./search.js";

/** The fixed longitude and cusp-crossing targets a request asked for, each present exactly when requested. */
interface RequestedTargets {
  readonly longitude: Longitude | undefined;
  readonly house: Houses | undefined;
}

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
  const wantsLongitude = decoded.kinds.includes("longitude-hit");
  const wantsCusp = decoded.kinds.includes("cusp-crossing");
  if (wantsLongitude && decoded.targetLongitude === undefined) {
    return yield* TransitValidationError.make({
      message: "targetLongitude is required for longitude-hit searches",
      cause: decoded.kinds,
    });
  }
  if (wantsCusp && decoded.house === undefined) {
    return yield* TransitValidationError.make({
      message: "house is required for cusp-crossing searches",
      cause: decoded.kinds,
    });
  }
  const targets: RequestedTargets = {
    longitude: wantsLongitude ? decoded.targetLongitude : undefined,
    house: wantsCusp ? decoded.house : undefined,
  };
  return { request: decoded, targets } as const;
});

export const findTransits = Effect.fn("astro-ascendant/transit/findTransits")(function* (
  request: TransitRequest,
) {
  const { request: validated, targets } = yield* validateRequest(request);
  const astroParams = yield* AstroParams;
  const ephemeris = yield* Ephemeris;

  const fromJulianDay = yield* ephemeris.dateToJulianDay(validated.from.moment.date);
  const fixedTargets = yield* buildFixedTargets(targets, validated.from, fromJulianDay);

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
      searchedUntil: dateTimeOfJulianDay(outcome.endJulianDay),
    });
  }

  const divisions = validated.includeCharts ?? [];
  if (divisions.length === 0) return events;
  return yield* enrichWithCharts(events, divisions, validated.from);
});

const buildFixedTargets = Effect.fn("astro-ascendant/transit/buildFixedTargets")(function* (
  targets: RequestedTargets,
  from: LocatedMoment,
  fromJulianDay: JulianDay,
) {
  const fixedTargets: Array<FixedTarget> = [];
  if (targets.longitude !== undefined) {
    fixedTargets.push({ kind: "longitude-hit", longitude: targets.longitude });
  }
  if (targets.house !== undefined) {
    const astroParams = yield* AstroParams;
    const ephemeris = yield* Ephemeris;
    const houses = yield* ephemeris.calculateHouses(
      fromJulianDay,
      from.latitude,
      from.longitude,
      astroParams.houseSystem,
      astroParams.ayanamsa,
    );
    fixedTargets.push({ kind: "cusp-crossing", longitude: houses.cusps[targets.house] });
  }
  return fixedTargets;
});

function mapEvents(
  hits: ReadonlyArray<RawHit>,
  planet: Planets,
  direction: TransitDirection,
): ReadonlyArray<TransitEvent> {
  const provenance = transitSearch.provenance;
  return hits.map((hit) =>
    TransitEvent.make({
      planet,
      moment: dateTimeOfJulianDay(hit.julianDay),
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
