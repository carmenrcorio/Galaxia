import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inviteAcceptPeopleUpdate } from "./invite-birth-data";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function utcDateYearsAgo(years: number): string {
  const now = new Date();
  return `${now.getUTCFullYear() - years}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function builtFromDate(birthDate: string) {
  return {
    birthDate,
    birthTime: "14:30",
    birthPlace: "Austin, Texas, United States",
    birth: { lat: 30.2672, lng: -97.7431 },
    tzOffsetMin: -360
  };
}

describe("inviteAcceptPeopleUpdate — raise-only is_minor at birth_data accept", () => {
  it("a person with no prior birth date accepted under-18 is raised to is_minor true", () => {
    const patch = inviteAcceptPeopleUpdate(builtFromDate(utcDateYearsAgo(10)), "date");
    expect(patch.birth_date).toBe(utcDateYearsAgo(10));
    expect(patch.is_minor).toBe(true);
  });

  it("an already-flagged minor is not flipped false by an adult-looking date (key omitted)", () => {
    const patch = inviteAcceptPeopleUpdate(builtFromDate("1987-12-29"), "exact");
    expect(patch).not.toHaveProperty("is_minor");
    expect("is_minor" in patch).toBe(false);
  });

  it("an existing adult accept path is unaffected — birth fields written, is_minor not in the UPDATE", () => {
    const patch = inviteAcceptPeopleUpdate(builtFromDate("1987-12-29"), "date");
    expect(patch).toEqual({
      birth_date: "1987-12-29",
      birth_time: "14:30",
      birth_place: "Austin, Texas, United States",
      birth_precision: "date",
      birth_lat: 30.2672,
      birth_lng: -97.7431,
      tz_offset_min: -360
    });
    expect(patch).not.toHaveProperty("is_minor");
  });
});

describe("POST /api/invite/birth-data wires the ratchet into the people UPDATE only", () => {
  const src = readFileSync(join(REPO_ROOT, "apps/web/app/api/invite/birth-data/route.ts"), "utf8");

  it("imports inviteAcceptPeopleUpdate and uses it as the people UPDATE payload", () => {
    expect(src).toContain('import { inviteAcceptPeopleUpdate } from "../../../../lib/invite-birth-data"');
    expect(src).toMatch(/\.from\("people"\)\.update\(\s*inviteAcceptPeopleUpdate\(built,\s*input\.precision\)\s*\)/);
  });

  it("does not write is_minor: false anywhere in the accept route", () => {
    expect(src).not.toMatch(/is_minor\s*:\s*false/);
  });

  it("leaves chart upsert and invite status update unchanged", () => {
    expect(src).toContain('supabase.from("charts").upsert({');
    expect(src).toContain("person_id: invite.person_id");
    expect(src).toContain("house_system: natal.houseSystem ?? null");
    expect(src).toContain("data: natal");
    expect(src).toContain("engine_version: CHART_ENGINE_VERSION");
    expect(src).toContain('supabase.from("invites").update({ status: "accepted" }).eq("id", invite.id)');
  });
});
