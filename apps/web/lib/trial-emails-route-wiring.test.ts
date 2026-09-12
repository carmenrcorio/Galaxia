import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the trial-email cron
 * (apps/web/app/api/cron/trial-emails/route.ts). Same server-only-import
 * reason as nudge-compute-route-wiring.test.ts for reading source instead
 * of importing the route module directly.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/trial-emails/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("trial-emails route — fails closed like every other cron route", () => {
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

describe("trial-emails route — returns a JSON summary with real numeric counts, never a bare 200", () => {
  const src = readRoute();

  it("returns the summary through cronSummaryResponse so a lost row fails closed", () => {
    expect(src).toMatch(/from\s*"\.\.\/\.\.\/\.\.\/\.\.\/lib\/cron-summary"/);
    expect(src).toContain("cronSummaryResponse({");
    expect(src).toMatch(/evaluated:\s*walk\.evaluated/);
    expect(src).toMatch(/pages:\s*walk\.pages/);
    expect(src).toMatch(/truncated:\s*walk\.truncated/);
    expect(src).toMatch(/return NextResponse\.json\(body,\s*\{\s*status\s*\}\)/);
  });

  it("paginates trialing profiles with an id cursor instead of a silent .limit(1000)", () => {
    expect(src).toMatch(/export const maxDuration\s*=\s*800/);
    expect(src).toContain("walkCronPages");
    expect(src).toMatch(/\.gt\("id",\s*lastId\)/);
    expect(src).not.toMatch(/\.limit\(1000\)/);
  });

  it("claims the trial_emails ledger row BEFORE sendEmail, and leaves it on send failure", () => {
    const sendIdx = src.indexOf("sendEmail(");
    const insertIdx = src.indexOf('.from("trial_emails").insert');
    expect(sendIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeLessThan(sendIdx);
    expect(src).not.toMatch(/\.from\("trial_emails"\)[\s\S]{0,120}\.delete\(/);
  });

  it("sent is a numeric counter (never a sparse per-kind object that can look empty on a real send)", () => {
    expect(src).toMatch(/let sent = 0;/);
    expect(src).toMatch(/sent \+= 1;/);
  });

  it("skipped is a real per-reason breakdown with every exit zeroed, including send misses", () => {
    expect(src).toContain("emptyTrialEmailSkipped");
    expect(src).toMatch(/skipped\.trialAlreadyEnded \+= 1/);
    expect(src).toMatch(/skipped\.notDue \+= 1/);
    expect(src).toMatch(/skipped\.alreadySent \+= 1/);
    expect(src).toMatch(/skipped\.noEmail \+= 1/);
    expect(src).toMatch(/skipped\.noResendKey \+= 1/);
    expect(src).toMatch(/skipped\.sendFailed \+= 1/);
  });

  it("uses pickTrialEmailKind / trialEmailAlreadyKeys / trialAlreadyEnded from the pure lib, not a re-derived chain", () => {
    expect(src).toContain("pickTrialEmailKind");
    expect(src).toContain("trialEmailAlreadyKeys");
    expect(src).toContain("trialAlreadyEnded");
  });

  it("skips trialAlreadyEnded before the kind picker", () => {
    const endedIdx = src.indexOf("trialAlreadyEnded(");
    const pickIdx = src.indexOf("pickTrialEmailKind(");
    expect(endedIdx).toBeGreaterThan(-1);
    expect(pickIdx).toBeGreaterThan(-1);
    expect(endedIdx).toBeLessThan(pickIdx);
  });
});
