// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clearShownSharedTransits, THIS_WEEK_SEEN_KEY_PREFIX } from "./this-week-seen";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("clearShownSharedTransits", () => {
  it("removes every this-week-seen key and leaves other localStorage entries", () => {
    window.localStorage.clear();
    window.localStorage.setItem(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-a`, "[{\"id\":\"evt\"}]");
    window.localStorage.setItem(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-b`, "[]");
    window.localStorage.setItem("galaxia.other", "keep");
    clearShownSharedTransits();
    expect(window.localStorage.getItem(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-a`)).toBeNull();
    expect(window.localStorage.getItem(`${THIS_WEEK_SEEN_KEY_PREFIX}owner-b`)).toBeNull();
    expect(window.localStorage.getItem("galaxia.other")).toBe("keep");
    expect(THIS_WEEK_SEEN_KEY_PREFIX).toBe("galaxia.thisWeek.shown.v1.");
  });
});

describe("sign-out clears the This Week ledger after the session ends", () => {
  it("web settings, the account sign-out button, and both delete paths clear after signOut", () => {
    const cases = [
      "apps/web/app/app/settings/page.tsx",
      "apps/web/components/sign-out-button.tsx",
      "apps/web/components/settings-account-section.tsx",
      "apps/web/components/account-data-panel.tsx",
    ];
    for (const rel of cases) {
      const src = read(rel);
      const signOutIdx = src.indexOf("auth.signOut()");
      const clearIdx = src.indexOf("clearShownSharedTransits()");
      expect(signOutIdx, rel).toBeGreaterThan(-1);
      expect(clearIdx, rel).toBeGreaterThan(signOutIdx);
    }
  });

  it("mobile sign-out clears AsyncStorage after supabase signOut, using the same key prefix", () => {
    const auth = read("apps/mobile/src/providers/auth-provider.tsx");
    const seen = read("apps/mobile/src/lib/this-week-seen.ts");
    const signOutIdx = auth.indexOf("supabase.auth.signOut()");
    const clearIdx = auth.indexOf("clearShownSharedTransits()");
    expect(signOutIdx).toBeGreaterThan(-1);
    expect(clearIdx).toBeGreaterThan(signOutIdx);
    expect(seen).toContain('export const THIS_WEEK_SEEN_KEY_PREFIX = "galaxia.thisWeek.shown.v1.";');
    expect(seen).toContain("AsyncStorage.getAllKeys");
    expect(seen).toContain("AsyncStorage.multiRemove");
  });
});
