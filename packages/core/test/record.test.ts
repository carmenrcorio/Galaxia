import { describe, expect, it } from "vitest";
import {
  filterRecordEntries,
  formatRecordEntryDate,
  formatRecordMonthHeading,
  groupRecordEntriesByMonth,
  isRecordTag,
  RECORD_TAG_IDS,
  recordEntryMatches,
  recordMonthKey,
  sanitizeFtsQuery,
  sanitizeRecordTags,
  toggleRecordTag
} from "../src/record";

const mar = { body: "We finally said the hard thing about money", createdAt: "2026-03-15T12:00:00.000Z", tags: ["hard_conversation"] };
const feb = { body: "A small breakthrough in how we fight", createdAt: "2026-02-02T08:00:00.000Z", tags: ["breakthrough", "conflict"] };
const jan = { body: "They said I could call anytime", createdAt: "2026-01-20T18:30:00.000Z", tags: ["something_they_said"] };

describe("RECORD_TAG_IDS", () => {
  it("is the curated relational-journal list and rejects free text", () => {
    expect([...RECORD_TAG_IDS]).toEqual([
      "hard_conversation",
      "breakthrough",
      "conflict",
      "celebration",
      "pattern_noticed",
      "something_they_said"
    ]);
    expect(isRecordTag("hard_conversation")).toBe(true);
    expect(isRecordTag("freeform")).toBe(false);
    expect(sanitizeRecordTags(["conflict", "nope", "conflict", "celebration"])).toEqual([
      "conflict",
      "celebration"
    ]);
  });

  it("toggleRecordTag adds, removes, and stays inside the curated set", () => {
    expect(toggleRecordTag([], "breakthrough")).toEqual(["breakthrough"]);
    expect(toggleRecordTag(["breakthrough"], "breakthrough")).toEqual([]);
    expect(toggleRecordTag(["conflict"], "celebration")).toEqual(["conflict", "celebration"]);
  });
});

describe("record dates", () => {
  it("shows an explicit UTC date and groups by month newest first", () => {
    expect(formatRecordEntryDate(mar.createdAt)).toBe("Mar 15, 2026");
    expect(recordMonthKey(feb.createdAt)).toBe("2026-02");
    expect(formatRecordMonthHeading("2026-02")).toBe("February 2026");
    const groups = groupRecordEntriesByMonth([mar, feb, jan]);
    expect(groups.map((g) => g.heading)).toEqual(["March 2026", "February 2026", "January 2026"]);
    expect(groups[0]!.entries).toEqual([mar]);
  });
});

describe("recordEntryMatches", () => {
  it("searches body terms, date range, and curated tags", () => {
    expect(recordEntryMatches(mar, { q: "hard money" })).toBe(true);
    expect(recordEntryMatches(mar, { q: "hard vacation" })).toBe(false);
    expect(recordEntryMatches(feb, { from: "2026-02-01", to: "2026-02-28" })).toBe(true);
    expect(recordEntryMatches(feb, { from: "2026-03-01" })).toBe(false);
    expect(recordEntryMatches(jan, { tag: "something_they_said" })).toBe(true);
    expect(recordEntryMatches(jan, { tag: "celebration" })).toBe(false);
  });

  it("filterRecordEntries returns the loaded set when filters are empty", () => {
    const all = [mar, feb, jan];
    expect(filterRecordEntries(all, {})).toEqual(all);
    expect(filterRecordEntries(all, { q: "breakthrough" }).map((e) => e.body)).toEqual([feb.body]);
  });
});

describe("sanitizeFtsQuery", () => {
  it("strips tsquery operators so a typed search cannot break plainto_tsquery", () => {
    expect(sanitizeFtsQuery("  hello & (world):*  ")).toBe("hello world");
  });
});
