import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(__dirname, "../app/app/person/[id]/page.tsx"),
  "utf8"
);
const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");

describe("person page information architecture", () => {
  it("You and them matches the living record tab (notes + earlier answers)", () => {
    expect(page).toContain('id="notes"');
    expect(page).toContain('id="past-conversations"');
    expect(page).toContain("Owner-only · never shared");
    expect(page).toContain("Archived Vela threads about");
  });

  it("keeps flip cards under the name and the wheel as the hero, no under-wheel tiles", () => {
    expect(page).toContain("Sun sign uncertain (year-only birth data)");
    expect(page).toContain('sectionHead("big-three")');
    expect(page).toContain("<FlipSignCards chart={chart} minorSafe={personIsMinor} />");
    expect(page).toContain("<RetrogradeBadge retro={Boolean(retro)} corner />");
    expect(page).toContain("retro={p.retro}");
    expect(page).not.toContain("ChartSignTiles");
    expect(page.indexOf("<FlipSignCards chart={chart} minorSafe={personIsMinor} />")).toBeLessThan(page.indexOf("href={`/app/compare"));
    expect(page.indexOf("<ChartWheel")).toBeLessThan(page.indexOf("</ChartImageExport>"));
    expect(page).toContain('p.body !== "sun" && p.body !== "moon"');
  });

  it("keeps outer planets once in a standalone generational signature card", () => {
    expect(page).toContain('isGen ? " ✦" : ""');
    expect(page).not.toContain('sectionHead("generational")');
    expect(page).toContain('id="generational" className="glass-card');
    expect(page).toContain("Generational signature");
    expect(page).not.toContain("generationInfo.name");
    expect(page).not.toContain("generationNameForYear");
    expect(page).toContain("plutoGenerationLabel");
    expect(page).toContain("chart.generational.pluto.confident");
    expect(page).toContain("chart.generational.pluto.sign");
    expect(page).toContain("chart.generational.cohortLabel");
    expect(page).not.toContain("Millennials");
    expect(page).not.toContain("Baby Boomers");
    expect(page).not.toContain("Generation X");
    expect(page).not.toContain("Generation Z");
    expect(page).toContain("getFamilyBridge");
    expect(page).toContain("GenerationalEraSections");
    expect(page).toContain("Changed sign that year");
  });

  it("does not drop interpretation copy while rearranging", () => {
    for (const token of [
      "interpretPlacement",
      "interpretRising",
      "interpretAspect",
      "interpretHouse",
      "ELEMENT_DOMINANT",
      "ELEMENT_ABSENT",
      "MODALITY_DOMINANT",
      "MODALITY_ABSENT",
      "aspectPatternCopy",
      "DAILY_SKY_UNAVAILABLE_YEAR_BODY",
      "DAILY_SKY_UNAVAILABLE_YEAR_FOLLOW_UP",
    ]) {
      expect(page).toContain(token);
    }
    const era = readFileSync(
      resolve(__dirname, "../components/generational-era-surface.tsx"),
      "utf8"
    );
    for (const token of [
      "GenerationalEraSurface",
      "PLUTO_SIGN_EXTENDED",
      "The corruption signature",
      "Others who carried this",
      "What they lived through",
    ]) {
      expect(era).toContain(token);
    }
  });

  it("keeps the era reading outside the Pluto row", () => {
    const expandStart = page.indexOf("function ExpandRow");
    const expandEnd = page.indexOf("/* ─── Modality balance");
    const expandFn = page.slice(expandStart, expandEnd);
    expect(expandFn).not.toContain("GenerationalEra");
    expect(expandFn).not.toContain("corruptionSignature");
    expect(expandFn).not.toContain("The corruption signature");
    expect(expandFn).not.toContain("plutoExtended");
    expect(expandFn).toContain("planetAspects");
    expect(expandFn).toContain(">Aspects<");

    const genStart = page.indexOf('id="generational"');
    const genEnd = page.indexOf('id="aspects"');
    const gen = page.slice(genStart, genEnd);
    const rows = gen.indexOf("renderPlacementRow(p)");
    const era = gen.indexOf("<GenerationalEraSections");
    const bridge = gen.indexOf("getFamilyBridge");
    expect(rows).toBeGreaterThan(-1);
    expect(era).toBeGreaterThan(rows);
    expect(bridge).toBeGreaterThan(era);
    expect(gen).toContain("chart.generational.pluto.confident");
  });

  it("has one navigation layer: tabs only, Today above them", () => {
    expect(page).toContain("PersonProfileNav");
    expect(page).not.toContain("onJump=");
    expect(page).toContain('id="person-today"');
    expect(page.indexOf('id="chart-wheel"')).toBeLessThan(page.indexOf('id="person-today"'));
    expect(page.indexOf('id="person-today"')).toBeLessThan(page.indexOf("<PersonProfileNav"));
    expect(page.indexOf("<PersonProfileNav")).toBeLessThan(page.indexOf('id="big-three"'));
    expect(page.indexOf('id="person-group-panel-them"')).toBeLessThan(page.indexOf('id="vela-on-them"'));
    expect(css).toMatch(/\.person-group-tab[\s\S]*?text-transform:\s*none/);
  });

  it("lazy-mounts the chart wheel after first paint as the always-visible hero", () => {
    expect(page).toContain("wheelMounted");
    expect(page).toContain("requestAnimationFrame");
    expect(page).toContain("person-chart-hero");
    expect(page).not.toContain("Hide wheel");
    expect(page).toContain("{wheelMounted ? (");
  });

  it("keeps constellation lines inside Edit, not as a top bar", () => {
    expect(page).not.toContain("<RelationshipEdgesBox");
    expect(page).toContain("<EditPersonPanel");
  });

  it("lists natal quincunxes as type and orb under Adjusts, not Key aspects", () => {
    expect(page).toContain("natalQuincunxes");
    expect(page).toContain('a.type === "quincunx"');
    expect(page).toContain("ADJUST_BADGE");
    expect(page).toContain("type and orb only");
    expect(page).toContain("{a.from} {a.type} {a.to}");
    expect(page).toContain("toDMS(a.orb)");
    expect(page).toContain("var(--gold)");
  });

  it("renders engine-owned chart patterns above Key aspects", () => {
    expect(page).toContain('id="chart-patterns"');
    expect(page).toContain("chart.patterns");
    expect(page).toContain("aspectPatternCopy");
    expect(page).not.toContain("const stellia");
    expect(page.indexOf('id="chart-patterns"')).toBeLessThan(page.indexOf('id="aspects"'));
    expect(page.indexOf('id="chart-patterns"')).toBeLessThan(page.indexOf('id="generational"'));
    expect(page.indexOf('id="generational"')).toBeLessThan(page.indexOf('id="aspects"'));
  });
});
