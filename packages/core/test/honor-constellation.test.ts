import { isMinorForSafety } from "../src/index";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FORBIDDEN_HONOR_RELATION_TYPES,
  HONOR_LINE_STYLE,
  HONOR_RELATION_TYPE,
  RELATIONSHIPS_OWNER_RLS_POLICY,
  buildHonorRelationshipInsert,
  honorConnectionDiff,
  honorEdgeFraming,
  honorEdgeTouchesMinor,
  honorEdgesFromDeclaredRows,
  isForbiddenHonorRelationType,
  isHonorRelationType,
  livingHonorCandidates,
  livingIdsFromHonorRows,
  synastryCannotSubstituteHonor,
} from "../src/honor-constellation";

const NOW = new Date("2026-07-12T00:00:00.000Z");

const owner = {
  id: "self-1",
  display_name: "Carmen",
  is_self: true,
  is_minor: false,
  birth_date: "1990-05-01",
  birth_precision: "exact" as const,
  passed_at: null,
};
const passedParent = {
  id: "passed-1",
  display_name: "Dad",
  is_self: false,
  is_minor: false,
  birth_date: "1955-03-02",
  birth_precision: "exact" as const,
  passed_at: "2024-11-02T00:00:00.000Z",
};
const livingChild = {
  id: "living-1",
  display_name: "Sam",
  is_self: false,
  is_minor: false,
  birth_date: "2015-08-20",
  birth_precision: "exact" as const,
  passed_at: null,
};
const livingFriend = {
  id: "living-2",
  display_name: "Alex",
  is_self: false,
  is_minor: false,
  birth_date: "1988-01-10",
  birth_precision: "exact" as const,
  passed_at: null,
};
const passedMinor = {
  id: "passed-minor",
  display_name: "Jamie",
  is_self: false,
  is_minor: false, // raw flag false — age backstop must still protect
  birth_date: "2017-04-03",
  birth_precision: "exact" as const,
  passed_at: "2025-01-15T00:00:00.000Z",
};

describe("Honor constellation — declared relationships only (zero inference)", () => {
  it("writes fixed remembrance relation_type — never guesses from owner-relations", () => {
    const row = buildHonorRelationshipInsert({
      ownerId: "owner-aaa",
      passedPersonId: passedParent.id,
      livingPersonId: livingChild.id,
    });
    expect(row).toEqual({
      owner_id: "owner-aaa",
      person_a: passedParent.id,
      person_b: livingChild.id,
      relation_type: HONOR_RELATION_TYPE,
    });
    expect(row.relation_type).toBe("remembrance");
    expect(isForbiddenHonorRelationType(row.relation_type)).toBe(false);
  });

  it("candidates are living people only — no auto-suggest, no passed peers", () => {
    const people = [owner, passedParent, livingChild, livingFriend, passedMinor];
    const candidates = livingHonorCandidates(people, passedParent.id);
    expect(candidates.map((c) => c.id).sort()).toEqual(
      [owner.id, livingChild.id, livingFriend.id].sort()
    );
    expect(candidates.some((c) => c.id === passedParent.id)).toBe(false);
    expect(candidates.some((c) => c.id === passedMinor.id)).toBe(false);
  });

  it("empty declaration yields zero honor edges — empty is empty", () => {
    const people = [owner, passedParent, livingChild];
    expect(honorEdgesFromDeclaredRows([], people, NOW)).toEqual([]);
  });

  it("draws ONLY declared relationships rows — never synastry-substitutes", () => {
    const people = [owner, passedParent, livingChild, livingFriend];
    const declared = [
      {
        person_a: passedParent.id,
        person_b: livingChild.id,
        relation_type: HONOR_RELATION_TYPE,
      },
    ];
    const edges = honorEdgesFromDeclaredRows(declared, people, NOW);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      fromId: passedParent.id,
      toId: livingChild.id,
      relationType: HONOR_RELATION_TYPE,
    });

    // Synastry may score parent↔friend high — that must NOT create an honor edge.
    const synastryPairs = [
      { fromId: passedParent.id, toId: livingFriend.id },
      { fromId: passedParent.id, toId: livingChild.id },
    ];
    expect(synastryCannotSubstituteHonor(synastryPairs, edges)).toBe(true);
    expect(
      honorEdgesFromDeclaredRows([], people, NOW).some(
        (e) => e.toId === livingFriend.id || e.fromId === livingFriend.id
      )
    ).toBe(false);
  });

  it("ignores non-remembrance relation_type rows (no romantic / partner edges)", () => {
    const people = [owner, passedParent, livingFriend];
    const rows = [
      {
        person_a: passedParent.id,
        person_b: livingFriend.id,
        relation_type: "partner",
      },
      {
        person_a: passedParent.id,
        person_b: owner.id,
        relation_type: HONOR_RELATION_TYPE,
      },
    ];
    const edges = honorEdgesFromDeclaredRows(rows, people, NOW);
    expect(edges).toHaveLength(1);
    expect(edges[0].toId).toBe(owner.id);
    expect(edges.every((e) => !isForbiddenHonorRelationType(e.relationType))).toBe(true);
  });

  it("does not infer spouse/lineage from shared owner-relations", () => {
    // Two people both related to owner as "parent" — must NOT invent a bond.
    const parentA = { ...passedParent, id: "p-a", relation: "parent" };
    const parentB = {
      ...livingFriend,
      id: "p-b",
      relation: "parent",
      passed_at: null,
    };
    const people = [owner, parentA, parentB];
    expect(honorEdgesFromDeclaredRows([], people as typeof people, NOW)).toEqual([]);
  });
});

