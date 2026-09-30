/**
 * Source-level guards for GET /api/account/export.
 *
 * The route imports `server-only` transitively, so it is read as text here
 * (same approach as comp-route-wiring.test.ts). The shape of the file it
 * produces is covered by buildAccountExport's own tests in @galaxia/core;
 * what this file protects is the half a unit test cannot see: which rows the
 * route is allowed to read, and which it must never read.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCOUNT_EXPORT_RATE_LIMIT, EXPORT_PROFILE_FIELDS } from "./account-data";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE = readFileSync(join(REPO_ROOT, "apps/web/app/api/account/export/route.ts"), "utf8");

describe("GET /api/account/export", () => {
  it("requires a session before reading anything", () => {
    expect(ROUTE).toContain("createSupabaseClientForRequest");
    expect(ROUTE).toContain("supabase.auth.getUser");
    expect(ROUTE).toContain('{ error: "Sign in required." }, { status: 401 }');
  });

  it("admits one export per hour through the atomic Postgres counter", () => {
    expect(ROUTE).toContain('supabase.rpc(\n    "check_and_increment_account_export_rate"');
    expect(ROUTE).not.toContain("p_limit");
    expect(ROUTE).not.toContain("p_window_seconds");
    expect(ROUTE).toContain("status: 429");
    expect(ROUTE).toContain("ACCOUNT_EXPORT_COPY.errorRateLimited");
    expect(ACCOUNT_EXPORT_RATE_LIMIT.limit).toBe(1);
  });

  it("scopes every read to rows the caller owns", () => {
    expect(ROUTE).toContain('.from("people")');
    expect(ROUTE).toContain('.from("relationships")');
    expect(ROUTE).toContain('.from("groups")');
    expect(ROUTE).toContain('.from("notes")');
    expect(ROUTE).toContain('.from("memorial_milestones")');
    // Four owner_id filters (people, relationships, groups, notes) plus the
    // profile row and the milestones' own user_id column.
    expect(ROUTE.match(/\.eq\("owner_id", uid\)/g)).toHaveLength(4);
    expect(ROUTE).toContain('.eq("id", uid)');
    expect(ROUTE).toContain('.eq("user_id", uid)');
    // Charts and memberships have no owner column: they are narrowed to ids
    // taken from the already-owner-filtered people and groups queries.
    expect(ROUTE).toContain('.in("person_id", personIds)');
    expect(ROUTE).toContain('.in("group_id", groupIds)');
    expect(ROUTE).toContain("const personIds = people.map");
    expect(ROUTE).toContain("const groupIds = groups.map");
  });

  it("never reads Vela conversations or the billing columns", () => {
    expect(ROUTE).not.toContain('from("threads")');
    expect(ROUTE).not.toContain('from("messages")');
    expect(ROUTE).not.toContain('from("vela');
    expect(ROUTE).not.toContain("stripe_customer_id");
    expect(ROUTE).not.toContain("subscription_status");
    expect(ROUTE).not.toContain("unsubscribe_token");
  });

  it("selects explicit columns so a widened table cannot leak a new one", () => {
    expect(ROUTE).not.toContain('select("*")');
    expect(ROUTE).toContain("EXPORT_PROFILE_FIELDS.join");
    expect([...EXPORT_PROFILE_FIELDS]).not.toContain("id");
  });

  it("returns an indented attachment named by date", () => {
    expect(ROUTE).toContain("JSON.stringify(payload, null, 2)");
    expect(ROUTE).toContain("accountExportFilename(exportedAt)");
    expect(ROUTE).toContain('"Content-Disposition": `attachment; filename=');
    expect(ROUTE).toContain('"Cache-Control": "no-store"');
  });

  it("user-facing copy carries no em dash", () => {
    expect(ROUTE).not.toContain("\u2014");
  });
});
