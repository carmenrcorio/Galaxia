import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_DELETE_MODAL_COPY,
  ACCOUNT_EXPORT_RATE_LIMIT,
  ACCOUNT_SECTION_COPY,
  DELETE_CONFIRMATION_DISPLAY_WORD,
  DELETE_CONFIRMATION_WORD,
  EXPORT_PROFILE_FIELDS,
  accountExportFilename,
  isDeleteConfirmation,
  shouldWarnBillingOnDelete
} from "../src/account-data";

describe("account-data helpers", () => {
  it("requires the exact confirmation word (case-insensitive, trimmed)", () => {
    expect(DELETE_CONFIRMATION_WORD).toBe("delete");
    expect(isDeleteConfirmation("delete")).toBe(true);
    expect(isDeleteConfirmation(" DELETE ")).toBe(true);
    expect(isDeleteConfirmation("Delete")).toBe(true);
    expect(isDeleteConfirmation("deleted")).toBe(false);
    expect(isDeleteConfirmation("yes")).toBe(false);
    expect(isDeleteConfirmation("")).toBe(false);
    expect(isDeleteConfirmation(null)).toBe(false);
  });

  it("warns on active, past_due, and lifetime only (never gates)", () => {
    expect(shouldWarnBillingOnDelete("active")).toBe(true);
    expect(shouldWarnBillingOnDelete("past_due")).toBe(true);
    expect(shouldWarnBillingOnDelete("lifetime")).toBe(true);
    expect(shouldWarnBillingOnDelete("trialing")).toBe(false);
    expect(shouldWarnBillingOnDelete("canceled")).toBe(false);
    expect(shouldWarnBillingOnDelete(null)).toBe(false);
  });

  it("export profile allowlist is name, timezone, and house system only", () => {
    expect([...EXPORT_PROFILE_FIELDS]).toEqual(["display_name", "timezone", "house_system"]);
    expect(EXPORT_PROFILE_FIELDS).not.toContain("id");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("stripe_customer_id");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("stripe_subscription_id");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("subscription_tier");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("unsubscribe_token");
  });

  it("delete failure copy does not claim a partial delete succeeded", () => {
    expect(ACCOUNT_DELETE_COPY.errorGeneric).toMatch(/Nothing was removed/);
    expect(ACCOUNT_DELETE_COPY).not.toHaveProperty("errorAuthCloseFailed");
  });

  it("asks for an uppercase DELETE while still accepting any casing", () => {
    expect(DELETE_CONFIRMATION_DISPLAY_WORD).toBe("DELETE");
    expect(ACCOUNT_DELETE_MODAL_COPY.typePrompt).toContain("DELETE");
    expect(isDeleteConfirmation(DELETE_CONFIRMATION_DISPLAY_WORD)).toBe(true);
  });

  it("uses the approved delete confirmation wording verbatim", () => {
    expect(ACCOUNT_DELETE_MODAL_COPY.body).toBe(
      "This will permanently delete your account, your constellation, and everything in it. This cannot be undone."
    );
  });

  it("Account section and modal copy carry no em dash", () => {
    for (const copy of [ACCOUNT_SECTION_COPY, ACCOUNT_DELETE_MODAL_COPY]) {
      for (const value of Object.values(copy)) {
        expect(value).not.toContain("\u2014");
      }
    }
  });

  it("allows one export per hour", () => {
    expect(ACCOUNT_EXPORT_RATE_LIMIT.limit).toBe(1);
    expect(ACCOUNT_EXPORT_RATE_LIMIT.windowSeconds).toBe(3600);
  });

  it("names the download by date", () => {
    expect(accountExportFilename(new Date("2026-09-27T04:05:06.000Z"))).toBe(
      "galaxia-export-2026-09-27.json"
    );
    expect(accountExportFilename("2026-01-02T23:59:59.000Z")).toBe("galaxia-export-2026-01-02.json");
    expect(accountExportFilename("not a date")).toMatch(/^galaxia-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
