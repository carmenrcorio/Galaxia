import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for `/admin/users/[id]` (app/admin/users/[id]/page.tsx).
 * A Next.js page under `app/**` isn't imported directly in this suite
 * (vitest.config.ts scopes discovery to `lib/**`/`components/**`, and the
 * page transitively imports `server-only` via `get-user-detail.ts` anyway)
 * — this reads the page's source directly, mirroring
 * `require-admin-wiring.test.ts` / `comp-route-wiring.test.ts`'s approach
 * for the same constraint.
 *
 * The load-bearing proof: the HARD BOUNDARY from the admin-portal-v2 brief
 * — this page (plus the two readers it calls) must read `auth.users`,
 * `profiles`, and `admin_audit_log` ONLY, never `people`/`notes`/`threads`/
 * any Vela table — and it must never call `requireAdmin()` itself (the
 * `/admin` layout already does, once, per its own doc comment).
 */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const PAGE_PATH = "apps/web/app/admin/users/[id]/page.tsx";
const GET_USER_DETAIL_PATH = "apps/web/lib/admin/get-user-detail.ts";
const READ_AUDIT_HISTORY_PATH = "apps/web/lib/admin/read-audit-history.ts";

function readFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("/admin/users/[id] page — no guard call of its own (the /admin layout owns it)", () => {
  const src = readFile(PAGE_PATH);

  it("never imports require-admin.ts (the doc comment may reference requireAdmin()/requireAdminApi() in prose to explain the layout/route guards it relies on instead)", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
    expect(src).not.toContain('from "../../../../lib/require-admin"');
  });
});

describe("/admin/users/[id] page and its readers — read only auth.users/profiles/admin_audit_log, never people/notes/threads/Vela", () => {
  const combinedSrc = [PAGE_PATH, GET_USER_DETAIL_PATH, READ_AUDIT_HISTORY_PATH].map(readFile).join("\n");

  it("never references people, notes, threads, or any Vela/cohort table as a query string (a .from(...) argument)", () => {
    // Scoped to quote forms an actual `.from(...)` call argument would use
    // (double/single-quoted string literals) — prose in doc comments here
    // legitimately uses backtick-markdown to name the very tables this
    // must exclude (e.g. "never `people`, `notes`, `threads`"), which would
    // false-positive a bare substring check.
    for (const forbidden of ["people", "notes", "threads", "vela", "cohort", "person_daily_nudges", "vela_pin"]) {
      expect(combinedSrc.toLowerCase()).not.toContain(`"${forbidden}"`);
      expect(combinedSrc.toLowerCase()).not.toContain(`'${forbidden}'`);
    }
  });

  it("every .from(...) call across the page and its readers targets profiles or admin_audit_log", () => {
    const fromCalls = combinedSrc.match(/\.from\(\s*["'][a-zA-Z_]+["']\s*\)/g) ?? [];
    expect(fromCalls.length).toBeGreaterThan(0);
    for (const call of fromCalls) {
      expect(call).toMatch(/"profiles"|"admin_audit_log"/);
    }
  });

  it("getAdminUserDetail is the page's only user-row reader, read-audit-history.ts is its only audit reader", () => {
    const pageSrc = readFile(PAGE_PATH);
    expect(pageSrc).toContain(
      'import { getAdminUserDetail, type AdminUserDetail } from "../../../../lib/admin/get-user-detail"'
    );
    expect(pageSrc).toContain(
      'import { readAdminAuditHistory, type AdminAuditHistoryEntry } from "../../../../lib/admin/read-audit-history"'
    );
  });
});

describe("/admin/users/[id] page — reuses the existing action buttons as-is, never reimplements them", () => {
  const src = readFile(PAGE_PATH);

  it("imports and renders ResendEmailButton and CompActionButton from their existing components, no new button component", () => {
    expect(src).toContain(
      'import { ResendEmailButton } from "../../../../components/admin/resend-email-button"'
    );
    expect(src).toContain('import { CompActionButton } from "../../../../components/admin/comp-action-button"');
    expect(src).toMatch(/<ResendEmailButton\s+userId={user\.id}\s*\/>/);
    expect(src).toMatch(/<CompActionButton[\s\S]{0,200}\/>/);
  });
});

describe("/admin/users/[id] page — renders a not-found state instead of throwing when the user id does not resolve", () => {
  const src = readFile(PAGE_PATH);

  it("checks !user before rendering the detail layout", () => {
    expect(src).toMatch(/if\s*\(\s*!user\s*\)\s*\{/);
  });
});
