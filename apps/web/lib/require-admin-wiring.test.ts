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
  // Scoped to just this function's body: requireAdminApi (below, in the
  // same file) legitimately calls `.auth.getUser()` directly — it can't go
  // through requireUser(), which redirects (see requireAdminApi's own
  // tests) — so a whole-file assertion would wrongly fail once that
  // function exists.
  const requireAdminSrc = src.slice(
    src.indexOf("export async function requireAdmin("),
    src.indexOf("export async function requireAdminApi(")
  );

  it("reuses requireUser() for authentication instead of its own auth.getUser() call", () => {
    expect(src).toContain('import { requireUser } from "./supabase/require-user"');
    expect(requireAdminSrc).toMatch(/await requireUser\(nextPath\)/);
    // The doc comment above may reference `auth.getUser()` to explain what
    // requireUser does internally — the guard against reinventing it is
    // that the code itself never calls `.auth.getUser()` directly.
    expect(requireAdminSrc).not.toMatch(/\.auth\.getUser\(\)/);
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
    // `nextPath as never` is a type-only cast for Next's typedRoutes (a
    // caller-supplied string isn't a literal Route) — same escape used for
    // dynamic hrefs elsewhere (app-nav.tsx); this only checks the redirect
    // call itself sits inside the `if (!isAdmin(row))` block, not the exact
    // gap (a doc comment sits between them).
    const guardBlock = src.slice(src.indexOf("if (!isAdmin(row)) {"), src.indexOf("return { supabase, user };"));
    expect(guardBlock).toMatch(/redirect\(nextPath(?:\s+as\s+never)?\)/);
  });

  it("fails closed (throws, does not default to admin) when the service-role key is missing", () => {
    expect(src).toMatch(/if\s*\(\s*!publicEnv\.supabaseUrl\s*\|\|\s*!privateEnv\.serviceRole\s*\)\s*\{[\s\S]{0,120}throw new Error/);
  });
});

/**
 * Source-level guards for `requireAdminApi` — the JSON-403 sibling used by
 * every `/api/admin/**` route handler. Same "read the source" constraint as
 * above (the module imports `server-only`).
 */
describe("requireAdminApi — the JSON-403 guard for /api/admin/** route handlers", () => {
  const src = readRequireAdmin();

  it("is exported alongside requireAdmin, not a rebuild of it", () => {
    expect(src).toMatch(/export async function requireAdminApi\(/);
    // Still only one requireAdmin definition — requireAdminApi must reuse
    // the same primitives (readAdminRow, isAdmin), not re-derive the check.
    expect(src).toMatch(/export async function requireAdmin\(/);
  });

  it("never calls requireUser() (which redirects) — it reads the session directly so it can return JSON instead", () => {
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).not.toMatch(/requireUser\(/);
    expect(apiFnSrc).toMatch(/\.auth\.getUser\(\)/);
  });

  it("decides via the same service-role readAdminRow + isAdmin path as requireAdmin, not an inline role check", () => {
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).toMatch(/readAdminRow\(serviceRoleClient,\s*user\.id\)/);
    expect(apiFnSrc).toMatch(/isAdmin\(row\)/);
    expect(apiFnSrc).not.toMatch(/role\s*===\s*["']admin["']/);
  });

  it("never redirects — every denial path returns a NextResponse.json(...) with a 403, never redirect()/NextResponse.redirect", () => {
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).not.toMatch(/redirect\(/);
    expect(apiFnSrc).toMatch(/NextResponse\.json\(\{\s*error:\s*"Forbidden"\s*\},\s*\{\s*status:\s*403\s*\}\)/);
  });

  it("returns a plain NextResponse | { user } union, not a boolean-discriminant ({ ok: ... }) one", () => {
    // apps/web/tsconfig.json sets strict:false (strictNullChecks off), under
    // which a `{ ok: boolean; ... }` discriminated union silently fails to
    // narrow with `if (!guard.ok)` — confirmed by reproducing it in
    // isolation, not a guess (see the doc comment above the type). instanceof
    // narrowing has no such dependency.
    expect(src).toMatch(/export type RequireAdminApiResult\s*=\s*NextResponse\s*\|\s*\{\s*user:\s*User\s*\}/);
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).not.toMatch(/\bok\s*:\s*(true|false|boolean)/);
  });

  it("wraps the session + admin-row check in try/catch so an unexpected error still denies (403), never an unhandled 500", () => {
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).toMatch(/try\s*\{[\s\S]*\}\s*catch\s*\{[\s\S]*forbidden\(\)/);
  });

  it("still names the missing env var (ENGINEERING.md §6) rather than folding config errors into a generic 403", () => {
    const apiFnSrc = src.slice(src.indexOf("export async function requireAdminApi("));
    expect(apiFnSrc).toMatch(/missingEnvMessage\("SUPABASE_SERVICE_ROLE_KEY"\)/);
    expect(apiFnSrc).toMatch(/status:\s*500/);
  });
});

/**
 * Source-level guard for the FIRST /api/admin/** route: it must call
 * requireAdminApi() itself (defense in depth — the /admin layout's
 * requireAdmin() call does not protect this route when it's hit directly)
 * and return the guard's NextResponse immediately when denied.
 */
describe("GET /api/admin/users — calls requireAdminApi itself, independent of the /admin layout", () => {
  const src = readFileSync(
    join(REPO_ROOT, "apps/web/app/api/admin/users/route.ts"),
    "utf8"
  );

  it("imports and calls requireAdminApi", () => {
    expect(src).toContain('import { requireAdminApi } from "../../../../lib/require-admin"');
    expect(src).toMatch(/await requireAdminApi\(\)/);
  });

  it("returns the guard immediately when it's a NextResponse (denied), before reading any user data", () => {
    expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    // The denial check must come before the service-role read.
    const guardIndex = src.indexOf("instanceof NextResponse");
    const readIndex = src.indexOf("listAdminUsers(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(readIndex).toBeGreaterThan(guardIndex);
  });

  it("never calls requireAdmin (the redirect version) — a route handler must use the JSON-403 variant", () => {
    // Scoped to the function body (the doc comment above may prose-reference
    // "requireAdmin() call" to explain the layout guard it does NOT rely on).
    // "requireAdmin(" (literal open-paren right after) only matches a call to
    // the redirect version — "requireAdminApi(" has "Api(" there instead, so
    // this does not false-positive on the JSON-403 variant this route uses.
    const fnSrc = src.slice(src.indexOf("export async function GET("));
    expect(fnSrc).not.toContain("requireAdmin(");
  });
});
