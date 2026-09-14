import { describe, expect, it } from "vitest";
import {
  filterRecordEntries,
  formatRecordEntryDate,
  formatRecordMonthHeading,
  groupPinnedInsightsByTheme,
  groupRecordEntriesByMonth,
  isMomentType,
  isPinTheme,
  isRecordTag,
  momentRecordBody,
  MOMENT_TYPE_IDS,
  MOMENT_TYPE_LABELS,
  PIN_THEME_IDS,
  RECORD_TAG_IDS,
  recordEntryMatches,
  recordMonthKey,
  sanitizeFtsQuery,
  sanitizeMomentType,
  sanitizePinTheme,
  sanitizeRecordTags,
  suggestPinTheme,
  toggleRecordTag,
  visiblePinnedInsights
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
      "something_they_said",
      "silence_needed_filling"
    ]);
    expect(isRecordTag("hard_conversation")).toBe(true);
    expect(isRecordTag("silence_needed_filling")).toBe(true);
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

describe("MOMENT_TYPE_IDS", () => {
  it("is a Record-tag subset and never includes pattern_noticed", () => {
    expect([...MOMENT_TYPE_IDS]).toEqual([
      "hard_conversation",
      "breakthrough",
      "conflict",
      "celebration",
      "silence_needed_filling",
      "something_they_said"
    ]);
    for (const id of MOMENT_TYPE_IDS) {
      expect(RECORD_TAG_IDS).toContain(id);
    }
    expect(isMomentType("pattern_noticed")).toBe(false);
    expect(isMomentType("silence_needed_filling")).toBe(true);
    expect(sanitizeMomentType("conflict")).toBe("conflict");
    expect(sanitizeMomentType("invented")).toBeNull();
    expect(momentRecordBody("celebration", "")).toBe(MOMENT_TYPE_LABELS.celebration);
    expect(momentRecordBody("celebration", "  We danced in the kitchen.  ")).toBe("We danced in the kitchen.");
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

describe("PIN_THEME_IDS", () => {
  it("is the curated pin-theme list and rejects free text", () => {
    expect([...PIN_THEME_IDS]).toEqual([
      "how_theyre_built",
      "how_you_two_work",
      "this_season",
      "talking",
      "tension",
      "care",
      "family",
      "work"
    ]);
    expect(isPinTheme("how_theyre_built")).toBe(true);
    expect(isPinTheme("invented_at_runtime")).toBe(false);
    expect(sanitizePinTheme("talking")).toBe("talking");
    expect(sanitizePinTheme("foobar")).toBeNull();
    expect(sanitizePinTheme(null)).toBeNull();
  });
});

describe("suggestPinTheme", () => {
  it("picks from the curated list based on the insight body and never invents", () => {
    expect(suggestPinTheme("Her natal Moon in the 4th house is how she's wired.")).toBe("how_theyre_built");
    expect(suggestPinTheme("The two of you keep looping this synastry pattern.")).toBe("how_you_two_work");
    expect(suggestPinTheme("This week's transit is landing right now.")).toBe("this_season");
    expect(suggestPinTheme("What to say in that conversation, and how to listen.")).toBe("talking");
    expect(suggestPinTheme("The friction and the clash keep showing up as a square.")).toBe("tension");
    expect(suggestPinTheme("What they need from you so they feel seen.")).toBe("care");
    expect(suggestPinTheme("Parenting your child when family tension is high.")).toBe("family");
    expect(suggestPinTheme("Your colleague at work, and the boss dynamic.")).toBe("work");
    expect(suggestPinTheme("A quiet afternoon with tea and a long walk.")).toBeNull();
  });
});

describe("visiblePinnedInsights", () => {
  const pins = [
    { id: "1", body: "Moon in Cancer, how she's wired", createdAt: "2026-06-01T00:00:00.000Z", theme: "how_theyre_built" as const },
    { id: "2", body: "The two of you in synastry", createdAt: "2026-05-01T00:00:00.000Z", theme: "how_you_two_work" as const },
    { id: "3", body: "Transit this week", createdAt: "2026-04-01T00:00:00.000Z", theme: "this_season" as const },
    { id: "4", body: "What to say", createdAt: "2026-03-01T00:00:00.000Z", theme: "talking" as const },
    { id: "5", body: "The friction", createdAt: "2026-02-01T00:00:00.000Z", theme: "tension" as const },
    { id: "6", body: "Unthemed older pin", createdAt: "2026-01-01T00:00:00.000Z", theme: null }
  ];

  it("collapses to five newest by default and expands on search or see-all", () => {
    const collapsed = visiblePinnedInsights(pins, { sort: "newest", expanded: false });
    expect(collapsed.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5"]);
    const oldest = visiblePinnedInsights(pins, { sort: "oldest", expanded: false });
    expect(oldest.map((p) => p.id)).toEqual(["6", "5", "4", "3", "2"]);
    const all = visiblePinnedInsights(pins, { sort: "newest", expanded: true });
    expect(all.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
    const searched = visiblePinnedInsights(pins, { q: "synastry", sort: "newest", expanded: false });
    expect(searched.map((p) => p.id)).toEqual(["2"]);
  });

  it("groups in curated order with unthemed last", () => {
    const groups = groupPinnedInsightsByTheme(pins);
    expect(groups.map((g) => g.theme)).toEqual([
      "how_theyre_built",
      "how_you_two_work",
      "this_season",
      "talking",
      "tension",
      null
    ]);
    expect(groups.at(-1)!.entries.map((e) => e.id)).toEqual(["6"]);
  });
});
