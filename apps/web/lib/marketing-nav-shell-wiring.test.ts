import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(REPO, rel), "utf8");
}

describe("MarketingNavShell wiring", () => {
  it("marketing pages import the server shell, not the client nav directly", () => {
    const pages = [
      "app/page.tsx",
      "app/login/page.tsx",
      "app/pricing/page.tsx",
      "app/why-galaxia/page.tsx"
    ];
    for (const page of pages) {
      const src = read(page);
      expect(src).toContain("marketing-nav-shell");
      expect(src).toContain("MarketingNavShell");
      expect(src).not.toMatch(/from ["'][^"']*\/marketing-nav["']/);
    }
  });

  it("shell resolves session on the server and passes initialUserId", () => {
    const shell = read("components/marketing/marketing-nav-shell.tsx");
    expect(shell).toContain("createSupabaseServerClient");
    expect(shell).toContain("initialUserId");
    expect(shell).toContain("<MarketingNav initialUserId={initialUserId} />");
  });
});
