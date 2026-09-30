import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The in-app This Week card is built in three places. Each one must pass
 * isMinorForSafety into the shared-transit person input so a stored
 * "partner" label cannot select romantic copy. The card itself still
 * renders the full lead and body.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

const FEEDS = [
  "apps/web/components/relational-transit-feed.tsx",
  "apps/mobile/app/(app)/(tabs)/home.tsx",
  "apps/mobile/app/(app)/this-week.tsx",
];

describe("This Week feeds pass minor safety into the copy frame", () => {
  it("sets isMinor from isMinorForSafety on every feed builder", () => {
    for (const rel of FEEDS) {
      const src = read(rel);
      expect(src, rel).toContain("isMinorForSafety");
      expect(src, rel).toContain("isMinor: isMinorForSafety(");
      const flagIdx = src.indexOf("isMinor: isMinorForSafety(");
      const buildIdx = src.indexOf("buildSharedWeekFeed(");
      expect(flagIdx, rel).toBeGreaterThan(-1);
      expect(buildIdx, rel).toBeGreaterThan(flagIdx);
    }
  });

  it("still renders the full in-app lead and body, not the lock-screen headline", () => {
    const web = read("apps/web/components/relational-transit-feed.tsx");
    const card = read("apps/mobile/src/components/this-week-card.tsx");
    expect(web).toContain("{row.lead}");
    expect(web).toContain("{row.body}");
    expect(web).not.toContain("pushHeadline");
    expect(card).toContain("{row.lead}");
    expect(card).toContain("{row.body}");
    expect(card).not.toContain("pushHeadline");
  });
});
