import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for /admin/analytics and the adoption metrics view.
 * The page imports env.server / createClient and is not imported directly
 * (vitest.config.ts scopes discovery to lib/** and components/**).
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const PAGE_PATH = "apps/web/app/admin/analytics/page.tsx";
const LAYOUT_PATH = "apps/web/app/admin/layout.tsx";
const MIGRATION_PATH = "supabase/migrations/20260915021648_admin_adoption_metrics.sql";
const READER_PATH = "apps/web/lib/admin/adoption-metrics.ts";

function readFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("/admin/analytics page — no guard call of its own (the /admin layout owns it)", () => {
  const src = readFile(PAGE_PATH);

  it("never imports require-admin.ts", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
  });

  it("does not add an owner-email special case (admin_users is the gate)", () => {
    expect(src).not.toContain("NEXT_PUBLIC_ADMIN_EMAIL");
    expect(src).not.toContain("help@galaxiamea.com");
    expect(src).not.toMatch(/user\.email/);
  });
});

describe("/admin/analytics page — service-role view read, no cache", () => {
  const src = readFile(PAGE_PATH);

  it("is force-dynamic with revalidate 0", () => {
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain("export const revalidate = 0");
  });

  it("constructs a service-role client the same way /admin/support does", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });

  it("reads through readAdminAdoptionMetrics, not a browser supabase client", () => {
    expect(src).toContain("readAdminAdoptionMetrics(serviceRoleClient)");
    expect(src).not.toMatch(/createSupabaseBrowserClient|createBrowserClient/);
  });
});

describe("/admin layout — Adoption nav link", () => {
  it("links to /admin/analytics from the existing admin nav", () => {
    const src = readFile(LAYOUT_PATH);
    expect(src).toContain('href="/admin/analytics"');
    expect(src).toContain("Adoption");
  });
});

describe("admin_adoption_metrics migration — service role only", () => {
  const sql = readFile(MIGRATION_PATH);

  it("creates the public.admin_adoption_metrics view", () => {
    expect(sql).toMatch(/create or replace view public\.admin_adoption_metrics as/i);
  });

  it("revokes the view from public, anon, and authenticated, then grants select to service_role", () => {
    expect(sql).toMatch(
      /revoke all on table public\.admin_adoption_metrics from public, anon, authenticated;/i
    );
    expect(sql).toMatch(/grant select on table public\.admin_adoption_metrics to service_role;/i);
    expect(sql).not.toMatch(/grant\s+select[\s\S]*to\s+(anon|authenticated)/i);
  });

  it("does not enable RLS on the view (Postgres cannot) and does not grant to client roles", () => {
    expect(sql).not.toMatch(/enable row level security/i);
    expect(sql).not.toMatch(/create policy/i);
  });

  it("counts auth.users, people, threads, messages, comparison_history, groups, notes moments, connect invites, and blog captures", () => {
    expect(sql).toContain("from auth.users");
    expect(sql).toContain("from public.people");
    expect(sql).toContain("from public.threads");
    expect(sql).toContain("from public.messages");
    expect(sql).toContain("from public.comparison_history");
    expect(sql).toContain("from public.groups");
    expect(sql).toContain("from public.group_members");
    expect(sql).toContain("kind = 'moment'");
    expect(sql).toContain("kind = 'constellation_connect'");
    expect(sql).toContain("from public.connection_grants");
    expect(sql).toContain("from public.blog_email_captures");
  });
});

describe("readAdminAdoptionMetrics — service-role view only", () => {
  const src = readFile(READER_PATH);

  it("queries admin_adoption_metrics and never a user-session client constructor", () => {
    expect(src).toContain('.from("admin_adoption_metrics")');
    expect(src).not.toContain("createClient");
    expect(src).not.toContain("privateEnv");
  });
});
