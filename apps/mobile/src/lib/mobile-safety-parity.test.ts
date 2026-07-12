import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  availableCompareRelationTypes,
  buildBirthInput,
  defaultCompareRelationType,
  isRomanticRelation,
  type BirthFormInput
} from "@galaxia/astro";
import { isMinorForSafety, peopleForTodaySky } from "@galaxia/core";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("BUG 1 — mobile Compare blocks romantic framing when either person is a minor", () => {
  const adult = { isMinor: false, birthDate: "1987-12-29", birthPrecision: "exact" as const };
  const flaggedChild = { isMinor: true, birthDate: "2015-08-20", birthPrecision: "exact" as const };
  const unflaggedChild = { isMinor: false, birthDate: "2017-04-03", birthPrecision: "exact" as const };

  it("defaults via defaultCompareRelationType(false) — never partners", () => {
    expect(defaultCompareRelationType(false)).toBe("friends");
    expect(isRomanticRelation(defaultCompareRelationType(false))).toBe(false);
  });

  it("pairHasMinor uses isMinorForSafety on both endpoints (not raw is_minor)", () => {
    const pairHasMinor =
      isMinorForSafety(adult, NOW) || isMinorForSafety(flaggedChild, NOW);
    expect(pairHasMinor).toBe(true);

    const ageAware =
      isMinorForSafety(adult, NOW) || isMinorForSafety(unflaggedChild, NOW);
    expect(isMinorForSafety(unflaggedChild, NOW)).toBe(true);
    expect(ageAware).toBe(true);
  });

  it("availableCompareRelationTypes removes romantic types when pairHasMinor", () => {
    const available = availableCompareRelationTypes(true);
    expect(available).not.toContain("partners");
    expect(available.some((t) => isRomanticRelation(t))).toBe(false);
    expect(isRomanticRelation(defaultCompareRelationType(true))).toBe(false);
    expect(defaultCompareRelationType(true)).toBe("parent-child");
  });

  it("snaps a romantic selection away when pairHasMinor (web parity)", () => {
    let relationType: ReturnType<typeof defaultCompareRelationType> = "partners";
    const pairHasMinor = true;
    if (pairHasMinor && isRomanticRelation(relationType)) {
      relationType = defaultCompareRelationType(true);
    }
    expect(relationType).toBe("parent-child");
    expect(isRomanticRelation(relationType)).toBe(false);
  });

  it("wiring: compare.tsx imports shared safety helpers and loads is_minor", () => {
    const src = readFileSync(resolve(__dirname, "../../app/compare.tsx"), "utf8");
    expect(src).toContain('from "@galaxia/core"');
    expect(src).toContain("isMinorForSafety");
    expect(src).toContain("availableCompareRelationTypes");
    expect(src).toContain("defaultCompareRelationType");
    expect(src).toContain("isRomanticRelation");
    expect(src).toContain("defaultCompareRelationType(false)");
    expect(src).toMatch(/\.select\([^)]*is_minor/);
    expect(src).toContain("birth_date");
    expect(src).toContain("birth_precision");
    expect(src).not.toMatch(/useState<RelationType>\("partners"\)/);
    expect(src).toContain("blockRomanticMinorRender");
  });
});

describe("BUG 2 — passed person excluded from mobile Today in your sky", () => {
  it("peopleForTodaySky drops anyone with passed_at set", () => {
    const people = [
      { id: "self", display_name: "Me", passed_at: null },
      { id: "living", display_name: "Friend", passed_at: undefined },
      { id: "remembered", display_name: "Grandparent", passed_at: "2024-11-02T00:00:00.000Z" }
    ];
    const sky = peopleForTodaySky(people);
    expect(sky.map((p) => p.id)).toEqual(["self", "living"]);
    expect(sky.some((p) => p.id === "remembered")).toBe(false);
  });

  it("wiring: home imports shared peopleForTodaySky + todayTransitsForChart and loads passed_at", () => {
    const src = readFileSync(resolve(__dirname, "../../app/index.tsx"), "utf8");
    expect(src).toContain("peopleForTodaySky");
    expect(src).toContain("todayTransitsForChart");
    expect(src).toContain("describeTransit");
    expect(src).toContain('from "@galaxia/core"');
    expect(src).toMatch(/peopleForTodaySky\(castPeople\)/);
    expect(src).toMatch(/\.select\([^)]*passed_at/);
    // No local reimplementation of today's transit helper.
    expect(src).not.toMatch(/function todayTransitsForChart/);
    expect(src).not.toMatch(/function describeTransit/);
    expect(src).toContain("passed people are excluded");
  });
});

describe("BUG 3 — exact birth refuses without timezone; low-precision still saves without one", () => {
  it("exact-time buildBirthInput throws when tzOffsetMin is missing", () => {
    const input: BirthFormInput = {
      precision: "exact",
      month: 7,
      day: 12,
      year: 1990,
      hour: 14,
      minute: 30,
      birthPlace: "Austin, Texas, United States",
      lat: "30.27",
      lng: "-97.74"
      // tzOffsetMin intentionally omitted
    };
    expect(() => buildBirthInput(input)).toThrow(/timezone/i);
  });

  it("exact-time succeeds when place + timezone are present (no local-as-UTC stamp)", () => {
    const built = buildBirthInput({
      precision: "exact",
      month: 7,
      day: 12,
      year: 1990,
      hour: 14,
      minute: 30,
      birthPlace: "Austin, Texas, United States",
      lat: "30.27",
      lng: "-97.74",
      tzOffsetMin: -300 // CDT
    });
    expect(built.hadTimezone).toBe(true);
    expect(built.birth.tzOffsetMin).toBe(-300);
    // 14:30 local CDT (−300) → 19:30 UTC — not stamped as 14:30Z
    expect(built.birth.dateUTC).toBe("1990-07-12T19:30:00.000Z");
    expect(built.birth.dateUTC).not.toBe("1990-07-12T14:30:00.000Z");
  });

  it("date-only birth saves without timezone (honestly hedged, no fabrication)", () => {
    const built = buildBirthInput({
      precision: "date",
      month: 3,
      day: 15,
      year: 1985
    });
    expect(built.birth.precision).toBe("date");
    expect(built.birthTime).toBeNull();
    expect(built.hadTimezone).toBe(false);
    expect(built.tzOffsetMin).toBeNull();
    expect(built.birth.dateUTC).toBe("1985-03-15T12:00:00.000Z");
  });

  it("year-only birth saves without timezone", () => {
    const built = buildBirthInput({
      precision: "year",
      yearOnly: 1955
    });
    expect(built.birth.precision).toBe("year");
    expect(built.birthTime).toBeNull();
    expect(built.hadTimezone).toBe(false);
    expect(built.birth.dateUTC).toBe("1955-01-01T00:00:00.000Z");
  });

  it("wiring: onboarding imports shared buildBirthInput/searchPlaces; local birth.ts is gone", () => {
    const src = readFileSync(resolve(__dirname, "../../app/onboarding.tsx"), "utf8");
    expect(src).toContain("buildBirthInput");
    expect(src).toContain("searchPlaces");
    expect(src).toContain('from "@galaxia/astro"');
    expect(src).not.toContain('from "../src/lib/birth"');
    expect(src).toContain("tzOffsetMin");
    expect(src).toContain("birthPlace");

    let deleted = false;
    try {
      readFileSync(resolve(__dirname, "birth.ts"), "utf8");
    } catch {
      deleted = true;
    }
    expect(deleted).toBe(true);
  });
});
