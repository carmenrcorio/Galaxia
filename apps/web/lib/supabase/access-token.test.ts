import { describe, expect, it } from "vitest";
import { accessTokenFromAuthorizationHeader } from "./access-token";

describe("accessTokenFromAuthorizationHeader", () => {
  it("reads a Bearer JWT and ignores surrounding whitespace", () => {
    expect(accessTokenFromAuthorizationHeader("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(accessTokenFromAuthorizationHeader("  Bearer abc.def.ghi  ")).toBe("abc.def.ghi");
    expect(accessTokenFromAuthorizationHeader("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("rejects missing, empty, and non-Bearer headers", () => {
    expect(accessTokenFromAuthorizationHeader(null)).toBeNull();
    expect(accessTokenFromAuthorizationHeader(undefined)).toBeNull();
    expect(accessTokenFromAuthorizationHeader("")).toBeNull();
    expect(accessTokenFromAuthorizationHeader("Basic abc")).toBeNull();
    expect(accessTokenFromAuthorizationHeader("Bearer")).toBeNull();
    expect(accessTokenFromAuthorizationHeader("Bearer ")).toBeNull();
  });
});
