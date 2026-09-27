import { describe, expect, it } from "vitest";
import { buildAccountExport, type AccountExportInput } from "../src/account-data";

const OWNER_PERSON = "11111111-1111-4111-8111-111111111111";
const FRIEND_PERSON = "22222222-2222-4222-8222-222222222222";
const GRANDMOTHER = "33333333-3333-4333-8333-333333333333";
const GROUP = "44444444-4444-4444-8444-444444444444";

function input(overrides: Partial<AccountExportInput> = {}): AccountExportInput {
  return {
    exportedAt: "2026-09-27T04:05:06.000Z",
    email: "carmen@example.com",
    profile: { display_name: "Carmen", timezone: "America/New_York", house_system: "placidus" },
    people: [
      {
        id: OWNER_PERSON,
        display_name: "Carmen",
        relation: "self",
        is_self: true,
        is_minor: false,
        birth_date: "1990-04-12",
        birth_time: "06:31:00",
        birth_place: "Jacksonville, Arkansas, United States",
        birth_precision: "exact",
        birth_lat: 34.866,
        birth_lng: -92.11,
        tz_offset_min: -360,
        created_at: "2026-01-01T00:00:00.000Z"
      },
      {
        id: FRIEND_PERSON,
        display_name: "Sam",
        relation: "friend",
        is_self: false,
        is_minor: false,
        birth_date: "1987-12-29",
        birth_precision: "date"
      },
      {
        id: GRANDMOTHER,
        display_name: "Nan",
        relation: "grandparent",
        passed_at: "2025-03-04T00:00:00.000Z",
        died_on: "2025-03-04",
        memorial_constellation: "lyra"
      }
    ],
    charts: [
      {
        person_id: OWNER_PERSON,
        house_system: "placidus",
        computed_at: "2026-01-01T00:00:10.000Z",
        data: {
          asc: "Leo",
          mc: "Taurus",
          houseSystem: "placidus",
          placements: [
            { body: "sun", sign: "Aries", degree: 22.4, house: 9, retro: false },
            { body: "pluto", sign: "Scorpio", degree: 16.1, house: 4, retro: true },
            { nonsense: true }
          ]
        }
      }
    ],
    relationships: [
      { person_a: OWNER_PERSON, person_b: FRIEND_PERSON, relation_type: "friend" }
    ],
    groups: [{ id: GROUP, name: "Sunday table", kind: "family", created_at: "2026-02-02T00:00:00.000Z" }],
    groupMembers: [
      { group_id: GROUP, person_id: OWNER_PERSON },
      { group_id: GROUP, person_id: GRANDMOTHER }
    ],
    notes: [
      {
        about_person: FRIEND_PERSON,
        body: "Called on the Saturn return day.",
        kind: "note",
        tags: ["saturn"],
        created_at: "2026-03-03T00:00:00.000Z"
      },
      {
        pair_low: OWNER_PERSON,
        pair_high: FRIEND_PERSON,
        group_id: GROUP,
        body: "Compare reading we kept.",
        kind: "reading",
        created_at: "2026-03-04T00:00:00.000Z"
      }
    ],
    milestones: [
      {
        profile_id: GRANDMOTHER,
        date: "2026-03-04",
        title: "First year",
        note: "Lit a candle.",
        created_at: "2026-03-04T12:00:00.000Z",
        updated_at: "2026-03-04T12:00:00.000Z"
      }
    ],
    ...overrides
  };
}

