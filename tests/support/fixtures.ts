import { DateTime, HashSet, Record } from "effect";

import * as Model from "../../src/chart/index.js";
import { PLANETS } from "../../src/chart/internal/constants.js";

function sourcePlanet(
  name: Model.Planets,
  longitude: number,
  isRetrograde = false,
): Model.SourcePlanet {
  return Model.SourcePlanet.make({
    name,
    longitude: Model.Longitude.make(longitude),
    is_retrograde: isRetrograde,
    star: Model.Star.make({ name: "Ashwini", lord: "Ketu", pada: 1 }),
  });
}

function placementsFromLongitudes(
  overrides: Partial<Record<Model.Planets, number>> = {},
  options: {
    readonly omit?: readonly Model.Planets[];
    readonly duplicate?: Model.Planets;
    readonly lagnaLongitude?: number;
    readonly retrograde?: readonly Model.Planets[];
  } = {},
): Model.Placements {
  const longitudes: Record<Model.Planets, number> = {
    Sun: 10,
    Moon: 40,
    Mars: 70,
    Mercury: 100,
    Jupiter: 130,
    Venus: 160,
    Saturn: 190,
    Rahu: 220,
    Ketu: 250,
    ...overrides,
  };
  const omitted = HashSet.fromIterable(options.omit ?? []);
  const retrograde = HashSet.fromIterable(options.retrograde ?? []);
  const planets = PLANETS.filter((planet) => !HashSet.has(omitted, planet)).map((planet) =>
    sourcePlanet(planet, longitudes[planet], HashSet.has(retrograde, planet)),
  );
  if (options.duplicate !== undefined) {
    planets.push(sourcePlanet(options.duplicate, longitudes[options.duplicate]));
  }

  return Model.Placements.make({
    lagna: Model.SourceLagna.make({
      name: "Lagna",
      longitude: Model.Longitude.make(options.lagnaLongitude ?? 0),
      star: Model.Star.make({ name: "Ashwini", lord: "Ketu", pada: 1 }),
    }),
    planets,
  });
}

function moment(date = "2000-01-01T12:00:00.000Z"): Model.Moment {
  return Model.Moment.make({ date: DateTime.makeUnsafe(date) });
}

function locatedMoment(
  date = "2000-01-01T12:00:00.000Z",
  latitude = 12.9716,
  longitude = 77.5946,
): Model.LocatedMoment {
  return Model.LocatedMoment.make({ moment: moment(date), latitude, longitude });
}

export const fixtures = {
  locatedMoment,
  moment,
  placementsFromLongitudes,
  sourcePlanet,
};
