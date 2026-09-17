import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("blog chart-reading capture route wiring", () => {
  const route = read("apps/web/app/api/blog/chart-reading-capture/route.ts");
  const unsub = read("apps/web/app/api/blog/chart-reading-unsubscribe/route.ts");
  const reading = read("apps/web/lib/chart-reading.ts");
  const migration = read("supabase/migrations/20260915013407_blog_email_captures.sql");

  it("validates email, rate-limits from blog_email_captures, and sends via dispatchEmail", () => {
    expect(route).toContain("isValidCaptureEmail");
    expect(route).toContain("CAPTURE_RATE_LIMIT");
    expect(route).toContain('.from("blog_email_captures")');
    expect(route).toContain("dispatchEmail");
    expect(route).toContain("addToBlogChartReadingsAudience");
    expect(route).toContain("loadAutomationCopy");
    expect(route).toContain("recordEmailSend");
    expect(route).toContain("emailOpenPixelUrl");
    expect(route).toContain("chart.reading");
    expect(route).toContain("has_birth_data");
  });

  it("computes personalized readings through the date-only path and never geocodes the city", () => {
    expect(reading).toContain('precision: "date"');
    expect(reading).toContain("buildBirthInput");
    expect(reading).toContain("interpretPlacement");
    expect(reading).not.toContain("searchPlaces");
    expect(reading).toContain("FALLBACK_PUBLISHED_BIRTH");
    expect(reading).toContain("1987-12-30T04:30:00.000Z");
  });

  it("creates the capture table with RLS and no client policies", () => {
    expect(migration).toContain("create table if not exists blog_email_captures");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("No client policies");
    expect(migration).toContain("revoke all on table public.blog_email_captures from anon, authenticated");
    expect(migration).not.toContain("create policy");
  });

  it("unsubscribe verifies the HMAC token and marks the Resend contact unsubscribed", () => {
    expect(unsub).toContain("emailFromChartReadingUnsubscribeToken");
    expect(unsub).toContain("unsubscribeBlogChartReading");
    expect(unsub).toContain("unsubscribed_at");
    expect(unsub).toContain("CHART_READING_UNSUBSCRIBED");
  });
});
