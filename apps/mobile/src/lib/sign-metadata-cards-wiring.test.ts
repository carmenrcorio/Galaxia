import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("mobile sign metadata cards", () => {
  it("renders between the compact Big Three and natal wheel", () => {
    const profile = readMobile("app/(app)/profile/[personId].tsx");
    const bigThree = profile.indexOf("<FlipSignCards");
    const metadata = profile.indexOf("<SignMetadataCards");
    const wheel = profile.indexOf("<ChartWheel");

    expect(bigThree).toBeGreaterThan(0);
    expect(metadata).toBeGreaterThan(bigThree);
    expect(wheel).toBeGreaterThan(metadata);
  });

  it("uses the confident Sun gate, shared palette, expandable origin, and glossary entries", () => {
    const component = readMobile("src/components/sign-metadata-cards.tsx");

    expect(component).toContain("sunSignFromChart(chart)");
    expect(component).toContain("ELEMENT_NODE_COLORS[metadata.element]");
    expect(component).toContain("originOpen ? metadata.symbolOrigin : firstSentence(metadata.symbolOrigin)");
    expect(component).toContain('glossarySlug="element"');
    expect(component).toContain('glossarySlug="modality"');
    expect(component).toContain('glossarySlug="ruling-planet"');
    expect(component).not.toContain("\u2014");
  });
});
