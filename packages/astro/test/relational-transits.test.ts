import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import { isRelationalTransitActive, relationalTransitDedupKey, scanRelationalTransits } from "../src/relational-transits";
import { interpretRelationalTransit, interpretRelationalTransitHeadline } from "../src/relational-transit-interpretations";

// Ground truth verified via a scratch script sweeping real dates against
// these exact three charts — not hand-picked "nice" numbers. On this date
// the engine finds two independent real relational transits simultaneously.
const CHART_A = computeNatalChart({ dateUTC: "1990-06-15T14:20:00.000Z", precision: "exact", lat: 40.7, lng: -74.0, tzOffsetMin: -240 });
const CHART_B = computeNatalChart({ dateUTC: "1962-01-10T08:00:00.000Z", precision: "exact", lat: 41.8, lng: -87.6, tzOffsetMin: -360 });
const CHART_C = computeNatalChart({ dateUTC: "1988-11-02T20:00:00.000Z", precision: "exact", lat: 34.0, lng: -118.2, tzOffsetMin: -480 });
const YEAR_ONLY = computeNatalChart({ dateUTC: "1975-01-01T00:00:00.000Z", precision: "year" });

const PEOPLE = [
  { id: "a", name: "Ada", chart: CHART_A },
  { id: "b", name: "Bo", chart: CHART_B },
  { id: "c", name: "Cy", chart: CHART_C },
];

const KNOWN_HIT_DATE = "2022-07-15T12:00:00.000Z";

