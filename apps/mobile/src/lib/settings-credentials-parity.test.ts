import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMAIL_CHANGE_COPY,
  PASSWORD_CHANGE_COPY,
  checkEmailChange,
  checkPasswordChange,
  emailChangeSentMessage
} from "@galaxia/core";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(__dirname, "../../../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

const settings = readMobile("app/(app)/(tabs)/settings.tsx");
const settingsCode = settings.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("mobile Settings carries the password and email change sections", () => {
  it("renders both expandable sections from the shared labels", () => {
    expect(settings).toContain("PASSWORD_CHANGE_COPY.sectionLabel");
    expect(settings).toContain("EMAIL_CHANGE_COPY.sectionLabel");
    expect(settings).toContain("passwordOpen");
    expect(settings).toContain("emailOpen");
    expect(settings).toContain("accessibilityState={{ expanded: passwordOpen }}");
    expect(settings).toContain("accessibilityState={{ expanded: emailOpen }}");
  });

  it("collects a new password twice and a new email once", () => {
    expect(settings).toContain("PASSWORD_CHANGE_COPY.newLabel");
    expect(settings).toContain("PASSWORD_CHANGE_COPY.confirmLabel");
    expect(settings).toContain("EMAIL_CHANGE_COPY.newLabel");
    expect(settings).toContain("secureTextEntry");
    expect(settings).toContain('keyboardType="email-address"');
  });

  it("labels the two buttons from the shared copy", () => {
    expect(settings).toContain("PASSWORD_CHANGE_COPY.submit");
    expect(settings).toContain("EMAIL_CHANGE_COPY.submit");
    expect(settings).toContain("PASSWORD_CHANGE_COPY.submitting");
    expect(settings).toContain("EMAIL_CHANGE_COPY.submitting");
  });

  it("sits above the export and delete cards", () => {
    const account = settings.indexOf("<Text style={cardTitle}>Account</Text>");
    const exportCard = settings.indexOf("ACCOUNT_EXPORT_COPY.title");
    const deleteCard = settings.indexOf("ACCOUNT_DELETE_COPY.title");
    expect(account).toBeGreaterThan(-1);
    expect(exportCard).toBeGreaterThan(account);
    expect(deleteCard).toBeGreaterThan(account);
  });
});

describe("mobile writes through the session and reports failures honestly", () => {
  it("calls auth.updateUser once per field", () => {
    expect(settingsCode).toContain("updateUser({ password: newPassword })");
    expect(settingsCode).toContain("updateUser({ email: check.email })");
  });

  it("re-reads the session immediately before each write", () => {
    expect(settingsCode.match(/auth\.getSession\(\)/g)?.length).toBe(2);
    expect(settings).toContain("PASSWORD_CHANGE_COPY.sessionExpired");
    expect(settings).toContain("EMAIL_CHANGE_COPY.sessionExpired");
  });

  it("shows the service error verbatim rather than a generic message", () => {
    expect(settingsCode).toContain("message: error.message");
    expect(settingsCode).not.toContain("Something went wrong");
  });

  it("clears the fields only after a success", () => {
    const passwordSuccess = settingsCode.indexOf('setNewPassword("")');
    const passwordError = settingsCode.indexOf("message: error.message");
    expect(passwordSuccess).toBeGreaterThan(passwordError);
    expect(settingsCode).toContain('setNewEmail("")');
  });
});

describe("mobile and web share one rule and one set of strings", () => {
  it("mobile restates no length or shape rule of its own", () => {
    expect(settingsCode).toContain("checkPasswordChange");
    expect(settingsCode).toContain("checkEmailChange");
    expect(settingsCode).toContain("emailChangeSentMessage");
    expect(settingsCode).not.toMatch(/newPassword\.length/);
    expect(settingsCode).not.toMatch(/@.*\.(com|test)/);
  });

  it("both screens import the same module for this copy", () => {
    const web = readRepo("apps/web/components/settings-account-credentials.tsx");
    for (const symbol of [
      "PASSWORD_CHANGE_COPY",
      "EMAIL_CHANGE_COPY",
      "checkPasswordChange",
      "checkEmailChange",
      "emailChangeSentMessage"
    ]) {
      expect(web, `web is missing ${symbol}`).toContain(symbol);
      expect(settings, `mobile is missing ${symbol}`).toContain(symbol);
    }
    expect(web).toContain('from "@galaxia/core"');
    expect(settings).toContain('from "@galaxia/core"');
  });

  it("the shared checks behave the same way the screens rely on", () => {
    expect(checkPasswordChange("short", "short").ok).toBe(false);
    expect(checkPasswordChange("a-quiet-galaxy", "a-quiet-galax").ok).toBe(false);
    expect(checkPasswordChange("a-quiet-galaxy", "a-quiet-galaxy").ok).toBe(true);
    expect(checkEmailChange("nope", null).ok).toBe(false);
    expect(checkEmailChange("new@example.com", "new@example.com").ok).toBe(false);
    expect(emailChangeSentMessage("new@example.com", "old@example.com")).toContain(
      "old@example.com"
    );
  });

  it("carries no em dash in this screen's copy (ENGINEERING.md §15)", () => {
    expect(settingsCode).not.toContain("\u2014");
    expect(PASSWORD_CHANGE_COPY.lead).not.toContain("\u2014");
    expect(EMAIL_CHANGE_COPY.lead).not.toContain("\u2014");
  });
});
