import { describe, expect, it } from "vitest";
import { eligibleForEmailSend, isDueForNudgeSend, NUDGE_SEND_TARGET_HOUR, ownerLocalHour, pickLeadNudgeRow } from "./nudge-send";

describe("ownerLocalHour / isDueForNudgeSend", () => {
  it("resolves the correct local hour for a real IANA zone", () => {
    // 2026-08-21T16:00:00Z is 09:00 America/Los_Angeles (PDT, UTC-7).
    const now = new Date("2026-08-21T16:00:00.000Z");
    expect(ownerLocalHour(now, "America/Los_Angeles")).toBe(9);
    expect(isDueForNudgeSend(now, "America/Los_Angeles")).toBe(true);
  });

  it("is not due outside the target hour", () => {
    const now = new Date("2026-08-21T16:00:00.000Z");
    expect(ownerLocalHour(now, "America/New_York")).toBe(12);
    expect(isDueForNudgeSend(now, "America/New_York")).toBe(false);
  });

  it("never fabricates a fallback hour for an unresolvable timezone — returns null, never due", () => {
    expect(ownerLocalHour(new Date(), "Not/A_Real_Zone")).toBeNull();
    expect(isDueForNudgeSend(new Date(), "Not/A_Real_Zone")).toBe(false);
  });

  it("a custom target hour is honored", () => {
    const now = new Date("2026-08-21T16:00:00.000Z"); // 12:00 America/New_York
    expect(isDueForNudgeSend(now, "America/New_York", 12)).toBe(true);
    expect(NUDGE_SEND_TARGET_HOUR).toBe(9);
  });

  it("hits every hour exactly once across a full UTC day for a fixed zone (no double-fire, no gap)", () => {
    const zone = "America/Los_Angeles";
    let dueCount = 0;
    for (let h = 0; h < 24; h++) {
      const now = new Date(Date.UTC(2026, 7, 21, h, 0, 0));
      if (isDueForNudgeSend(now, zone)) dueCount += 1;
    }
    expect(dueCount).toBe(1);
  });
});

describe("eligibleForEmailSend — minor-exclusion gate", () => {
  it("drops rows whose subject person is minor_safe", () => {
    const rows = [
      { person_id: "adult", copy_tier: "full", minor_safe: false },
      { person_id: "minor", copy_tier: "full", minor_safe: true }
    ];
    expect(eligibleForEmailSend(rows).map((r) => r.person_id)).toEqual(["adult"]);
  });

  it("drops rows flagged passed, defensively", () => {
    const rows = [
      { person_id: "living", copy_tier: "full", minor_safe: false, passed: false },
      { person_id: "gone", copy_tier: "full", minor_safe: false, passed: true }
    ];
    expect(eligibleForEmailSend(rows).map((r) => r.person_id)).toEqual(["living"]);
  });

  it("keeps everything when nothing is minor or passed", () => {
    const rows = [
      { person_id: "a", copy_tier: "full", minor_safe: false },
      { person_id: "b", copy_tier: "empty_hedge", minor_safe: false }
    ];
    expect(eligibleForEmailSend(rows)).toHaveLength(2);
  });
});

describe("pickLeadNudgeRow — one nudge leads, never a digest", () => {
  it("picks the first eligible row with real content, self-first order preserved", () => {
    const rows = [
      { person_id: "self", copy_tier: "empty_hedge" },
      { person_id: "partner", copy_tier: "full" }
    ];
    expect(pickLeadNudgeRow(rows, null)?.person_id).toBe("partner");
  });

  it("honors a pin — pinned person with real content sorts first via orderSkyRowsForHome", () => {
    const rows = [
      { person_id: "self", copy_tier: "full" },
      { person_id: "pinned", copy_tier: "full" }
    ];
    expect(pickLeadNudgeRow(rows, "pinned")?.person_id).toBe("pinned");
  });

  it("a pinned person with no real content that day does not lead over someone with content", () => {
    const rows = [
      { person_id: "pinned", copy_tier: "empty_hedge" },
      { person_id: "self", copy_tier: "full" }
    ];
    expect(pickLeadNudgeRow(rows, "pinned")?.person_id).toBe("self");
  });

  it("returns null when every row that day is empty_hedge — never fabricates a lead", () => {
    const rows = [
      { person_id: "self", copy_tier: "empty_hedge" },
      { person_id: "partner", copy_tier: "empty_hedge" }
    ];
    expect(pickLeadNudgeRow(rows, null)).toBeNull();
  });

  it("returns null on an empty row set", () => {
    expect(pickLeadNudgeRow([], null)).toBeNull();
  });

  it("minor-exclusion must happen upstream: this function has no minor awareness of its own", () => {
    // Deliberate: pickLeadNudgeRow's type doesn't even accept minor_safe —
    // proving callers cannot lean on it to filter minors. eligibleForEmailSend
    // must run first (asserted structurally, not just by convention).
    const rows: { person_id: string; copy_tier: string }[] = [{ person_id: "x", copy_tier: "full" }];
    expect(pickLeadNudgeRow(rows, null)).not.toBeNull();
  });
});
