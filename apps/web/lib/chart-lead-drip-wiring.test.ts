import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const route = read("apps/web/app/api/cron/chart-lead-drip/route.ts");
const unsubscribe = read("apps/web/app/api/chart-lead/unsubscribe/route.ts");
const workflow = read(".github/workflows/chart-lead-drip.yml");
const migration = read("supabase/migrations/20260926235914_chart_lead_drip_conversion.sql");

describe("chart lead drip cron wiring", () => {
  it("fails closed behind the shared CRON_SECRET bearer pattern", () => {
    expect(route).toContain("const secret = process.env.CRON_SECRET;");
    expect(route).toContain("cronBearerMatches");
    expect(route).toMatch(/!secret[\s\S]{0,180}status:\s*503/);
    expect(route).toMatch(/!cronBearerMatches[\s\S]{0,180}status:\s*401/);
  });

  it("reconciles auth conversions before selecting subscribed, unconverted leads", () => {
    const reconcileIndex = route.indexOf('"mark_chart_lead_conversions"');
    const selectIndex = route.indexOf('.from("chart_leads")');
    expect(reconcileIndex).toBeGreaterThan(-1);
    expect(reconcileIndex).toBeLessThan(selectIndex);
    expect(route).toContain('.eq("subscribed", true)');
    expect(route).toContain('.is("converted_at", null)');
    expect(route).toContain('.lt("drip_step", 3)');
  });

  it("recomputes stored inputs with the current engine and advances only after an accepted send", () => {
    const computeIndex = route.indexOf("computeNatalChart(");
    const sendIndex = route.indexOf("dispatchEmail(");
    const updateIndex = route.indexOf(".update({ drip_step:");
    expect(route).toContain("parseChartLeadBirthInput(lead.chart_data)");
    expect(computeIndex).toBeGreaterThan(-1);
    expect(computeIndex).toBeLessThan(sendIndex);
    expect(sendIndex).toBeLessThan(updateIndex);
    expect(route).toContain("chartLeadEmailHeaders(unsubscribeUrl)");
    expect(route).toContain("idempotencyKey: `chart-lead/${lead.id}/${step}`");
  });

  it("returns fully accounted numeric cron results", () => {
    expect(route).toContain("walkCronPages");
    expect(route).toContain("cronSummaryResponse({");
    expect(route).toContain("evaluated: walk.evaluated");
    expect(route).toContain("sent,");
    for (const reason of ["notDue", "noResendKey", "invalidChartData", "sendFailed"]) {
      expect(route).toContain(`skipped.${reason} += 1`);
    }
  });
});

describe("chart lead unsubscribe wiring", () => {
  it("uses a unique opaque token and service-role-only table posture", () => {
    expect(migration).toContain("add column unsubscribe_token uuid not null default gen_random_uuid()");
    expect(migration).toContain("create unique index chart_leads_unsubscribe_token_idx");
    expect(unsubscribe).toContain('privateEnv.serviceRole');
    expect(unsubscribe).toContain('.eq("unsubscribe_token", token)');
    expect(unsubscribe).toContain(".update({ subscribed: false })");
  });

  it("supports human GET and RFC 8058 POST without requiring a session", () => {
    expect(unsubscribe).toContain("export async function GET");
    expect(unsubscribe).toContain("export async function POST");
    expect(unsubscribe).not.toContain("getUser");
    expect(unsubscribe).not.toContain("CRON_SECRET");
  });
});

describe("chart lead conversion migration", () => {
  it("marks matching auth emails through both signup trigger and daily reconciliation", () => {
    expect(migration).toContain("lower(account.email) = lead.email");
    expect(migration).toContain("after insert or update of email on auth.users");
    expect(migration).toContain("where email = lower(new.email)");
    expect(migration).toContain("set converted_at = coalesce(converted_at, now())");
    expect(migration).toContain("grant execute on function public.mark_chart_lead_conversions() to service_role");
  });
});

describe("chart lead GitHub Actions schedule", () => {
  it("runs daily off-peak and posts with the shared secrets", () => {
    expect(workflow).toContain('cron: "26 6 * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("secrets.GALAXIA_APP_URL");
    expect(workflow).toContain("secrets.CRON_SECRET");
    expect(workflow).toContain("POST /api/cron/chart-lead-drip");
    expect(workflow).toContain('-X POST "${{ secrets.GALAXIA_APP_URL }}/api/cron/chart-lead-drip"');
  });
});
