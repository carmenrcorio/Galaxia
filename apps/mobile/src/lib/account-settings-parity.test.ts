/**
 * Settings -> Account parity with web.
 *
 * Mobile renders React Native primitives, so the section is asserted at the
 * source level (the same approach the other *-parity tests take). What
 * matters is that both clients show one Account section at the bottom, use
 * the same approved strings from @galaxia/core, and gate the delete behind a
 * typed DELETE in a modal rather than a single tap.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETE_MODAL_COPY,
  ACCOUNT_SECTION_COPY,
  DELETE_CONFIRMATION_DISPLAY_WORD
} from "@galaxia/core";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

const mobileSettings = readFileSync(
  resolve(mobileRoot, "app/(app)/(tabs)/settings.tsx"),
  "utf8"
);
const webSection = readFileSync(
  resolve(repoRoot, "apps/web/components/settings-account-section.tsx"),
  "utf8"
);
const webDialog = readFileSync(
  resolve(repoRoot, "apps/web/components/account-delete-dialog.tsx"),
  "utf8"
);
const webSettings = readFileSync(
  resolve(repoRoot, "apps/web/app/app/settings/page.tsx"),
  "utf8"
);

describe("Settings Account section, web and mobile", () => {
  it("both clients render one Account section from the shared copy", () => {
    for (const src of [mobileSettings, webSection]) {
      expect(src).toContain("ACCOUNT_SECTION_COPY");
      expect(src).toContain("ACCOUNT_SECTION_COPY.exportButton");
      expect(src).toContain("ACCOUNT_SECTION_COPY.deleteButton");
    }
    expect(webSettings).toContain("SettingsAccountSection");
  });

  it("puts the section at the bottom of the screen, under the people and groups lists", () => {
    const peopleCard = mobileSettings.indexOf("<Text style={cardTitle}>People</Text>");
    const groupsCard = mobileSettings.indexOf("<Text style={cardTitle}>Groups</Text>");
    const accountCard = mobileSettings.indexOf("{ACCOUNT_SECTION_COPY.title}");
    expect(peopleCard).toBeGreaterThan(-1);
    expect(accountCard).toBeGreaterThan(peopleCard);
    expect(accountCard).toBeGreaterThan(groupsCard);

    const webAccount = webSettings.indexOf("<SettingsAccountSection");
    expect(webAccount).toBeGreaterThan(webSettings.indexOf("Your groups"));
    expect(webAccount).toBeGreaterThan(webSettings.indexOf("Contact support"));
  });

  it("puts the confirmation behind a modal that needs DELETE typed", () => {
    expect(mobileSettings).toContain("<Modal");
    expect(mobileSettings).toContain("ACCOUNT_DELETE_MODAL_COPY.body");
    expect(mobileSettings).toContain("DELETE_CONFIRMATION_DISPLAY_WORD");
    expect(mobileSettings).toContain("isDeleteConfirmation");
    expect(mobileSettings).toContain("disabled={!canDelete || deleting}");

    expect(webDialog).toContain('aria-modal="true"');
    expect(webDialog).toContain("ACCOUNT_DELETE_MODAL_COPY.body");
    expect(webDialog).toContain("DELETE_CONFIRMATION_DISPLAY_WORD");
    expect(webDialog).toContain("isDeleteConfirmation");
  });

  it("uses the approved wording, and only the approved wording", () => {
    expect(ACCOUNT_DELETE_MODAL_COPY.body).toBe(
      "This will permanently delete your account, your constellation, and everything in it. This cannot be undone."
    );
    expect(ACCOUNT_SECTION_COPY.exportButton).toBe("Download my data");
    expect(ACCOUNT_SECTION_COPY.deleteButton).toBe("Delete my account");
    expect(DELETE_CONFIRMATION_DISPLAY_WORD).toBe("DELETE");
    // The modal is the only place the sentence lives: neither client hardcodes it.
    for (const src of [mobileSettings, webSection, webDialog]) {
      expect(src).not.toContain("This cannot be undone.");
    }
  });

  it("signs the person out only after the purge succeeds", () => {
    const deleteBlock = mobileSettings.slice(
      mobileSettings.indexOf("const deleteAccount"),
      mobileSettings.indexOf("const openBillingOnWeb")
    );
    expect(deleteBlock).toContain("requestAccountDelete");
    expect(deleteBlock.indexOf("if (!result.ok)")).toBeLessThan(deleteBlock.indexOf("await signOut()"));
    expect(deleteBlock).toContain("setDeleteError(result.error)");

    expect(webSection).toContain('window.location.href = "/"');
    expect(webSection.indexOf("setDeleteError(body.error")).toBeLessThan(
      webSection.indexOf("supabase.auth.signOut()")
    );
  });

  it("carries no em dash in either client's Account copy", () => {
    for (const src of [mobileSettings, webSection, webDialog]) {
      expect(src).not.toContain("\u2014");
    }
  });
});
