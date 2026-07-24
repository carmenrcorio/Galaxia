/**
 * Surface wiring — Venus placement copy must always go through
 * interpretPlacement / bodyDomain / interpretHouse with a minorSafe flag.
 * Call sites must not read PLANET_IN_SIGN.venus or VENUS_IN_*_MINOR directly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  interpretPlacement,
  PLANET_IN_SIGN,
  VENUS_IN_SIGN_MINOR,
  type SignKey,
} from "@galaxia/astro";

const SIGNS: SignKey[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function read(rel: string) {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("inventory surfaces — Venus never rendered without minorSafe", () => {
  it("/chart gates via isMinorForSafety and passes chartMinorSafe into lookup + PDF", () => {
    const src = read("../app/chart/page.tsx");
    expect(src).toContain("isMinorForSafety");
    expect(src).toContain("chartMinorSafe");
    expect(src).toContain("interpretPlacement(");
    expect(src).toContain("{ minorSafe: chartMinorSafe }");
    expect(src).toContain("bodyDomain(");
    expect(src).toContain("minorSafe={chartMinorSafe}");
    // Must not choose the minor table at the call site.
    expect(src).not.toContain("VENUS_IN_SIGN_MINOR");
    expect(src).not.toContain("PLANET_IN_SIGN");
  });

  it("/s single always passes minorSafe: true — no compute, no persist, no age branch", () => {
    const src = read("../components/share-snapshot-view.tsx");
    expect(src).toContain("const minorSafe = true");
    expect(src).toContain("interpretPlacement(p.body as BodyKey, p.sign as SignKey, { minorSafe })");
    expect(src).toContain("bodyDomain(p.body as BodyKey, { minorSafe })");
    expect(src).toContain("minorSafe={minorSafe}");
    // Fail-safe: must not call isMinorForSafety or read birthDate on single shares.
    expect(src).not.toMatch(/SingleSnapshot[\s\S]*?isMinorForSafety/);
    expect(src).not.toContain("VENUS_IN_SIGN_MINOR");
    expect(src).not.toContain("subjectIsMinor");
  });

  it("PDF requires caller-supplied minorSafe and does not recompute age", () => {
    const src = read("../components/chart-pdf-export.tsx");
    expect(src).toContain("minorSafe: boolean");
    expect(src).toContain("interpretPlacement(p.body as BodyKey, p.sign as SignKey, safety)");
    expect(src).toContain("bodyDomain(p.body as BodyKey, safety)");
    // Mentioned in the file header as caller contract only — must not import or call.
    expect(src).not.toMatch(/from ["']@galaxia\/core["']/);
    expect(src).not.toMatch(/\bisMinorForSafety\s*\(/);
    expect(src).not.toMatch(/\bbirthDate\b\s*[:=]/);
    expect(src).not.toContain("VENUS_IN_SIGN_MINOR");
  });

  it("/app/person applies already-computed personIsMinor to natal placements + houses", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain("personIsMinor");
    expect(src).toContain("const safety = { minorSafe: personIsMinor }");
    expect(src).toContain("interpretPlacement(bk, sk, safety)");
    expect(src).toContain("interpretHouse(bk, p.house as HouseKey, safety)");
    expect(src).toContain("interpretHouse(bk2, hk, { minorSafe: personIsMinor })");
    expect(src).toContain("bodyDomain(bk, safety)");
    expect(src).not.toContain("VENUS_IN_SIGN_MINOR");
    expect(src).not.toContain("VENUS_IN_HOUSE_MINOR");
    // Must not read BODY_DOMAIN.venus directly for placement rows.
    expect(src).not.toMatch(/BODY_DOMAIN\[/);
  });

  it("NatalSignReveal passes required minorSafe into interpretPlacement", () => {
    const src = read("../components/natal-sign-reveal.tsx");
    expect(src).toContain("interpretPlacement(sun.body as BodyKey, sun.sign as SignKey, { minorSafe })");
    expect(src).toContain("interpretPlacement(moon.body as BodyKey, moon.sign as SignKey, { minorSafe })");
  });
});

describe("/s contract — curated Venus regardless of input", () => {
  it("minorSafe:true (the /s constant) never yields an adult Venus string", () => {
    // Mirrors share-snapshot-view's `const minorSafe = true`.
    const minorSafe = true;
    for (const sign of SIGNS) {
      const reading = interpretPlacement("venus", sign, { minorSafe });
      expect(reading).toEqual(VENUS_IN_SIGN_MINOR[sign]);
      expect(reading.short).not.toBe(PLANET_IN_SIGN.venus[sign].short);
      expect(reading.long).not.toBe(PLANET_IN_SIGN.venus[sign].long);
    }
  });
});
