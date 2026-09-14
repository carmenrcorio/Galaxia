import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import {
  PAIR_TRANSIT_ACTIVE_ORB_DEG,
  activePairTransits,
  diffPairTransits,
  pairTransitIdentity,
  pairTransitsAreHonest
} from "../src/compare-transit-delta";
import {
  COMPARE_HISTORY_EMPTY,
  COMPARE_HISTORY_HEADING,
  COMPARE_MOVED_ON,
  COMPARE_NEWLY_ACTIVE,
  COMPARE_SINCE_HEADING,
  COMPARE_TRANSITS_UNAVAILABLE,
  compareHistoryLastViewed,
  compareNatalAspectsConstant,
  compareNoTransitShift,
  describePairTransitLine,
  hydrateComparisonHistory
} from "../src/compare-history-copy";

const NATAL_A = computeNatalChart({
  dateUTC: "1993-04-10T13:45:00.000Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006
});
const NATAL_B = computeNatalChart({
  dateUTC: "1994-11-20T09:15:00.000Z",
  precision: "exact",
  lat: 34.0522,
  lng: -118.2437
});

const PERSONS = [
  { personId: "a", chart: NATAL_A, include: true },
  { personId: "b", chart: NATAL_B, include: true }
] as const;

describe("activePairTransits", () => {
  it("uses the Active-today orb and skips year-only charts", () => {
    const yearOnly = computeNatalChart({
      dateUTC: "1995-01-01T00:00:00.000Z",
      precision: "year"
    });
    const hits = activePairTransits(PERSONS, "2026-06-29T12:00:00.000Z");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.orb <= PAIR_TRANSIT_ACTIVE_ORB_DEG)).toBe(true);
    expect(
      activePairTransits([{ personId: "y", chart: yearOnly, include: true }], "2026-06-29T12:00:00.000Z")
    ).toEqual([]);
    expect(pairTransitsAreHonest([yearOnly, NATAL_A])).toBe(false);
    expect(pairTransitsAreHonest([NATAL_A, NATAL_B])).toBe(true);
  });

  it("omits a person when include is false (passed / remembrance)", () => {
    const both = activePairTransits(PERSONS, "2026-06-29T12:00:00.000Z");
    const livingOnly = activePairTransits(
      [
        { personId: "a", chart: NATAL_A, include: true },
        { personId: "b", chart: NATAL_B, include: false }
      ],
      "2026-06-29T12:00:00.000Z"
    );
    expect(livingOnly.every((hit) => hit.personId === "a")).toBe(true);
    expect(livingOnly.length).toBeLessThan(both.length);
  });
});

describe("diffPairTransits", () => {
  it("is empty when the same instant is compared to itself", () => {
    const now = activePairTransits(PERSONS, "2026-06-29T12:00:00.000Z");
    const delta = diffPairTransits(hitsAt("2026-06-29T12:00:00.000Z"), now);
    expect(delta.movedOn).toEqual([]);
    expect(delta.newlyActive).toEqual([]);
  });

  it("reports transits that left orb and transits that entered orb across months", () => {
    const previous = activePairTransits(PERSONS, "2026-01-01T12:00:00.000Z");
    const current = activePairTransits(PERSONS, "2026-06-29T12:00:00.000Z");
    const delta = diffPairTransits(previous, current);
    expect(delta.movedOn.length + delta.newlyActive.length).toBeGreaterThan(0);
    const prevKeys = new Set(previous.map((hit) => pairTransitIdentity(hit.personId, hit)));
    for (const hit of delta.newlyActive) {
      expect(prevKeys.has(pairTransitIdentity(hit.personId, hit))).toBe(false);
    }
    const currKeys = new Set(current.map((hit) => pairTransitIdentity(hit.personId, hit)));
    for (const hit of delta.movedOn) {
      expect(currKeys.has(pairTransitIdentity(hit.personId, hit))).toBe(false);
    }
  });

  it("does not treat an orb change of the same aspect as a new transit", () => {
    const previous = [
      { personId: "a", transitBody: "saturn" as const, natalBody: "sun" as const, type: "square" as const, orb: 1.4 }
    ];
    const current = [
      { personId: "a", transitBody: "saturn" as const, natalBody: "sun" as const, type: "square" as const, orb: 0.2 }
    ];
    const delta = diffPairTransits(previous, current);
    expect(delta.movedOn).toEqual([]);
    expect(delta.newlyActive).toEqual([]);
  });
});

describe("compare history copy", () => {
  it("states natal aspects are constant and names both people", () => {
    expect(compareNatalAspectsConstant("Ada", "Bea")).toContain("Ada");
    expect(compareNatalAspectsConstant("Ada", "Bea")).toContain("Bea");
    expect(compareNatalAspectsConstant("Ada", "Bea")).toMatch(/have not changed/);
    expect(COMPARE_SINCE_HEADING).toBe("Since you last looked");
    expect(COMPARE_NEWLY_ACTIVE).toMatch(/Newly active/);
    expect(COMPARE_MOVED_ON).toMatch(/Moved on/);
    expect(compareHistoryLastViewed("Sep 1, 2026")).toBe("Last viewed Sep 1, 2026");
    expect(compareNoTransitShift("Sep 1, 2026")).toMatch(/since Sep 1, 2026/);
    expect(COMPARE_TRANSITS_UNAVAILABLE).toMatch(/cannot be shown honestly/);
    expect(COMPARE_HISTORY_HEADING).toBe("Recent comparisons");
    expect(COMPARE_HISTORY_EMPTY).toMatch(/Pick two people/);
    expect(describePairTransitLine("Ada", { transitBody: "mars", type: "square", natalBody: "venus" })).toBe(
      "Ada: transiting mars square natal venus"
    );
  });

  it("contains no U+2014", () => {
    const strings = [
      COMPARE_SINCE_HEADING,
      COMPARE_NEWLY_ACTIVE,
      COMPARE_MOVED_ON,
      COMPARE_TRANSITS_UNAVAILABLE,
      COMPARE_HISTORY_HEADING,
      COMPARE_HISTORY_EMPTY,
      compareNatalAspectsConstant("Ada", "Bea"),
      compareNoTransitShift("Sep 1, 2026"),
      describePairTransitLine("Ada", { transitBody: "mars", type: "square", natalBody: "venus" })
    ];
    for (const s of strings) {
      expect(s).not.toContain("\u2014");
    }
  });
});

describe("hydrateComparisonHistory", () => {
  it("skips orphan pairs and puts self on the left", () => {
    const items = hydrateComparisonHistory(
      [
        {
          person_low: "11111111-aaaa-4aaa-8aaa-000000000001",
          person_high: "11111111-aaaa-4aaa-8aaa-000000000002",
          last_viewed_at: "2026-09-01T12:00:00.000Z"
        }
      ],
      [
        { id: "11111111-aaaa-4aaa-8aaa-000000000001", display_name: "Ada", relation: "friend" },
        { id: "11111111-aaaa-4aaa-8aaa-000000000002", display_name: "Bea", relation: "self" }
      ]
    );
    expect(items[0]!.nameA).toBe("Bea");
    expect(items[0]!.nameB).toBe("Ada");
  });
});

function hitsAt(whenUTC: string) {
  return activePairTransits(PERSONS, whenUTC);
}
