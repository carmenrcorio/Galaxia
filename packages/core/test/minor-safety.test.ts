import { describe, expect, it } from "vitest";
import { isMinorForSafety, minPossibleAge } from "../src/index";

// Fixed "now" for deterministic tests: 2026-07-11 (matches the audit date).
const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("isMinorForSafety — the age-based backstop", () => {
  it("PRIMARY REGRESSION: a real child (Gabriel, born 2017-04-03, is_minor=false) is still treated as a minor", () => {
    // This is the exact production record the audit found: a 9-year-old
    // saved with the manual checkbox unchecked. Before this fix, every gate
    // that read `is_minor` directly would have silently let this bypass.
    expect(
      isMinorForSafety({ isMinor: false, birthDate: "2017-04-03", birthPrecision: "exact" }, NOW)
    ).toBe(true);
  });

  it("age backstop fires even when is_minor is false, for exact precision", () => {
    // Born 10 years before "now" — unambiguously a minor regardless of the checkbox.
    expect(isMinorForSafety({ isMinor: false, birthDate: "2016-01-01", birthPrecision: "exact" }, NOW)).toBe(true);
  });

  it("age backstop fires for date precision too", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: "2015-06-15", birthPrecision: "date" }, NOW)).toBe(true);
  });

  it("an adult with is_minor=false stays unprotected (no false positive)", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: "1987-12-29", birthPrecision: "exact" }, NOW)).toBe(false);
  });

  it("the manual flag can only ADD protection, never remove it: is_minor=true overrides an adult-looking birth date", () => {
    // A human explicitly said "minor" — that must always win, even if the
    // stored birth date (e.g. a data-entry mistake) looks adult.
    expect(isMinorForSafety({ isMinor: true, birthDate: "1990-01-01", birthPrecision: "exact" }, NOW)).toBe(true);
  });

  it("is_minor=true with no birth date at all is still protected (manual flag works standalone)", () => {
    expect(isMinorForSafety({ isMinor: true, birthDate: null, birthPrecision: "none" }, NOW)).toBe(true);
  });

  it("no birth date and is_minor=false defers to the manual signal (nothing to compute)", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: null, birthPrecision: "none" }, NOW)).toBe(false);
  });

  it("year-only precision at the 17/18 boundary is treated as a minor (over-protect on ambiguity)", () => {
    // now = 2026-07-11. Born "2008" (year-only): could be 17 (if birthday
    // hasn't happened yet, e.g. Nov) or 18 (if it has, e.g. Jan). Since it's
    // POSSIBLE they are 17, over-protect.
    expect(isMinorForSafety({ isMinor: false, birthDate: "2008-01-01", birthPrecision: "year" }, NOW)).toBe(true);
  });

  it("year-only precision clearly in adulthood is not flagged", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: "1970-01-01", birthPrecision: "year" }, NOW)).toBe(false);
  });

  it("year-only precision clearly a minor (young year) is flagged", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: "2020-01-01", birthPrecision: "year" }, NOW)).toBe(true);
  });

  it("someone who turns 18 exactly today is no longer a minor", () => {
    // now = 2026-07-11 → born 2008-07-11 turns 18 today.
    expect(isMinorForSafety({ isMinor: false, birthDate: "2008-07-11", birthPrecision: "exact" }, NOW)).toBe(false);
  });

  it("someone who turns 18 tomorrow is still a minor today", () => {
    expect(isMinorForSafety({ isMinor: false, birthDate: "2008-07-12", birthPrecision: "exact" }, NOW)).toBe(true);
  });
});

describe("minPossibleAge", () => {
  it("returns null with no usable birth date (progressive capture / 'none' precision)", () => {
    expect(minPossibleAge(null, "none", NOW)).toBeNull();
    expect(minPossibleAge(undefined, undefined, NOW)).toBeNull();
  });

  it("computes an exact age for exact/date precision", () => {
    expect(minPossibleAge("2017-04-03", "exact", NOW)).toBe(9);
  });

  it("assumes the latest possible birthday (Dec 31) for year-only precision", () => {
    // now = 2026-07-11. Year 2010 → Dec-31 assumption → not yet turned 16 this year → 15.
    expect(minPossibleAge("2010-01-01", "year", NOW)).toBe(15);
  });
});
