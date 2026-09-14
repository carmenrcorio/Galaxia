import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RECORD_CLEAR_FILTERS,
  RECORD_DATE_FROM_LABEL,
  RECORD_DATE_TO_LABEL,
  RECORD_FILTER_EMPTY,
  RECORD_SEARCH_LABEL,
  RECORD_SEARCH_PLACEHOLDER,
  RECORD_TAG_ENTRY_LABEL,
  RECORD_TAG_FILTER_LABEL,
  RECORD_TAG_LABELS
} from "./record-copy";

const COPY_FILE = join(__dirname, "record-copy.ts");

describe("record-copy", () => {
  it("tags every authored string FOUNDER-REVIEW and never uses em dashes", () => {
    const src = readFileSync(COPY_FILE, "utf8");
    expect(src).toContain("FOUNDER-REVIEW");
    expect(src).not.toContain("\u2014");
    expect(src).not.toContain("\u2013");
    expect(RECORD_TAG_LABELS).toEqual({
      hard_conversation: "Hard conversation",
      breakthrough: "Breakthrough",
      conflict: "Conflict",
      celebration: "Celebration",
      pattern_noticed: "Pattern noticed",
      something_they_said: "Something they said"
    });
    expect(RECORD_SEARCH_PLACEHOLDER).toBe("Search this record");
    expect(RECORD_SEARCH_LABEL).toBe("Search this record");
    expect(RECORD_DATE_FROM_LABEL).toBe("From");
    expect(RECORD_DATE_TO_LABEL).toBe("To");
    expect(RECORD_TAG_FILTER_LABEL).toBe("Filter by tag");
    expect(RECORD_TAG_ENTRY_LABEL).toBe("Tag this note");
    expect(RECORD_FILTER_EMPTY).toBe("No entries match these filters.");
    expect(RECORD_CLEAR_FILTERS).toBe("Clear filters");
  });
});
