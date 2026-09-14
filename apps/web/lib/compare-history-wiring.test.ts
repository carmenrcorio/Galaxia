import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");

describe("Compare history wiring", () => {
  it("/app/compare loads history, upserts last_viewed_at, and leads with the transit delta", () => {
    const src = read("apps/web/app/app/compare/page.tsx");
    expect(src).toContain('from("comparison_history")');
    expect(src).toContain("last_viewed_at");
    expect(src).toContain("onConflict: \"owner_id,person_low,person_high\"");
    expect(src).toContain("CompareHistoryList");
    expect(src).toContain("CompareSinceLastViewed");
    expect(src).toContain("diffPairTransits");
    expect(src).toContain("activePairTransits");
    expect(src).toContain("computeSynastry");
    expect(src).not.toContain("from(\"synastry\").insert");
  });

  it("does not change computeSynastry; delta uses computeTransits via activePairTransits", () => {
    const delta = read("packages/astro/src/compare-transit-delta.ts");
    expect(delta).toContain("computeTransits(");
    expect(delta).not.toMatch(/import[\s\S]*computeSynastry/);
    expect(delta).not.toMatch(/computeSynastry\s*\(/);
    expect(delta).toContain("PAIR_TRANSIT_ACTIVE_ORB_DEG");
  });

  it("mobile Compare persists the same pair ledger and leads with the same copy", () => {
    const src = read("apps/mobile/app/(app)/compare.tsx");
    expect(src).toContain('from("comparison_history")');
    expect(src).toContain("COMPARE_HISTORY_HEADING");
    expect(src).toContain("COMPARE_SINCE_HEADING");
    expect(src).toContain("compareNatalAspectsConstant");
    expect(src).toContain("diffPairTransits");
  });
});
