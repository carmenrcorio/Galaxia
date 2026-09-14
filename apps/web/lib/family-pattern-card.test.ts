import { describe, expect, it } from "vitest";
import {
  FAMILY_COMPARE_PLANETS,
  type FamilyComparePersonInput,
  type FamilyPlanet,
  type NatalChart,
  type Sign,
} from "@galaxia/astro";
import {
  FAMILY_PATTERN_CARD_ACK,
  FAMILY_PATTERN_CARD_CONFIRM,
  FAMILY_PATTERN_CARD_EYEBROW,
  FAMILY_PATTERN_CARD_PRIVACY_BODY,
  FAMILY_PATTERN_CARD_SIZE,
  FAMILY_PATTERN_CARD_UNNAMED,
  FAMILY_PATTERN_CARD_WATERMARK,
  buildFamilyPatternCard,
  familyPatternCardHasForbiddenContent,
  firstNameFromDisplayName,
  parseFamilyPatternCardRequest,
  toFamilyPatternCardRenderInput,
} from "./family-pattern-card";

function chart(signs: Partial<Record<FamilyPlanet, Sign>>, house?: number): NatalChart {
  const cell = (body: "sun" | "moon" | "mercury" | "venus" | "mars", sign: Sign) => ({
    body,
    lon: 0,
    sign,
    degree: 0,
    retro: false,
    confident: true as const,
    ...(house ? { house } : {}),
  });
  return {
    placements: [
      cell("sun", signs.sun ?? "Leo"),
      cell("moon", signs.moon ?? "Cancer"),
      cell("mercury", signs.mercury ?? "Virgo"),
      cell("venus", signs.venus ?? "Libra"),
      cell("mars", signs.mars ?? "Aries"),
    ],
    asc: signs.rising,
    precision: "exact",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
  };
}

const ADA: FamilyComparePersonInput = {
  id: "a",
  name: "Ada Lovelace",
  chart: chart({ sun: "Leo", moon: "Cancer", rising: "Virgo" }, 7),
  passed: true,
};
const NELL: FamilyComparePersonInput = {
  id: "n",
  name: "Nellie Bly",
  chart: chart({ sun: "Leo", moon: "Pisces", rising: "Virgo" }, 4),
};
const BO: FamilyComparePersonInput = {
  id: "b",
  name: "Bo",
  chart: chart({ sun: "Aries", moon: "Cancer", rising: "Sagittarius" }),
};

describe("firstNameFromDisplayName", () => {
  it("keeps only the first word", () => {
    expect(firstNameFromDisplayName("Ada Lovelace")).toBe("Ada");
    expect(firstNameFromDisplayName("Nellie Bly")).toBe("Nellie");
    expect(firstNameFromDisplayName("Bo")).toBe("Bo");
  });

  it("falls back to the unnamed token when the stored name is blank", () => {
    expect(firstNameFromDisplayName("   ")).toBe(FAMILY_PATTERN_CARD_UNNAMED);
  });
});

describe("buildFamilyPatternCard", () => {
  it("builds a card from signs and first names, with a memorial flag, and no birth fields", () => {
    const card = buildFamilyPatternCard([ADA, NELL, BO], ["a", "n", "b"]);
    expect(card).toBeTruthy();
    expect(card!.people.map((p) => p.firstName)).toEqual(["Ada", "Nellie", "Bo"]);
    expect(card!.people.find((p) => p.id === "a")?.memorial).toBe(true);
    expect(card!.people.find((p) => p.id === "n")?.memorial).toBe(false);
    expect(card!.headline).toContain("Leo Sun");
    expect(card!.headline).toContain("Virgo Rising");
    expect(card!.headline).toContain("Cancer Moon");
    expect(card!.interpretation).toMatch(/^(All of you|Two of you|Three of you) carry /);
    expect(card!.interpretation).toMatch(/\.$/);
    expect(card!.interpretation).not.toContain("House");

    const json = JSON.stringify(toFamilyPatternCardRenderInput(card!));
    expect(json).not.toContain("Lovelace");
    expect(json).not.toContain("Bly");
    expect(json).not.toContain("House");
    expect(json).not.toMatch(/\bhouse\b/i);
    expect(json).not.toContain("1990");
    expect(json).not.toMatch(/\b\d{1,2}:\d{2}\b/);
    expect(familyPatternCardHasForbiddenContent(toFamilyPatternCardRenderInput(card!))).toBe(false);
    for (const key of ["birthDate", "birth_date", "birth_time", "birth_place", "lat", "lng", "dateUTC", "house"]) {
      expect(json).not.toContain(key);
    }
  });

  it("returns null when no two remaining people share a sign in the same placement", () => {
    expect(buildFamilyPatternCard([ADA, NELL, BO], ["b"])).toBeNull();
    const disjoint: FamilyComparePersonInput = {
      ...BO,
      chart: chart({
        sun: "Taurus",
        moon: "Gemini",
        rising: "Capricorn",
        mercury: "Sagittarius",
        venus: "Scorpio",
        mars: "Pisces",
      }),
    };
    expect(buildFamilyPatternCard([ADA, disjoint], ["a", "b"])).toBeNull();
  });

  it("recomputes the headline after a person is removed", () => {
    const all = buildFamilyPatternCard([ADA, NELL, BO], ["a", "n", "b"])!;
    expect(all.headline).toContain("Cancer Moon");
    const withoutBo = buildFamilyPatternCard([ADA, NELL, BO], ["a", "n"])!;
    expect(withoutBo.people.map((p) => p.firstName)).toEqual(["Ada", "Nellie"]);
    expect(withoutBo.headline).not.toContain("Cancer Moon");
    expect(withoutBo.headline).toContain("Leo Sun");
  });

  it("is 1080 by 1080", () => {
    expect(FAMILY_PATTERN_CARD_SIZE).toEqual({ width: 1080, height: 1080 });
  });
});

