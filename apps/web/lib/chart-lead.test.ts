import { describe, expect, it } from "vitest";
import {
  isValidChartLeadEmail,
  normalizeChartLeadEmail,
  parseChartLeadBirthInput,
} from "./chart-lead";

describe("chart lead email", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeChartLeadEmail("  Sky@Example.COM ")).toBe("sky@example.com");
  });

  it("accepts a normal address and rejects malformed or oversized addresses", () => {
    expect(isValidChartLeadEmail("sky@example.com")).toBe(true);
    expect(isValidChartLeadEmail("not-an-email")).toBe(false);
    expect(isValidChartLeadEmail(`${"a".repeat(245)}@example.com`)).toBe(false);
  });
});

describe("parseChartLeadBirthInput", () => {
  it("keeps only validated birth input fields", () => {
    expect(parseChartLeadBirthInput({
      precision: "exact",
      month: 6,
      day: 15,
      year: 1990,
      hour: 10,
      minute: 30,
      birthPlace: "  Austin, Texas, United States  ",
      lat: "30.2672",
      lng: "-97.7431",
      tzOffsetMin: -300,
      tzId: "America/Chicago",
      name: "must not persist",
      chart: { placements: ["must not persist"] },
    })).toEqual({
      precision: "exact",
      month: 6,
      day: 15,
      year: 1990,
      hour: 10,
      minute: 30,
      birthPlace: "Austin, Texas, United States",
      lat: "30.2672",
      lng: "-97.7431",
      tzOffsetMin: -300,
      tzId: "America/Chicago",
    });
  });

  it("supports date and year precision", () => {
    expect(parseChartLeadBirthInput({ precision: "date", month: 6, day: 15, year: 1990 })).toEqual({
      precision: "date",
      month: 6,
      day: 15,
      year: 1990,
    });
    expect(parseChartLeadBirthInput({ precision: "year", yearOnly: 1990 })).toEqual({
      precision: "year",
      yearOnly: 1990,
    });
  });

  it("rejects invalid dates, exact births without timezone, and out-of-range coordinates", () => {
    expect(() => parseChartLeadBirthInput({ precision: "date", month: 2, day: 31, year: 1990 })).toThrow("Invalid date");
    expect(() => parseChartLeadBirthInput({
      precision: "exact",
      month: 6,
      day: 15,
      year: 1990,
      hour: 10,
      minute: 30,
    })).toThrow("resolved timezone");
    expect(() => parseChartLeadBirthInput({
      precision: "date",
      month: 6,
      day: 15,
      year: 1990,
      lat: "91",
    })).toThrow("latitude");
  });
});
