import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAccountName } from "@galaxia/core";
import { signupNameFromUserMetadata } from "./account-name";

/**
 * Source-level guards for the name pipeline.
 *
 * The bug this branch fixes was never one wrong line. It was the same wrong idea
 * reimplemented on several screens: derive a display name from the login email
 * when no name is handy. Unit tests on the resolver cannot catch a fourth screen
 * doing it again inline, so these assertions read the actual sources.
 *
 * Precedent for testing wiring by reading source: lib/person-care-wiring.test.ts.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

/**
 * Comments are stripped before asserting. These tests are about what the code
 * does, and the comments explaining the old behaviour necessarily quote it.
 */
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}

/** Every surface that names or greets the signed-in user. */
const NAME_SURFACES = [
  "apps/web/app/account/page.tsx",
  "apps/web/app/app/page.tsx",
  "apps/web/app/app/vela/page.tsx",
  "apps/web/app/app/settings/page.tsx",
  "apps/mobile/app/(app)/home.tsx",
  "apps/mobile/app/index.tsx"
];

describe("no surface derives a display name from an email address", () => {
  for (const surface of NAME_SURFACES) {
    it(`${surface} never splits an email to make a name`, () => {
      const source = read(surface);
      // Matches email.split("@"), user.email?.split('@'), and the like.
      expect(source).not.toMatch(/email\s*(\?\.)?\s*\.?\s*split\s*\(\s*["'`]@/);
    });
  }
});

describe("the greeting surfaces read the shared resolver", () => {
  for (const surface of ["apps/web/app/app/page.tsx", "apps/mobile/app/(app)/home.tsx", "apps/web/app/account/page.tsx"]) {
    it(`${surface} calls resolveAccountName`, () => {
      expect(read(surface)).toContain("resolveAccountName(");
    });
  }
});

describe("mobile signup no longer writes a name it never collected", () => {
  it("does not write display_name at signup", () => {
    const source = read("apps/mobile/app/index.tsx");
    expect(source).not.toContain("display_name");
  });
});

describe("the dead Open in app button is gone", () => {
  it("no surface renders an Open in app control", () => {
    for (const surface of ["apps/web/app/account/page.tsx", "apps/web/app/app/settings/page.tsx"]) {
      expect(read(surface)).not.toMatch(/>\s*Open in app\s*</);
    }
  });

  it("the account screen no longer links a fake app target at its own site URL", () => {
    expect(read("apps/web/app/account/page.tsx")).not.toContain("${siteUrl}/account");
  });
});

describe("change password is the authenticated flow, not the recovery flow", () => {
  const changePassword = read("apps/web/components/change-password.tsx");

  it("updates the live session's user", () => {
    expect(changePassword).toContain("supabase.auth.updateUser({ password: newPassword })");
  });

  it("requires a session before writing", () => {
    expect(changePassword).toContain("supabase.auth.getSession()");
  });

  it("does not touch the forgot-password email recovery flow", () => {
    expect(changePassword).not.toContain("resetPasswordForEmail");
  });

  it("shows the real failure message rather than a generic one", () => {
    expect(changePassword).toContain("setError(updateError.message)");
    expect(changePassword).not.toMatch(/something went wrong/i);
  });

  it("is mounted on the account screen", () => {
    expect(read("apps/web/app/account/page.tsx")).toContain("<ChangePassword />");
  });
});

describe("the password rule is shared with signup, not restated", () => {
  it("signup and change-password both import the shared minimum", () => {
    expect(read("apps/web/components/signup-form.tsx")).toContain("PASSWORD_MIN_LENGTH");
    expect(read("apps/web/components/change-password.tsx")).toContain("PASSWORD_MIN_LENGTH");
  });

  it("neither form hardcodes its own minimum length", () => {
    for (const surface of ["apps/web/components/signup-form.tsx", "apps/web/components/change-password.tsx"]) {
      expect(read(surface)).not.toMatch(/minLength=\{\d+\}/);
    }
  });
});

describe("signup captures a first and last name", () => {
  const signup = read("apps/web/components/signup-form.tsx");

  it("renders both name fields", () => {
    expect(signup).toContain('htmlFor="signup-first-name"');
    expect(signup).toContain('htmlFor="signup-last-name"');
  });

  it("carries the name through auth metadata so email confirmation cannot lose it", () => {
    expect(signup).toContain("first_name");
    expect(signup).toContain("last_name");
    expect(signup).toContain("full_name");
  });
});

describe("signupNameFromUserMetadata", () => {
  it("prefers an explicit full name", () => {
    expect(signupNameFromUserMetadata({ user_metadata: { full_name: "Carmen Corio" } })).toBe("Carmen Corio");
  });

  it("falls back to joining first and last", () => {
    expect(signupNameFromUserMetadata({ user_metadata: { first_name: "Carmen", last_name: "Corio" } })).toBe("Carmen Corio");
  });

  it("returns an empty string when signup captured no name", () => {
    expect(signupNameFromUserMetadata({ user_metadata: {} })).toBe("");
    expect(signupNameFromUserMetadata(null)).toBe("");
    expect(signupNameFromUserMetadata(undefined)).toBe("");
  });

  it("ignores non-string metadata rather than rendering it", () => {
    expect(signupNameFromUserMetadata({ user_metadata: { full_name: 42, first_name: {}, last_name: [] } })).toBe("");
  });

  it("never turns an email in metadata into a name via the resolver", () => {
    // Metadata is transport for a captured name only. Even if something stuffed
    // an email in there, the resolver treats stored fields, not emails, as names.
    const resolved = resolveAccountName({ email: "carmen@example.com" });
    expect(resolved.name).toBeNull();
  });
});
