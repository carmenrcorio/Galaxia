import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for POST /api/admin/users/[id]/resend-email, mirroring
 * the wiring test GET /api/admin/users already has
 * (require-admin-wiring.test.ts). Lives under lib/ (not colocated with the
 * route) because vitest.config.ts scopes test discovery to `lib/**` so it
 * never tries to execute Next.js route/build artifacts — reads the route's
 * source directly rather than importing the module, which transitively
 * imports `server-only` via `require-admin.ts` (same constraint documented
 * there).
 */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/admin/users/[id]/resend-email/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("POST /api/admin/users/[id]/resend-email — calls requireAdminApi itself, independent of the /admin layout", () => {
  const src = readRoute();

  it("imports and calls requireAdminApi", () => {
    expect(src).toContain('import { requireAdminApi } from "../../../../../../lib/require-admin"');
    expect(src).toMatch(/await requireAdminApi\(\)/);
  });

  it("returns the guard immediately when it's a NextResponse (denied), before reading params or sending any email", () => {
    expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    const guardIndex = src.indexOf("instanceof NextResponse");
    const paramsIndex = src.indexOf("await params");
    const sendIndex = src.indexOf("resendUserEmail(");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(paramsIndex).toBeGreaterThan(guardIndex);
    expect(sendIndex).toBeGreaterThan(guardIndex);
  });

  it("never calls requireAdmin (the redirect version) — a route handler must use the JSON-403 variant", () => {
    const fnSrc = src.slice(src.indexOf("export async function POST("));
    expect(fnSrc).not.toContain("requireAdmin(");
  });
});

describe("POST /api/admin/users/[id]/resend-email — branches the email type, never sends one generic email", () => {
  const src = readRoute();

  it("imports resendUserEmail (the branch-deciding helper) rather than reimplementing the decision inline", () => {
    expect(src).toContain('import { resendUserEmail } from "../../../../../../lib/admin/resend-email"');
    expect(src).toMatch(/resendUserEmail\(/);
  });

  it("maps both email types to a distinct audit action — never a single action regardless of type", () => {
    expect(src).toMatch(/confirmation:\s*"resend_confirmation_email"/);
    expect(src).toMatch(/reset:\s*"resend_password_reset_email"/);
  });

  it("never writes to the profiles table — this action only triggers an email", () => {
    expect(src).not.toMatch(/from\(\s*["']profiles["']\s*\)/);
  });
});

describe("POST /api/admin/users/[id]/resend-email — audits in the same function as the mutation, never fire-and-forget", () => {
  const src = readRoute();

  it("imports the shared writeAdminAuditLog helper rather than inserting into admin_audit_log itself", () => {
    expect(src).toContain('import { writeAdminAuditLog, type AdminAuditAction } from "../../../../../../lib/admin/audit-log"');
    expect(src).not.toMatch(/from\(\s*["']admin_audit_log["']\s*\)/);
  });

  it("calls writeAdminAuditLog with actorId from the guard's verified user, never from the request body/params", () => {
    expect(src).toMatch(/actorId:\s*guard\.user\.id/);
  });

  it("calls writeAdminAuditLog AFTER the email send succeeds, and its failure returns a non-200 response rather than being swallowed", () => {
    const auditCallIndex = src.indexOf("await writeAdminAuditLog(");
    const sendIndex = src.indexOf("resendUserEmail(");
    expect(sendIndex).toBeGreaterThan(-1);
    expect(auditCallIndex).toBeGreaterThan(sendIndex);

    // The audit write sits in its own try/catch whose catch branch returns
    // a non-2xx NextResponse — it must not be a bare `await` with no
    // failure handling, and it must not be caught and ignored.
    const auditBlockStart = src.lastIndexOf("try {", auditCallIndex);
    const auditBlockEnd = src.indexOf("return NextResponse.json({ ok: true", auditCallIndex);
    const auditBlock = src.slice(auditBlockStart, auditBlockEnd);
    expect(auditBlock).toMatch(/catch\s*\(err\)\s*\{/);
    expect(auditBlock).toMatch(/status:\s*500/);
  });
});
