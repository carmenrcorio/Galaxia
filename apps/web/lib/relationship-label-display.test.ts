import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

const DISPLAY_SURFACES: Array<[string, string]> = [
  ["apps/web/app/app/settings/page.tsx", "formatRelationshipLabel(person.relation)"],
  ["apps/web/app/app/person/[id]/page.tsx", "formatRelationshipLabel(person.relation)"],
  ["apps/web/app/app/page.tsx", "formatRelationshipLabel(hoverPerson.relation)"],
  ["apps/mobile/app/(app)/(tabs)/settings.tsx", "formatRelationshipLabel(person.relation)"],
  ["apps/mobile/app/(app)/profile/[personId].tsx", "formatRelationshipLabel(person.relation)"],
  ["apps/mobile/app/(app)/onboarding.tsx", "formatRelationshipLabel(person.relation)"],
  ["apps/web/components/pending-connect-invites.tsx", "formatRelationshipLabel(connectRelationLabel(row.relationship_type))"],
  ["apps/mobile/src/components/pending-connect-invites.tsx", "formatRelationshipLabel(connectRelationLabel(row.relationship_type))"],
];

describe("relationship label display casing", () => {
  it("lowercases stored relationship labels on every render surface", () => {
    for (const [file, needle] of DISPLAY_SURFACES) {
      expect(read(file), file).toContain(needle);
    }
  });

  it("keeps edit fields on the stored value so a save does not rewrite casing", () => {
    for (const file of [
      "apps/web/components/edit-person-panel.tsx",
      "apps/mobile/src/components/edit-person-panel.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("value={relation}");
      expect(src, file).not.toContain("formatRelationshipLabel");
    }
  });
});
