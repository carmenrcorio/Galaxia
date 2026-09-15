import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHART_READING_CLOSING_LINE,
  CHART_READING_CONFIRMATION,
  CHART_READING_FRAMING,
  CHART_READING_SUBMIT,
  chartReadingEmailSubject,
  chartReadingOpeningLine
} from "./chart-reading-copy";

describe("chart-reading authored copy", () => {
  it("tags every authored string FOUNDER-REVIEW and never uses U+2014", () => {
    const src = readFileSync(join(__dirname, "chart-reading-copy.ts"), "utf8");
    expect(src).toContain("FOUNDER-REVIEW");
    expect(src).not.toContain("\u2014");
    for (const value of [
      CHART_READING_FRAMING,
      CHART_READING_SUBMIT,
      CHART_READING_CONFIRMATION,
      CHART_READING_CLOSING_LINE,
      chartReadingEmailSubject("Cancer"),
      chartReadingEmailSubject(null),
      chartReadingOpeningLine({ personName: "Sam", sample: false }),
      chartReadingOpeningLine({ personName: null, sample: true, sunSign: "Capricorn", moonSign: "Taurus" })
    ]) {
      expect(value).not.toContain("\u2014");
      expect(value).not.toMatch(/your astrology reading/i);
    }
    expect(CHART_READING_CONFIRMATION).not.toContain("!");
    expect(chartReadingEmailSubject(null)).not.toMatch(/^astrology/i);
  });
});
