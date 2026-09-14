import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import {
  addCivilDays,
  composeConstellationLetter,
  scanRelationalTransitsForWeek,
  type LetterPerson,
} from "../src/constellation-letter";
import { scanRelationalTransits } from "../src/relational-transits";

const CHART_A = computeNatalChart({ dateUTC: "1990-06-15T14:20:00.000Z", precision: "exact", lat: 40.7, lng: -74.0, tzOffsetMin: -240 });
const CHART_B = computeNatalChart({ dateUTC: "1962-01-10T08:00:00.000Z", precision: "exact", lat: 41.8, lng: -87.6, tzOffsetMin: -360 });
const CHART_C = computeNatalChart({ dateUTC: "1988-11-02T20:00:00.000Z", precision: "exact", lat: 34.0, lng: -118.2, tzOffsetMin: -480 });

const PEOPLE = [
  { id: "a", name: "Ada", chart: CHART_A },
  { id: "b", name: "Bo", chart: CHART_B },
  { id: "c", name: "Cy", chart: CHART_C },
];

const KNOWN_HIT_DATE = "2022-07-15T12:00:00.000Z";

const LETTER_PEOPLE: LetterPerson[] = [
  { personId: "a", personName: "Ada", isMinor: false, isSelf: false },
  { personId: "b", personName: "Bo", isMinor: false, isSelf: false },
  { personId: "c", personName: "Cy", isMinor: false, isSelf: false },
];

describe("addCivilDays", () => {
  it("adds days on the civil calendar without inventing a timezone", () => {
    expect(addCivilDays("2026-09-13", 0)).toBe("2026-09-13");
    expect(addCivilDays("2026-09-13", 1)).toBe("2026-09-14");
    expect(addCivilDays("2026-09-13", 6)).toBe("2026-09-19");
  });
});

describe("scanRelationalTransitsForWeek", () => {
  it("finds the same real events a single-instant scan finds on a known hit week", () => {
    const week = scanRelationalTransitsForWeek(PEOPLE, "2022-07-10", "UTC");
    const instant = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    expect(week.length).toBeGreaterThan(0);
    const saturnTrine = week.find((e) => e.transitBody === "saturn" && e.aspectType === "trine");
    expect(saturnTrine).toBeTruthy();
    expect(saturnTrine!.affected.map((a) => a.personId).sort()).toEqual(["a", "c"]);
    for (const event of instant) {
      expect(
        week.some(
          (w) =>
            w.transitBody === event.transitBody &&
            w.aspectType === event.aspectType &&
            w.affected.map((a) => a.personId).sort().join(",") === event.affected.map((a) => a.personId).sort().join(",")
        )
      ).toBe(true);
    }
  });

  it("returns nothing for a one-person constellation", () => {
    expect(scanRelationalTransitsForWeek([PEOPLE[0]!], "2022-07-10", "UTC")).toEqual([]);
  });
});

