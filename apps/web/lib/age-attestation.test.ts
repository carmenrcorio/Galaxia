import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGE_CONFIRMATION_REQUIRED, hasAgeConfirmation } from "./age-attestation";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("hasAgeConfirmation", () => {
  it("accepts only the boolean true", () => {
    expect(hasAgeConfirmation({ age_confirmed: true })).toBe(true);
  });

  it("rejects missing, false, and non-boolean values", () => {
    expect(hasAgeConfirmation(undefined)).toBe(false);
    expect(hasAgeConfirmation(null)).toBe(false);
    expect(hasAgeConfirmation({})).toBe(false);
    expect(hasAgeConfirmation({ age_confirmed: false })).toBe(false);
    expect(hasAgeConfirmation({ age_confirmed: "true" })).toBe(false);
    expect(hasAgeConfirmation({ age_confirmed: 1 })).toBe(false);
    expect(hasAgeConfirmation({ age_confirmed: "True" })).toBe(false);
  });
});

describe("POST /api/auth/signup age attestation wiring", () => {
  const route = read("apps/web/app/api/auth/signup/route.ts");
  const form = read("apps/web/components/signup-form.tsx");

  it("returns 400 Age confirmation required before any signUp call", () => {
    expect(route).toContain("hasAgeConfirmation");
    expect(route).toContain("AGE_CONFIRMATION_REQUIRED");
    expect(AGE_CONFIRMATION_REQUIRED).toBe("Age confirmation required");
    expect(route).toMatch(/status:\s*400/);
    const gateIdx = route.indexOf("hasAgeConfirmation");
    const signUpIdx = route.indexOf("auth.signUp");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(signUpIdx).toBeGreaterThan(gateIdx);
  });

  it("does not add a database column or persist the attestation", () => {
    expect(route).not.toMatch(/\.from\(/);
    expect(route).not.toMatch(/age_confirmed_at|date_of_birth|birth_date/);
    expect(route).not.toContain("insert");
  });

  it("the signup form posts age_confirmed to this route and no longer calls signUp in the browser", () => {
    expect(form).toContain('fetch("/api/auth/signup"');
    expect(form).toContain("age_confirmed: ageConfirmed");
    expect(form).toContain('data-testid="age-gate-checkbox"');
    expect(form).not.toContain("supabase.auth.signUp");
  });

  it("mobile signup posts age_confirmed to this route and no longer calls signUp on the client", () => {
    const mobileScreen = read("apps/mobile/app/index.tsx");
    const mobileSignup = read("apps/mobile/src/lib/signup.ts");
    expect(mobileSignup).toContain('siteUrlFor("api/auth/signup")');
    expect(mobileSignup).toContain("age_confirmed: input.ageConfirmed");
    expect(mobileSignup).not.toContain("supabase.auth.signUp");
    expect(mobileScreen).toContain("signupViaServer");
    expect(mobileScreen).not.toContain("supabase.auth.signUp");
    expect(mobileScreen).toContain('testID="age-gate-checkbox"');
    expect(mobileScreen).toContain("disabled={submitting || !ageConfirmed}");
  });

  it("constellation-connect signup uses the same /signup form, so the same server check", () => {
    expect(read("apps/web/lib/connect-invite.ts")).toContain("signupWithNextHref(connectPath(token))");
    expect(read("apps/web/app/signup/page.tsx")).toContain("<SignupForm");
    expect(read("apps/web/components/connect-accept-view.tsx")).toContain("signupForConnectHref");
  });
});
