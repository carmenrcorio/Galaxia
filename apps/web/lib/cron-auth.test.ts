import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cronBearerMatches } from "./cron-auth";

const SECRET = "super-secret-cron-token-value";
const HEADER = `Bearer ${SECRET}`;

const REPO_ROOT = join(__dirname, "..", "..", "..");
const HELPER_PATH = "apps/web/lib/cron-auth.ts";
const CRON_ROUTES = [
  "apps/web/app/api/cron/trial-emails/route.ts",
  "apps/web/app/api/cron/nudge-compute/route.ts",
  "apps/web/app/api/cron/nudge-send/route.ts",
  "apps/web/app/api/cron/relational-transit-scan/route.ts",
  "apps/web/app/api/cron/relational-transit-push/route.ts"
] as const;

function readSrc(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("cronBearerMatches (security-critical)", () => {
  it("accepts the exact Bearer ${secret} header", () => {
    expect(cronBearerMatches(HEADER, SECRET)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(cronBearerMatches("Bearer wrong-token", SECRET)).toBe(false);
  });

  it("rejects a missing/empty header", () => {
    expect(cronBearerMatches(null, SECRET)).toBe(false);
    expect(cronBearerMatches(undefined, SECRET)).toBe(false);
    expect(cronBearerMatches("", SECRET)).toBe(false);
  });

  it("fails closed when the expected secret is empty", () => {
    expect(cronBearerMatches(HEADER, "")).toBe(false);
    expect(cronBearerMatches("Bearer ", "")).toBe(false);
    expect(cronBearerMatches("", "")).toBe(false);
  });

  it("rejects a value of different length (no prefix or suffix match)", () => {
    expect(cronBearerMatches(HEADER + "x", SECRET)).toBe(false);
    expect(cronBearerMatches(HEADER.slice(0, -1), SECRET)).toBe(false);
    expect(cronBearerMatches(SECRET, SECRET)).toBe(false);
  });

  it("is case-sensitive on both the scheme and the token", () => {
    expect(cronBearerMatches(HEADER.toUpperCase(), SECRET)).toBe(false);
    expect(cronBearerMatches(`bearer ${SECRET}`, SECRET)).toBe(false);
  });

  it("does not authorize a header that merely contains the secret", () => {
    expect(cronBearerMatches(`Bearer ${SECRET} extra`, SECRET)).toBe(false);
    expect(cronBearerMatches(`Token ${SECRET}`, SECRET)).toBe(false);
  });
});

describe("cronBearerMatches — implementation is timingSafeEqual, no length early-return", () => {
  const src = readSrc(HELPER_PATH);

  it("compares with node:crypto timingSafeEqual on equal-length buffers", () => {
    expect(src).toMatch(/from\s+"node:crypto"/);
    expect(src).toContain("timingSafeEqual");
    expect(src).toContain("Buffer.alloc(expected.length)");
  });

  it("does not early-return on a length mismatch (that reintroduces the timing signal)", () => {
    expect(src).not.toMatch(/if\s*\([^)]*length[^)]*\)\s*\{?\s*return/);
    expect(src).toContain("bytesEqual & lengthEqual");
  });

  it("never logs the supplied header or secret", () => {
    expect(src).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });
});

describe("all five cron routes share cronBearerMatches and return a body-less 401", () => {
  it.each([...CRON_ROUTES])("%s", (routePath) => {
    const src = readSrc(routePath);
    expect(src).toContain("cronBearerMatches");
    expect(src).toMatch(/from\s+"\.\.\/\.\.\/\.\.\/\.\.\/lib\/cron-auth"/);
    expect(src).not.toMatch(/auth\s*!==\s*`Bearer \$\{secret\}`/);
    expect(src).toMatch(/new NextResponse\(null,\s*\{\s*status:\s*401\s*\}\)/);
    expect(src).not.toContain('error: "Unauthorized."');
    expect(src).not.toMatch(/console\.(log|info|warn|error|debug)\([^)]*(auth|authorization|secret|token)/i);
  });
});
