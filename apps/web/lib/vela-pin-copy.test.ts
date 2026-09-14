import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PIN_THEME_LABELS,
  VELA_PIN_NO_THEME,
  VELA_PIN_SEARCH_EMPTY,
  VELA_PIN_SEARCH_LABEL,
  VELA_PIN_SEARCH_PLACEHOLDER,
  VELA_PIN_SHOW_LATEST,
  VELA_PIN_SORT_LABEL,
  VELA_PIN_SORT_NEWEST,
  VELA_PIN_SORT_OLDEST,
  VELA_PIN_THEME_GROUP_UNTHEMED,
  VELA_PIN_THEME_LABEL,
  VELA_PIN_THEME_SUGGESTED,
  velaPinSeeAllLabel
} from "./vela-pin-copy";

const COPY_FILE = join(__dirname, "vela-pin-copy.ts");

describe("vela-pin-copy", () => {
  it("tags every authored string FOUNDER-REVIEW and never uses em dashes", () => {
    const src = readFileSync(COPY_FILE, "utf8");
    expect(src).toContain("FOUNDER-REVIEW");
    expect(src).not.toContain("\u2014");
    expect(src).not.toContain("\u2013");
    expect(PIN_THEME_LABELS).toEqual({
      how_theyre_built: "How they're built",
      how_you_two_work: "How you two work",
      this_season: "This season",
      talking: "Talking",
      tension: "Tension",
      care: "Care",
      family: "Family",
      work: "Work"
    });
    expect(VELA_PIN_SEARCH_PLACEHOLDER).toBe("Search pinned insights");
    expect(VELA_PIN_SEARCH_LABEL).toBe("Search pinned insights");
    expect(VELA_PIN_SORT_LABEL).toBe("Sort pinned insights");
    expect(VELA_PIN_SORT_NEWEST).toBe("Newest");
    expect(VELA_PIN_SORT_OLDEST).toBe("Oldest");
    expect(VELA_PIN_SHOW_LATEST).toBe("Show the latest 5");
    expect(velaPinSeeAllLabel(12)).toBe("See all 12");
    expect(VELA_PIN_SEARCH_EMPTY).toBe("No pinned insights match this search.");
    expect(VELA_PIN_THEME_LABEL).toBe("Theme");
    expect(VELA_PIN_NO_THEME).toBe("No theme");
    expect(VELA_PIN_THEME_GROUP_UNTHEMED).toBe("No theme");
    expect(VELA_PIN_THEME_SUGGESTED).toBe("Suggested from the insight. Keep it, change it, or clear it.");
  });
});
