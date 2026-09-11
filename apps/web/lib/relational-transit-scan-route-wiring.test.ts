import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the relational-transit scan cron
 * (apps/web/app/api/cron/relational-transit-scan/route.ts). Same
 * server-only-import reason as nudge-compute-route-wiring.test.ts for
 * reading source instead of importing the route module directly.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/relational-transit-scan/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("relational-transit-scan route — fails closed like every other cron route", () => {
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

describe("relational-transit-scan route — returns a JSON summary with real numeric counts, never a bare 200", () => {
  const src = readRoute();

  it("initializes ownersScanned and eventsUpserted as numeric counters", () => {
    expect(src).toMatch(/let\s+ownersScanned\s*=\s*0\s*;/);
    expect(src).toMatch(/let\s+eventsUpserted\s*=\s*0\s*;/);
  });

  it("returns ok, ownersScanned, eventsUpserted, skipped, and evaluated in the success response", () => {
    expect(src).toMatch(
      /return NextResponse\.json\(\{\s*ok:\s*true,\s*ownersScanned,\s*eventsUpserted,\s*skipped,\s*evaluated:\s*profiles\?\.length\s*\?\?\s*0\s*\}\);/
    );
  });

  it("skipped is a real per-owner breakdown (noPeople/singlePerson), not a placeholder", () => {
    expect(src).toMatch(/const skipped = \{ noPeople: 0, singlePerson: 0 \};/);
  });
});
