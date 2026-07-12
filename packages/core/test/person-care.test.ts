import { describe, expect, it } from "vitest";
import {
  buildPersonPageNavSections,
  isMinorForSafety,
  peopleForTodaySky,
  shouldShowLiveTransits,
} from "../src/index";

const NOW = new Date("2026-07-12T00:00:00.000Z");

describe("shouldShowLiveTransits — care gate (person page + home sky)", () => {
  it("hides live/current transit surfaces for a passed person", () => {
    expect(shouldShowLiveTransits({ passed_at: "2024-11-02T00:00:00.000Z" })).toBe(false);
    expect(shouldShowLiveTransits({ passed_at: "2026-07-12T15:00:00.000Z" })).toBe(false);
  });

  it("allows live transit surfaces for living people", () => {
    expect(shouldShowLiveTransits({ passed_at: null })).toBe(true);
    expect(shouldShowLiveTransits({ passed_at: undefined })).toBe(true);
    expect(shouldShowLiveTransits({})).toBe(true);
  });

  it("returns false for null/undefined person", () => {
    expect(shouldShowLiveTransits(null)).toBe(false);
    expect(shouldShowLiveTransits(undefined)).toBe(false);
  });
});

describe("peopleForTodaySky — home care hole", () => {
  it("excludes passed people from sky rows and leaves living (incl. self)", () => {
    const people = [
      { id: "self", display_name: "Me", passed_at: null },
      { id: "living", display_name: "Sam", passed_at: null },
      { id: "gone", display_name: "Rosa", passed_at: "2024-11-02T00:00:00.000Z" },
    ];
    const sky = peopleForTodaySky(people);
    expect(sky.map((p) => p.id)).toEqual(["self", "living"]);
    expect(sky.some((p) => p.id === "gone")).toBe(false);
  });

  it("returns empty when every person is passed", () => {
    expect(
      peopleForTodaySky([
        { id: "a", passed_at: "2020-01-01T00:00:00.000Z" },
        { id: "b", passed_at: "2021-01-01T00:00:00.000Z" },
      ])
    ).toEqual([]);
  });
});

describe("buildPersonPageNavSections — nav syncs with rendered sections", () => {
  it("omits Active today for a passed person (no dead transit anchor)", () => {
    const nav = buildPersonPageNavSections({
      hasRemembrance: true,
      hasActiveToday: false,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: false,
      hasHonorBox: true,
    });
    expect(nav.map((s) => s.id)).not.toContain("active-today");
    expect(nav.map((s) => s.id)).toContain("honor-light");
    expect(nav.map((s) => s.id)).toContain("remembrance");
    expect(nav[nav.length - 1]?.id).toBe("honor-light");
  });

  it("includes Active today only when that section actually renders", () => {
    const withTransit = buildPersonPageNavSections({
      hasRemembrance: false,
      hasActiveToday: true,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: false,
      hasHouses: false,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: false,
      hasHonorBox: false,
    });
    expect(withTransit.map((s) => s.id)).toContain("active-today");
    expect(withTransit.map((s) => s.id)).not.toContain("honor-light");
    expect(withTransit.map((s) => s.id)).not.toContain("aspects");
    expect(withTransit.map((s) => s.id)).not.toContain("houses");
  });

  it("produces zero dead links — every id corresponds to a known section anchor", () => {
    const known = new Set([
      "remembrance",
      "active-today",
      "vela-on-them",
      "chart-wheel",
      "big-three",
      "placements",
      "aspects",
      "houses",
      "generational",
      "notes",
      "past-conversations",
      "honor-light",
    ]);
    const nav = buildPersonPageNavSections({
      hasRemembrance: true,
      hasActiveToday: true,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: true,
      hasHonorBox: true,
    });
    for (const s of nav) {
      expect(known.has(s.id)).toBe(true);
    }
    expect(nav).toHaveLength(12);
  });
});

describe("passed minor still minor (care does not strip safety)", () => {
  it("isMinorForSafety ignores passed_at", () => {
    expect(
      isMinorForSafety(
        {
          isMinor: true,
          birthDate: "2015-03-01",
          birthPrecision: "date",
        },
        NOW
      )
    ).toBe(true);
    expect(
      isMinorForSafety(
        {
          isMinor: false,
          birthDate: "2018-06-15",
          birthPrecision: "date",
        },
        NOW
      )
    ).toBe(true);
  });
});
