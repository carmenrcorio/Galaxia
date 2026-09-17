import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tokens } from "@galaxia/ui";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

function readFromMobile(relativePath: string): string {
  return readFileSync(resolve(mobileRoot, relativePath), "utf8");
}

function screenSources(): string[] {
  return [
    readFromMobile("app/(app)/(tabs)/home.tsx"),
    readFromMobile("app/(app)/onboarding.tsx"),
    readFromMobile("app/(app)/(tabs)/compare.tsx"),
    readFromMobile("app/(app)/(tabs)/groups.tsx"),
    readFromMobile("app/(app)/(tabs)/vela.tsx"),
    readFromMobile("app/(app)/(tabs)/settings.tsx"),
    readFromMobile("app/(app)/profile/[personId].tsx"),
    readFromMobile("app/subscribe.tsx"),
    readFromMobile("src/providers/entitlement-provider.tsx")
  ];
}

describe("Phase 1 hygiene: one product, one graph, web tokens", () => {
  it("removes Free / Galaxia+ remnant copy and entitlement shims from mobile screens", () => {
    for (const src of screenSources()) {
      expect(src).not.toContain("Galaxia+");
      expect(src).not.toContain("Free plan");
      expect(src).not.toContain("Free tier");
      expect(src).not.toContain("peopleLimit");
      expect(src).not.toContain("dailyVelaLimit");
      expect(src).not.toContain("canUseGroups");
      expect(src).not.toContain("canAddPerson");
      expect(src).not.toContain("canSendVelaMessage");
      expect(src).not.toContain("recordVelaMessageSent");
      expect(src).not.toContain('tier: "free"');
      expect(src).not.toContain('tier === "plus"');
    }
  });

  it("does not advertise a wheel stub on the person profile", () => {
    const src = readFromMobile("app/(app)/profile/[personId].tsx");
    expect(src).not.toContain("Wheel placeholder");
    expect(src).not.toContain("SVG wheel component next slice");
  });

  it("Settings writes house system, email prefs, and support the same way web does", () => {
    const src = readFromMobile("app/(app)/(tabs)/settings.tsx");
    expect(src).toContain("HOUSE_SYSTEM_OPTIONS");
    expect(src).toContain("isHouseSystem");
    expect(src).toMatch(/\.select\("[^"]*house_system[^"]*daily_nudge_emails_enabled[^"]*weekly_constellation_letter_enabled[^"]*"\)/);
    expect(src).toMatch(/supabase\.from\("profiles"\)\.upsert\(\{\s*id:\s*session\.user\.id,\s*house_system:\s*next\s*\}\)/);
    expect(src).toMatch(/supabase\.from\("profiles"\)\.update\(\{\s*daily_nudge_emails_enabled:\s*next\s*\}\)\.eq\("id",\s*session\.user\.id\)/);
    expect(src).toMatch(/supabase\.from\("profiles"\)\.update\(\{\s*weekly_constellation_letter_enabled:\s*next\s*\}\)\.eq\("id",\s*session\.user\.id\)/);
    expect(src).toContain('from("support_requests")');
    expect(src).toContain("daily_nudge_emails_enabled !== false");
    expect(src).toContain("weekly_constellation_letter_enabled !== false");
    expect(src).not.toContain("\u2014");
  });

  it("Settings delete/export go through the web APIs, not a second purge", () => {
    const settings = readFromMobile("app/(app)/(tabs)/settings.tsx");
    const api = readFromMobile("src/lib/account-api.ts");
    expect(settings).toContain("requestAccountExport");
    expect(settings).toContain("requestAccountDelete");
    expect(settings).toContain("ACCOUNT_DELETE_COPY");
    expect(settings).toContain("isDeleteConfirmation");
    expect(settings).toContain("shouldWarnBillingOnDelete");
    expect(settings).toContain("signOut");
    expect(api).toContain('siteUrlFor("api/account/export")');
    expect(api).toContain('siteUrlFor("api/account/delete")');
    expect(api).toContain("Authorization");
    expect(api).toContain("Bearer");
    expect(api).not.toContain('.rpc("purge_own_account_data")');
    expect(settings).not.toContain('.rpc("purge_own_account_data")');
    expect(settings).not.toContain("\u2014");
  });

  it("aligns @galaxia/ui ink, hairline, and glass radius to web :root", () => {
    const css = readFileSync(resolve(repoRoot, "apps/web/app/globals.css"), "utf8");
    expect(tokens.colors.ink).toBe("#0a0717");
    expect(tokens.colors.ink2).toBe("#16102e");
    expect(tokens.colors.ink3).toBe("#1d1640");
    expect(tokens.colors.gold).toBe("#E6AE6C");
    expect(tokens.colors.goldSoft).toBe("#caa06f");
    expect(tokens.radii.lg).toBe(22);
    expect(css).toContain("--ink:  #0a0717;");
    expect(css).toContain("border-radius: 22px;");
    const app = JSON.parse(readFromMobile("app.json")) as {
      expo: {
        android: { adaptiveIcon: { backgroundColor: string; foregroundImage: string } };
        plugins: unknown;
      };
    };
    expect(app.expo.android.adaptiveIcon.backgroundColor).toBe("#0a0717");
    expect(app.expo.android.adaptiveIcon.foregroundImage).toBe("./assets/icon.png");
    expect(JSON.stringify(app.expo.plugins)).toContain("#0a0717");
    expect(JSON.stringify(app.expo.plugins)).toContain("./assets/icon.png");
  });
});
