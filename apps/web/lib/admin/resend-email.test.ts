import { describe, expect, it } from "vitest";
import { determineResendEmailType } from "./resend-email";

describe("determineResendEmailType — pure branch decision", () => {
  it("an unconfirmed signup (email_confirmed_at null) branches to confirmation", () => {
    expect(determineResendEmailType({ email_confirmed_at: null })).toBe("confirmation");
  });

  it("an unconfirmed signup (email_confirmed_at undefined/missing) also branches to confirmation", () => {
    expect(determineResendEmailType({})).toBe("confirmation");
  });

  it("a confirmed user branches to reset, never confirmation", () => {
    expect(determineResendEmailType({ email_confirmed_at: "2026-01-01T00:00:00.000Z" })).toBe("reset");
  });

  it("never sends a single generic email regardless of state — the two branches are mutually exclusive for every input", () => {
    for (const confirmedAt of [null, undefined, "2020-01-01T00:00:00.000Z", "2026-08-22T00:00:00.000Z"]) {
      const result = determineResendEmailType({ email_confirmed_at: confirmedAt });
      expect(["confirmation", "reset"]).toContain(result);
      expect(result).toBe(confirmedAt ? "reset" : "confirmation");
    }
  });
});
