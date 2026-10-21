import type { Degree, Longitude } from "../model.js";

export interface DivisionalTarget {
  readonly signIndex: number;
  readonly degree: Degree;
  readonly longitude: Longitude;
}

export interface SourcePosition {
  readonly longitude: Longitude;
  readonly signIndex: number;
  readonly degree: Degree;
}

export interface Subdivision {
  readonly partIndex: number;
  readonly degree: number;
}
