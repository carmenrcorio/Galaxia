import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("Quick Chart RelatedLinks sit after the compute form", () => {
  it("/chart places RelatedLinks after the See the chart control", () => {
    const src = read("apps/web/app/chart/quick-chart-page.tsx");
    const formIdx = src.indexOf("See the chart");
    const linksIdx = src.indexOf("<RelatedLinks");
    expect(formIdx).toBeGreaterThan(-1);
    expect(linksIdx).toBeGreaterThan(formIdx);
  });

  it("/chart/compare places RelatedLinks after the compatibility control", () => {
    const src = read("apps/web/app/chart/compare/page.tsx");
    const formIdx = src.indexOf("See our compatibility");
    const linksIdx = src.indexOf("<RelatedLinks");
    expect(formIdx).toBeGreaterThan(-1);
    expect(linksIdx).toBeGreaterThan(formIdx);
  });
});
