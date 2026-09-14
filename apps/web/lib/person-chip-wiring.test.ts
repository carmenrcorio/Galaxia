import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("person chip color wiring", () => {
  it("InitialAvatar is the only color path and imports personChipColor from core", () => {
    const src = read("components/initial-avatar.tsx");
    expect(src).toContain('from "@galaxia/core"');
    expect(src).toContain("personChipColor");
    expect(src).toContain("personInitials");
    expect(src).not.toContain("avatarColorClass");
    expect(src).not.toMatch(/av-\d/);
  });

  it("does not leave a name-hash avatar helper in lib/design.ts", () => {
    const src = read("lib/design.ts");
    expect(src).not.toContain("avatarColorClass");
    expect(src).not.toMatch(/function initials\(/);
  });

  it("does not keep the old six-stop .av-* palette as a second system", () => {
    const css = read("app/globals.css");
    expect(css).not.toMatch(/\.av-[0-5]\s*\{/);
    expect(css).toContain(".avatar__star");
  });

  it("there is no light theme to contrast-check — the app is navy-only", () => {
    const css = read("app/globals.css");
    expect(css).not.toMatch(/prefers-color-scheme:\s*light/);
    expect(css).not.toMatch(/\[data-theme=["']light["']\]/);
    expect(css).not.toMatch(/html\.light\b/);
  });

  it("chip call sites pass personId instead of inventing a local color", () => {
    const files = [
      "app/app/person/[id]/page.tsx",
      "app/app/compare/page.tsx",
      "app/app/vela/page.tsx",
      "app/app/groups/page.tsx",
      "app/app/page.tsx",
      "components/groups/group-selector.tsx",
      "components/groups/manage-group-accordion.tsx",
      "components/groups/chart-grid-section.tsx",
      "components/relational-transit-feed.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).toContain("InitialAvatar");
      expect(src, file).toContain("personId=");
      expect(src, file).not.toContain("avatarColorClass");
    }
  });
});
