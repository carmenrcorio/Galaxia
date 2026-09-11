/**
 * Structural guarantee: every natal surface that used to leave a houses gap
 * mounts HousesUnavailableCard. One component, no second place to forget.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("HousesUnavailableCard wiring — no houses gap on year-only charts", () => {
  it("person page always mounts the shared card (no year-only null branch)", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("HousesUnavailableCard");
    expect(src).toContain("hasHouses={hasHouses}");
    expect(src).toContain("precision={chart.precision}");
    expect(src).not.toContain('person.birth_precision !== "year"');
    expect(src).not.toContain("The house layer requires an exact birth time and location");
  });

  it("quick chart mounts the shared card beside the missing-wheel gap", () => {
    const src = read("../app/chart/quick-chart-page.tsx");
    expect(src).toContain("HousesUnavailableCard");
    expect(src).toContain("precision={result.chart.precision}");
    expect(src).not.toContain("The house layer requires an exact birth time and location");
  });

  it("share snapshot mounts the shared card on single natal views", () => {
    const src = read("../components/share-snapshot-view.tsx");
    expect(src).toContain("HousesUnavailableCard");
    expect(src).toContain("precision={payload.chart.precision}");
    expect(src).not.toContain("The house layer requires an exact birth time and location");
  });
});
