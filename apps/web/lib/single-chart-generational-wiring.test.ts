import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), "utf8");
}

describe("single-chart generational summary wiring", () => {
  it("renders below full placements and above actions on Quick Chart", () => {
    const page = read("../app/chart/quick-chart-page.tsx");
    const placements = page.indexOf("Hide full chart");
    const generational = page.indexOf("<SingleChartGenerationalSummary");
    const actions = page.indexOf("<ChartPdfExport", generational);

    expect(placements).toBeGreaterThan(-1);
    expect(generational).toBeGreaterThan(placements);
    expect(actions).toBeGreaterThan(generational);
  });

  it("renders below full placements and above actions on a single share", () => {
    const share = read("../components/share-snapshot-view.tsx");
    const placements = share.indexOf("Hide full chart");
    const generational = share.indexOf("<SingleChartGenerationalSummary");
    const actions = share.indexOf("<SaveToGalaxyButton", generational);

    expect(placements).toBeGreaterThan(-1);
    expect(generational).toBeGreaterThan(placements);
    expect(actions).toBeGreaterThan(generational);
  });
});
