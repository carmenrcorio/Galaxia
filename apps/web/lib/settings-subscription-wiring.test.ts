import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import { SETTINGS_SUBSCRIPTION_COPY } from "./settings-subscription";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("Settings subscription panel does not trust the client billing SDK", () => {
  it("the Settings page no longer imports the RevenueCat Web SDK", () => {
    const src = read("apps/web/app/app/settings/page.tsx");
    expect(src).not.toContain("@revenuecat/purchases-js");
    expect(src).not.toContain("Purchases");
    expect(src).not.toContain("getCustomerInfo");
    expect(src).not.toContain("managementURL");
    expect(src).toContain("SettingsSubscriptionPanel");
  });

  it("the panel module never imports Purchases and never writes subscription_status", () => {
    const panel = read("apps/web/components/settings-subscription-panel.tsx");
    const lib = read("apps/web/lib/settings-subscription.ts");
    expect(panel).not.toContain("@revenuecat/purchases-js");
    expect(lib).not.toContain("@revenuecat/purchases-js");
    expect(panel).not.toContain("Purchases");
    expect(lib).not.toContain("Purchases");
    expect(panel).not.toMatch(/subscription_status\s*:/);
    expect(lib).not.toMatch(/\.update\(/);
    expect(lib).not.toMatch(/\.upsert\(/);
  });

  it("the panel reads profiles billing columns, including subscription_status and plan", () => {
    const panel = read("apps/web/components/settings-subscription-panel.tsx");
    expect(panel).toContain("subscription_status");
    expect(panel).toContain("trial_ends_at");
    expect(panel).toContain("current_period_end");
    expect(panel).toContain("cancel_at_period_end");
    expect(panel).toContain("comped");
    expect(panel).toContain("plan");
  });

  it("hasAccess from @galaxia/core is the access decision in the view model", () => {
    const lib = read("apps/web/lib/settings-subscription.ts");
    expect(lib).toContain("GALAXIA_HELP_EMAIL");
    expect(lib).toContain("hasAccess");
    expect(lib).toContain("trialDaysRemaining");
    expect(lib).toContain('from "@galaxia/core"');
    expect(lib).toMatch(/hasAccess\(/);
    expect(lib).toMatch(/trialDaysRemaining\(/);
  });

  it("user-facing copy contains no em dash", () => {
    const lib = read("apps/web/lib/settings-subscription.ts");
    expect(lib).not.toContain("\u2014");
    const panel = read("apps/web/components/settings-subscription-panel.tsx");
    expect(panel).not.toContain("\u2014");
  });

  it("the contact address is the one Galaxia help inbox, the same CAN-SPAM footer address", () => {
    const lib = read("apps/web/lib/settings-subscription.ts");
    const panel = read("apps/web/components/settings-subscription-panel.tsx");
    const tests = read("apps/web/components/settings-subscription-panel.test.tsx");
    const unit = read("apps/web/lib/settings-subscription.test.ts");
    const fragment = read("changelog.d/cursor-fix-settings-subscription-hang-05f1.md");
    const emails = read("apps/web/lib/emails.ts");
    const deleteRoute = read("apps/web/app/api/account/delete/route.ts");
    const retiredDomain = ["galaxia", "app"].join(".");
    expect(emails).toContain("GALAXIA_HELP_EMAIL");
    expect(lib).toContain("GALAXIA_HELP_EMAIL");
    expect(deleteRoute).toContain("ACCOUNT_DELETE_COPY.errorGeneric");
    expect(deleteRoute).not.toContain("errorAuthCloseFailed");
    for (const src of [lib, panel, tests, unit, fragment, emails, deleteRoute]) {
      expect(src).not.toContain(retiredDomain);
    }
    expect(lib).toContain("export const BILLING_SUPPORT_EMAIL = GALAXIA_HELP_EMAIL");
    expect(SETTINGS_SUBSCRIPTION_COPY.timeout).toContain(GALAXIA_HELP_EMAIL);
  });
});
