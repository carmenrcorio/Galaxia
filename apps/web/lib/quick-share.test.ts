import type { NatalChart } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  effectiveCompareFraming,
  giftBirthIsoDate,
  giftComparePath,
  isShareActive,
  parseExpiresInDays,
  sharePath,
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

  it("refuses compare + pairHasMinor + partners (romantic-family beyond the old binary)", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: { ...baseComparePayload, relationType: "partners" },
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(400);
      expect(result.error.toLowerCase()).toContain("minor");
    }
  });

  it("accepts the full RelationType union, not just the old romantic|platonic binary", () => {
    for (const relationType of ["partners", "siblings", "friends", "parent-child", "ancestor"] as const) {
      const result = validateQuickSharePersistBody({
        kind: "compare",
        payload: { ...baseComparePayload, pairHasMinor: false, relationType },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p = result.payload as CompareSharePayload;
        expect(p.relationType).toBe(relationType);
      }
    }
  });

  it("rejects a relationType outside the supported union", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: { ...baseComparePayload, pairHasMinor: false, relationType: "spouse" },
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("relationType");
    }
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

  it("single payload keeps displayDate/birthPlace/chart only and strips name", () => {
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
        displayDate: "April 3, 2017",
        birthPlace: "Austin",
        chart: expect.objectContaining({ precision: "date" }),
      });
      expect(result.payload).not.toHaveProperty("name");
      expect(result.payload).not.toHaveProperty("giftBirth");
      expect(JSON.stringify(result.payload)).not.toMatch(/Ada|birthDate|tzOffsetMin|"lat"|"lng"/);
    }
  });

  it("single payload allowlists giftBirth and still drops a smuggled name", () => {
    const result = validateQuickSharePersistBody({
      kind: "single",
      payload: {
        name: "Ada",
        displayDate: "April 3, 2017",
        birthPlace: "Austin",
        chart: minimalChart,
        giftBirth: {
          precision: "date",
          month: 4,
          day: 3,
          year: 2017,
          lat: "30.2672",
          lng: "-97.7431",
          birthPlace: "Austin",
          name: "Ada",
        },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.kind === "single") {
      expect(result.payload).not.toHaveProperty("name");
      expect(result.payload.giftBirth).toEqual({
        precision: "date",
        month: 4,
        day: 3,
        year: 2017,
        lat: "30.2672",
        lng: "-97.7431",
        birthPlace: "Austin",
      });
      expect(JSON.stringify(result.payload.giftBirth)).not.toMatch(/Ada/);
    }
  });

  it("compare payload ignores a smuggled giftBirth envelope", () => {
    const result = validateQuickSharePersistBody({
      kind: "compare",
      payload: { ...baseComparePayload, giftBirth: { precision: "date", month: 1, day: 1, year: 1990 } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.payload)).not.toMatch(/giftBirth/);
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

  it("snaps a bad partners+minor row (full-union romantic family) to platonic + held", () => {
    const framing = effectiveCompareFraming({
      ...baseComparePayload,
      relationType: "partners",
      pairHasMinor: true,
    });
    expect(framing.relationType).toBe("platonic");
    expect(framing.blockRomanticMinorRender).toBe(false);
    expect(framing.romanticHeldNotice).toBe(true);
  });

  it("passes a non-romantic full-union row through unchanged (old binary rows still render as before)", () => {
    const framing = effectiveCompareFraming({
      ...baseComparePayload,
      relationType: "friends",
      pairHasMinor: true,
    });
    expect(framing.relationType).toBe("friends");
    expect(framing.blockRomanticMinorRender).toBe(false);
    expect(framing.romanticHeldNotice).toBe(false);
  });

  it("old binary platonic row still renders as platonic, unaffected by the widened type", () => {
    const framing = effectiveCompareFraming(baseComparePayload);
    expect(framing.relationType).toBe("platonic");
    expect(framing.blockRomanticMinorRender).toBe(false);
    expect(framing.romanticHeldNotice).toBe(false);
  });
});

describe("gift share helpers — token URLs, expiry, giftBirth date", () => {
  it("share and gift-compare paths never include a name", () => {
    expect(sharePath("abc_TOKEN-1")).toBe("/s/abc_TOKEN-1");
    expect(giftComparePath("abc_TOKEN-1")).toBe("/chart/compare?gift=abc_TOKEN-1");
    expect(sharePath("Ada Lovelace")).toBe("/s/Ada%20Lovelace");
    expect(giftComparePath("Ada Lovelace")).not.toContain("Ada Lovelace");
  });

  it("defaults expiry to 14 days and coerces anonymous never to 14", () => {
    expect(parseExpiresInDays(undefined, false)).toEqual({ ok: true, days: 14 });
    expect(parseExpiresInDays(null, false)).toEqual({ ok: true, days: 14 });
    expect(parseExpiresInDays(null, true)).toEqual({ ok: true, days: null });
    expect(parseExpiresInDays(7, true)).toEqual({ ok: true, days: 7 });
    expect(parseExpiresInDays(99, true).ok).toBe(false);
  });

  it("treats revoked or past expires_at as inactive, null expiry as live", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    expect(isShareActive({ expires_at: null, revoked_at: null }, now)).toBe(true);
    expect(isShareActive({ expires_at: "2026-09-15T00:00:00Z", revoked_at: null }, now)).toBe(true);
    expect(isShareActive({ expires_at: "2026-09-14T11:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(isShareActive({ expires_at: null, revoked_at: "2026-09-14T00:00:00Z" }, now)).toBe(false);
  });

  it("giftBirthIsoDate uses year-01-01 for year precision and a real Y-M-D otherwise", () => {
    expect(giftBirthIsoDate({ precision: "year", yearOnly: 1952 })).toBe("1952-01-01");
    expect(giftBirthIsoDate({ precision: "date", year: 2017, month: 4, day: 3 })).toBe("2017-04-03");
    expect(giftBirthIsoDate({ precision: "date" })).toBeNull();
  });
});
