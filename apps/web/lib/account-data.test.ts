import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_DELETE_MODAL_COPY,
  ACCOUNT_SECTION_COPY,
  DELETE_CONFIRMATION_DISPLAY_WORD,
  DELETE_CONFIRMATION_WORD,
  EXPORT_PROFILE_FIELDS,
  isDeleteConfirmation,
  shouldWarnBillingOnDelete
} from "./account-data";

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
  });

  it("re-exports the Settings Account section copy web and mobile share", () => {
    expect(DELETE_CONFIRMATION_DISPLAY_WORD).toBe("DELETE");
    expect(ACCOUNT_SECTION_COPY.title).toBe("Account");
    expect(ACCOUNT_SECTION_COPY.exportButton).toBe("Download my data");
    expect(ACCOUNT_SECTION_COPY.deleteButton).toBe("Delete my account");
    expect(ACCOUNT_DELETE_MODAL_COPY.body).toBe(
      "This will permanently delete your account, your constellation, and everything in it. This cannot be undone."
    );
  });

  it("delete failure copy does not claim a partial delete succeeded", () => {
    expect(ACCOUNT_DELETE_COPY.errorGeneric).toMatch(/Nothing was removed/);
    expect(ACCOUNT_DELETE_COPY).not.toHaveProperty("errorAuthCloseFailed");
  });
});