describe("composeConstellationLetter", () => {
  const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);

  it("returns null when nothing is active", () => {
    expect(composeConstellationLetter([], LETTER_PEOPLE)).toBeNull();
  });

  it("never includes a person who is not in a real event", () => {
    const extra: LetterPerson[] = [...LETTER_PEOPLE, { personId: "ghost", personName: "Ghost", isMinor: false, isSelf: false }];
    const draft = composeConstellationLetter(events, extra);
    expect(draft).not.toBeNull();
    expect(draft!.portraits.some((p) => p.personId === "ghost")).toBe(false);
  });

  it("never names a minor, and will write about one person if that is all that remains", () => {
    const withMinor: LetterPerson[] = [
      { personId: "a", personName: "Ada", isMinor: false, isSelf: false },
      { personId: "b", personName: "Bo", isMinor: true, isSelf: false },
      { personId: "c", personName: "Cy", isMinor: true, isSelf: false },
    ];
    const draft = composeConstellationLetter(events, withMinor);
    expect(draft).not.toBeNull();
    expect(draft!.onlyOnePerson).toBe(true);
    expect(draft!.portraits).toHaveLength(1);
    expect(draft!.portraits[0]!.personId).toBe("a");
    expect(draft!.opening).toContain("Ada");
    expect(draft!.opening).toContain("The rest of the circle is quiet.");
    expect(draft!.portraits[0]!.dynamicSentence).not.toContain("Bo");
    expect(draft!.portraits[0]!.dynamicSentence).not.toContain("Cy");
  });

  it("caps at four people and never pads", () => {
    const manyEvents = events.flatMap((event) =>
      event.affected.map((hit, i) => ({
        ...event,
        affected: [
          hit,
          {
            ...hit,
            personId: `extra-${event.transitBody}-${i}`,
            personName: `Extra ${event.transitBody} ${i}`,
          },
        ],
      }))
    );
    const people: LetterPerson[] = [
      ...LETTER_PEOPLE,
      ...manyEvents.flatMap((e) =>
        e.affected
          .filter((h) => !LETTER_PEOPLE.some((p) => p.personId === h.personId))
          .map((h) => ({ personId: h.personId, personName: h.personName, isMinor: false, isSelf: false }))
      ),
    ];
    const draft = composeConstellationLetter(manyEvents, people);
    expect(draft).not.toBeNull();
    expect(draft!.portraits.length).toBeLessThanOrEqual(4);
    expect(draft!.portraits.length).toBeGreaterThan(0);
    if (bestByPersonCount(manyEvents, people) > 4) {
      expect(draft!.portraits.length).toBe(4);
    }
  });

  it("every sentence traces to the portrait's real natal body and transiting body", () => {
    const draft = composeConstellationLetter(events, LETTER_PEOPLE);
    expect(draft).not.toBeNull();
    expect(draft!.portraits.length).toBeGreaterThanOrEqual(1);
    expect(draft!.portraits.length).toBeLessThanOrEqual(4);
    for (const portrait of draft!.portraits) {
      const natal = portrait.natalBody.charAt(0).toUpperCase() + portrait.natalBody.slice(1);
      const transit = portrait.transitBody.charAt(0).toUpperCase() + portrait.transitBody.slice(1);
      expect(portrait.dynamicSentence).toContain(natal);
      expect(portrait.dynamicSentence).toContain(transit);
      expect(portrait.intentionSentence.startsWith("One thing to try")).toBe(true);
      expect(portrait.dynamicSentence).not.toContain("\u2014");
      expect(portrait.intentionSentence).not.toContain("\u2014");
    }
    expect(draft!.opening).not.toContain("\u2014");
  });

  it("uses Your for the self row instead of repeating the greeting name", () => {
    const people: LetterPerson[] = [
      { personId: "a", personName: "Ada", isMinor: false, isSelf: true },
      { personId: "b", personName: "Bo", isMinor: false, isSelf: false },
      { personId: "c", personName: "Cy", isMinor: false, isSelf: false },
    ];
    const draft = composeConstellationLetter(events, people);
    expect(draft).not.toBeNull();
    const selfPortrait = draft!.portraits.find((p) => p.personId === "a");
    if (selfPortrait) {
      expect(selfPortrait.dynamicSentence.startsWith("Your ")).toBe(true);
      expect(selfPortrait.intentionSentence).toMatch(/^One thing to try:/);
      expect(selfPortrait.intentionSentence).not.toContain("with Ada");
    }
  });

  it("never lists every person when more than four have a real hit", () => {
    const ids = ["p1", "p2", "p3", "p4", "p5"];
    const event = {
      transitBody: "saturn" as const,
      transitSign: "Pisces" as const,
      aspectType: "trine" as const,
      affected: ids.map((id, i) => ({
        personId: id,
        personName: `Person ${id}`,
        natalBody: "sun" as const,
        natalSign: "Aries" as const,
        aspectType: "trine" as const,
        orbDeg: i,
        exactAtUTC: "2022-07-15T12:00:00.000Z",
      })),
      activeFromUTC: "2022-07-01T00:00:00.000Z",
      activeToUTC: "2022-08-01T00:00:00.000Z",
    };
    const people: LetterPerson[] = ids.map((id) => ({
      personId: id,
      personName: `Person ${id}`,
      isMinor: false,
      isSelf: false,
    }));
    const draft = composeConstellationLetter([event], people);
    expect(draft).not.toBeNull();
    expect(draft!.portraits).toHaveLength(4);
    expect(draft!.portraits.map((p) => p.personId)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(draft!.opening).not.toContain("Person p5");
  });
});

function bestByPersonCount(
  events: ReturnType<typeof scanRelationalTransits>,
  people: LetterPerson[]
): number {
  const ids = new Set<string>();
  const allowed = new Set(people.filter((p) => !p.isMinor).map((p) => p.personId));
  for (const event of events) {
    for (const hit of event.affected) {
      if (allowed.has(hit.personId)) ids.add(hit.personId);
    }
  }
  return ids.size;
}
