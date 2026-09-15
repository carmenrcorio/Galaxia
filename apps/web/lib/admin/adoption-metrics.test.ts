import { describe, expect, it, vi } from "vitest";
import {
  ADOPTION_METRIC_COLUMNS,
  ADOPTION_SECTIONS,
  formatAvg,
  formatCount,
  formatRefreshedAt,
  formatWeekDelta,
  parseAdminAdoptionMetrics,
  readAdminAdoptionMetrics,
  toNonNegativeNumber
} from "./adoption-metrics";

const FIXTURE_ROW = {
  total_accounts: 18,
  new_accounts_this_week: 3,
  active_accounts_this_week: 5,
  accounts_with_person: 10,
  total_people: 46,
  people_added_this_week: 5,
  avg_people_per_account: "4.60",
  memorial_or_ancient_profiles: 6,
  total_vela_conversations: 32,
  vela_messages_this_week: 3,
  compare_sessions: 0,
  compare_sessions_this_week: 0,
  total_groups: 2,
  groups_with_3_plus_members: 2,
  moments_logged: 0,
  connect_invites_sent: 2,
  connect_invites_accepted: 0,
  blog_email_captures: 0
};

describe("toNonNegativeNumber", () => {
  it("accepts numbers and numeric strings", () => {
    expect(toNonNegativeNumber(4, "x")).toBe(4);
    expect(toNonNegativeNumber("4.60", "avg")).toBe(4.6);
    expect(toNonNegativeNumber(0, "x")).toBe(0);
  });

  it("rejects negatives, NaN, and missing values", () => {
    expect(() => toNonNegativeNumber(-1, "x")).toThrow(/x is not a usable number/);
    expect(() => toNonNegativeNumber("nope", "x")).toThrow(/x is not a usable number/);
    expect(() => toNonNegativeNumber(undefined, "x")).toThrow(/x is not a usable number/);
  });
});

describe("parseAdminAdoptionMetrics", () => {
  it("coerces every column, including numeric strings from Postgres numeric", () => {
    const parsed = parseAdminAdoptionMetrics(FIXTURE_ROW);
    expect(parsed.total_accounts).toBe(18);
    expect(parsed.avg_people_per_account).toBe(4.6);
    expect(parsed.compare_sessions).toBe(0);
    expect(parsed.blog_email_captures).toBe(0);
  });

  it("throws when a required column is missing", () => {
    expect(() => parseAdminAdoptionMetrics({ total_accounts: 1 })).toThrow(
      /new_accounts_this_week is not a usable number/
    );
  });
});

describe("readAdminAdoptionMetrics", () => {
  it("selects the view through the passed service-role client and parses the row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: FIXTURE_ROW, error: null });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ select });
    const metrics = await readAdminAdoptionMetrics({ from } as never);
    expect(from).toHaveBeenCalledWith("admin_adoption_metrics");
    expect(select).toHaveBeenCalledWith(ADOPTION_METRIC_COLUMNS.join(", "));
    expect(metrics.total_people).toBe(46);
    expect(metrics.avg_people_per_account).toBe(4.6);
  });

  it("throws the PostgREST message when the query errors", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "permission denied" } });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ select });
    await expect(readAdminAdoptionMetrics({ from } as never)).rejects.toThrow("permission denied");
  });

  it("throws when the view returns no row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ select });
    await expect(readAdminAdoptionMetrics({ from } as never)).rejects.toThrow(
      "admin_adoption_metrics returned no row"
    );
  });
});

describe("formatters", () => {
  it("formats counts and week deltas without padding", () => {
    expect(formatCount(18)).toBe("18");
    expect(formatCount(0)).toBe("0");
    expect(formatWeekDelta(3)).toBe("+3 this week");
    expect(formatWeekDelta(0)).toBe("+0 this week");
  });

  it("formats the people-per-account average to two decimal places", () => {
    expect(formatAvg(4.6)).toBe("4.60");
    expect(formatAvg(0)).toBe("0.00");
  });

  it("formats last-refreshed as a UTC clock, never a local implicit zone", () => {
    expect(formatRefreshedAt(new Date("2026-09-15T02:16:00.000Z"))).toBe("15 Sep 2026, 02:16 UTC");
  });
});

describe("ADOPTION_SECTIONS", () => {
  it("covers all five metric groups and every view column exactly once as a value or week delta", () => {
    expect(ADOPTION_SECTIONS.map((s) => s.title)).toEqual([
      "Accounts",
      "Constellation",
      "Vela and Compare",
      "Groups",
      "Engagement"
    ]);
    const keys = ADOPTION_SECTIONS.flatMap((s) =>
      s.rows.flatMap((row) => (row.weekKey ? [row.valueKey, row.weekKey] : [row.valueKey]))
    );
    expect(keys.sort()).toEqual([...ADOPTION_METRIC_COLUMNS].sort());
  });
});
