/**
 * End-to-end VERIFY proofs for the transit nudge engine spec (audit item 3).
 * These are behavioral proofs driven through the real production pipeline
 * (computeNatalChart → buildPersonDailyNudge, i.e. eligibility + selection +
 * copy resolution) across a real date range with real ephemeris — not
 * hand-picked buildPassId() calls or hand-constructed EnrichedTransitHit
 * fixtures like `transit-nudge.test.ts`.
 *
 * The concurrent-write and RLS-isolation proofs from the same audit item are
 * NOT here: they require a real Postgres unique constraint / real Supabase
 * JWTs, and this monorepo has no local Supabase stack (see AGENTS.md). They
 * are runnable scripts instead — `scripts/verify-person-daily-nudges-concurrency.mjs`
 * and `scripts/verify-person-daily-nudges-rls.mjs` — run against the live
 * project and reported separately, per the same "write it as a runnable
 * script and say so" allowance the audit gives for RLS isolation.
 */
import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import { buildPersonDailyNudge } from "../src/transit-nudge";

const MS_PER_DAY = 86_400_000;

describe("VERIFY: multi-pass slow transit is silent between passes", () => {
  // Real chart, real range. Saturn square natal Uranus for this chart makes
  // exactly three real exact passes across 2025-01-01..2027-06-19 (900 days):
  // a direct pass (2026-04-22), the retrograde re-pass (2026-11-24, ":R"),
  // and the final direct pass (2026-12-27) — the classic "station wobble"
  // triple hit for a slow outer transit. Discovered by scanning the real
  // pipeline, not asserted from astrological priors.
  const chart = computeNatalChart({
    dateUTC: "1990-06-15T12:00:00.000Z",
    precision: "exact",
    lat: 40.7,
    lng: -74.0,
  });
  const rangeStart = new Date("2025-01-01T12:00:00.000Z");
  const rangeDays = 900;

  function rowsAcrossRange() {
    const rows: { date: string; row: ReturnType<typeof buildPersonDailyNudge> }[] = [];
    for (let i = 0; i < rangeDays; i += 1) {
      const when = new Date(rangeStart.getTime() + i * MS_PER_DAY);
      const date = when.toISOString().slice(0, 10);
      const row = buildPersonDailyNudge({
        ownerId: "owner",
        personId: "person",
        date,
        whenUTC: when.toISOString(),
        chart,
        birthPrecision: "exact",
        birthDate: "1990-06-15",
        relation: "self",
        isSelf: true,
        minorSafe: false,
      });
      rows.push({ date, row });
    }
    return rows;
  }

  it("selects saturn square natal uranus on exactly 3 distinct pass_ids over ~2.5 years", () => {
    const rows = rowsAcrossRange();
    const matches = rows.filter(
      ({ row }) => row.transit_body === "saturn" && row.natal_body === "uranus" && row.aspect_type === "square"
    );
    const distinctPassIds = new Set(matches.map((m) => m.row.pass_id));

    expect(matches.length).toBeGreaterThan(0);
    expect(distinctPassIds.size).toBe(3);

    // Each distinct pass_id clusters near a real exact_at — never a
    // fabricated or hand-picked one; it comes straight out of the row the
    // real selection path produced.
    for (const passId of distinctPassIds) {
      const example = matches.find((m) => m.row.pass_id === passId)!.row;
      expect(example.exact_at).toBeTruthy();
      expect(example.orb_deg).not.toBeNull();
    }
  });

  it("is silent for this transit across the multi-month gap between passes", () => {
    const rows = rowsAcrossRange();
    // The first pass clears by 2026-04-27; the retrograde re-pass does not
    // begin until ~2026-11-11 — a >5 month silent gap where the old
    // (unwindowed) behavior would have kept repeating this transit daily.
    const quietWindow = rows.filter(({ date }) => date >= "2026-05-15" && date <= "2026-10-15");
    expect(quietWindow.length).toBeGreaterThan(100);

    const quietMatches = quietWindow.filter(
      ({ row }) => row.transit_body === "saturn" && row.natal_body === "uranus" && row.aspect_type === "square"
    );
    expect(quietMatches).toHaveLength(0);
  });

  it("never selects this transit outside its per-body degree window (real selection path)", () => {
    const rows = rowsAcrossRange();
    const matches = rows.filter(
      ({ row }) => row.transit_body === "saturn" && row.natal_body === "uranus" && row.aspect_type === "square"
    );
    // saturn's exactness window is 0.55° (windows.ts) — every day the real
    // pipeline selected this transit, the orb it wrote must respect that.
    for (const { row } of matches) {
      expect(row.orb_deg).not.toBeNull();
      expect(Math.abs(row.orb_deg!)).toBeLessThanOrEqual(0.55);
    }
  });
});

