import { describe, expect, it } from "vitest";
import { applyBirthFormUpgrade, birthFormFromPerson } from "./birth-form-upgrade";

describe("birthFormFromPerson", () => {
  it("does not treat a year-only YYYY-01-01 as a known birthday", () => {
    const form = birthFormFromPerson({
      birth_precision: "year",
      birth_date: "1952-01-01",
    });
    expect(form.precision).toBe("year");
    expect(form.yearOnly).toBe(1952);
    expect(form.month).toBeUndefined();
    expect(form.day).toBeUndefined();
    expect(form.year).toBeUndefined();
  });

  it("keeps a real date and time for exact precision", () => {
    const form = birthFormFromPerson({
      birth_precision: "exact",
      birth_date: "1987-12-29",
      birth_time: "22:30:00",
      birth_place: "Little Rock, Arkansas, United States",
      birth_lat: 34.7465,
      birth_lng: -92.2896,
      tz_offset_min: -360,
    });
    expect(form.precision).toBe("exact");
    expect(form.year).toBe(1987);
    expect(form.month).toBe(12);
    expect(form.day).toBe(29);
    expect(form.hour).toBe(22);
    expect(form.minute).toBe(30);
    expect(form.birthPlace).toBe("Little Rock, Arkansas, United States");
    expect(form.tzOffsetMin).toBe(-360);
  });
});

describe("applyBirthFormUpgrade", () => {
  it("year → date keeps the year and leaves month and day empty", () => {
    const upgraded = applyBirthFormUpgrade(
      {
        precision: "year",
        yearOnly: 1952,
      },
      "date"
    );
    expect(upgraded.precision).toBe("date");
    expect(upgraded.year).toBe(1952);
    expect(upgraded.month).toBeUndefined();
    expect(upgraded.day).toBeUndefined();
    expect(upgraded.yearOnly).toBeUndefined();
  });

  it("date → exact keeps the known date and place, and does not invent a time", () => {
    const upgraded = applyBirthFormUpgrade(
      {
        precision: "date",
        year: 1990,
        month: 7,
        day: 16,
        birthPlace: "Chicago, Illinois, United States",
        lat: "41.8781",
        lng: "-87.6298",
      },
      "exact"
    );
    expect(upgraded.precision).toBe("exact");
    expect(upgraded.year).toBe(1990);
    expect(upgraded.month).toBe(7);
    expect(upgraded.day).toBe(16);
    expect(upgraded.hour).toBeUndefined();
    expect(upgraded.minute).toBeUndefined();
    expect(upgraded.birthPlace).toBe("Chicago, Illinois, United States");
  });
});
