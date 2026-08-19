import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("rejects absolute URLs with a scheme", () => {
    expect(safeNextPath("https://evil.com")).toBe("/start");
    expect(safeNextPath("http://evil.com")).toBe("/start");
    // "://" anywhere in the value is rejected, not just at the start.
    expect(safeNextPath("/redirect?to=https://evil.com")).toBe("/start");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBe("/start");
  });

  it("rejects the backslash-as-slash variant", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/start");
  });

  it("rejects a value with no leading slash", () => {
    expect(safeNextPath("evil.com")).toBe("/start");
  });

  it("falls back for empty, null, and undefined", () => {
    expect(safeNextPath("")).toBe("/start");
    expect(safeNextPath(null)).toBe("/start");
    expect(safeNextPath(undefined)).toBe("/start");
  });

  it("returns a plain internal path unchanged", () => {
    expect(safeNextPath("/app")).toBe("/app");
  });

  it("preserves query strings on internal paths", () => {
    expect(safeNextPath("/app/person/123?x=1")).toBe("/app/person/123?x=1");
    expect(safeNextPath("/welcome?prefill=abc")).toBe("/welcome?prefill=abc");
  });

  it("honors a custom fallback", () => {
    expect(safeNextPath("https://evil.com", "/app")).toBe("/app");
    expect(safeNextPath(null, "/")).toBe("/");
  });
});
