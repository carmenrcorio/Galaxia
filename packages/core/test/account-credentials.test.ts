import { describe, expect, it } from "vitest";
import {
  EMAIL_CHANGE_COPY,
  PASSWORD_CHANGE_COPY,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MISMATCH_ERROR,
  PASSWORD_RULE_HINT,
  PASSWORD_TOO_SHORT_ERROR,
  checkEmailChange,
  checkPasswordChange,
  emailChangeSentMessage,
  isLikelyEmailAddress
} from "../src/account-credentials";

describe("password change checks", () => {
  it("matches the minimum configured on the auth project", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_RULE_HINT).toContain("8");
  });

  it("rejects an empty password before any request is made", () => {
    const result = checkPasswordChange("", "");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(PASSWORD_TOO_SHORT_ERROR);
  });

  it("rejects a password one character under the minimum", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = checkPasswordChange(short, short);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(PASSWORD_TOO_SHORT_ERROR);
  });

  it("reports length before mismatch, so the first answer is the actionable one", () => {
    const result = checkPasswordChange("short", "different");
    expect(result.error).toBe(PASSWORD_TOO_SHORT_ERROR);
  });

  it("rejects two long passwords that disagree", () => {
    const result = checkPasswordChange("constellation", "constellations");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(PASSWORD_MISMATCH_ERROR);
  });

  it("does not trim the password, because whitespace is part of it", () => {
    expect(checkPasswordChange("  spaced pass  ", "  spaced pass  ").ok).toBe(true);
    expect(checkPasswordChange("  spaced pass  ", "spaced pass").ok).toBe(false);
  });

  it("accepts a long matching pair", () => {
    const result = checkPasswordChange("a-quiet-galaxy", "a-quiet-galaxy");
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("email shape check", () => {
  it("accepts ordinary addresses", () => {
    expect(isLikelyEmailAddress("carmen@example.com")).toBe(true);
    expect(isLikelyEmailAddress("first.last+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects the shapes that are certainly wrong", () => {
    for (const value of [
      "",
      "   ",
      "carmen",
      "carmen@",
      "@example.com",
      "carmen@localhost",
      "carmen@@example.com",
      "carmen@example..com",
      "carmen@.com",
      "carmen@example.",
      "carmen@example.c",
      "carmen space@example.com"
    ]) {
      expect(isLikelyEmailAddress(value), value).toBe(false);
    }
  });

  it("treats null and undefined as not an address", () => {
    expect(isLikelyEmailAddress(null)).toBe(false);
    expect(isLikelyEmailAddress(undefined)).toBe(false);
  });
});

describe("email change checks", () => {
  it("rejects an empty address with its own message", () => {
    const result = checkEmailChange("   ", "carmen@example.com");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(EMAIL_CHANGE_COPY.emptyError);
  });

  it("rejects a malformed address", () => {
    const result = checkEmailChange("not-an-address", "carmen@example.com");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(EMAIL_CHANGE_COPY.invalidError);
  });

  it("rejects the address already on the account, ignoring case and padding", () => {
    const result = checkEmailChange("  Carmen@Example.com ", "carmen@example.com");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(EMAIL_CHANGE_COPY.sameEmailError);
  });

  it("normalizes an accepted address", () => {
    const result = checkEmailChange("  New.Address@Example.com  ", "carmen@example.com");
    expect(result.ok).toBe(true);
    expect(result.email).toBe("new.address@example.com");
  });

  it("accepts without a known current address", () => {
    expect(checkEmailChange("new@example.com", null).ok).toBe(true);
    expect(checkEmailChange("new@example.com", undefined).ok).toBe(true);
    expect(checkEmailChange("new@example.com", "").ok).toBe(true);
  });
});

describe("email change confirmation message", () => {
  it("names both addresses, because both links have to be opened", () => {
    const message = emailChangeSentMessage("new@example.com", "old@example.com");
    expect(message).toContain("Check your new email to confirm the change.");
    expect(message).toContain("new@example.com");
    expect(message).toContain("old@example.com");
  });

  it("still says a second link exists when the current address is unknown", () => {
    const message = emailChangeSentMessage("new@example.com", null);
    expect(message).toContain("new@example.com");
    expect(message).toContain("your current address");
  });
});

describe("authored copy", () => {
  const strings = [
    PASSWORD_RULE_HINT,
    PASSWORD_TOO_SHORT_ERROR,
    PASSWORD_MISMATCH_ERROR,
    ...Object.values(PASSWORD_CHANGE_COPY),
    ...Object.values(EMAIL_CHANGE_COPY),
    emailChangeSentMessage("new@example.com", "old@example.com")
  ];

  it("has no em dash (ENGINEERING.md §15)", () => {
    for (const value of strings) {
      expect(value, value).not.toContain("\u2014");
    }
  });

  it("never names the backend to the user (ENGINEERING.md §7)", () => {
    for (const value of strings) {
      expect(value.toLowerCase(), value).not.toContain("supabase");
    }
  });

  it("labels the two sections and the two buttons the way Settings does", () => {
    expect(PASSWORD_CHANGE_COPY.sectionLabel).toBe("Change password");
    expect(PASSWORD_CHANGE_COPY.submit).toBe("Update password");
    expect(EMAIL_CHANGE_COPY.sectionLabel).toBe("Change email");
    expect(EMAIL_CHANGE_COPY.submit).toBe("Update email");
  });
});
