import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for POST /api/admin/support/[id]/close and .../reopen,
 * mirroring the wiring test GET /api/admin/users already has
 * (require-admin-wiring.test.ts). Lives under lib/ (vitest.config.ts scopes
 * discovery to `lib/**`) and reads the routes' source directly rather than
 * importing them, since they transitively import `server-only` via
 * `require-admin.ts`.
 */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function readRoute(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe.each([
  { transition: "close", action: "close_support_request", path: "apps/web/app/api/admin/support/[id]/close/route.ts" },
  { transition: "reopen", action: "reopen_support_request", path: "apps/web/app/api/admin/support/[id]/reopen/route.ts" }
])("POST /api/admin/support/[id]/$transition", ({ transition, action, path }) => {
  const src = readRoute(path);

  it("imports and calls requireAdminApi", () => {
    expect(src).toContain('import { requireAdminApi } from "../../../../../../lib/require-admin"');
    expect(src).toMatch(/await requireAdminApi\(\)/);
  });

  it("returns the guard immediately when it's a NextResponse (denied), before reading params or transitioning the request", () => {
    expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    const guardIndex = src.indexOf("instanceof NextResponse");
    const paramsIndex = src.indexOf("await params");
    const transitionIndex = src.indexOf("transitionSupportRequest(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(paramsIndex).toBeGreaterThan(guardIndex);
    expect(transitionIndex).toBeGreaterThan(guardIndex);
  });

  it("never calls requireAdmin (the redirect version) — a route handler must use the JSON-403 variant", () => {
    const fnSrc = src.slice(src.indexOf("export async function POST("));
    expect(fnSrc).not.toContain("requireAdmin(");
  });

  it(`calls transitionSupportRequest with the "${transition}" direction`, () => {
    expect(src).toMatch(new RegExp(`transitionSupportRequest\\([^)]*"${transition}"\\)`));
  });

  it("imports the shared writeAdminAuditLog helper rather than inserting into admin_audit_log itself", () => {
    expect(src).toContain('import { writeAdminAuditLog } from "../../../../../../lib/admin/audit-log"');
    expect(src).not.toMatch(/from\(\s*["']admin_audit_log["']\s*\)/);
  });

  it(`writes the "${action}" audit action, with actorId from the guard (never the request) and targetUserId from the updated row's owner (never the admin)`, () => {
    expect(src).toContain(`action: "${action}"`);
    expect(src).toMatch(/actorId:\s*guard\.user\.id/);
    expect(src).toMatch(/targetUserId:\s*updated\.owner_id/);
  });

  it("calls writeAdminAuditLog AFTER the transition succeeds, and its own failure returns a non-200 response rather than being swallowed", () => {
    const auditCallIndex = src.indexOf("await writeAdminAuditLog(");
    const transitionIndex = src.indexOf("transitionSupportRequest(");
    expect(transitionIndex).toBeGreaterThan(-1);
    expect(auditCallIndex).toBeGreaterThan(transitionIndex);

    const auditBlockStart = src.lastIndexOf("try {", auditCallIndex);
    const auditBlockEnd = src.indexOf("return NextResponse.json({ ok: true", auditCallIndex);
    const auditBlock = src.slice(auditBlockStart, auditBlockEnd);
    expect(auditBlock).toMatch(/catch\s*\(err\)\s*\{/);
    expect(auditBlock).toMatch(/status:\s*500/);
  });

  it("translates SupportRequestNotFoundError to 404 and SupportRequestConflictError to 409, not a generic 500", () => {
    expect(src).toContain("SupportRequestNotFoundError");
    expect(src).toContain("SupportRequestConflictError");
    expect(src).toMatch(/instanceof SupportRequestNotFoundError[\s\S]{0,80}status:\s*404/);
    expect(src).toMatch(/instanceof SupportRequestConflictError[\s\S]{0,80}status:\s*409/);
  });

  it("never writes to the profiles table", () => {
    expect(src).not.toMatch(/from\(\s*["']profiles["']\s*\)/);
  });
});
