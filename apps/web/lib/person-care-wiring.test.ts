import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("source wiring — person page + home hide live sky for passed", () => {
  it("person page gates daily nudge with shouldShowLiveTransits (no run for passed)", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/app/person/[id]/page.tsx"),
      "utf8"
    );
    expect(src).toContain("shouldShowLiveTransits");
    expect(src).toContain("showActiveToday");
    expect(src).toContain("person_daily_nudges");
    expect(src).toContain("buildPersonDailyNudge");
    expect(src).toMatch(/if\s*\(\s*shouldShowLiveTransits\(personRow\)\s*\)/);
    expect(src).toContain("HonorDeclarationBox");
    expect(src).toContain("Who carries their light ↓");
    expect(src).toContain("HONOR_LIGHT_ANCHOR_ID");
    expect(src).toContain("RemembranceSpace");
    expect(src).toContain("ChartWheel");
    expect(src).toContain("aspects={natalAspects}");
    expect(src).toContain("PersonProfileNav");
    expect(src).toContain("buildPersonPageGroups");
    expect(src).toContain("resolvePersonPageEntry");
    expect(src).toContain('get("transit")');
    expect(src).toContain("person-today");
    expect(src).not.toContain("person-group-panel-now");
    expect(src).toContain("person-group-panel-them");
    expect(src).toContain('person-group-panel-remembrance" : "person-group-panel-yours"');
    expect(src.indexOf('id="chart-wheel"')).toBeLessThan(src.indexOf('id="person-today"'));
    expect(src.indexOf('id="person-today"')).toBeLessThan(src.indexOf('id="big-three"'));
    expect(src.indexOf('id="big-three"')).toBeLessThan(src.indexOf('id="placements"'));
    expect(src.indexOf('id="placements"')).toBeLessThan(src.indexOf('id="generational"'));
    expect(src.indexOf('id="generational"')).toBeLessThan(src.indexOf('id="aspects"'));
    expect(src.indexOf('id="aspects"')).toBeLessThan(src.indexOf('id="houses"'));
    expect(src.indexOf('id="houses"')).toBeLessThan(src.indexOf('id="element-balance"'));
    expect(src).toContain("ChartVocabSubhead");
    expect(src).toContain("PERSON_TAB_LABEL");
    expect(src).toContain("PERSON_TAB_VOCAB");
    expect(src).toContain('sectionHead("big-three")');
    expect(src).toContain('sectionHead("placements")');
    expect(src).toContain('sectionHead("aspects")');
    expect(src).toContain('sectionHead("houses")');
    expect(src).toContain("GenerationalEraSurface");
    expect(src).toContain("isProfessionalPersonRelation");
    expect(src).toContain("showWorkView={isProfessionalPersonRelation(person.relation)}");
  });

  it("This Week feed strips memorial people via thisWeekRowsFromStored before render", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/relational-transit-feed.tsx"),
      "utf8"
    );
    expect(src).toContain("thisWeekRowsFromStored");
    expect(src).toContain("peopleForThisWeek");
    expect(src).toContain("passedPersonIds");
    expect(src).toMatch(/thisWeekRowsFromStored\(\(transitRows/);
    expect(src).toMatch(/peopleForThisWeek\(peopleList\)/);
  });

  it("home Today in your sky filters with peopleForTodaySky before durable nudge plan", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/page.tsx"), "utf8");
    expect(src).toContain("peopleForTodaySky");
    expect(src).toMatch(/peopleForTodaySky\(castPeople\)/);
    expect(src).toContain("exclude_from_dailies");
    expect(src).toContain("planDailyNudgeWrites");
    expect(src).toContain("person_daily_nudges");
    expect(src).toContain("CARE: passed people excluded");
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

  it("MemorialConstellationPicker is collapsed by default; library opens on Change", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/memorial-constellation-picker.tsx"),
      "utf8"
    );
    expect(src).toContain('useState(false)');
    expect(src).toContain("memorial-constellation-collapsed");
    expect(src).toContain("Change");
    expect(src).toContain('role="dialog"');
    expect(src).toContain("aria-haspopup=\"dialog\"");
    // Collapsed row keeps summary + myth visible (whimsy always on).
    expect(src).toContain("pattern.summary");
    expect(src).toContain("pattern.myth");
    expect(src).toMatch(/Collapsed selection row[\s\S]*pattern\.summary[\s\S]*pattern\.myth/);
    // Collapsed until Change — open starts false; library gated on `open`.
    expect(src).toMatch(/\{open \? \(/);
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
    expect(page).toContain("app-content--remembrance");
    // Empty "Vela on {name}" card is not mounted on remembrance — sole entry is RemembranceSpace.
    expect(page).toContain("showVelaOnThem");
    expect(page).toContain("!showRemembrance || velaPins.length > 0");
    expect(page).toContain("Remembrance keeps a single Vela entry in RemembranceSpace");
    expect(remembrance).toContain("Ask Vela about {person.display_name}");
    expect(remembrance).toContain("remembranceVelaHref");
    // Only one Ask Vela about {name} CTA source on remembrance: RemembranceSpace.
    const remembranceAskCount = (remembrance.match(/Ask Vela about \{person\.display_name\}/g) ?? []).length;
    expect(remembranceAskCount).toBe(1);
  });
});
