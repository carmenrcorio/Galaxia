import { describe, expect, it } from "vitest";
import { formatWithdrawnReasonForDisplay } from "./record";

describe("formatWithdrawnReasonForDisplay", () => {
  it("restates asserted-vs-computed audit voice without log jargon", () => {
    const raw =
      "Asserted Jamie Chen has a Cancer Sun; computed chart shows Leo Sun (confident). Detected by fabrication audit, 2026-07-10.";
    expect(formatWithdrawnReasonForDisplay(raw)).toBe(
      "Vela said Jamie Chen has a Cancer Sun, but the chart on file shows Leo Sun. We withdrew that answer on July 10, 2026."
    );
  });

  it("restates year-only assertion withdrawals plainly", () => {
    const raw =
      "Asserted a confident Cancer Sun for a year-only birth; the Sun sign is uncertain and cannot be determined from a birth year alone. Detected by fabrication audit, 2026-07-10.";
    expect(formatWithdrawnReasonForDisplay(raw)).toBe(
      "Vela stated a Cancer Sun for a year-only birth — the Sun sign is uncertain and cannot be determined from a birth year alone. That didn't hold against the chart on file, so we withdrew that answer on July 10, 2026."
    );
  });

  it("restates dual-placement mismatches", () => {
    const raw =
      "Asserted Pisces Sun / Scorpio Moon; computed chart shows Capricorn Sun / Taurus Moon (confident). Detected by fabrication audit, 2026-07-10.";
    expect(formatWithdrawnReasonForDisplay(raw)).toBe(
      "Vela said Pisces Sun / Scorpio Moon, but the chart on file shows Capricorn Sun / Taurus Moon. We withdrew that answer on July 10, 2026."
    );
  });

  it("never returns empty — falls back when reason missing", () => {
    expect(formatWithdrawnReasonForDisplay(null)).toMatch(/withdrew/i);
    expect(formatWithdrawnReasonForDisplay("")).toMatch(/withdrew/i);
  });

  it("does not emit internal audit phrasing", () => {
    const out = formatWithdrawnReasonForDisplay(
      "Asserted Jamie Chen has a Cancer Sun; computed chart shows Leo Sun (confident). Detected by fabrication audit, 2026-07-10."
    );
    expect(out.toLowerCase()).not.toContain("fabrication audit");
    expect(out.toLowerCase()).not.toContain("detected by");
    expect(out.toLowerCase()).not.toContain("(confident)");
  });
});
