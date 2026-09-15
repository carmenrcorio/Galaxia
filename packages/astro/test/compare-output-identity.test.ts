/**
 * Selector UI must not change the comparison. Old pills and the new derived
 * type both end at the same `relationType` argument to the same functions;
 * `computeSynastry` still takes only the two charts.
 */
import { describe, expect, it } from "vitest";
import {
  compareHeadline,
  relationshipWatchLine,
  selectCompareAspectRows,
  suggestCompareRelationType,
  whatTheyNeed,
  type GuidancePerson,
  type RelationType,
} from "../src/compare-guidance";
import { computeNatalChart, computeSynastry, type NatalChart } from "../src/index";

const chartA: NatalChart = computeNatalChart({
  dateUTC: "1988-03-14T09:24:00Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006,
});
const chartB: NatalChart = computeNatalChart({
  dateUTC: "1991-11-02T17:05:00Z",
  precision: "exact",
  lat: 51.5074,
  lng: -0.1278,
});
const synastry = computeSynastry(chartA, chartB);
const signOf = (chart: NatalChart, body: string) =>
  chart.placements.find((p) => p.body === body)?.sign;
const personFrom = (chart: NatalChart, name: string): GuidancePerson => ({
  display_name: name,
  sun: signOf(chart, "sun"),
  moon: signOf(chart, "moon"),
  venus: signOf(chart, "venus"),
  mars: signOf(chart, "mars"),
  mercury: signOf(chart, "mercury"),
  saturn: signOf(chart, "saturn"),
});
const ada = personFrom(chartA, "Ada");
const sam = personFrom(chartB, "Sam");

function reading(relType: RelationType) {
  return {
    headline: compareHeadline(relType, synastry.scores.overall),
    needA: whatTheyNeed(synastry.scores, ada, relType, synastry),
    needB: whatTheyNeed(synastry.scores, sam, relType, synastry),
    watch: relationshipWatchLine(synastry.scores, relType, synastry),
    rows: selectCompareAspectRows(synastry.aspects, relType, 6),
  };
}

describe("same pair through derived type vs an equivalent pill pick", () => {
  it("tags that already mapped still derive the type the old pills used", () => {
    const unchanged: Record<string, RelationType> = {
      partner: "partners",
      sibling: "siblings",
      friend: "friends",
      parent: "parent-child",
      child: "parent-child",
      ancestor: "ancestor",
      colleague: "colleagues",
      coworker: "colleagues",
      "co-worker": "colleagues",
      boss: "manager-report",
      manager: "manager-report",
      professor: "mentor-mentee",
      mentor: "mentor-mentee",
    };
    for (const [tag, type] of Object.entries(unchanged)) {
      expect(suggestCompareRelationType("self", tag), tag).toBe(type);
    }
  });

  it("derived type and the matching pill produce byte-identical copy", () => {
    const derivedFriend = suggestCompareRelationType("self", "friend");
    expect(derivedFriend).toBe("friends");
    expect(JSON.stringify(reading(derivedFriend!))).toBe(JSON.stringify(reading("friends")));

    const derivedPartner = suggestCompareRelationType("self", "partner");
    expect(derivedPartner).toBe("partners");
    expect(JSON.stringify(reading(derivedPartner!))).toBe(JSON.stringify(reading("partners")));

    const derivedParent = suggestCompareRelationType("self", "parent");
    const derivedMother = suggestCompareRelationType("self", "mother");
    expect(derivedParent).toBe("parent-child");
    expect(derivedMother).toBe("parent-child");
    expect(JSON.stringify(reading(derivedParent!))).toBe(JSON.stringify(reading("parent-child")));
    expect(JSON.stringify(reading(derivedMother!))).toBe(JSON.stringify(reading("parent-child")));
  });

  it("computeSynastry ignores relationship type and is stable for the pair", () => {
    expect(computeSynastry(chartA, chartB)).toEqual(synastry);
  });
});
