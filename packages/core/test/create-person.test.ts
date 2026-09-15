import { describe, expect, it } from "vitest";
import {
  buildPersonInsertRow,
  createPerson,
  type CreatePersonInput,
  type PeopleInsertClient,
  type PersonInsertRow
} from "../src/create-person";

const NOW = new Date("2026-09-15T00:00:00.000Z");

const DATE_BIRTH = {
  precision: "date" as const,
  birthDate: "1990-07-16",
  birthTime: null,
  birthPlace: "Lisbon, Portugal",
  birthLat: 38.72,
  birthLng: -9.14,
  tzOffsetMin: 60
};

function sample(overrides: Partial<CreatePersonInput> = {}): CreatePersonInput {
  return {
    userId: "owner-1",
    displayName: "  Maya  ",
    relation: "friend",
    isSelf: false,
    isMinor: false,
    birth: DATE_BIRTH,
    now: NOW,
    ...overrides
  };
}

function recordingClient(store: PersonInsertRow[]): PeopleInsertClient {
  return {
    from: (table: "people") => {
      if (table !== "people") throw new Error("createPerson may only write people");
      return {
        insert: (row: PersonInsertRow) => {
          store.push(row);
          return {
            select: () => ({
              single: async () => ({ data: { id: `id-${store.length}` }, error: null })
            })
          };
        }
      };
    }
  };
}

describe("buildPersonInsertRow", () => {
  it("trims the name, stores the requested relation, and derives is_minor from the date backstop", () => {
    const { row, refusedRelation } = buildPersonInsertRow(sample());
    expect(row.display_name).toBe("Maya");
    expect(row.relation).toBe("friend");
    expect(row.is_minor).toBe(false);
    expect(row.birth_precision).toBe("date");
    expect(row.birth_date).toBe("1990-07-16");
    expect(row.passed_at).toBeNull();
    expect(refusedRelation).toBeNull();
  });

  it("none precision leaves every birth column null", () => {
    const { row } = buildPersonInsertRow(sample({ birth: { precision: "none" } }));
    expect(row.birth_precision).toBe("none");
    expect(row.birth_date).toBeNull();
    expect(row.birth_time).toBeNull();
    expect(row.birth_place).toBeNull();
    expect(row.birth_lat).toBeNull();
    expect(row.birth_lng).toBeNull();
    expect(row.tz_offset_min).toBeNull();
  });

  it("keeps the manual minor flag when there is no birth date to compute from", () => {
    const { row } = buildPersonInsertRow(
      sample({ isMinor: true, birth: { precision: "none" } })
    );
    expect(row.is_minor).toBe(true);
  });

  it("refuses a romantic relation for a minor and reports it", () => {
    const { row, refusedRelation } = buildPersonInsertRow(
      sample({
        relation: "partner",
        birth: { ...DATE_BIRTH, birthDate: "2015-06-01" }
      })
    );
    expect(row.is_minor).toBe(true);
    expect(row.relation).toBe("other");
    expect(refusedRelation).toBe("partner");
  });

  it("passes self through without rewriting the relation", () => {
    const { row, refusedRelation } = buildPersonInsertRow(
      sample({ displayName: "Me", relation: "self", isSelf: true })
    );
    expect(row.is_self).toBe(true);
    expect(row.relation).toBe("self");
    expect(refusedRelation).toBeNull();
  });

  it("throws when the name is blank after trim", () => {
    expect(() => buildPersonInsertRow(sample({ displayName: "   " }))).toThrow(/name/i);
  });
});

describe("createPerson is the single insert", () => {
  it("identical input from onboarding and from add-person produces identical rows", async () => {
    const onboarding: PersonInsertRow[] = [];
    const addPerson: PersonInsertRow[] = [];
    const input = sample({ displayName: "Rosa", relation: "mother" });

    const fromOnboarding = await createPerson(recordingClient(onboarding), input);
    const fromAddPerson = await createPerson(recordingClient(addPerson), input);

    expect(onboarding[0]).toEqual(addPerson[0]);
    expect(fromOnboarding.display_name).toBe(fromAddPerson.display_name);
    expect(fromOnboarding.relation).toBe(fromAddPerson.relation);
    expect(fromOnboarding.is_minor).toBe(fromAddPerson.is_minor);
    expect(fromOnboarding.birth_precision).toBe(fromAddPerson.birth_precision);
    expect(fromOnboarding.birth_date).toBe(fromAddPerson.birth_date);
    expect(fromOnboarding.passed_at).toBe(fromAddPerson.passed_at);
  });

  it("returns the inserted id with the refused relation when a minor partner is rewritten", async () => {
    const store: PersonInsertRow[] = [];
    const created = await createPerson(
      recordingClient(store),
      sample({
        relation: "partner",
        birth: { ...DATE_BIRTH, birthDate: "2015-06-01" }
      })
    );
    expect(created.id).toBe("id-1");
    expect(created.relation).toBe("other");
    expect(created.refusedRelation).toBe("partner");
    expect(created.is_minor).toBe(true);
  });
});
