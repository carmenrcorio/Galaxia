import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("account export/delete accept the mobile session JWT (D5)", () => {
  it("both routes resolve the user through createSupabaseClientForRequest", () => {
    const del = read("apps/web/app/api/account/delete/route.ts");
    const exp = read("apps/web/app/api/account/export/route.ts");
    expect(del).toContain("createSupabaseClientForRequest");
    expect(exp).toContain("createSupabaseClientForRequest");
    expect(del).toContain("accessToken");
    expect(exp).toContain("accessToken");
    expect(exp).toMatch(/export async function GET\(req: Request\)/);
    expect(del).toContain("purge_own_account_data");
  });

  it("cookie AccountDataPanel still calls the same routes without an Authorization header", () => {
    const panel = read("apps/web/components/account-data-panel.tsx");
    expect(panel).toContain('fetch("/api/account/export"');
    expect(panel).toContain('fetch("/api/account/delete"');
    expect(panel).not.toMatch(/Authorization/);
    expect(panel).toContain("ACCOUNT_DELETE_COPY");
    expect(panel).toContain("confirmation: typed.trim().toLowerCase()");
  });

  it("the helper still falls back to the cookie server client", () => {
    const src = read("apps/web/lib/supabase/user-from-request.ts");
    expect(src).toContain("createSupabaseServerClient");
    expect(src).toContain("accessTokenFromAuthorizationHeader");
    expect(src).not.toContain("serviceRole");
  });
});
