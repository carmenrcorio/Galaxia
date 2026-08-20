import { describe, expect, it } from "vitest";
import { shouldBackfillTimezone, validateIanaTimezone } from "../src/timezone";

describe("validateIanaTimezone", () => {
  it("accepts a real IANA zone", () => {
    expect(validateIanaTimezone("America/New_York")).toBe("America/New_York");
    expect(validateIanaTimezone("UTC")).toBe("UTC");
  });

  it("rejects garbage strings the runtime would throw on", () => {
    expect(validateIanaTimezone("Not/A/Real/Zone")).toBeNull();
    expect(validateIanaTimezone("America/NotACity")).toBeNull();
    expect(validateIanaTimezone("<script>")).toBeNull();
  });

  it("rejects null/empty/undefined without throwing", () => {
    expect(validateIanaTimezone(null)).toBeNull();
    expect(validateIanaTimezone(undefined)).toBeNull();
    expect(validateIanaTimezone("")).toBeNull();
  });
});

describe("shouldBackfillTimezone", () => {
  it("backfills when the stored value is missing", () => {
    expect(shouldBackfillTimezone(null)).toBe(true);
    expect(shouldBackfillTimezone(undefined)).toBe(true);
    expect(shouldBackfillTimezone("")).toBe(true);
    expect(shouldBackfillTimezone("   ")).toBe(true);
  });

  it("never backfills once a value is stored — no write-amplification on repeat loads", () => {
    expect(shouldBackfillTimezone("America/New_York")).toBe(false);
    expect(shouldBackfillTimezone("UTC")).toBe(false);
  });
});
