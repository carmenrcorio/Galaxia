import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("mobile sign metadata cards", () => {
  it("renders the compact Big Three and wheel together before metadata and actions", () => {
    const profile = readMobile("app/(app)/profile/[personId].tsx");
    const bigThree = profile.indexOf("<FlipSignCards");
    const wheel = profile.indexOf("<ChartWheel");
    const metadata = profile.indexOf("<SignMetadataCards");
    const actions = profile.indexOf('<Link href="/compare"');

    expect(bigThree).toBeGreaterThan(0);
    expect(wheel).toBeGreaterThan(bigThree);
    expect(metadata).toBeGreaterThan(wheel);
    expect(actions).toBeGreaterThan(metadata);
  });

  it("uses the confident Sun gate, shared palettes, glyphs, full origin, and glossary entries", () => {
    const component = readMobile("src/components/sign-metadata-cards.tsx");

    expect(component).toContain("sunSignFromChart(chart)");
    expect(component).toContain("ELEMENT_NODE_COLORS[metadata.element]");
    expect(component).toContain("BIRTHSTONE_COLORS[sunSign]");
    expect(component).toContain("SIGN_GLYPH[sunSign]");
    expect(component).toContain("BODY_GLYPH[metadata.rulingPlanet]");
    expect(component).toContain("{metadata.symbolOrigin}");
    expect(component).not.toContain("firstSentence");
    expect(component).not.toContain("originOpen");
    expect(component).toContain('glossarySlug="element"');
    expect(component).toContain('glossarySlug="modality"');
    expect(component).toContain('glossarySlug="ruling-planet"');
    expect(component).not.toContain("\u2014");
  });

  it("shows every element, metal, and birthstone significance without a tap", () => {
    const component = readMobile("src/components/sign-metadata-cards.tsx");

    expect(component).toContain("{metadata.elementSignificance}");
    expect(component).toContain("{metadata.metalSignificance}");
    expect(component).toContain("{metadata.birthstoneSignificance}");
    expect(component).not.toContain("significanceOpen");
  });

  it("separates the identity, symbol, and materials bands into their own rows", () => {
    const component = readMobile("src/components/sign-metadata-cards.tsx");

    expect(component.match(/style={rowStyle}/g)?.length).toBe(1);
    expect(component.match(/style={\[rowStyle, dividedRowStyle/g)?.length).toBe(2);
    expect(component).toContain("borderTopWidth: 1");
  });
});
