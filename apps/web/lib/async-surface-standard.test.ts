import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repo = join(__dirname, "..", "..", "..");
const engineering = readFileSync(join(repo, "ENGINEERING.md"), "utf8");
const core = readFileSync(join(repo, "packages/core/src/async-surface.ts"), "utf8");
const settings = readFileSync(join(__dirname, "./settings-subscription.ts"), "utf8");

describe("source wiring — async surface standard (ENGINEERING.md §18)", () => {
  it("records the loading / empty / failure rule next to the constellation and subscription gold standards", () => {
    expect(engineering).toContain("## 18. Every async surface has loading, empty, and failure");
    expect(engineering).toContain("No spinner runs indefinitely");
    expect(engineering).toContain("Error copy says what failed and what to do next");
    expect(engineering).toContain("Empty copy states the condition and offers one action");
    expect(engineering).toContain("constellation-starfield-skeleton.tsx");
    expect(engineering).toContain("settings-subscription.ts");
  });

  it("shares withTimeout from @galaxia/core and keeps the Settings 2s wrapper", () => {
    expect(core).toContain("export const DEFAULT_FETCH_TIMEOUT_MS = 8000");
    expect(core).toContain("export const VELA_FETCH_TIMEOUT_MS = 15000");
    expect(core).toContain("export function withTimeout");
    expect(settings).toContain("SUBSCRIPTION_FETCH_TIMEOUT_MS = 2000");
    expect(settings).toContain("raceTimeout");
    expect(settings).toContain("SubscriptionLoadTimeoutError");
  });

  it("wraps high-traffic screens in withTimeout instead of an indefinite spinner", () => {
    const web = (rel: string) => readFileSync(join(repo, "apps/web", rel), "utf8");
    const mobile = (rel: string) => readFileSync(join(repo, "apps/mobile", rel), "utf8");
    const screens = [
      web("app/app/page.tsx"),
      web("app/app/this-week/page.tsx"),
      web("app/app/moment/page.tsx"),
      web("app/app/compare/page.tsx"),
      web("app/app/person/[id]/page.tsx"),
      web("app/app/groups/page.tsx"),
      web("app/app/vela/page.tsx"),
      web("app/app/settings/page.tsx"),
      mobile("app/(app)/(tabs)/vela.tsx"),
      mobile("app/(app)/(tabs)/settings.tsx")
    ];
    for (const src of screens) {
      expect(src).toContain("withTimeout");
      expect(src).toContain("DEFAULT_FETCH_TIMEOUT_MS");
    }
    expect(web("app/app/vela/page.tsx")).toContain("VELA_FETCH_TIMEOUT_MS");
    expect(mobile("app/(app)/(tabs)/vela.tsx")).toContain("VELA_FETCH_TIMEOUT_MS");
  });
});
