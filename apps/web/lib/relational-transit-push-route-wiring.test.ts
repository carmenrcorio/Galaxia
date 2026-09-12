import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the relational-transit push-send cron
 * (apps/web/app/api/cron/relational-transit-push/route.ts). Same
 * server-only-import reason as nudge-compute-route-wiring.test.ts for
 * reading source instead of importing the route module directly.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/relational-transit-push/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("relational-transit-push route — fails closed like every other cron route", () => {
  const src = readRoute();

  it("503s when CRON_SECRET is unset, 401s on a wrong/missing bearer header", () => {
    expect(src).toContain("const secret = process.env.CRON_SECRET;");
    expect(src).toMatch(/if\s*\(\s*!secret\s*\)\s*\{[\s\S]{0,200}status:\s*503/);
    expect(src).toContain('req.headers.get("authorization")');
    expect(src).toMatch(/auth !== `Bearer \$\{secret\}`[\s\S]{0,200}status:\s*401/);
  });

  it("uses a service-role client with persistSession: false", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });

  it("is a Node-runtime route (no `export const runtime = \"edge\"`)", () => {
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });
});

describe("relational-transit-push route — returns a JSON summary with real numeric counts, never a bare 200", () => {
  const src = readRoute();

  it("initializes pushed as a numeric counter", () => {
    expect(src).toMatch(/let\s+pushed\s*=\s*0\s*;/);
  });

  it("returns the summary through cronSummaryResponse so a lost row fails closed", () => {
    expect(src).toMatch(/from\s*"\.\.\/\.\.\/\.\.\/\.\.\/lib\/cron-summary"/);
    expect(src).toContain("cronSummaryResponse({");
    expect(src).toMatch(/evaluated:\s*walk\.evaluated/);
    expect(src).toMatch(/sent:\s*pushed/);
    expect(src).toMatch(/pages:\s*walk\.pages/);
    expect(src).toMatch(/truncated:\s*walk\.truncated/);
    expect(src).toMatch(/return NextResponse\.json\(body,\s*\{\s*status\s*\}\)/);
  });

  it("paginates events with an id cursor instead of a silent .limit(500)", () => {
    expect(src).toMatch(/export const maxDuration\s*=\s*800/);
    expect(src).toContain("walkCronPages");
    expect(src).toMatch(/\.gt\("id",\s*lastId\)/);
    expect(src).not.toMatch(/\.limit\(500\)/);
  });

  it("checks response.ok before marking push_sent_at, and does not mark on Expo HTTP failure", () => {
    expect(src).toMatch(/if\s*\(\s*!response\.ok\s*\)/);
    expect(src).toMatch(/skipped\.pushFailed \+= 1/);
    const okIdx = src.indexOf("!response.ok");
    const markIdx = src.lastIndexOf('update({ push_sent_at:');
    expect(okIdx).toBeGreaterThan(-1);
    expect(markIdx).toBeGreaterThan(okIdx);
  });

  it("skipped is a real per-event breakdown (noTokens/preferenceOff/majorOnlyFiltered/pushFailed), not a placeholder", () => {
    expect(src).toMatch(/const skipped = \{ noTokens: 0, preferenceOff: 0, majorOnlyFiltered: 0, pushFailed: 0 \};/);
    expect(src).toMatch(/skipped\.pushFailed \+= 1/);
  });
});
