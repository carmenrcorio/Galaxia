import { describe, expect, it } from "vitest";
import {
  MEMORIAL_MILESTONE_NOTE_MAX,
  MEMORIAL_MILESTONE_TITLE_MAX,
  memorialTimelineWindow,
  shouldShowMemorialTimeline,
  validateMemorialMilestoneInput,
} from "../src/index";

describe("shouldShowMemorialTimeline", () => {
  it("shows only for a passed, non-self person with a real (non-year-only) chart", () => {
    const passed = { passed_at: "2024-01-01T00:00:00.000Z", is_self: false };
    expect(shouldShowMemorialTimeline(passed, { precision: "exact" })).toBe(true);
    expect(shouldShowMemorialTimeline(passed, { precision: "date" })).toBe(true);
  });

  it("hides for year-only charts (never fabricate a return from a sampled longitude)", () => {
    const passed = { passed_at: "2024-01-01T00:00:00.000Z", is_self: false };
    expect(shouldShowMemorialTimeline(passed, { precision: "year" })).toBe(false);
  });

  it("hides for living people, self, missing chart, or missing person", () => {
    expect(shouldShowMemorialTimeline({ passed_at: null, is_self: false }, { precision: "exact" })).toBe(false);
    expect(shouldShowMemorialTimeline({ passed_at: "2024-01-01T00:00:00.000Z", is_self: true }, { precision: "exact" })).toBe(false);
    expect(shouldShowMemorialTimeline({ passed_at: "2024-01-01T00:00:00.000Z", is_self: false }, null)).toBe(false);
    expect(shouldShowMemorialTimeline(null, { precision: "exact" })).toBe(false);
  });
});

describe("memorialTimelineWindow", () => {
  it("uses died_on as the honest end date when recorded", () => {
    const win = memorialTimelineWindow({ died_on: "2020-05-04" });
    expect(win.endIsKnown).toBe(true);
    expect(win.endDateUTC).toBe("2020-05-04T12:00:00.000Z");
  });

  it("falls back to now — never a fabricated end date — when unrecorded", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const win = memorialTimelineWindow({ died_on: null }, now);
    expect(win.endIsKnown).toBe(false);
    expect(win.endDateUTC).toBe(now.toISOString());
  });
});

describe("validateMemorialMilestoneInput", () => {
  it("accepts a valid trimmed title + note", () => {
    const result = validateMemorialMilestoneInput({ title: "  Married Mom  ", note: "  At the lake house.  ", date: "2001-06-01" });
    expect(result).toEqual({ ok: true, title: "Married Mom", note: "At the lake house." });
  });

  it("treats an empty/whitespace note as null", () => {
    const result = validateMemorialMilestoneInput({ title: "Started the bakery", note: "   ", date: "1998-01-01" });
    expect(result.ok).toBe(true);
    expect(result.ok && result.note).toBeNull();
  });

  it("requires a date and a non-empty title", () => {
    expect(validateMemorialMilestoneInput({ title: "Something", date: undefined }).ok).toBe(false);
    expect(validateMemorialMilestoneInput({ title: "  ", date: "2001-01-01" }).ok).toBe(false);
  });

  it("enforces the DB check-constraint lengths (title 100, note 500)", () => {
    const longTitle = "x".repeat(MEMORIAL_MILESTONE_TITLE_MAX + 1);
    const longNote = "y".repeat(MEMORIAL_MILESTONE_NOTE_MAX + 1);
    expect(validateMemorialMilestoneInput({ title: longTitle, date: "2001-01-01" }).ok).toBe(false);
    expect(validateMemorialMilestoneInput({ title: "ok", note: longNote, date: "2001-01-01" }).ok).toBe(false);
    expect(
      validateMemorialMilestoneInput({ title: "x".repeat(MEMORIAL_MILESTONE_TITLE_MAX), date: "2001-01-01" }).ok
    ).toBe(true);
  });
});