describe("buildAccountExport", () => {
  it("carries the profile fields the person recognises", () => {
    const payload = buildAccountExport(input());
    expect(payload.profile).toEqual({
      name: "Carmen",
      email: "carmen@example.com",
      timezone: "America/New_York",
      house_system: "placidus"
    });
    expect(payload.exported_at).toBe("2026-09-27T04:05:06.000Z");
    expect(payload.export_version).toBe(1);
  });

  it("includes every person with birth data, memorial status, and chart placements", () => {
    const payload = buildAccountExport(input());
    expect(payload.people).toHaveLength(3);

    const carmen = payload.people[0];
    expect(carmen.name).toBe("Carmen");
    expect(carmen.is_self).toBe(true);
    expect(carmen.birth).toEqual({
      date: "1990-04-12",
      time: "06:31:00",
      place: "Jacksonville, Arkansas, United States",
      precision: "exact",
      latitude: 34.866,
      longitude: -92.11,
      utc_offset_minutes: -360
    });
    expect(carmen.chart?.ascendant_sign).toBe("Leo");
    expect(carmen.chart?.midheaven_sign).toBe("Taurus");
    expect(carmen.chart?.house_system).toBe("placidus");
    expect(carmen.chart?.placements).toEqual([
      { body: "sun", sign: "Aries", degree: 22.4, house: 9, retrograde: false },
      { body: "pluto", sign: "Scorpio", degree: 16.1, house: 4, retrograde: true }
    ]);

    const nan = payload.people[2];
    expect(nan.memorial).toEqual({ remembered: true, died_on: "2025-03-04", constellation: "lyra" });
    expect(payload.people[1].memorial.remembered).toBe(false);
  });

  it("reports a person with no stored chart as having none rather than inventing one", () => {
    const payload = buildAccountExport(input());
    expect(payload.people[1].chart).toBeNull();
    expect(payload.people[2].chart).toBeNull();
  });

  it("names people in relationships, groups, notes, and milestones instead of using ids", () => {
    const payload = buildAccountExport(input());
    expect(payload.relationships).toEqual([
      { relationship_type: "friend", people: ["Carmen", "Sam"] }
    ]);
    expect(payload.groups).toEqual([
      {
        name: "Sunday table",
        kind: "family",
        created_at: "2026-02-02T00:00:00.000Z",
        members: ["Carmen", "Nan"]
      }
    ]);
    expect(payload.notes[0].person).toBe("Sam");
    expect(payload.notes[0].content).toBe("Called on the Saturn return day.");
    expect(payload.notes[0].created_at).toBe("2026-03-03T00:00:00.000Z");
    expect(payload.notes[1].about_pair).toEqual(["Carmen", "Sam"]);
    expect(payload.notes[1].group).toBe("Sunday table");
    expect(payload.memorial_milestones).toEqual([
      {
        person: "Nan",
        date: "2026-03-04",
        title: "First year",
        note: "Lit a candle.",
        created_at: "2026-03-04T12:00:00.000Z",
        updated_at: "2026-03-04T12:00:00.000Z"
      }
    ]);
  });

  it("never serialises an internal id, an owner id, or an auth token", () => {
    const serialised = JSON.stringify(buildAccountExport(input()));
    for (const id of [OWNER_PERSON, FRIEND_PERSON, GRANDMOTHER, GROUP]) {
      expect(serialised).not.toContain(id);
    }
    expect(serialised).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(serialised).not.toContain("owner_id");
    expect(serialised).not.toContain("access_token");
    expect(serialised).not.toContain("linked_user_id");
    expect(serialised).not.toContain("unsubscribe_token");
  });

  it("omits Vela conversation history entirely", () => {
    const payload = buildAccountExport(input());
    expect(payload).not.toHaveProperty("threads");
    expect(payload).not.toHaveProperty("messages");
    expect(JSON.stringify(payload)).not.toContain("thread_id");
  });

  it("holds an empty account without fabricating rows", () => {
    const payload = buildAccountExport({
      exportedAt: "2026-09-27T00:00:00.000Z",
      email: null,
      profile: null,
      people: [],
      charts: [],
      relationships: [],
      groups: [],
      groupMembers: [],
      notes: [],
      milestones: []
    });
    expect(payload.profile).toEqual({ name: null, email: null, timezone: null, house_system: null });
    expect(payload.people).toEqual([]);
    expect(payload.relationships).toEqual([]);
    expect(payload.groups).toEqual([]);
    expect(payload.notes).toEqual([]);
    expect(payload.memorial_milestones).toEqual([]);
  });

  it("is human-readable JSON when indented", () => {
    const text = JSON.stringify(buildAccountExport(input()), null, 2);
    expect(text.split("\n").length).toBeGreaterThan(40);
    expect(text).toContain('\n  "profile": {');
  });
});
