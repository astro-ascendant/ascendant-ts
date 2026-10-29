import { describe, expect, it } from "@effect/vitest";

import type { Longitude } from "../src/chart/model.js";
import { Zodiac } from "../src/utils/index.js";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

describe("Zodiac", () => {
  it("wraps any integer onto the 0-11 wheel", () => {
    expect(Zodiac.wrapIndex(0)).toBe(0);
    expect(Zodiac.wrapIndex(11)).toBe(11);
    expect(Zodiac.wrapIndex(12)).toBe(0);
    expect(Zodiac.wrapIndex(-1)).toBe(11);
    expect(Zodiac.wrapIndex(-13)).toBe(11);
    expect(Zodiac.wrapIndex(25)).toBe(1);
  });

  it("round-trips every sign through its index", () => {
    for (const [index, sign] of SIGNS.entries()) {
      expect(Zodiac.rashiIndexOf(sign)).toBe(index);
      expect(Zodiac.signAt(index)).toBe(sign);
    }
  });

  it("wraps out-of-range positions to signs", () => {
    expect(Zodiac.signAt(12)).toBe("Aries");
    expect(Zodiac.signAt(-1)).toBe("Pisces");
  });

  it("wraps angles onto the circle and into the signed range", () => {
    expect(Zodiac.wrapLongitude(360)).toBe(0);
    expect(Zodiac.wrapLongitude(-0.5)).toBeCloseTo(359.5, 10);
    expect(Zodiac.wrapSigned(359.9)).toBeCloseTo(-0.1, 10);
    expect(Zodiac.wrapSigned(181)).toBeCloseTo(-179, 10);
    expect(Zodiac.wrapSigned(-180)).toBe(-180);
  });

  it("locates the sign containing a longitude", () => {
    const at = (longitude: number) => Zodiac.indexOfLongitude(longitude as Longitude);
    expect(at(0)).toBe(0);
    expect(at(29.99)).toBe(0);
    expect(at(30)).toBe(1);
    expect(at(359.99)).toBe(11);
  });

  it("measures forward distance between positions", () => {
    expect(Zodiac.distanceBetween(0, 0)).toBe(0);
    expect(Zodiac.distanceBetween(0, 1)).toBe(1);
    expect(Zodiac.distanceBetween(11, 0)).toBe(1);
    expect(Zodiac.distanceBetween(0, 11)).toBe(11);
  });

  it("counts 1-based houses between positions", () => {
    expect(Zodiac.houseDistance(5, 5)).toBe(1);
    expect(Zodiac.houseDistance(0, 1)).toBe(2);
    expect(Zodiac.houseDistance(11, 0)).toBe(2);
    expect(Zodiac.houseDistance(0, 11)).toBe(12);
  });

  it("resolves the sign of the nth house from lagna", () => {
    expect(Zodiac.houseSignOf(0, 1)).toBe("Aries");
    expect(Zodiac.houseSignOf(0, 12)).toBe("Pisces");
    expect(Zodiac.houseSignOf(11, 2)).toBe("Aries");
  });

  it("walks the full wheel from any start in either direction", () => {
    expect(Zodiac.sequenceFrom(0, 1)).toEqual([...SIGNS]);
    expect(Zodiac.sequenceFrom(0, -1)[1]).toBe("Pisces");
    expect(Zodiac.sequenceFrom(0, 1)).toHaveLength(12);
    expect(Zodiac.sequenceFrom(5, 1)[0]).toBe("Virgo");
  });

  it("rejects out-of-range wheel positions", () => {
    expect(() => Zodiac.RashiIndex.make(12)).toThrow();
    expect(() => Zodiac.RashiIndex.make(-1)).toThrow();
  });
});
