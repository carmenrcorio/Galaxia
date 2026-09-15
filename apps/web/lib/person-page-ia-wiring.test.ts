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

  it("keeps Sun/Moon/Rising at most twice: header glance and Big three", () => {
    expect(page).toContain("Sun sign uncertain (year-only birth data)");
    expect(page).toContain('sectionHead("big-three")');
    expect(page).not.toContain('{ label: "Sun", sign: sun?.sign }');
    expect(page).toContain('p.body !== "sun" && p.body !== "moon"');
  });

  it("keeps outer planets once: diamond-marked rows, no standalone generation section", () => {
    expect(page).toContain('isGen ? " ✦" : ""');
    expect(page).not.toContain('sectionHead("generational")');
    expect(page).toContain("generationInfo.name");
    expect(page).toContain("chart.generational.cohortLabel");
    expect(page).toContain("getFamilyBridge");
    expect(page).toContain("PLUTO_SIGN_EXTENDED");
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
      "STELLIUM_NOTE",
      "DAILY_SKY_UNAVAILABLE_YEAR_BODY",
      "DAILY_SKY_UNAVAILABLE_YEAR_FOLLOW_UP",
      "GenerationalEraSurface",
      "The corruption signature",
      "Others who carried this",
      "What they lived through",
    ]) {
      expect(page).toContain(token);
    }
  });

  it("has one navigation layer: tabs only, Today above them", () => {
    expect(page).toContain("PersonProfileNav");
    expect(page).not.toContain("onJump=");
    expect(page).toContain('id="person-today"');
    expect(page.indexOf('id="person-today"')).toBeLessThan(page.indexOf("<PersonProfileNav"));
    expect(css).toMatch(/\.person-group-tab[\s\S]*?text-transform:\s*none/);
  });

  it("lazy-mounts the chart wheel after first paint and keeps it collapsible", () => {
    expect(page).toContain("wheelMounted");
    expect(page).toContain("requestAnimationFrame");
    expect(page).toContain("Hide wheel");
    expect(page).toContain("{wheelMounted ? (");
  });

  it("places G7 relationship connections in the header before Compare", () => {
    const picker = page.lastIndexOf("<RelationshipEdgesBox");
    const compare = page.indexOf("href={`/app/compare");
    expect(picker).toBeGreaterThan(0);
    expect(compare).toBeGreaterThan(picker);
  });
});
