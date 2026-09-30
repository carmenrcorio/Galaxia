import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("security phase 1 wiring", () => {
  it("hardcodes rate limits in SQL and removes caller parameters", () => {
    const sql = read("supabase/migrations/20260930210000_security_phase_1_fixes.sql");
    expect(sql).toMatch(/check_and_increment_account_export_rate\(\)/);
    expect(sql).toMatch(/check_and_increment_vela_rate\(\)/);
    expect(sql).toContain("p_limit int := 1");
    expect(sql).toContain("p_window_seconds int := 3600");
    expect(sql).toContain("p_limit := 5");
    expect(sql).toContain("p_limit := 20");
    expect(sql).toMatch(/drop function if exists public\.check_and_increment_vela_rate\(int, int\)/);
  });

  it("closes anon early_access inserts", () => {
    const sql = read("supabase/migrations/20260930210000_security_phase_1_fixes.sql");
    expect(sql).toContain('drop policy if exists "anon can insert waitlist"');
  });

  it("routes account delete through password verify and service-role purge", () => {
    const route = read("apps/web/app/api/account/delete/route.ts");
    expect(route).toContain("signInWithPassword");
    expect(route).toContain('rpc("purge_user_account"');
    expect(route).not.toContain("purge_own_account_data");
  });
});
