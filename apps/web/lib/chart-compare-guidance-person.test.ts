/**
 * Documents GuidancePerson parity on /chart/compare: mercury and saturn signs
 * must match /app/compare so whatTheyNeed() can surface sibling/friend and
 * parent-child / professional clauses on Quick Compare.
 */
import { computeNatalChart, computeSynastry, whatTheyNeed, type BirthInput } from "@galaxia/astro";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const birthA: BirthInput = {
  dateUTC: "1990-06-15T14:30:00.000Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006,
  tzOffsetMin: -240,
};

const birthB: BirthInput = {
  dateUTC: "1988-03-22T09:15:00.000Z",
  precision: "exact",
  lat: 34.0522,
  lng: -118.2437,
  tzOffsetMin: -420,
};

function getSign(chart: ReturnType<typeof computeNatalChart>, body: string) {
  const p = chart.placements.find((pl) => pl.body === body);
  return p && p.confident !== false ? p.sign : undefined;
}

function guidancePerson(
  chart: ReturnType<typeof computeNatalChart>,
  display_name: string,
  withMercurySaturn: boolean
) {
  const base = {
    display_name,
    sun: getSign(chart, "sun"),
    moon: getSign(chart, "moon"),
    venus: getSign(chart, "venus"),
    mars: getSign(chart, "mars"),
  };
  if (!withMercurySaturn) return base;
  return {
    ...base,
    mercury: getSign(chart, "mercury"),
    saturn: getSign(chart, "saturn"),
  };
}

describe("Quick Compare GuidancePerson mercury/saturn parity", () => {
  it("chart/compare page passes mercury and saturn on GuidancePerson objects", () => {
    const src = readFileSync(resolve(__dirname, "../app/chart/compare/page.tsx"), "utf8");
    expect(src).toContain('mercury: getSign(result.chartA, "mercury")');
    expect(src).toContain('saturn: getSign(result.chartA, "saturn")');
  });

  it("relation types whose whatTheyNeed output changes when mercury/saturn are added", () => {
    const chartA = computeNatalChart(birthA);
    const chartB = computeNatalChart(birthB);
    const synastry = computeSynastry(chartA, chartB);
    const personB = guidancePerson(chartB, "Sam", true);

    const relTypes = ["siblings", "friends", "parent-child", "colleagues", "manager-report", "mentor-mentee"] as const;
    const changed: string[] = [];

    for (const relType of relTypes) {
      const without = whatTheyNeed(
        synastry.scores,
        guidancePerson(chartB, "Sam", false),
        relType,
        synastry
      );
      const withMs = whatTheyNeed(synastry.scores, personB, relType, synastry);
      if (without !== withMs) changed.push(relType);
    }

    expect(changed).toContain("siblings");
    expect(changed).toContain("friends");
    expect(changed).toContain("parent-child");
    expect(changed.some((t) => t.startsWith("colleagues") || t.includes("colleague"))).toBe(true);
  });
});
