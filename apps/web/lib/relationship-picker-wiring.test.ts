import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const page = readFileSync(join(REPO_ROOT, "apps/web/app/app/person/[id]/page.tsx"), "utf8");
const edit = readFileSync(join(REPO_ROOT, "apps/web/components/edit-person-panel.tsx"), "utf8");
const picker = readFileSync(
  join(REPO_ROOT, "apps/web/components/relationship-edges.tsx"),
  "utf8"
);
const honor = readFileSync(
  join(REPO_ROOT, "apps/web/components/honor-declaration.tsx"),
  "utf8"
);

describe("relationship picker Phase 3 wiring", () => {
  it("mounts the picker inside Edit on charted and no-chart person pages, and keeps honor declaration", () => {
    expect(page).not.toContain("<RelationshipEdgesBox");
    expect(edit).toContain("<RelationshipEdgesBox");
    expect(edit).toContain("embedded");
    expect(page).toContain("HonorDeclarationBox");
    expect((edit.match(/<RelationshipEdgesBox/g) ?? []).length).toBe(1);
    expect((page.match(/<HonorDeclarationBox/g) ?? []).length).toBe(2);
  });

  it("picker never writes or deletes remembrance", () => {
    expect(picker).toContain("buildRelationshipInsert");
    expect(picker).not.toContain("buildHonorRelationshipInsert");
    expect(picker).not.toContain("HONOR_RELATION_TYPE");
    expect(picker).toContain('.eq("relation_type", bond.relationType)');
    expect(picker).toContain("partnerBondAllowed");
    expect(picker).toContain("isMinor: person.is_minor === true || subjectIsMinor");
  });

  it("honor delete stays remembrance-scoped", () => {
    expect(honor).toMatch(
      /\.delete\(\)[\s\S]{0,180}\.eq\("relation_type", HONOR_RELATION_TYPE\)/
    );
    expect(honor).toContain("Who carries their light?");
  });
});
