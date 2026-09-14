import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const home = readFileSync(join(REPO_ROOT, "apps/web/app/app/page.tsx"), "utf8");
const honorBox = readFileSync(
  join(REPO_ROOT, "apps/web/components/honor-declaration.tsx"),
  "utf8"
);

describe("relationship line render — Phase 2 fetch + stroke", () => {
  it("constellation fetch is un-narrowed; honor delete stays remembrance-scoped", () => {
    expect(home).toContain(
      'supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", uid)'
    );
    expect(home).not.toContain(
      'supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", uid).eq("relation_type", HONOR_RELATION_TYPE)'
    );
    expect(honorBox).toContain('.select("id, person_a, person_b, relation_type")');
    expect(honorBox).toContain('.eq("owner_id", userId)');
    expect(honorBox).toContain('.eq("relation_type", HONOR_RELATION_TYPE)');
    expect(honorBox).toMatch(
      /\.delete\(\)[\s\S]{0,180}\.eq\("relation_type", HONOR_RELATION_TYPE\)/
    );
    const honorFetch = honorBox.slice(
      honorBox.indexOf("loadHonorConnections"),
      honorBox.indexOf("saveHonorConnections")
    );
    expect(honorFetch).not.toContain('.eq("relation_type", HONOR_RELATION_TYPE)');
  });

  it("drawHonorLink uses RELATION_LINE_STYLE and does not skip non-remembrance", () => {
    expect(home).toContain("const style = RELATION_LINE_STYLE[edge.relationType]");
    expect(home).not.toContain("if (edge.relationType !== HONOR_RELATION_TYPE) return");
    expect(home).toContain("honorEdges.some((e) => e.relationType === HONOR_RELATION_TYPE)");
    expect(home).toContain("function drawLink(");
  });

  it("honor declaration save diffs through connectionDiff, not a type-blind delete", () => {
    expect(honorBox).toContain("connectionDiff(savedIds, selectedIds)");
    expect(honorBox).not.toContain("honorConnectionDiff");
  });
});
