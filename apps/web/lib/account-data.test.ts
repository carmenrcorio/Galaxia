import { describe, expect, it } from "vitest";
import {
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

  it("export profile allowlist excludes Stripe and deprecated tier fields", () => {
    expect(EXPORT_PROFILE_FIELDS).toContain("subscription_status");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("stripe_customer_id");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("stripe_subscription_id");
    expect(EXPORT_PROFILE_FIELDS).not.toContain("subscription_tier");
  });
});
