import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("source wiring — person page + home hide live sky for passed", () => {
  it("person page gates todayTransits with shouldShowLiveTransits (no run for passed)", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/app/person/[id]/page.tsx"),
      "utf8"
    );
    expect(src).toContain("shouldShowLiveTransits");
    expect(src).toContain("showActiveToday");
    expect(src).toMatch(/if\s*\(\s*!shouldShowLiveTransits\(person\)\s*\)\s*return\s*\[\]/);
    expect(src).toContain("HonorDeclarationBox");
    expect(src).toContain("Who carries their light ↓");
    expect(src).toContain("HONOR_LIGHT_ANCHOR_ID");
    expect(src).toContain("RemembranceSpace");
    expect(src).toContain("ChartWheel");
    expect(src).toContain("aspects={natalAspects}");
    expect(src).toContain("The big three");
    expect(src).toContain("Placements");
    expect(src).toContain("ChartSectionNav");
  });

  it("home Today in your sky filters with peopleForTodaySky before transit compute", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/page.tsx"), "utf8");
    expect(src).toContain("peopleForTodaySky");
    expect(src).toMatch(/peopleForTodaySky\(castPeople\)/);
    expect(src).toContain("passed people are excluded");
  });

  it("RemembranceSpace no longer embeds the honor-declaration box (reflections only)", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/remembrance-space.tsx"),
      "utf8"
    );
    expect(src).toContain("Your reflections");
    expect(src).not.toContain("Who carries their light?");
    expect(src).not.toContain("livingHonorCandidates");
  });

  it("HonorDeclarationBox owns the bottom honor section id", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/honor-declaration.tsx"),
      "utf8"
    );
    expect(src).toContain('HONOR_LIGHT_ANCHOR_ID = "honor-light"');
    expect(src).toContain("Who carries their light?");
    expect(src).toContain("livingHonorCandidates");
  });

  it("HonorDeclarationBox is a details disclosure collapsed by default", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/honor-declaration.tsx"),
      "utf8"
    );
    expect(src).toContain("<details");
    expect(src).toContain('className="honor-declare-summary"');
    // Collapsed by default — no open attribute on the root details.
    expect(src).not.toMatch(/<details[^>]*\sopen[\s>]/);
  });

  it("remembrance person page keeps a single Ask Vela entry (RemembranceSpace)", () => {
    const page = readFileSync(
      resolve(__dirname, "../app/app/person/[id]/page.tsx"),
      "utf8"
    );
    const remembrance = readFileSync(
      resolve(__dirname, "../components/remembrance-space.tsx"),
      "utf8"
    );
    expect(page).toContain("!personPassed");
    expect(page).toContain("app-content--remembrance");
    expect(page).toContain("!showRemembrance");
    expect(remembrance).toContain("Ask Vela about {person.display_name}");
    expect(remembrance).toContain("remembranceVelaHref");
  });
});