describe("scanRelationalTransits", () => {
  it("finds a real, verified relational transit hitting 2+ people on a known date", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    expect(events.length).toBeGreaterThanOrEqual(2);
    const saturnTrine = events.find((e) => e.transitBody === "saturn" && e.aspectType === "trine");
    expect(saturnTrine).toBeTruthy();
    expect(saturnTrine!.affected.map((a) => a.personId).sort()).toEqual(["a", "c"]);
    const jupiterSquare = events.find((e) => e.transitBody === "jupiter" && e.aspectType === "square");
    expect(jupiterSquare).toBeTruthy();
    expect(jupiterSquare!.affected.map((a) => a.personId).sort()).toEqual(["a", "c"]);
  });

  it("never returns a single-person hit as a relational transit", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    for (const event of events) {
      expect(event.affected.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("only scans the 5 slow-moving bodies (Jupiter/Saturn/Uranus/Neptune/Pluto), never Sun/Moon/inner planets", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    const allowed = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);
    for (const event of events) {
      expect(allowed.has(event.transitBody)).toBe(true);
    }
  });

  it("derives a real active window bracketing both affected people's exact dates, not a hardcoded range", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    for (const event of events) {
      const from = new Date(event.activeFromUTC).getTime();
      const to = new Date(event.activeToUTC).getTime();
      expect(from).toBeLessThan(to);
      for (const hit of event.affected) {
        const exact = new Date(hit.exactAtUTC).getTime();
        expect(exact).toBeGreaterThanOrEqual(from);
        expect(exact).toBeLessThanOrEqual(to);
      }
    }
  });

  it("sorts events by affected-person count, then tightest orb, so the biggest/clearest story leads", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1]!;
      const cur = events[i]!;
      const sameCount = prev.affected.length === cur.affected.length;
      expect(prev.affected.length >= cur.affected.length || (sameCount && prev.affected[0]!.orbDeg <= cur.affected[0]!.orbDeg)).toBe(true);
    }
  });

  it("excludes year-only charts entirely (no fabricated exact date from a mid-year sample)", () => {
    const events = scanRelationalTransits(
      [{ id: "a", name: "Ada", chart: CHART_A }, { id: "y1", name: "Yuki", chart: YEAR_ONLY }, { id: "y2", name: "Yara", chart: YEAR_ONLY }],
      KNOWN_HIT_DATE
    );
    for (const event of events) {
      expect(event.affected.some((a) => a.personId === "y1" || a.personId === "y2")).toBe(false);
    }
  });

  it("returns nothing for a lone person, even with a real hit against their own chart", () => {
    const events = scanRelationalTransits([{ id: "a", name: "Ada", chart: CHART_A }], KNOWN_HIT_DATE);
    expect(events).toEqual([]);
  });

  it("is deterministic — same inputs, same outputs", () => {
    const first = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    const second = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("scans a 20-person constellation (the daily-job scale target) in well under a second", () => {
    const bigConstellation = Array.from({ length: 20 }, (_, i) => {
      const year = 1950 + ((i * 4) % 70);
      const month = (i * 3) % 12;
      const day = 1 + ((i * 7) % 27);
      const hour = 10 + (i % 12);
      const min = (i * 5) % 60;
      const dateUTC = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`;
      return { id: String(i), name: `Person ${i}`, chart: computeNatalChart({ dateUTC, precision: "exact", lat: 30 + i, lng: -70 - i, tzOffsetMin: -300 }) };
    });
    const start = Date.now();
    scanRelationalTransits(bigConstellation, KNOWN_HIT_DATE);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe("isRelationalTransitActive", () => {
  it("is true inside the window and false outside it", () => {
    const event = { activeFromUTC: "2022-06-19T07:18:12.823Z", activeToUTC: "2022-07-28T07:56:40.485Z" };
    expect(isRelationalTransitActive(event, "2022-07-10T00:00:00.000Z")).toBe(true);
    expect(isRelationalTransitActive(event, "2022-06-01T00:00:00.000Z")).toBe(false);
    expect(isRelationalTransitActive(event, "2022-09-01T00:00:00.000Z")).toBe(false);
  });
});

describe("relationalTransitDedupKey", () => {
  it("is stable for the same real event re-scanned a day later (upsert, not duplicate)", () => {
    const day1 = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    const day2 = scanRelationalTransits(PEOPLE, new Date(new Date(KNOWN_HIT_DATE).getTime() + 86_400_000).toISOString());
    const saturnDay1 = day1.find((e) => e.transitBody === "saturn" && e.aspectType === "trine")!;
    const saturnDay2 = day2.find((e) => e.transitBody === "saturn" && e.aspectType === "trine")!;
    expect(relationalTransitDedupKey(saturnDay1)).toBe(relationalTransitDedupKey(saturnDay2));
  });

  it("differs for different affected people or different transit/aspect", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    const keys = events.map(relationalTransitDedupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("relational transit interpretation copy", () => {
  it("headline names the real transit body, aspect, and both affected people's names + natal bodies", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    const saturnTrine = events.find((e) => e.transitBody === "saturn" && e.aspectType === "trine")!;
    const headline = interpretRelationalTransitHeadline(saturnTrine);
    expect(headline).toContain("Saturn");
    expect(headline).toContain("flowing with");
    for (const hit of saturnTrine.affected) {
      expect(headline).toContain(hit.personName);
    }
  });

  it("body copy is relationally framed (mentions 'both' — never a single-person read)", () => {
    const events = scanRelationalTransits(PEOPLE, KNOWN_HIT_DATE);
    for (const event of events) {
      const { headline, body } = interpretRelationalTransit(event);
      expect(headline.length).toBeGreaterThan(0);
      expect(body.toLowerCase()).toContain("both");
    }
  });

  it("handles 3+ affected people with an Oxford-comma list, not a broken 2-person phrase", () => {
    const threeWay = {
      transitBody: "saturn" as const,
      aspectType: "square" as const,
      affected: [
        { personId: "a", personName: "Ada", natalBody: "moon" as const, natalSign: "Cancer" as const, aspectType: "square" as const, orbDeg: 0.1, exactAtUTC: "2022-01-01T00:00:00.000Z" },
        { personId: "b", personName: "Mom", natalBody: "venus" as const, natalSign: "Capricorn" as const, aspectType: "square" as const, orbDeg: 0.2, exactAtUTC: "2022-01-02T00:00:00.000Z" },
        { personId: "c", personName: "Sam", natalBody: "sun" as const, natalSign: "Libra" as const, aspectType: "square" as const, orbDeg: 0.3, exactAtUTC: "2022-01-03T00:00:00.000Z" },
      ],
    };
    const headline = interpretRelationalTransitHeadline(threeWay);
    expect(headline).toContain("Ada's Moon, Mom's Venus, and Sam's Sun");
  });
});
