import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("mobile glossary tooltips on compare", () => {
  it("mounts GlossaryTooltip on first flows, catches, orb, and aspect types", () => {
    const src = readMobile("app/(app)/(tabs)/compare.tsx");
    expect(src).toContain("GlossaryTooltip");
    expect(src).toContain('glossarySlug="flows-and-catches"');
    expect(src).toContain('glossarySlug="orb"');
    expect(src).toContain("aspectGlossarySlug");
    expect(src).not.toContain("applying");
    expect(src).not.toContain("separating");
  });

  it("opens the public glossary hash via the configured site URL", () => {
    const src = readMobile("src/components/glossary-tooltip.tsx");
    expect(src).toContain("getGlossaryTerm");
    expect(src).toContain("glossaryPreview");
    expect(src).toContain("GLOSSARY_SEE_FULL_DEFINITION");
    expect(src).toContain("Linking.openURL");
    expect(src).toContain("/glossary#");
    expect(src).toContain("siteUrl()");
    expect(src).not.toContain("requireSiteUrl");
    expect(src).not.toContain("\u2014");
  });
});