describe("VERIFY: precision side-by-side, same person/date, exact vs date_sign", () => {
  const birthDateUTC = "1990-06-15T12:00:00.000Z";
  const birthDate = "1990-06-15";
  const exactChart = computeNatalChart({ dateUTC: birthDateUTC, precision: "exact", lat: 40.7, lng: -74.0 });
  const dateSignChart = computeNatalChart({ dateUTC: birthDateUTC, precision: "date" });

  // Real day, real pipeline: exact mode picks a transit Moon → natal Moon hit
  // with a real orb; date_sign for the SAME person/date, run through the
  // same buildPersonDailyNudge, lands on a different (non-Moon) natal target
  // because eligibility disqualifies Moon and never stores orb_deg outside
  // exact mode. Discovered by scanning, not asserted from priors.
  const sameDay = "2026-07-05";
  const whenUTC = "2026-07-05T12:00:00.000Z";

  function build(chart: typeof exactChart, birthPrecision: "exact" | "date") {
    return buildPersonDailyNudge({
      ownerId: "owner",
      personId: "person",
      date: sameDay,
      whenUTC,
      chart,
      birthPrecision,
      birthDate,
      relation: "self",
      isSelf: true,
      minorSafe: false,
    });
  }

  it("exact mode targets natal Moon with a real orb_deg for this person/date", () => {
    const row = build(exactChart, "exact");
    expect(row.precision_mode).toBe("exact");
    expect(row.natal_body).toBe("moon");
    expect(row.orb_deg).not.toBeNull();
    expect(typeof row.orb_deg).toBe("number");
  });

  it("date_sign mode, same person/date, never targets natal Moon and never writes orb_deg", () => {
    const row = build(dateSignChart, "date");
    expect(row.precision_mode).toBe("date_sign");
    expect(row.orb_deg).toBeNull();
    expect(row.natal_body).not.toBe("moon");
  });

  it("holds across a wider scan, not just the one cherry-picked day", () => {
    const start = new Date("2026-01-01T12:00:00.000Z");
    let sawExactMoonHit = false;
    for (let i = 0; i < 400; i += 1) {
      const when = new Date(start.getTime() + i * MS_PER_DAY);
      const date = when.toISOString().slice(0, 10);
      const exactDay = buildPersonDailyNudge({
        ownerId: "owner",
        personId: "person",
        date,
        whenUTC: when.toISOString(),
        chart: exactChart,
        birthPrecision: "exact",
        birthDate,
        relation: "self",
        isSelf: true,
        minorSafe: false,
      });
      const dateSignDay = buildPersonDailyNudge({
        ownerId: "owner",
        personId: "person",
        date,
        whenUTC: when.toISOString(),
        chart: dateSignChart,
        birthPrecision: "date",
        birthDate,
        relation: "self",
        isSelf: true,
        minorSafe: false,
      });
      // date_sign never fabricates a Moon target or an orb_deg, on any day.
      expect(dateSignDay.orb_deg).toBeNull();
      expect(dateSignDay.natal_body).not.toBe("moon");
      if (exactDay.natal_body === "moon" && exactDay.orb_deg != null) sawExactMoonHit = true;
    }
    // Sanity: exact mode does, somewhere in this range, target Moon with a
    // real orb — proving the contrast is real and not just "never happens".
    expect(sawExactMoonHit).toBe(true);
  });
});
