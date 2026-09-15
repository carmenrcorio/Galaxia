import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");
const WEB_COMPARE = "apps/web/app/app/compare/page.tsx";

describe("Compare selection UI scales without dual pill grids", () => {
  it("web Compare uses the searchable person fields, not wrap-flex people.map grids", () => {
    const src = read(WEB_COMPARE);
    expect(src).toContain("ComparePersonField");
    expect(src).toContain("compareAddPersonHref");
    expect(src).toContain("recentComparedPeople");
    expect(src).not.toContain("AddPersonForm");
    expect(src).not.toContain("AskAfterAdd");
    expect(src).not.toContain("idPrefix=\"compare-add\"");
    expect(src).not.toContain("group-member-chip");
    expect(src).not.toMatch(/people\.map\(\(p\) =>/);
  });

  it("still flows relationType into the same interpretation functions, not computeSynastry", () => {
    const src = read(WEB_COMPARE);
    expect(src).toMatch(/computeSynastry\(natalA,\s*natalB\)/);
    expect(src).not.toMatch(/computeSynastry\([^)]*relationType/);
    expect(src).toContain("compareHeadline(relationType");
    expect(src).toContain("whatTheyNeed(");
    expect(src).toContain("FlowsAndCatchesSection");
    expect(src).toContain("relationType={relationType}");
    expect(src).toContain("setRelationType");
    expect(src).toContain("suggestCompareRelationType");
    expect(src).toContain("availableCompareRelationTypes");
    expect(src).toContain("isMinorForSafety");
  });

  it("keeps the existing relationship-type pills behind Change, labeled via compareRelationLabel", () => {
    const src = read(WEB_COMPARE);
    expect(src).toContain("compareRelationLabel");
    expect(src).toContain("COMPARE_RELATION_CHANGE");
    expect(src).toContain("availableTypes.map");
    expect(src).toContain("userChoseTypeRef.current = true");
  });

  it("add-person returns to Compare with the new person selected when next is set", () => {
    const add = read("apps/web/app/app/add-person/page.tsx");
    expect(add).toContain("comparePathAfterAddPerson");
    expect(add).toContain("router.push");
  });
});
