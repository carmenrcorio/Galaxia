import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openRateLabel } from "./emails";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("/admin/emails catalog — layout gate, nav, open counts", () => {
  const src = read("apps/web/app/admin/emails/page.tsx");
  const layout = read("apps/web/app/admin/layout.tsx");

  it("never imports require-admin.ts (the layout owns the gate)", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
  });

  it("lists automations, sign-in mail, and campaigns with opened counts", () => {
    expect(src).toContain("listTemplatesForAdmin(serviceRoleClient)");
    expect(src).toContain("listCampaignsForAdmin(serviceRoleClient)");
    expect(src).toContain("countEmailSends");
    expect(src).toContain("openRateLabel");
    expect(src).toContain("<th>Opened</th>");
    expect(src).toContain("tracking pixel");
  });

  it("links each automation row to /admin/emails/{kind}", () => {
    expect(src).toContain("`/admin/emails/${row.kind}`");
    expect(src).toContain("`/admin/emails/campaigns/${row.id}`");
  });

  it("adds Emails to the existing admin nav", () => {
    expect(layout).toContain('href="/admin/emails"');
    expect(layout).toContain("Emails");
  });
});

describe("/admin/emails/[kind] editor — layout gate, no requireAdmin", () => {
  const src = read("apps/web/app/admin/emails/[kind]/page.tsx");

  it("never imports require-admin.ts", () => {
    expect(src).not.toMatch(/from\s+["'][./]*lib\/require-admin["']/);
  });

  it("renders EmailEditorForm and the recent-open table", () => {
    expect(src).toContain("<EmailEditorForm");
    expect(src).toContain("listRecentEmailSends");
    expect(src).toContain("<th>Opened</th>");
  });
});

describe("admin email API routes — requireAdminApi independent of the layout", () => {
  it("PATCH /api/admin/emails/[kind] calls requireAdminApi before writing", () => {
    const src = read("apps/web/app/api/admin/emails/[kind]/route.ts");
    expect(src).toContain("requireAdminApi");
    expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
    const guardIdx = src.indexOf("instanceof NextResponse");
    const writeIdx = src.indexOf("updateEmailTemplate(");
    expect(writeIdx).toBeGreaterThan(guardIdx);
    expect(src).toContain('action: "update_email_template"');
    expect(src).toContain("actorId: guard.user.id");
  });

  it("POST /api/admin/emails/[kind]/test and campaign send call requireAdminApi", () => {
    const testSrc = read("apps/web/app/api/admin/emails/[kind]/test/route.ts");
    const sendSrc = read("apps/web/app/api/admin/campaigns/[id]/send/route.ts");
    for (const src of [testSrc, sendSrc]) {
      expect(src).toContain("requireAdminApi");
      expect(src).toMatch(/if\s*\(\s*guard\s+instanceof\s+NextResponse\s*\)\s*return\s+guard;/);
      expect(src).toContain("recordEmailSend");
      expect(src).toContain("emailOpenPixelUrl");
    }
  });
});

describe("open pixel and campaign unsubscribe — no session", () => {
  const open = read("apps/web/app/api/email/open/route.ts");
  const unsub = read("apps/web/app/api/campaign-email/unsubscribe/route.ts");

  it("always returns a GIF and never distinguishes a missing send", () => {
    expect(open).toContain("image/gif");
    expect(open).toContain("recordEmailOpenByTrackingId");
    expect(open).not.toContain("CRON_SECRET");
    expect(open).not.toMatch(/auth\.getUser\(/);
    expect(open).toContain("pixelResponse()");
  });

  it("campaign unsubscribe flips only campaign_emails_opted_out", () => {
    expect(unsub).toMatch(/\.update\(\{\s*campaign_emails_opted_out:\s*true\s*\}\)/);
    expect(unsub).not.toContain("trial_emails_opted_out");
    expect(unsub).not.toContain("daily_nudge_emails_enabled");
    expect(unsub).not.toContain("weekly_constellation_letter_enabled");
    expect(unsub).toMatch(/export async function POST[\s\S]*new NextResponse\(null,\s*\{\s*status:\s*200/);
  });
});

describe("openRateLabel", () => {
  it("names a floor, not a percentage of zero", () => {
    expect(openRateLabel(0, 0)).toBe("none yet");
    expect(openRateLabel(10, 3)).toBe("3 of 10 (30%)");
  });
});
