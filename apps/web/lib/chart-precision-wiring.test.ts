/**
 * Chart precision is visible on every person profile, and silent gaps
 * (aspects, daily sky, memorial with no birth data) name the missing input.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("chart precision surfaces — no silent gaps", () => {
  it("person page mounts the persistent indicator and one upgrade path", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("ChartPrecisionIndicator");
    expect(src).toContain("ChartPrecisionUpgradeButton");
    expect(src).toContain("openPrecisionUpgrade");
    expect(src).toContain("upgradeTo={editUpgradeTo}");
    expect(src).not.toContain("{person.relation} · {person.birth_precision} precision");
  });

  it("person page names year-only aspects in place instead of skipping the section", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("AspectsUnavailableCard");
    expect(src).toContain("showActiveTodayPrecisionEmpty");
    expect(src).toContain("DAILY_SKY_UNAVAILABLE_YEAR_BODY");
    expect(src).toContain('hasAspects: natalAspectReadings.length > 0 || chart.precision === "year"');
  });

  it("memorial timeline still renders when a passed person has no chart yet", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("shouldShowMemorialTimeline(person, null)");
    expect(src).toContain("chart={null}");
  });

  it("the no-chart profile does not call saved birth details missing data", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("CHART_PRECISION_NONE_WAITING");
    expect(src).toContain("CHART_SAVED_DETAILS_NO_CHART_BODY");
    expect(src).toContain('person.birth_precision === "none" ? CHART_PRECISION_NONE_WAITING : CHART_SAVED_DETAILS_NO_CHART_BODY');
    expect(src).not.toContain("No birth data yet: their chart is waiting.");
  });

  it("compare offers a single add-date action when synastry is blocked by year-only data", () => {
    const src = read("../app/app/compare/page.tsx");
    expect(src).toContain("CHART_PRECISION_ADD_DATE");
    expect(src).toContain("precisionGapPerson");
    expect(src).toContain("`/app/person/${precisionGapPerson.id}`");
  });
});
