import { readdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Grant-path lock: `profiles.subscription_status` is never written by client
 * code. The RevenueCat webhook is the only production writer. Complements
 * `packages/core/test/rc-entitlement-id.test.ts` (literal entitlement id).
 */
const REPO_ROOT = join(__dirname, "..", "..", "..");

const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "coverage", ".git"]);
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const WEBHOOK_ROUTE = "apps/web/app/api/webhooks/revenuecat/route.ts";
const LATEST_PROFILES_GRANT = "supabase/migrations/20260909030000_relational_transits.sql";

function isTestPath(rel: string): boolean {
  const base = rel.split("/").pop() ?? rel;
  return base.includes(".test.") || base.includes(".spec.") || rel.includes("/__tests__/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(abs, out);
      continue;
    }
    if (!EXTENSIONS.has(extname(entry.name))) continue;
    out.push(relative(REPO_ROOT, abs).split("\\").join("/"));
  }
  return out;
}

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("profiles.subscription_status grant path stays closed", () => {
  it("authenticated column grants still omit subscription_status", () => {
    const src = read(LATEST_PROFILES_GRANT);
    const grants = src.match(/^grant (insert|update) \([^)]+\)/gm) ?? [];
    expect(grants.length).toBeGreaterThanOrEqual(2);
    for (const line of grants) {
      expect(line).not.toContain("subscription_status");
      expect(line).not.toContain("comped");
      expect(line).not.toContain("plan");
      expect(line).not.toContain("current_period_end");
      expect(line).not.toContain("cancel_at_period_end");
      expect(line).not.toContain("trial_ends_at");
    }
  });

  it("the webhook route is the only production .update/.upsert that writes subscription_status", () => {
    const hits: string[] = [];
    const writeRe = /\.(update|upsert)\(\s*\{[^}]*subscription_status\s*:/;
    for (const root of ["apps/web", "apps/mobile", "packages", "supabase/functions"]) {
      for (const rel of walk(join(REPO_ROOT, root))) {
        if (isTestPath(rel)) continue;
        if (writeRe.test(read(rel))) hits.push(rel);
      }
    }
    expect(hits).toEqual([WEBHOOK_ROUTE]);
  });

  it("the paywall only reads subscription_status and never writes it", () => {
    const src = read("apps/web/components/paywall.tsx");
    expect(src).toContain('.select("subscription_status")');
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/subscription_status\s*:/);
  });

  it("the paywall imports RC_ENTITLEMENT_ID from @galaxia/core, not a local literal", () => {
    const src = read("apps/web/components/paywall.tsx");
    expect(src).toMatch(/import\s*\{[^}]*RC_ENTITLEMENT_ID[^}]*\}\s*from\s*"@galaxia\/core"/);
    expect(src).toContain("customerInfo.entitlements.active[RC_ENTITLEMENT_ID]");
  });

  it("mobile entitlement provider only reads profiles billing columns", () => {
    const src = read("apps/mobile/src/providers/entitlement-provider.tsx");
    expect(src).toContain('.select("subscription_status, trial_ends_at, comped")');
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/subscription_status\s*:/);
  });
});

describe("POST /api/webhooks/revenuecat fails closed on auth (PR #63)", () => {
  const src = read(WEBHOOK_ROUTE);

  it("refuses to process when REVENUECAT_WEBHOOK_AUTH is unset (503)", () => {
    expect(src).toContain('missingEnvMessage("REVENUECAT_WEBHOOK_AUTH")');
    expect(src).toMatch(/status:\s*503/);
    const unsetIdx = src.indexOf("if (!expected)");
    const verifyIdx = src.indexOf("if (!verifyWebhookAuth");
    expect(unsetIdx).toBeGreaterThan(-1);
    expect(verifyIdx).toBeGreaterThan(unsetIdx);
  });

  it("rejects missing/forged Authorization with 401 before any profile write", () => {
    expect(src).toContain("verifyWebhookAuth(req.headers.get(\"authorization\"), expected)");
    expect(src).toContain('{ error: "Unauthorized." }');
    expect(src).toMatch(/status:\s*401/);
    const authIdx = src.indexOf("if (!verifyWebhookAuth");
    const updateIdx = src.indexOf(".update({");
    expect(authIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(authIdx);
  });

  it("maps by event.type via mapRevenueCatEvent and never writes comped", () => {
    expect(src).toContain("mapRevenueCatEvent(event)");
    expect(src).not.toMatch(/comped\s*:/);
    expect(src).toContain("subscription_status: update.subscription_status");
  });
});
