import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for POST /api/admin/users/[id]/comp/grant and
 * .../comp/revoke, mirroring `resend-email-route-wiring.test.ts` /
 * `require-admin-wiring.test.ts`'s GET /api/admin/users test. Lives under
 * lib/ (not colocated with the routes) because vitest.config.ts scopes
 * test discovery to `lib/**` so it never tries to execute Next.js
 * route/build artifacts — reads each route's source directly rather than
 * importing the module, which transitively imports `server-only` via
 * `require-admin.ts` (same constraint documented there).
 */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const GRANT_ROUTE_PATH = "apps/web/app/api/admin/users/[id]/comp/grant/route.ts";
const REVOKE_ROUTE_PATH = "apps/web/app/api/admin/users/[id]/comp/revoke/route.ts";
const COMP_LIB_PATH = "apps/web/lib/admin/comp.ts";

function readRoute(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe.each([
  ["grant", GRANT_ROUTE_PATH, "grant_comp"],
  ["revoke", REVOKE_ROUTE_PATH, "revoke_comp"]
] as const)("POST /api/admin/users/[id]/comp/%s — calls requireAdminApi itself, independent of the /admin layout", (transition, routePath, _action) => {
  const src = readRoute(routePath);

  it("imports and calls requireAdminApi", () => {
    expect(src).toContain('import { requireAdminApi } from "../../../../../../../lib/require-admin"');
    expect(src).toMatch(/await requireAdminApi\(\)/);
  });

  it("returns the guard immediately when it's a NextResponse (denied), before reading params or calling transitionComp", () => {
    expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    const guardIndex = src.indexOf("instanceof NextResponse");
    const paramsIndex = src.indexOf("await params");
    const transitionIndex = src.indexOf("transitionComp(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(paramsIndex).toBeGreaterThan(guardIndex);
    expect(transitionIndex).toBeGreaterThan(guardIndex);
  });

  it("never calls requireAdmin (the redirect version) — a route handler must use the JSON-403 variant", () => {
    const fnSrc = src.slice(src.indexOf("export async function POST("));
    expect(fnSrc).not.toContain("requireAdmin(");
  });

  it(`calls transitionComp with the "${transition}" transition, never reimplementing the branch inline`, () => {
    expect(src).toContain('import {\n  CompConflictError,\n  CompTargetNotFoundError,\n  SelfCompError,\n  transitionComp\n} from "../../../../../../../lib/admin/comp"');
    expect(src).toMatch(new RegExp(`transitionComp\\([^)]*"${transition}"\\)`));
  });
});

describe("POST /api/admin/users/[id]/comp/grant and /revoke — write ONLY comped, never subscription_status/trial_ends_at (LOCKED)", () => {
  for (const [label, path] of [
    ["grant", GRANT_ROUTE_PATH],
    ["revoke", REVOKE_ROUTE_PATH]
  ] as const) {
    it(`${label} route never writes subscription_status or trial_ends_at as an object key (doc-comment mentions of the column names, with no trailing colon, are fine)`, () => {
      const src = readRoute(path);
      expect(src).not.toMatch(/subscription_status\s*:/);
      expect(src).not.toMatch(/trial_ends_at\s*:/);
    });

    it(`${label} route never writes to profiles directly — the write lives only in transitionComp`, () => {
      const src = readRoute(path);
      expect(src).not.toMatch(/from\(\s*["']profiles["']\s*\)/);
    });
  }

  it("transitionComp itself (lib/admin/comp.ts) has exactly one profiles .update(...) call, and its only key is comped", () => {
    const src = readRoute(COMP_LIB_PATH);
    const updateCalls = src.match(/\.update\(\{[^}]*\}\)/g) ?? [];
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toBe(".update({ comped: nextComped })");
  });
});

describe("POST /api/admin/users/[id]/comp/grant and /revoke — error mapping matches the LOCKED status codes", () => {
  it("grant maps SelfCompError->403, CompTargetNotFoundError->404, CompConflictError->409", () => {
    const src = readRoute(GRANT_ROUTE_PATH);
    expect(src).toMatch(/SelfCompError[\s\S]{0,80}status:\s*403/);
    expect(src).toMatch(/CompTargetNotFoundError[\s\S]{0,80}status:\s*404/);
    expect(src).toMatch(/CompConflictError[\s\S]{0,80}status:\s*409/);
  });

  it("revoke maps SelfCompError->403, CompTargetNotFoundError->404, CompConflictError->409", () => {
    const src = readRoute(REVOKE_ROUTE_PATH);
    expect(src).toMatch(/SelfCompError[\s\S]{0,80}status:\s*403/);
    expect(src).toMatch(/CompTargetNotFoundError[\s\S]{0,80}status:\s*404/);
    expect(src).toMatch(/CompConflictError[\s\S]{0,80}status:\s*409/);
  });

  it("both routes 500 on a missing service-role key, naming the missing env var", () => {
    for (const path of [GRANT_ROUTE_PATH, REVOKE_ROUTE_PATH]) {
      const src = readRoute(path);
      expect(src).toMatch(/missingEnvMessage\("SUPABASE_SERVICE_ROLE_KEY"\)/);
    }
  });
});

describe("POST /api/admin/users/[id]/comp/grant and /revoke — audits in the same function as the mutation, never fire-and-forget", () => {
  it("grant imports the shared writeAdminAuditLog helper and calls it with action 'grant_comp', actorId from the guard", () => {
    const src = readRoute(GRANT_ROUTE_PATH);
    expect(src).toContain('import { writeAdminAuditLog } from "../../../../../../../lib/admin/audit-log"');
    expect(src).not.toMatch(/from\(\s*["']admin_audit_log["']\s*\)/);
    expect(src).toMatch(/action:\s*"grant_comp"/);
    expect(src).toMatch(/actorId:\s*guard\.user\.id/);
  });

  it("revoke imports the shared writeAdminAuditLog helper and calls it with action 'revoke_comp', actorId from the guard", () => {
    const src = readRoute(REVOKE_ROUTE_PATH);
    expect(src).toContain('import { writeAdminAuditLog } from "../../../../../../../lib/admin/audit-log"');
    expect(src).not.toMatch(/from\(\s*["']admin_audit_log["']\s*\)/);
    expect(src).toMatch(/action:\s*"revoke_comp"/);
    expect(src).toMatch(/actorId:\s*guard\.user\.id/);
  });

  it("metadata reports resulting_access from the transitionComp result, not a hardcoded value", () => {
    for (const path of [GRANT_ROUTE_PATH, REVOKE_ROUTE_PATH]) {
      const src = readRoute(path);
      expect(src).toMatch(/metadata:\s*\{\s*resulting_access:\s*result\.hasAccess\s*\}/);
    }
  });

  it("both routes call writeAdminAuditLog AFTER transitionComp succeeds, and its failure returns a non-200 response rather than being swallowed", () => {
    for (const path of [GRANT_ROUTE_PATH, REVOKE_ROUTE_PATH]) {
      const src = readRoute(path);
      const auditCallIndex = src.indexOf("await writeAdminAuditLog(");
      const transitionIndex = src.indexOf("transitionComp(");
      expect(transitionIndex).toBeGreaterThan(-1);
      expect(auditCallIndex).toBeGreaterThan(transitionIndex);

      const auditBlockStart = src.lastIndexOf("try {", auditCallIndex);
      const auditBlockEnd = src.indexOf("return NextResponse.json({ ok: true", auditCallIndex);
      const auditBlock = src.slice(auditBlockStart, auditBlockEnd);
      expect(auditBlock).toMatch(/catch\s*\(err\)\s*\{/);
      expect(auditBlock).toMatch(/status:\s*500/);
    }
  });
});
