import { describe, expect, it } from "vitest";
import { computeReadTimeMinutes } from "./read-time";

function words(n: number): string {
  return Array.from({ length: n }, () => "word").join(" ");
}

describe("computeReadTimeMinutes", () => {
  it("returns 1 for empty copy", () => {
    expect(computeReadTimeMinutes("")).toBe(1);
    expect(computeReadTimeMinutes("   \n\n  ")).toBe(1);
  });

  it("ceils words / 225", () => {
    expect(computeReadTimeMinutes(words(1))).toBe(1);
    expect(computeReadTimeMinutes(words(225))).toBe(1);
    expect(computeReadTimeMinutes(words(226))).toBe(2);
  });

  it("does not count a bare em dash as a word", () => {
    const dashes = Array.from({ length: 14 }, () => "\u2014").join(" ");
    expect(computeReadTimeMinutes(`${words(225)} ${dashes}`)).toBe(1);
    expect(computeReadTimeMinutes("hello \u2014 world")).toBe(
      computeReadTimeMinutes("hello world")
    );
  });

  it("does not inflate when dashes sit between real words the way the synastry body used to", () => {
    const withDashes =
      "A birth chart is a map of where the planets actually were at the moment someone was born \u2014 computed from astronomical data, not generated or guessed.";
    const withoutDashes =
      "A birth chart is a map of where the planets actually were at the moment someone was born: computed from astronomical data, not generated or guessed.";
    expect(computeReadTimeMinutes(withDashes)).toBe(computeReadTimeMinutes(withoutDashes));
  });
});
