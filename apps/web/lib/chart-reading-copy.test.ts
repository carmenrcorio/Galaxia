import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHART_READING_BIRTH_DATA_NOTE,
  CHART_READING_CLOSING_LINE,
  CHART_READING_SAMPLE_NO_BIRTH_DATE,
  CHART_READING_CONFIRMATION,
  CHART_READING_SUBMIT,
  CHART_READING_TIME_HELP_LABEL,
  CHART_READING_TIME_HELP_SHORT,
  CHART_READING_TIME_HELP_WITTY,
  chartReadingEmailSubject,
  chartReadingOpeningLine
} from "./chart-reading-copy";

describe("chart-reading authored copy", () => {
  it("never uses U+2014 in authored chart-reading copy", () => {
    const src = readFileSync(join(__dirname, "chart-reading-copy.ts"), "utf8");
    expect(src).not.toContain("\u2014");
    for (const value of [
      CHART_READING_BIRTH_DATA_NOTE,
      CHART_READING_TIME_HELP_LABEL,
      CHART_READING_TIME_HELP_SHORT,
      CHART_READING_TIME_HELP_WITTY,
      CHART_READING_SUBMIT,
      CHART_READING_CONFIRMATION,
      CHART_READING_CLOSING_LINE,
      CHART_READING_SAMPLE_NO_BIRTH_DATE,
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
