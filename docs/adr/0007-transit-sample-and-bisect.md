# Find transits by sampling and bisection

Transit search has no native `@swisseph/node` API, so it samples `Ephemeris.calculatePosition` at per-planet coarse steps and bisects each bracketed crossing to one-minute precision, with stations detected from `longitudeSpeed` sign changes.
