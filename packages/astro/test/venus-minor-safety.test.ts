/**
 * Venus placement / house minor-safety lookup.
 *
 * Every call site must pass PlacementSafetyOpts.minorSafe; this suite asserts
 * the library chooses the table (call sites never pick VENUS_IN_*_MINOR directly).
 */

import { describe, expect, it } from "vitest";
import {
  BODY_DOMAIN,
  bodyDomain,
  interpretPlacement,
  PLANET_IN_SIGN,
  VENUS_IN_SIGN_MINOR,
  type SignKey,
} from "../src/interpretations";
import {
  interpretHouse,
  PLANET_IN_HOUSE,
  VENUS_IN_HOUSE_MINOR,
  type HouseKey,
} from "../src/house-interpretations";

const SIGNS: SignKey[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const HOUSES: HouseKey[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe("interpretPlacement — Venus minorSafe gate", () => {
  it("minorSafe:false returns PLANET_IN_SIGN.venus adult strings for every sign", () => {
    for (const sign of SIGNS) {
      const reading = interpretPlacement("venus", sign, { minorSafe: false });
      expect(reading).toEqual(PLANET_IN_SIGN.venus[sign]);
      expect(reading.short).not.toEqual(VENUS_IN_SIGN_MINOR[sign].short);
    }
  });

  it("minorSafe:true never returns a PLANET_IN_SIGN.venus adult string", () => {
    for (const sign of SIGNS) {
      const reading = interpretPlacement("venus", sign, { minorSafe: true });
      const adult = PLANET_IN_SIGN.venus[sign];
      expect(reading).toEqual(VENUS_IN_SIGN_MINOR[sign]);
      expect(reading.short).not.toBe(adult.short);
      expect(reading.long).not.toBe(adult.long);
      expect(reading.short.length).toBeGreaterThan(0);
      expect(reading.long.length).toBeGreaterThan(0);
    }
  });

  it("non-Venus bodies are unchanged by minorSafe", () => {
    const adult = interpretPlacement("mars", "Scorpio", { minorSafe: false });
    const minor = interpretPlacement("mars", "Scorpio", { minorSafe: true });
    expect(adult).toEqual(minor);
    expect(adult).toEqual(PLANET_IN_SIGN.mars.Scorpio);
  });
});

describe("bodyDomain — Venus minor label swap", () => {
  it("adult Venus domain stays 'How they love'", () => {
    expect(bodyDomain("venus", { minorSafe: false })).toBe("How they love");
    expect(bodyDomain("venus", { minorSafe: false })).toBe(BODY_DOMAIN.venus);
  });

  it("minor Venus domain is 'How they care'", () => {
    expect(bodyDomain("venus", { minorSafe: true })).toBe("How they care");
  });

  it("other bodies ignore minorSafe", () => {
    expect(bodyDomain("mars", { minorSafe: true })).toBe(BODY_DOMAIN.mars);
    expect(bodyDomain("sun", { minorSafe: false })).toBe(BODY_DOMAIN.sun);
  });
});

describe("interpretHouse — Venus minorSafe gate", () => {
  it("minorSafe:false returns PLANET_IN_HOUSE.venus adult strings for every house", () => {
    for (const house of HOUSES) {
      const reading = interpretHouse("venus", house, { minorSafe: false });
      expect(reading).toEqual(PLANET_IN_HOUSE.venus[house]);
    }
  });

  it("minorSafe:true never returns a PLANET_IN_HOUSE.venus adult string", () => {
    for (const house of HOUSES) {
      const reading = interpretHouse("venus", house, { minorSafe: true });
      const adult = PLANET_IN_HOUSE.venus[house];
      expect(reading).toEqual(VENUS_IN_HOUSE_MINOR[house]);
      expect(reading.short).not.toBe(adult.short);
      expect(reading.long).not.toBe(adult.long);
      expect(reading.short.length).toBeGreaterThan(0);
      expect(reading.long.length).toBeGreaterThan(0);
    }
  });

  it("Mars house copy is unchanged by minorSafe (conflict-framed, not romantic)", () => {
    const adult = interpretHouse("mars", 5, { minorSafe: false });
    const minor = interpretHouse("mars", 5, { minorSafe: true });
    expect(adult).toEqual(minor);
    expect(adult).toEqual(PLANET_IN_HOUSE.mars[5]);
  });
});
