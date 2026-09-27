import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("web sign metadata card placement", () => {
  it("renders between the compact Big Three and natal wheel on a person profile", () => {
    const person = read("app/app/person/[id]/page.tsx");
    const bigThree = person.indexOf("<FlipSignCards");
    const metadata = person.indexOf("<SignMetadataCards");
    const wheel = person.indexOf("<ChartWheel");

    expect(bigThree).toBeGreaterThan(0);
    expect(metadata).toBeGreaterThan(bigThree);
    expect(wheel).toBeGreaterThan(metadata);
  });

  it("renders after the Quick Chart Big Three and before its wheel", () => {
    const quick = read("app/chart/quick-chart-page.tsx");
    const bigThree = quick.indexOf("<NatalSignReveal");
    const metadata = quick.indexOf("<SignMetadataCards");
    const wheel = quick.indexOf("<ChartWheel");

    expect(bigThree).toBeGreaterThan(0);
    expect(metadata).toBeGreaterThan(bigThree);
    expect(wheel).toBeGreaterThan(metadata);
  });
});
