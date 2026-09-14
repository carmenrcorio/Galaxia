import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/constellation-letter/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("constellation-letter cron — fails closed like every other cron route", () => {
  const src = readRoute();

  it("503s when CRON_SECRET is unset, 401s on a wrong/missing bearer header", () => {
    expect(src).toContain("const secret = process.env.CRON_SECRET;");
    expect(src).toMatch(/if\s*\(\s*!secret\s*\)\s*\{[\s\S]{0,200}status:\s*503/);
    expect(src).toContain("cronBearerMatches");
    expect(src).toMatch(/new NextResponse\(null,\s*\{\s*status:\s*401\s*\}\)/);
  });

  it("uses a service-role client with persistSession: false and is not edge", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });
});

describe("constellation-letter cron — consent, Sunday, compose, ledger", () => {
  const src = readRoute();

  it("filters the independent weekly preference, never daily_nudge_emails_enabled", () => {
    expect(src).toContain('.eq("weekly_constellation_letter_enabled", true)');
    expect(src).not.toContain('.eq("daily_nudge_emails_enabled"');
    expect(src).not.toMatch(/\.select\("[^"]*relational_transit_alerts/);
    expect(src).not.toMatch(/\.eq\("relational_transit_alerts"/);
  });

  it("checks local Sunday before scanning, and skips a quiet week instead of sending filler", () => {
    const dueIdx = src.indexOf("isDueForConstellationLetter(");
    const scanIdx = src.indexOf("scanRelationalTransitsForWeek(");
    const composeIdx = src.indexOf("composeConstellationLetter(");
    const quietIdx = src.indexOf("skipped.quietWeek");
    expect(dueIdx).toBeGreaterThan(-1);
    expect(scanIdx).toBeGreaterThan(dueIdx);
    expect(composeIdx).toBeGreaterThan(scanIdx);
    expect(quietIdx).toBeGreaterThan(composeIdx);
  });

  it("claims the (owner_id, week_of) ledger before sendEmail/dispatchEmail", () => {
    const claimIdx = src.indexOf('.from("constellation_letters")');
    const sendIdx = src.indexOf("dispatchEmail(");
    expect(claimIdx).toBeGreaterThan(-1);
    expect(sendIdx).toBeGreaterThan(claimIdx);
    expect(src).toContain('ignoreDuplicates: true');
    expect(src).toContain("onConflict: \"owner_id,week_of\"");
  });

  it("returns the summary through cronSummaryResponse", () => {
    expect(src).toContain("cronSummaryResponse({");
    expect(src).toMatch(/evaluated:\s*walk\.evaluated/);
    expect(src).toMatch(/pages:\s*walk\.pages/);
    expect(src).toMatch(/truncated:\s*walk\.truncated/);
  });

  it("paginates with an id cursor and never silently .limit(1000)", () => {
    expect(src).toContain("walkCronPages");
    expect(src).toMatch(/\.gt\("id",\s*lastId\)/);
    expect(src).not.toMatch(/\.limit\(1000\)/);
  });
});

describe("constellation-letter cron — no vercel.json and no hasAccess rewrite", () => {
  const src = readRoute();
  const workflow = readFileSync(join(REPO_ROOT, ".github/workflows/relational-transits.yml"), "utf8");

  it("is scheduled from the existing relational-transits workflow, not a new scheduler", () => {
    expect(workflow).toContain("/api/cron/constellation-letter");
    expect(workflow).toContain("needs: scan");
    expect(src).toContain(".github/workflows/relational-transits.yml");
  });

  it("never imports hasAccess", () => {
    expect(src).not.toContain("hasAccess");
  });
});
