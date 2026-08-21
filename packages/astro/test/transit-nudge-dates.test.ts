/**
 * VERIFY proofs for nudge-delivery Phase B1's tz-aware `ownerLocalDate` /
 * `whenUTCForOwnerLocalDate` (packages/astro/src/transit-nudge/dates.ts).
 *
 * Two guarantees under test:
 * 1. Regression: calling either function with NO third arg (every existing
 *    client caller — web home, web person page, mobile home) is
 *    byte-identical to the pre-B1 output for the same runtime tz.
 * 2. Tz-correctness: passing a valid IANA zone computes that zone's real
 *    calendar day / DST-correct local-noon UTC instant, independent of the
 *    process's own runtime tz (this test suite itself runs in the CI/VM's
 *    tz, typically UTC — the whole point of the server job).
 */
import { describe, expect, it } from "vitest";
import { ownerLocalDate, whenUTCForOwnerLocalDate } from "../src/transit-nudge/dates";

/** Pre-B1 reference implementation — runtime-local-tz only, no tz param. */
function preB1OwnerLocalDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function preB1WhenUTCForOwnerLocalDate(dateYYYYMMDD: string): string {
  const [y, m, d] = dateYYYYMMDD.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0).toISOString();
}

describe("ownerLocalDate — regression guard (omitted tz, existing callers unaffected)", () => {
  it("matches the pre-B1 runtime-tz output for a range of instants when timezone is omitted", () => {
    const samples = [
      new Date("2026-01-15T03:00:00.000Z"),
      new Date("2026-06-21T12:00:00.000Z"),
      new Date("2026-12-31T23:30:00.000Z"),
      new Date(),
    ];
    for (const now of samples) {
      expect(ownerLocalDate(now)).toBe(preB1OwnerLocalDate(now));
    }
  });

  it("matches the pre-B1 output when timezone is explicitly null or an invalid string (never throws)", () => {
    const now = new Date("2026-03-10T08:00:00.000Z");
    expect(ownerLocalDate(now, null)).toBe(preB1OwnerLocalDate(now));
    expect(ownerLocalDate(now, "Not/A_RealZone")).toBe(preB1OwnerLocalDate(now));
    expect(ownerLocalDate(now, "")).toBe(preB1OwnerLocalDate(now));
  });
});

describe("whenUTCForOwnerLocalDate — regression guard (omitted tz, existing callers unaffected)", () => {
  it("matches the pre-B1 runtime-tz output when timezone is omitted", () => {
    const dates = ["2026-01-15", "2026-06-21", "2026-12-31"];
    for (const date of dates) {
      expect(whenUTCForOwnerLocalDate(date)).toBe(preB1WhenUTCForOwnerLocalDate(date));
    }
  });

  it("matches the pre-B1 output when timezone is explicitly null or an invalid string", () => {
    const date = "2026-03-10";
    expect(whenUTCForOwnerLocalDate(date, new Date(), null)).toBe(preB1WhenUTCForOwnerLocalDate(date));
    expect(whenUTCForOwnerLocalDate(date, new Date(), "Not/A_RealZone")).toBe(preB1WhenUTCForOwnerLocalDate(date));
  });
});

describe("ownerLocalDate — tz-correctness for a non-UTC zone (the whole point of Phase B1)", () => {
  it("America/Los_Angeles: an instant that is already tomorrow in UTC is still 'today' in LA", () => {
    // 2026-01-16T03:00:00Z is 2026-01-15 19:00 PST (UTC-8) — LA is a full
    // calendar day behind UTC at this instant. On a UTC-runtime server (no
    // tz param), the runtime-tz path says "2026-01-16"; the LA-aware path
    // must say "2026-01-15" — a real, provable divergence, not a rounding
    // quirk. (Compared against the pre-B1 reference, not a hardcoded
    // string, so this holds regardless of the CI process's own tz.)
    const now = new Date("2026-01-16T03:00:00.000Z");
    expect(ownerLocalDate(now, "America/Los_Angeles")).toBe("2026-01-15");
    expect(ownerLocalDate(now)).toBe(preB1OwnerLocalDate(now));
  });

  it("America/Los_Angeles: standard time (PST, UTC-8) vs daylight time (PDT, UTC-7) both resolve correctly", () => {
    // Jan 15 noon PST -> 20:00 UTC same day.
    expect(whenUTCForOwnerLocalDate("2026-01-15", new Date(), "America/Los_Angeles")).toBe(
      "2026-01-15T20:00:00.000Z"
    );
    // Jul 15 noon PDT -> 19:00 UTC same day (DST offset, one hour less).
    expect(whenUTCForOwnerLocalDate("2026-07-15", new Date(), "America/Los_Angeles")).toBe(
      "2026-07-15T19:00:00.000Z"
    );
  });

  it("Pacific/Kiritimati (UTC+14): far-ahead zones compute a day that hasn't started yet in UTC", () => {
    // 2026-01-14T12:00:00Z is already 2026-01-15 02:00 in Kiritimati (UTC+14).
    const now = new Date("2026-01-14T12:00:00.000Z");
    expect(ownerLocalDate(now, "Pacific/Kiritimati")).toBe("2026-01-15");
    expect(ownerLocalDate(now)).not.toBe("2026-01-15");
  });
});