describe("parseFamilyPatternCardRequest", () => {
  it("drops unknown keys including birth fields instead of forwarding them", () => {
    const parsed = parseFamilyPatternCardRequest({
      people: [
        { firstName: "Ada", memorial: true, lastName: "Lovelace", birthDate: "1815-12-10" },
        { firstName: "Nellie", memorial: false, house: 7 },
      ],
      headline: "Leo Sun",
      interpretation: "Two of you carry Leo Sun: bold, fast, all-in.",
      birthPlace: "London",
    });
    expect(parsed).toEqual({
      people: [
        { firstName: "Ada", memorial: true },
        { firstName: "Nellie", memorial: false },
      ],
      headline: "Leo Sun",
      interpretation: "Two of you carry Leo Sun: bold, fast, all-in.",
    });
  });

  it("accepts two first-name people with no extra keys", () => {
    const parsed = parseFamilyPatternCardRequest({
      people: [
        { firstName: "Ada", memorial: true },
        { firstName: "Nellie", memorial: false },
      ],
      headline: "Leo Sun · Virgo Rising",
      interpretation: "Two of you carry Leo Sun: bold, fast, all-in.",
    });
    expect(parsed).toEqual({
      people: [
        { firstName: "Ada", memorial: true },
        { firstName: "Nellie", memorial: false },
      ],
      headline: "Leo Sun · Virgo Rising",
      interpretation: "Two of you carry Leo Sun: bold, fast, all-in.",
    });
  });

  it("rejects a payload whose text includes a house or a date", () => {
    expect(
      parseFamilyPatternCardRequest({
        people: [
          { firstName: "Ada", memorial: false },
          { firstName: "Bo", memorial: false },
        ],
        headline: "Leo Sun",
        interpretation: "House 7 is the pattern.",
      }),
    ).toEqual({ error: "Invalid request." });
    expect(
      parseFamilyPatternCardRequest({
        people: [
          { firstName: "Ada", memorial: false },
          { firstName: "Bo", memorial: false },
        ],
        headline: "Leo Sun",
        interpretation: "Born 1990-06-15.",
      }),
    ).toEqual({ error: "Invalid request." });
  });
});

describe("founder-review copy", () => {
  const copy = [
    FAMILY_PATTERN_CARD_ACK,
    FAMILY_PATTERN_CARD_CONFIRM,
    FAMILY_PATTERN_CARD_EYEBROW,
    FAMILY_PATTERN_CARD_PRIVACY_BODY,
    FAMILY_PATTERN_CARD_WATERMARK,
  ];
  it("has no em dashes", () => {
    for (const line of copy) {
      expect(line).not.toContain("\u2014");
    }
  });

  it("privacy body names the three forbidden birth fields", () => {
    expect(FAMILY_PATTERN_CARD_PRIVACY_BODY).toContain("birth date");
    expect(FAMILY_PATTERN_CARD_PRIVACY_BODY).toContain("birth time");
    expect(FAMILY_PATTERN_CARD_PRIVACY_BODY).toContain("birth place");
  });
});

describe("FAMILY_COMPARE_PLANETS still the six personal placements the grid shows", () => {
  it("is sun through mars, including rising", () => {
    expect(FAMILY_COMPARE_PLANETS).toEqual(["sun", "moon", "rising", "mercury", "venus", "mars"]);
  });
});
