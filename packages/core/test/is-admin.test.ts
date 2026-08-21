import { describe, expect, it } from "vitest";
import { isAdmin } from "../src/is-admin";

describe("isAdmin", () => {
  it("fails closed when there is no admin_users row at all", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("fails closed on a row with no role / an empty role", () => {
    expect(isAdmin({ role: null })).toBe(false);
    expect(isAdmin({ role: undefined })).toBe(false);
    expect(isAdmin({ role: "" })).toBe(false);
  });

  it("fails closed on an unrecognized role value (vocabulary can grow, but unknown != admin)", () => {
    expect(isAdmin({ role: "support" })).toBe(false);
    expect(isAdmin({ role: "suspended" })).toBe(false);
    expect(isAdmin({ role: "ADMIN" })).toBe(false); // case-sensitive on purpose — no silent widening
  });

  it("grants admin only for a recognized admin role value", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });
});
