import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the no-login unsubscribe route
 * (apps/web/app/api/nudge-email/unsubscribe/route.ts) — the legal-critical
 * piece of nudge delivery Phase B2. Reads source directly for the same
 * server-only-import reason as the cron route wiring tests.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/nudge-email/unsubscribe/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("unsubscribe route — requires no session, no CRON_SECRET (a lapsed user has neither)", () => {
  const src = readRoute();

  it("never checks CRON_SECRET or an Authorization bearer header", () => {
    expect(src).not.toContain("CRON_SECRET");
    expect(src).not.toContain('req.headers.get("authorization")');
  });

  it("never calls supabase.auth.getUser/getSession — this route is unauthenticated by design", () => {
    expect(src).not.toMatch(/auth\.getUser\(/);
    expect(src).not.toMatch(/auth\.getSession\(/);
  });

  it("uses the service-role client, same shape as the cron routes", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });
});

describe("unsubscribe route — token-based, scoped by the unique column, never a raw user id", () => {
  const src = readRoute();

  it("reads the token from a query param, not a path segment that could be guessed sequentially", () => {
    expect(src).toContain('searchParams.get("token")');
  });

  it("updates profiles filtered by unsubscribe_token, never by id/email directly", () => {
    expect(src).toMatch(/\.update\(\{\s*daily_nudge_emails_enabled:\s*false\s*\}\)/);
    expect(src).toMatch(/\.eq\("unsubscribe_token",\s*token\)/);
    expect(src).not.toMatch(/\.eq\("id",\s*token\)/);
  });

  it("only ever flips the consent column false — never any other profiles column", () => {
    const updateCalls = [...src.matchAll(/\.update\(\{([^}]*)\}\)/g)].map((m) => m[1].trim());
    for (const call of updateCalls) {
      expect(call).toBe("daily_nudge_emails_enabled: false");
    }
  });
});

describe("unsubscribe route — GET shows a page, POST is a blank one-click ack (RFC 8058)", () => {
  const src = readRoute();

  it("both GET and POST call the same unsubscribe helper", () => {
    expect(src).toMatch(/export async function GET\([\s\S]{0,200}unsubscribeByToken\(/);
    expect(src).toMatch(/export async function POST\([\s\S]{0,200}unsubscribeByToken\(/);
  });

  it("GET responds with an HTML confirmation page, status 200", () => {
    expect(src).toMatch(/export async function GET[\s\S]*?new NextResponse\(CONFIRMATION_HTML,\s*\{\s*status:\s*200/);
    expect(src).toContain('"Content-Type": "text/html; charset=utf-8"');
  });

  it("POST returns a blank body (null) with no redirect — no Location header, no HTML", () => {
    const postBody = src.slice(src.indexOf("export async function POST"));
    expect(postBody).toMatch(/new NextResponse\(null,\s*\{\s*status:\s*200\s*\}\)/);
    expect(postBody).not.toContain("NextResponse.redirect(");
    expect(postBody).not.toContain("Location");
    expect(postBody).not.toContain("CONFIRMATION_HTML");
  });
});

describe("unsubscribe route — idempotent and never leaks token validity", () => {
  const src = readRoute();

  it("does nothing (no throw, no distinguishable response) when the token is missing/falsy", () => {
    expect(src).toMatch(/if\s*\(\s*!token[\s\S]{0,100}return;/);
  });

  it("GET always returns the same confirmation regardless of whether the token resolved", () => {
    const getBody = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST"));
    // Exactly one branch to a different response inside GET would indicate a
    // valid/invalid distinction — there must be none.
    expect(getBody.match(/return new NextResponse\(/g)?.length).toBe(1);
  });
});
