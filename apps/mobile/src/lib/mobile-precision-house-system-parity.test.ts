import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBirthInput, computeNatalChart, type BirthFormInput } from "@galaxia/astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { deferredPersonRow } from "./deferred-person-row";
import { getPreferredHouseSystem } from "./house-system";

const onboardingSrc = readFileSync(resolve(__dirname, "../../app/(app)/onboarding.tsx"), "utf8");
const persistSrc = readFileSync(resolve(__dirname, "./persist-person.ts"), "utf8");
const profileSrc = readFileSync(resolve(__dirname, "../../app/(app)/profile/[personId].tsx"), "utf8");

/** Minimal stand-in for the one query getPreferredHouseSystem makes. */
function profilesStub(row: Record<string, unknown> | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null })
        })
      })
    })
  } as unknown as SupabaseClient;
}

describe("mobile reads the saved house system instead of hardcoding Placidus", () => {
  it("returns the stored preference", async () => {
    await expect(getPreferredHouseSystem(profilesStub({ house_system: "whole" }), "u1")).resolves.toBe("whole");
    await expect(getPreferredHouseSystem(profilesStub({ house_system: "equal" }), "u1")).resolves.toBe("equal");
    await expect(getPreferredHouseSystem(profilesStub({ house_system: "placidus" }), "u1")).resolves.toBe("placidus");
  });

  it("falls back to placidus only when no valid preference is stored", async () => {
    await expect(getPreferredHouseSystem(profilesStub(null), "u1")).resolves.toBe("placidus");
    await expect(getPreferredHouseSystem(profilesStub({}), "u1")).resolves.toBe("placidus");
    await expect(getPreferredHouseSystem(profilesStub({ house_system: "koch" }), "u1")).resolves.toBe("placidus");
  });

  it("the preference actually changes the computed chart, so the read is load-bearing", () => {
    const built = buildBirthInput({
      precision: "exact",
      month: 12,
      day: 29,
      year: 1987,
      hour: 22,
      minute: 30,
      birthPlace: "Little Rock, Arkansas, United States",
      lat: "34.7465",
      lng: "-92.2896",
      tzOffsetMin: -360
    });
    const placidus = computeNatalChart({ ...built.birth, houseSystem: "placidus" });
    const whole = computeNatalChart({ ...built.birth, houseSystem: "whole" });

    expect(placidus.houseSystem).toBe("placidus");
    expect(whole.houseSystem).toBe("whole");
    expect(whole.cusps).not.toEqual(placidus.cusps);
  });

  it("wiring: persistPerson computes with the profile preference, not a literal", () => {
    expect(persistSrc).toContain("getPreferredHouseSystem");
    expect(persistSrc).toContain("computeNatalChart({ ...built.birth, houseSystem })");
    expect(persistSrc).not.toContain('houseSystem: "placidus"');
    expect(persistSrc).toContain("engine_version: CHART_ENGINE_VERSION");
    expect(persistSrc).not.toContain("engine_version: 2");
    expect(onboardingSrc).toContain("persistPerson");
  });
});

describe("mobile can save a person with no birth data (web precision parity)", () => {
  it("buildBirthInput refuses to invent a date for precision none", () => {
    // This is why the write path must branch before it: the engine will not
    // synthesize a birth date, so a "none" person has no chart at all.
    expect(() => buildBirthInput({ precision: "none" } as BirthFormInput)).toThrow(/No birth data/i);
  });

  it("the deferred row leaves every birth column null", () => {
    const row = deferredPersonRow({
      ownerId: "owner-1",
      displayName: "  Grandmother  ",
      relation: "grandparent",
      isSelf: false,
      isMinor: false
    });

    expect(row).toEqual({
      owner_id: "owner-1",
      is_self: false,
      display_name: "Grandmother",
      relation: "grandparent",
      is_minor: false,
      birth_precision: "none",
      birth_date: null,
      birth_time: null,
      birth_place: null,
      birth_lat: null,
      birth_lng: null,
      tz_offset_min: null
    });
  });

  it("keeps the manual minor flag: with no birth date it is the only safety signal", () => {
    const flagged = deferredPersonRow({
      ownerId: "owner-1",
      displayName: "Niece",
      relation: "child",
      isSelf: false,
      isMinor: true
    });
    expect(flagged.is_minor).toBe(true);
  });

  it("wiring: persistPerson offers none through createPerson before chart computation", () => {
    expect(onboardingSrc).toContain("CHART_PRECISION_NONE_TIER");
    expect(persistSrc).toContain('input.precision === "none"');
    expect(persistSrc).toContain("createPerson");
    expect(persistSrc.indexOf('input.precision === "none"')).toBeLessThan(
      persistSrc.indexOf("buildBirthInput(input)")
    );
  });

  it("wiring: only the add-person form offers it, matching web's allowNone", () => {
    expect(onboardingSrc).toContain("allowNone");
    expect(onboardingSrc).toContain("<BirthFields input={personInput} onChange={setPersonInput} allowNone />");
    // Your own profile still starts from real birth data (web: /welcome mounts
    // BirthFields without allowNone).
    expect(onboardingSrc).toContain("<BirthFields input={selfInput} onChange={setSelfInput} />");
  });

  it("wiring: the profile screen renders a person who has no chart row", () => {
    expect(profileSrc).toContain('supabase.from("charts").select("data, house_system, engine_version").eq("person_id", actualPersonId).maybeSingle()');
    expect(profileSrc).not.toContain("Unable to load chart.");
    expect(profileSrc).not.toContain("if (!person || !chart)");
    expect(profileSrc).toContain("CHART_PRECISION_NONE_FACT");
    expect(profileSrc).toContain('person.birth_precision === "none"');
    expect(profileSrc).toContain("CHART_SAVED_DETAILS_NO_CHART_BODY");
    // A failed read is kept apart from an absent chart, so an outage is never
    // rendered as missing birth data (ENGINEERING §12).
    expect(profileSrc).toContain("chartLoadError");
    expect(profileSrc).toContain("Chart could not be loaded");
  });

  it("wiring: the profile states chart precision as a fact and names missing houses/aspects", () => {
    expect(profileSrc).toContain("ChartPrecisionFacts");
    expect(profileSrc).toContain("chartPrecisionFact");
    expect(profileSrc).toContain("housesUnavailableCopy");
    expect(profileSrc).toContain("ASPECTS_UNAVAILABLE_YEAR_BODY");
    expect(profileSrc).not.toContain("{person.relation} · {person.birth_precision}");
  });
});
