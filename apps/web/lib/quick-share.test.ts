import type { NatalChart } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  effectiveCompareFraming,
  stripBirthPii,
  validateQuickSharePersistBody,
  type CompareSharePayload,
} from "./quick-share";

const minimalChart = {
  placements: [
    {
      body: "sun" as const,
      lon: 10,
      sign: "Aries" as const,
      degree: 10,
      retro: false,
      confident: true,
    },
  ],
  precision: "date" as const,
  generational: {
    uranus: { sign: "Capricorn" as const, confident: true },
    neptune: { sign: "Capricorn" as const, confident: true },
    pluto: { sign: "Scorpio" as const, confident: true },
    cohortLabel: "test",
  },
} satisfies NatalChart;

const baseComparePayload = {
  relationType: "platonic" as const,
  pairHasMinor: true,
  chartA: minimalChart,
  chartB: minimalChart,
  synastry: {
    scores: { overall: 60 },
    aspects: [{ from: "Sun", to: "Moon", type: "trine", orb: 1.2, harmony: 1 }],
  },
  generational: { theme: "Shared sky", shared: [], diverged: [] },
};

describe("validateQuickSharePersistBody — romantic-minor structural guarantee", () => {
  it("refuses compare + pairHasMinor + romantic (no insert path)", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: { ...baseComparePayload, relationType: "romantic" },
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(400);
      expect(result.error.toLowerCase()).toContain("minor");
    }
  });

  it("allows compare + pairHasMinor + platonic", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: baseComparePayload,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe("compare");
      const p = result.payload as CompareSharePayload;
      expect(p.pairHasMinor).toBe(true);
      expect(p.relationType).toBe("platonic");
    }
  });

  it("allows adult romantic compare", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: { ...baseComparePayload, pairHasMinor: false, relationType: "romantic" },
    });
    expect(result.ok).toBe(true);
  });

  it("strips raw birth PII keys from a smuggled payload nest", () => {
    const smuggled = stripBirthPii({
      displayDate: "April 3, 2017",
      birthPlace: "Austin",
      birthDate: "2017-04-03",
      lat: 30.2,
      lng: -97.7,
      tzOffsetMin: -300,
      nested: { birthPrecision: "exact", ok: true },
    });
    expect(smuggled).toEqual({
      displayDate: "April 3, 2017",
      birthPlace: "Austin",
      nested: { ok: true },
    });
  });

  it("single payload keeps displayDate/birthPlace/chart only", () => {
    const result = validateQuickSharePersistBody({
      kind: "single",
      payload: {
        name: "Ada",
        displayDate: "April 3, 2017",
        birthPlace: "Austin",
        birthDate: "2017-04-03",
        lat: 1,
        lng: 2,
        tzOffsetMin: -300,
        chart: minimalChart,
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "single") {
      expect(result.payload).toEqual({
        name: "Ada",
        displayDate: "April 3, 2017",
        birthPlace: "Austin",
        chart: expect.objectContaining({ precision: "date" }),
      });
      expect(JSON.stringify(result.payload)).not.toMatch(/birthDate|tzOffsetMin|"lat"|"lng"/);
    }
  });
});

describe("effectiveCompareFraming — render backstop", () => {
  it("snaps to platonic + held when a bad romantic+minor row is present", () => {
    const framing = effectiveCompareFraming({
      ...baseComparePayload,
      relationType: "romantic",
      pairHasMinor: true,
    });
    expect(framing.relationType).toBe("platonic");
    expect(framing.blockRomanticMinorRender).toBe(false);
    expect(framing.romanticHeldNotice).toBe(true);
  });
});
