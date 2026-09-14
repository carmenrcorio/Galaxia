import { cohortOverlay, computeNatalChart } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import { exampleGroupReading, EXAMPLE_ID_PREFIX, EXAMPLE_PEOPLE, isExampleId } from "./groups-example";

describe("example group reading", () => {
  it("prefixes every member id so example rows cannot collide with user UUIDs", () => {
    expect(EXAMPLE_PEOPLE).toHaveLength(4);
    for (const person of EXAMPLE_PEOPLE) {
      expect(person.id.startsWith(EXAMPLE_ID_PREFIX)).toBe(true);
      expect(isExampleId(person.id)).toBe(true);
    }
    expect(isExampleId("3f6d2a1c-9b0e-4d77-8c11-0a1b2c3d4e5f")).toBe(false);
  });

  it("computes tropical Sun signs from the civil dates, not invented placements", () => {
    const sunSign = (dateUTC: string, extra: { lat: number; lng: number; tzOffsetMin: number }) => {
      const chart = computeNatalChart({ dateUTC, precision: "exact", ...extra });
      return chart.placements.find((p) => p.body === "sun")?.sign;
    };
    expect(sunSign("1991-04-12T13:30:00.000Z", { lat: 40.7128, lng: -74.006, tzOffsetMin: -240 })).toBe("Aries");
    expect(sunSign("1993-09-08T21:45:00.000Z", { lat: 41.8781, lng: -87.6298, tzOffsetMin: -300 })).toBe("Virgo");
    expect(sunSign("1994-12-03T15:10:00.000Z", { lat: 34.0522, lng: -118.2437, tzOffsetMin: -480 })).toBe("Sagittarius");
    expect(sunSign("1997-07-21T10:20:00.000Z", { lat: 51.5074, lng: -0.1278, tzOffsetMin: 60 })).toBe("Cancer");
  });

  it("matches published outer-planet ingress eras for these birth years", () => {
    const reading = exampleGroupReading();
    const byName = new Map(
      reading.chartGridMembers.map((m) => [m.name, m.chart.generational])
    );
    const lila = byName.get("Lila")!;
    const owen = byName.get("Owen")!;
    const priya = byName.get("Priya")!;
    const nate = byName.get("Nate")!;

    // Pluto Scorpio ~1983-1995; Sagittarius ~1995-2008.
    expect(lila.pluto.sign).toBe("Scorpio");
    expect(owen.pluto.sign).toBe("Scorpio");
    expect(priya.pluto.sign).toBe("Scorpio");
    expect(nate.pluto.sign).toBe("Sagittarius");

    // Uranus Capricorn ~1988-1996; Aquarius ~1996-2003.
    expect(lila.uranus.sign).toBe("Capricorn");
    expect(owen.uranus.sign).toBe("Capricorn");
    expect(priya.uranus.sign).toBe("Capricorn");
    expect(nate.uranus.sign).toBe("Aquarius");

    // Neptune Capricorn ~1984-1998.
    expect(lila.neptune.sign).toBe("Capricorn");
    expect(owen.neptune.sign).toBe("Capricorn");
    expect(priya.neptune.sign).toBe("Capricorn");
    expect(nate.neptune.sign).toBe("Capricorn");
  });

  it("builds the overlay from those computed gens, same function a live group uses", () => {
    const reading = exampleGroupReading();
    const overlay = cohortOverlay(
      reading.chartGridMembers.map((m) => ({ name: m.name, gen: m.chart.generational }))
    );
    expect(reading.overlay).toEqual(overlay);
    expect(overlay.sharedSky).toEqual([{ planet: "neptune", sign: "Capricorn" }]);
    const uranus = overlay.faultLines.find((line) => line.planet === "uranus");
    const pluto = overlay.faultLines.find((line) => line.planet === "pluto");
    expect(uranus?.groups.some((g) => g.sign === "Aquarius" && g.names.includes("Nate"))).toBe(true);
    expect(pluto?.groups.some((g) => g.sign === "Sagittarius" && g.names.includes("Nate"))).toBe(true);
    expect(overlay.label).toContain("generational sky");
  });

  it("uses exact Placidus charts so the chart grid has confident personal planets", () => {
    for (const member of exampleGroupReading().chartGridMembers) {
      expect(member.chart.precision).toBe("exact");
      expect(member.chart.houseSystem).toBe("placidus");
      expect(member.chart.asc).toBeTruthy();
      const sun = member.chart.placements.find((p) => p.body === "sun");
      expect(sun?.confident).toBe(true);
    }
  });
});
