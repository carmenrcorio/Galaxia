import { describe, expect, it } from "vitest";
import { joinFullName, resolveAccountName, splitFullName } from "../src/account-name";

const EMAIL = "carmen.corio@example.com";

describe("resolveAccountName precedence", () => {
  it("prefers the explicitly set profile name", () => {
    const resolved = resolveAccountName({
      profileDisplayName: "Carmen Corio",
      selfPersonName: "Carmen",
      email: EMAIL
    });
    expect(resolved.name).toBe("Carmen Corio");
    expect(resolved.source).toBe("profile");
    expect(resolved.hasName).toBe(true);
  });

  it("falls back to the self-person name from onboarding", () => {
    const resolved = resolveAccountName({ profileDisplayName: null, selfPersonName: "Carmen", email: EMAIL });
    expect(resolved.name).toBe("Carmen");
    expect(resolved.source).toBe("self-person");
  });

  it("reports no name when neither field holds one", () => {
    const resolved = resolveAccountName({ email: EMAIL });
    expect(resolved.name).toBeNull();
    expect(resolved.firstName).toBeNull();
    expect(resolved.source).toBeNull();
    expect(resolved.hasName).toBe(false);
  });

  it("treats blank and whitespace-only stored values as absent", () => {
    const resolved = resolveAccountName({ profileDisplayName: "   ", selfPersonName: "", email: EMAIL });
    expect(resolved.name).toBeNull();
    expect(resolved.hasName).toBe(false);
  });

  it("normalizes surrounding and internal whitespace", () => {
    const resolved = resolveAccountName({ profileDisplayName: "  Ana   Maria  " });
    expect(resolved.name).toBe("Ana Maria");
    expect(resolved.firstName).toBe("Ana");
  });
});

describe("resolveAccountName never presents an email as a name", () => {
  it("does not use the email or any fragment of it as the name", () => {
    const resolved = resolveAccountName({ email: EMAIL });
    expect(resolved.name).toBeNull();
    expect(resolved.firstName).toBeNull();
  });

  it("offers the full email only as the identity label, never the local part", () => {
    const resolved = resolveAccountName({ email: EMAIL });
    expect(resolved.identityLabel).toBe(EMAIL);
    expect(resolved.identityLabel).not.toBe("carmen.corio");
  });

  it("uses the name as the identity label once a name exists", () => {
    const resolved = resolveAccountName({ profileDisplayName: "Carmen Corio", email: EMAIL });
    expect(resolved.identityLabel).toBe("Carmen Corio");
  });

  it("returns a null identity label when there is neither a name nor an email", () => {
    expect(resolveAccountName().identityLabel).toBeNull();
    expect(resolveAccountName({}).identityLabel).toBeNull();
  });

  it("takes a stored name at face value even when it looks like an email local part", () => {
    // Deliberate: no cleanup heuristic. Guessing that a stored name is not a
    // real name would also reject someone who genuinely goes by that string.
    const resolved = resolveAccountName({ profileDisplayName: "carmenrcorio", email: "carmenrcorio@example.com" });
    expect(resolved.name).toBe("carmenrcorio");
    expect(resolved.source).toBe("profile");
  });
});

describe("splitFullName and joinFullName", () => {
  it("splits a two-word name into first and last", () => {
    expect(splitFullName("Carmen Corio")).toEqual({ firstName: "Carmen", lastName: "Corio" });
  });

  it("keeps a multi-part last name intact", () => {
    expect(splitFullName("Ana Maria de la Cruz")).toEqual({ firstName: "Ana", lastName: "Maria de la Cruz" });
  });

  it("handles a single name with no last name", () => {
    expect(splitFullName("Bear")).toEqual({ firstName: "Bear", lastName: "" });
  });

  it("handles null, undefined, and blank input", () => {
    expect(splitFullName(null)).toEqual({ firstName: "", lastName: "" });
    expect(splitFullName(undefined)).toEqual({ firstName: "", lastName: "" });
    expect(splitFullName("   ")).toEqual({ firstName: "", lastName: "" });
  });

  it("joins first and last into one stored value", () => {
    expect(joinFullName("Carmen", "Corio")).toBe("Carmen Corio");
    expect(joinFullName(" Carmen ", " Corio ")).toBe("Carmen Corio");
  });

  it("joins cleanly when the last name is missing", () => {
    expect(joinFullName("Bear", "")).toBe("Bear");
    expect(joinFullName("Bear", null)).toBe("Bear");
    expect(joinFullName("", "")).toBe("");
  });

  it("round trips so one stored column can back a two-field form", () => {
    for (const stored of ["Carmen Corio", "Bear", "Ana Maria de la Cruz", "Jean-Luc Picard"]) {
      const { firstName, lastName } = splitFullName(stored);
      expect(joinFullName(firstName, lastName)).toBe(stored);
    }
  });
});
