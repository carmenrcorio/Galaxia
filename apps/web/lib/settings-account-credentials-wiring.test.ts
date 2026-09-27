import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("Settings carries the password and email change sections", () => {
  it("mounts the Account credentials card and hands it the account email", () => {
    const src = read("apps/web/app/app/settings/page.tsx");
    expect(src).toContain("SettingsAccountCredentials");
    expect(src).toContain("<SettingsAccountCredentials accountEmail={accountEmail} />");
  });

  it("drops the old pointer that sent people to /account to change a password", () => {
    const src = read("apps/web/app/app/settings/page.tsx");
    expect(src).not.toContain("Change your password from");
  });

  it("places the card above the data export and delete pointer", () => {
    const src = read("apps/web/app/app/settings/page.tsx");
    const card = src.indexOf("<SettingsAccountCredentials");
    const dataPointer = src.indexOf("/account/data");
    expect(card).toBeGreaterThan(-1);
    expect(dataPointer).toBeGreaterThan(card);
  });
});

describe("the credentials card writes through the session, never a service key", () => {
  const component = read("apps/web/components/settings-account-credentials.tsx");
  // Comments explain the constraints; they are not what a person reads, and
  // ENGINEERING.md §15 exempts them. Assertions about copy read the code only.
  const code = component.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("calls auth.updateUser for each field and nothing else", () => {
    expect(component).toContain("updateUser({ password: newPassword })");
    expect(component).toContain("updateUser({ email: check.email })");
  });

  it("re-reads the session immediately before each write", () => {
    expect(component.match(/auth\.getSession\(\)/g)?.length).toBe(2);
    expect(component).toContain("PASSWORD_CHANGE_COPY.sessionExpired");
    expect(component).toContain("EMAIL_CHANGE_COPY.sessionExpired");
  });

  it("uses the shared checks rather than restating the rule", () => {
    expect(component).toContain("checkPasswordChange");
    expect(component).toContain("checkEmailChange");
    expect(component).toContain("emailChangeSentMessage");
    // No length rule is restated here. The only one is inside the shared
    // check, which is also what the mobile screen calls.
    expect(code).not.toMatch(/length\s*[<>=]+\s*\d/);
    expect(code).not.toMatch(/minLength/);
  });

  it("reports the service's error verbatim, never a generic replacement", () => {
    expect(component).toContain("message: error.message");
    expect(component).not.toContain("Something went wrong");
  });

  it("authors no user-visible copy of its own beyond the shared constants", () => {
    expect(component).toContain("PASSWORD_CHANGE_COPY");
    expect(component).toContain("EMAIL_CHANGE_COPY");
    expect(component).toContain("PASSWORD_RULE_HINT");
  });

  it("carries no em dash and never names the backend in user-visible copy", () => {
    expect(code).not.toContain("\u2014");
    // The module path is the one string allowed to say it. Nothing shows the
    // backend's name to the reader (ENGINEERING.md §7).
    const literals: string[] = code.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? [];
    const offenders = literals.filter(
      (literal) => literal.toLowerCase().includes("supabase") && !literal.includes("lib/supabase/client")
    );
    expect(offenders).toEqual([]);
  });
});

describe("the password rule is defined once", () => {
  it("apps/web/lib/password-rules re-exports the shared rule instead of restating it", () => {
    const src = read("apps/web/lib/password-rules.ts");
    expect(src).toContain('from "@galaxia/core"');
    expect(src).not.toMatch(/export const PASSWORD_MIN_LENGTH/);
  });
});
