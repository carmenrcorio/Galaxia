import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("weekly constellation letter consent + unsubscribe", () => {
  const migration = read("supabase/migrations/20260914240000_weekly_constellation_letter.sql");
  const settings = read("apps/web/app/app/settings/page.tsx");
  const unsub = read("apps/web/app/api/constellation-letter/unsubscribe/route.ts");
  const nudgeUnsub = read("apps/web/app/api/nudge-email/unsubscribe/route.ts");

  it("defaults the letter on, independently of the daily sky email", () => {
    expect(migration).toMatch(/weekly_constellation_letter_enabled boolean not null default true/);
    expect(migration).toContain("weekly_constellation_letter_enabled");
    expect(migration).toMatch(/grant (insert|update) \([\s\S]*weekly_constellation_letter_enabled/);
  });

  it("never grants unsubscribe_token to authenticated", () => {
    for (const grantLine of migration.match(/^grant (insert|update) \([^)]*\).*$/gm) ?? []) {
      expect(grantLine).not.toContain("unsubscribe_token");
    }
  });

  it("Settings writes only the letter column on its own toggle", () => {
    expect(settings).toMatch(/\.select\("[^"]*weekly_constellation_letter_enabled[^"]*"\)/);
    expect(settings).toMatch(
      /supabase\.from\("profiles"\)\.update\(\{\s*weekly_constellation_letter_enabled:\s*next\s*\}\)\.eq\("id",\s*userId\)/
    );
    expect(settings).toMatch(/weekly_constellation_letter_enabled\s*!==\s*false/);
  });

  it("letter unsubscribe flips only the letter column, and the nudge route still only flips the daily column", () => {
    expect(unsub).toMatch(/\.update\(\{\s*weekly_constellation_letter_enabled:\s*false\s*\}\)/);
    expect(unsub).toMatch(/\.eq\("unsubscribe_token",\s*token\)/);
    expect(unsub).not.toContain("daily_nudge_emails_enabled");
    expect(unsub).not.toContain("CRON_SECRET");
    expect(nudgeUnsub).toMatch(/\.update\(\{\s*daily_nudge_emails_enabled:\s*false\s*\}\)/);
    expect(nudgeUnsub).not.toContain("weekly_constellation_letter_enabled");
  });

  it("GET is a page, POST is a blank RFC 8058 ack", () => {
    expect(unsub).toMatch(/export async function GET[\s\S]*?new NextResponse\(CONFIRMATION_HTML,\s*\{\s*status:\s*200/);
    const postBody = unsub.slice(unsub.indexOf("export async function POST"));
    expect(postBody).toMatch(/new NextResponse\(null,\s*\{\s*status:\s*200\s*\}\)/);
    expect(postBody).not.toContain("NextResponse.redirect(");
  });
});

describe("constellation letter measurement", () => {
  const migration = read("supabase/migrations/20260914240000_weekly_constellation_letter.sql");
  const open = read("apps/web/app/api/constellation-letter/open/route.ts");
  const go = read("apps/web/app/api/constellation-letter/go/route.ts");
  const webhook = read("apps/web/app/api/webhooks/resend/route.ts");

  it("ledger has sent, open, and click columns", () => {
    expect(migration).toContain("sent_at timestamptz not null default now()");
    expect(migration).toContain("opened_at timestamptz");
    expect(migration).toContain("clicked_at timestamptz");
    expect(migration).toContain("open_count integer not null default 0");
    expect(migration).toContain("click_count integer not null default 0");
    expect(migration).toContain("resend_id text");
    expect(migration).toContain("primary key (owner_id, week_of)".replace("primary key ", "unique "));
  });

  it("open pixel and click wrapper record counts without requiring a session", () => {
    expect(open).not.toContain("CRON_SECRET");
    expect(open).not.toMatch(/auth\.getUser\(/);
    expect(open).toContain("opened_at");
    expect(open).toContain("open_count");
    expect(go).toContain("clicked_at");
    expect(go).toContain("click_count");
    expect(go).toContain("THIS_WEEK_HREF");
  });

  it("Resend webhook fails closed and only updates constellation_letters", () => {
    expect(webhook).toContain('missingEnvMessage("RESEND_WEBHOOK_SECRET")');
    expect(webhook).toContain("verifyResendWebhookSignature");
    expect(webhook).toContain("email.opened");
    expect(webhook).toContain("email.clicked");
    expect(webhook).toContain('.from("constellation_letters")');
  });
});
