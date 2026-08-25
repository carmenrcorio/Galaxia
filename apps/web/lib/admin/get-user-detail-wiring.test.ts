import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for `getAdminUserDetail` (get-user-detail.ts). This
 * module imports `server-only`, which throws unconditionally outside a
 * Next.js server-bundle context (same constraint `require-admin-wiring.
 * test.ts` documents for `require-admin.ts`) — so this reads the source
 * directly instead of importing it.
 *
 * The load-bearing proof here is the HARD BOUNDARY from the admin-portal-v2
 * brief: the detail page's reader must read `auth.users` (via the Admin
 * API) and `profiles` ONLY, and must never reference `people`, `notes`,
 * `threads`, or any Vela table. `AdminUserRow`'s own exclusion doc-comment
 * intent (list-users.ts) carries into this reader.
 */
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const GET_USER_DETAIL_PATH = "apps/web/lib/admin/get-user-detail.ts";

function readSrc(): string {
  return readFileSync(join(REPO_ROOT, GET_USER_DETAIL_PATH), "utf8");
}

describe("getAdminUserDetail — reads only auth.users (Admin API) and profiles, never people/notes/threads/Vela", () => {
  const src = readSrc();

  it("imports server-only, so this module can never be pulled into a client bundle", () => {
    expect(src).toContain('import "server-only"');
  });

  it("reads the target user via the Auth Admin API, not a client-session query", () => {
    expect(src).toMatch(/serviceRoleClient\.auth\.admin\.getUserById\(userId\)/);
  });

  it("reads exactly the extended profiles field set (list-users.ts's fields plus the seven new columns), as one literal string", () => {
    expect(src).toContain(
      '"id, display_name, subscription_status, comped, trial_ends_at, created_at, timezone, daily_nudge_emails_enabled, subscription_tier, plan, cancel_at_period_end, current_period_end, house_system, stripe_customer_id, stripe_subscription_id"'
    );
    for (const field of [
      "display_name",
      "subscription_status",
      "comped",
      "trial_ends_at",
      "created_at",
      "timezone",
      "daily_nudge_emails_enabled",
      "subscription_tier",
      "plan",
      "cancel_at_period_end",
      "current_period_end",
      "house_system",
      "stripe_customer_id",
      "stripe_subscription_id"
    ]) {
      expect(src).toContain(field);
    }
  });

  it("queries only the profiles table, never people/notes/threads/vela", () => {
    const fromCalls = src.match(/\.from\(\s*["'][a-z_]+["']\s*\)/g) ?? [];
    expect(fromCalls.length).toBeGreaterThan(0);
    for (const call of fromCalls) {
      expect(call).toContain('"profiles"');
    }
    for (const forbidden of ["people", "notes", "threads", "vela", "cohort", "person_daily_nudges"]) {
      expect(src.toLowerCase()).not.toContain(`"${forbidden}"`);
      expect(src.toLowerCase()).not.toContain(`'${forbidden}'`);
    }
  });

  it("constructs a service-role client the same way listAdminUsers does (persistSession: false)", () => {
    expect(src).toMatch(/createClient\([^)]*\{\s*\n?\s*auth:\s*\{\s*persistSession:\s*false\s*\}/);
  });

  it("returns null (not a throw) when the auth user cannot be found, so the page can render a not-found state", () => {
    const fnSrc = src.slice(src.indexOf("export async function getAdminUserDetail("));
    expect(fnSrc).toMatch(/if\s*\(authError\s*\|\|\s*!authData\?\.\s*user\)\s*\{\s*\n\s*return null;/);
  });
});
