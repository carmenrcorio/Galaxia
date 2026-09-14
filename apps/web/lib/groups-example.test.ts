import { cohortOverlay, computeNatalChart } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  buildExampleGroupReading,
  exampleGroupReading,
  EXAMPLE_ID_PREFIX,
  EXAMPLE_PEOPLE,
  isExampleId,
} from "./groups-example";

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
    expect(sunSign("2001-03-14T21:10:00.000Z", { lat: 30.2672, lng: -97.7431, tzOffsetMin: -360 })).toBe("Pisces");
    expect(sunSign("2003-09-30T10:20:00.000Z", { lat: 51.5074, lng: -0.1278, tzOffsetMin: 60 })).toBe("Libra");
    expect(sunSign("1976-05-18T14:40:00.000Z", { lat: 41.8781, lng: -87.6298, tzOffsetMin: -300 })).toBe("Taurus");
    expect(sunSign("1954-08-22T18:30:00.000Z", { lat: 42.3601, lng: -71.0589, tzOffsetMin: -240 })).toBe("Leo");
  });

  it("matches published outer-planet ingress eras for these birth years", () => {
    const reading = buildExampleGroupReading();
    const byName = new Map(
      reading.chartGridMembers.map((m) => [m.name, m.chart.generational])
    );
    const noor = byName.get("Noor")!;
    const theo = byName.get("Theo")!;
    const jonah = byName.get("Jonah")!;
    const mira = byName.get("Mira")!;

    // Pluto: Leo ~1939-1957, Libra ~1971-1984, Sagittarius ~1995-2008.
    expect(mira.pluto.sign).toBe("Leo");
    expect(jonah.pluto.sign).toBe("Libra");
    expect(noor.pluto.sign).toBe("Sagittarius");
    expect(theo.pluto.sign).toBe("Sagittarius");

    // Uranus: Cancer ~1949-1956, Scorpio ~1975-1981, Aquarius ~1996-2003.
    expect(mira.uranus.sign).toBe("Cancer");
    expect(jonah.uranus.sign).toBe("Scorpio");
    expect(noor.uranus.sign).toBe("Aquarius");
    expect(theo.uranus.sign).toBe("Aquarius");

    // Neptune: Libra ~1942-1956, Sagittarius ~1970-1984, Aquarius ~1998-2011.
    expect(mira.neptune.sign).toBe("Libra");
    expect(jonah.neptune.sign).toBe("Sagittarius");
    expect(noor.neptune.sign).toBe("Aquarius");
    expect(theo.neptune.sign).toBe("Aquarius");
  });

  it("builds the overlay from those computed gens, same function a live group uses", () => {
    const reading = buildExampleGroupReading();
    const overlay = cohortOverlay(
      reading.chartGridMembers.map((m) => ({ name: m.name, gen: m.chart.generational }))
    );
    expect(reading.overlay).toEqual(overlay);
    expect(overlay.sharedSky).toEqual([]);
    expect(overlay.label).toContain("No single generation");
    const uranus = overlay.faultLines.find((line) => line.planet === "uranus");
    const neptune = overlay.faultLines.find((line) => line.planet === "neptune");
    const pluto = overlay.faultLines.find((line) => line.planet === "pluto");
    expect(uranus?.groups.some((g) => g.sign === "Aquarius" && g.names.includes("Noor") && g.names.includes("Theo"))).toBe(true);
    expect(neptune?.groups.some((g) => g.sign === "Aquarius" && g.names.includes("Noor") && g.names.includes("Theo"))).toBe(true);
    expect(pluto?.groups.some((g) => g.sign === "Sagittarius" && g.names.includes("Noor") && g.names.includes("Theo"))).toBe(true);
  });

  it("keeps the same-generation pair in the first three highlights the page shows", () => {
    const reading = buildExampleGroupReading();
    expect(reading.pairHighlights).toHaveLength(3);
    expect(reading.pairHighlights[0]?.pair).toBe("Noor × Theo");
    expect(reading.pairHighlights[0]?.summary.startsWith("Same generation")).toBe(true);
    expect(reading.pairHighlights.slice(1).every((h) => h.summary.startsWith("Fault line:"))).toBe(true);
  });

  it("uses exact Placidus charts so the chart grid has confident personal planets", () => {
    for (const member of buildExampleGroupReading().chartGridMembers) {
      expect(member.chart.precision).toBe("exact");
      expect(member.chart.houseSystem).toBe("placidus");
      expect(member.chart.asc).toBeTruthy();
      const sun = member.chart.placements.find((p) => p.body === "sun");
      expect(sun?.confident).toBe(true);
    }
  });

  it("ships a static snapshot that still equals a live engine compute", () => {
    expect(exampleGroupReading()).toEqual(buildExampleGroupReading());
  });
});
