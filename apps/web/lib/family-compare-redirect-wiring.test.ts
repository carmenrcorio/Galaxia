import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("/app/family-compare is a permanent middleware redirect, not a stub page", () => {
  it("middleware issues a 308 to /app/groups before the auth gate", () => {
    const src = read("apps/web/middleware.ts");
    expect(src).toMatch(/path === "\/app\/family-compare"/);
    expect(src).toMatch(/url\.pathname = "\/app\/groups"/);
    expect(src).toMatch(/NextResponse\.redirect\(url,\s*308\)/);
    const redirectIdx = src.indexOf('path === "/app/family-compare"');
    const authIdx = src.indexOf("const needsAuth");
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(redirectIdx);
  });

  it("does not leave a route file that looks like a feature", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/app/family-compare/page.tsx"))).toBe(false);
  });
});
