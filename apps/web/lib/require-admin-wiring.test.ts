import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for `requireAdmin` (apps/web/lib/require-admin.ts).
 * Importing the module directly isn't viable in this suite — it imports
 * `server-only`, which throws unconditionally outside a Next.js
 * server-bundle context (same constraint `nudge-compute-route-wiring.
 * test.ts` and `timezone-wiring.test.ts` already document). So this reads
 * the actual source instead — proves the wiring (real auth, service-role
 * read, the pure isAdmin decision, fail-closed redirect) without needing a
 * Next.js server context. The genuine behavioral proof (founder id passes,
 * a non-admin id is redirected, the client-session read path is provably
 * not what decides) is `require-admin-live.test.ts` / `read-admin-row.
 * test.ts`, run against the live project.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const REQUIRE_ADMIN_PATH = "apps/web/lib/require-admin.ts";

function readRequireAdmin(): string {
  return readFileSync(join(REPO_ROOT, REQUIRE_ADMIN_PATH), "utf8");
}

describe("requireAdmin — layers on top of real auth, never reinvents it", () => {
  const src = readRequireAdmin();

  it("reuses requireUser() for authentication instead of its own auth.getUser() call", () => {
    expect(src).toContain('import { requireUser } from "./supabase/require-user"');
    expect(src).toMatch(/await requireUser\(nextPath\)/);
    // The doc comment above may reference `auth.getUser()` to explain what
    // requireUser does internally — the guard against reinventing it is
    // that the code itself never calls `.auth.getUser()` directly.
    expect(src).not.toMatch(/\.auth\.getUser\(\)/);
  });
});

describe("requireAdmin — decides from a service-role read, never a client-trusted value", () => {
  const src = readRequireAdmin();

  it("imports server-only, so this module can never be pulled into a client bundle", () => {
    expect(src).toContain('import "server-only"');
  });

  it("constructs a service-role client the same way api/cancel/route.ts does (persistSession: false, privateEnv.serviceRole)", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });

  it("reads admin_users via the shared readAdminRow helper against the service-role client, not the user's own session client", () => {
    expect(src).toContain('import { readAdminRow } from "./read-admin-row"');
    expect(src).toMatch(/readAdminRow\(serviceRoleClient,\s*user\.id\)/);
  });

  it("decides admin status only via the pure isAdmin() from @galaxia/core, never an inline role check", () => {
    expect(src).toContain('import { isAdmin } from "@galaxia/core"');
    expect(src).toMatch(/isAdmin\(row\)/);
    // No inline re-derivation of the role vocabulary (e.g. `role === "admin"` typed out again here).
    expect(src).not.toMatch(/role\s*===\s*["']admin["']/);
  });

  it("never reads a role/admin claim from a header, cookie, or request body", () => {
    for (const forbidden of ["headers.get", "req.headers", "x-admin", "X-Admin", "body.role", "body.admin"]) {
      expect(src).not.toContain(forbidden);
    }
  });

  it("fails closed: redirects (does not silently continue) when isAdmin() is false", () => {
    expect(src).toMatch(/if\s*\(\s*!isAdmin\(row\)\s*\)\s*\{[\s\S]{0,80}redirect\(nextPath\)/);
  });

  it("fails closed (throws, does not default to admin) when the service-role key is missing", () => {
    expect(src).toMatch(/if\s*\(\s*!publicEnv\.supabaseUrl\s*\|\|\s*!privateEnv\.serviceRole\s*\)\s*\{[\s\S]{0,120}throw new Error/);
  });
});
