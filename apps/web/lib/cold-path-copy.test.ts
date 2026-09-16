import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function readRepo(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
}

const COLD_PATH_COPY_FILES = [
  "apps/web/app/chart/compare/page.tsx",
  "apps/web/lib/nav-links.ts",
  "apps/web/components/share-snapshot-view.tsx",
  "apps/web/lib/quick-share.ts",
  "apps/web/components/quick-check-modal.tsx",
] as const;

describe("cold-path copy reads as synastry, not compatibility", () => {
  it("strips user-visible compatibility from the public compare path", () => {
    for (const rel of COLD_PATH_COPY_FILES) {
      const visible = stripComments(readRepo(rel));
      expect(visible, rel).not.toMatch(/compatib/i);
    }
  });

  it("does not tell visitors to set tzOffsetMin by name", () => {
    expect(readRepo("apps/web/components/birth-fields.tsx")).not.toContain("tzOffsetMin via");
  });

  it("uses the approved compare H1 strings", () => {
    const src = readRepo("apps/web/app/chart/compare/page.tsx");
    expect(src).toContain('"See where two charts flow and catch, free."');
    expect(src).toContain('"See where two charts flow and catch."');
    expect(src).toContain('"A shared synastry reading"');
  });

  it("keeps synastry in /chart/compare metadata", () => {
    expect(readRepo("apps/web/app/chart/compare/layout.tsx")).toMatch(/synastry/i);
  });
});
