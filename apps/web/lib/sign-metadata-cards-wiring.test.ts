import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("web sign metadata card placement", () => {
  it("keeps the compact Big Three and wheel together before metadata and actions on a person profile", () => {
    const person = read("app/app/person/[id]/page.tsx");
    const bigThree = person.indexOf("<FlipSignCards");
    const wheel = person.indexOf("<ChartWheel");
    const metadata = person.indexOf("<SignMetadataCards");
    const actions = person.indexOf("<Link href={`/app/compare?a=");

    expect(bigThree).toBeGreaterThan(0);
    expect(person).toContain("chart-identity-unit");
    expect(wheel).toBeGreaterThan(bigThree);
    expect(metadata).toBeGreaterThan(wheel);
    expect(actions).toBeGreaterThan(metadata);
  });

  it("keeps the Quick Chart Big Three and wheel together before metadata", () => {
    const quick = read("app/chart/quick-chart-page.tsx");
    const bigThree = quick.indexOf("<NatalSignReveal");
    const wheel = quick.indexOf("<ChartWheel");
    const metadata = quick.indexOf("<SignMetadataCards");

    expect(bigThree).toBeGreaterThan(0);
    expect(quick).toContain("chart-identity-unit");
    expect(wheel).toBeGreaterThan(bigThree);
    expect(metadata).toBeGreaterThan(wheel);
  });
});