describe("No romantic framing on any honor edge", () => {
  it("HONOR_RELATION_TYPE is non-romantic and forbidden list covers partner types", () => {
    expect(isHonorRelationType(HONOR_RELATION_TYPE)).toBe(true);
    expect(isForbiddenHonorRelationType(HONOR_RELATION_TYPE)).toBe(false);
    for (const t of FORBIDDEN_HONOR_RELATION_TYPES) {
      expect(isForbiddenHonorRelationType(t)).toBe(true);
    }
  });

  it("framing is always remembrance continuity — romantic: false", () => {
    expect(honorEdgeFraming(false)).toEqual({
      kind: "remembrance",
      romantic: false,
      label: "Remembrance light — continuity",
    });
    expect(honorEdgeFraming(true).romantic).toBe(false);
    expect(honorEdgeFraming(true).label).toMatch(/never romantic/i);
  });

  it("visual tokens reuse ancient-light / water — distinct from synastry element gradients", () => {
    expect(HONOR_LINE_STYLE.water).toBe("#6FB1B8");
    expect(HONOR_LINE_STYLE.ancient).toBe("#DA8C8C");
    expect(HONOR_LINE_STYLE.dash.length).toBeGreaterThan(0);
  });
});

describe("MINOR SAFETY: honor edges use isMinorForSafety (both endpoints)", () => {
  it("passed minor is still a minor — raw is_minor alone would miss them", () => {
    expect(passedMinor.is_minor).toBe(false);
    expect(
      isMinorForSafety(
        {
          isMinor: passedMinor.is_minor,
          birthDate: passedMinor.birth_date,
          birthPrecision: passedMinor.birth_precision,
        },
        NOW
      )
    ).toBe(true);
  });

  it("edge touching a passed minor flags touchesMinor via isMinorForSafety", () => {
    expect(honorEdgeTouchesMinor(passedMinor, owner, NOW)).toBe(true);
    expect(honorEdgeTouchesMinor(passedParent, livingChild, NOW)).toBe(true); // living child is minor by age
    expect(honorEdgeTouchesMinor(passedParent, livingFriend, NOW)).toBe(false);
  });

  it("galaxy honor edges set touchesMinor from age-aware gate, not raw is_minor", () => {
    const people = [owner, passedMinor, livingFriend];
    const rows = [
      {
        person_a: passedMinor.id,
        person_b: livingFriend.id,
        relation_type: HONOR_RELATION_TYPE,
      },
    ];
    const edges = honorEdgesFromDeclaredRows(rows, people, NOW);
    expect(edges).toHaveLength(1);
    expect(edges[0].touchesMinor).toBe(true);
    expect(honorEdgeFraming(edges[0].touchesMinor).romantic).toBe(false);
  });
});

describe("Declare-then-remove round-trips (reversible)", () => {
  it("diff adds and removes exactly the user selection — no orphans implied", () => {
    expect(honorConnectionDiff([], [livingChild.id, owner.id])).toEqual({
      toAdd: [livingChild.id, owner.id],
      toRemove: [],
    });
    expect(honorConnectionDiff([livingChild.id, owner.id], [owner.id])).toEqual({
      toAdd: [],
      toRemove: [livingChild.id],
    });
    expect(honorConnectionDiff([owner.id], [])).toEqual({
      toAdd: [],
      toRemove: [owner.id],
    });
  });

  it("livingIdsFromHonorRows round-trips declared carriers", () => {
    const rows = [
      {
        person_a: passedParent.id,
        person_b: livingChild.id,
        relation_type: HONOR_RELATION_TYPE,
      },
      {
        person_a: passedParent.id,
        person_b: owner.id,
        relation_type: HONOR_RELATION_TYPE,
      },
    ];
    expect(livingIdsFromHonorRows(rows, passedParent.id).sort()).toEqual(
      [livingChild.id, owner.id].sort()
    );
    // After removals (empty rows) — empty constellation
    expect(livingIdsFromHonorRows([], passedParent.id)).toEqual([]);
  });
});

describe("relationships RLS + unique index (schema contracts)", () => {
  it("documents owner RLS policy constants against the migration", () => {
    expect(RELATIONSHIPS_OWNER_RLS_POLICY.name).toBe("relationships owner all");
    expect(RELATIONSHIPS_OWNER_RLS_POLICY.using).toBe("owner_id = auth.uid()");
    const policySql = readFileSync(
      resolve(__dirname, "../../../supabase/migrations/20260629220500_add_owner_rls_policies.sql"),
      "utf8"
    );
    expect(policySql).toContain('create policy "relationships owner all"');
    expect(policySql).toContain("owner_id = auth.uid()");
  });

  it("ships unique index migration so declare/remove cannot leave duplicate pairs", () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        "../../../supabase/migrations/20260712190000_relationships_honor_unique.sql"
      ),
      "utf8"
    );
    expect(sql).toContain("relationships_owner_pair_type_uidx");
    expect(sql).toContain("remembrance");
  });
});
