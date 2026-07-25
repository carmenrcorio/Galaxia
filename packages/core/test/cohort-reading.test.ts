import { describe, expect, it } from "vitest";
import {
  buildGroupsCurrentPayload,
  cohortStateFromGroupsCurrentPayload,
  GROUPS_CURRENT_SOURCE,
  memberSetHash,
  readyMembersForCohortOverlay,
  selectGroupsCurrentForRoster
} from "../src/cohort-reading";

const overlay = {
  sharedSky: [{ planet: "pluto", sign: "Scorpio" }],
  faultLines: [
    {
      planet: "uranus",
      groups: [
        { sign: "Capricorn", names: ["A", "B"] },
        { sign: "Aquarius", names: ["C"] }
      ]
    }
  ],
  label: "Shared sky on 1 outer planet"
};

const idsA = ["p-b", "p-a", "p-c"];
const idsB = ["p-a", "p-b", "p-d"];

describe("memberSetHash", () => {
  it("is order-independent and stable", () => {
    expect(memberSetHash(["b", "a", "c"])).toBe(memberSetHash(["c", "b", "a"]));
    expect(memberSetHash(idsA)).toBe(memberSetHash(["p-a", "p-b", "p-c"]));
  });

  it("changes when the roster changes", () => {
    expect(memberSetHash(idsA)).not.toBe(memberSetHash(idsB));
  });
});

describe("hydrate-from-note path", () => {
  it("builds a groups_current payload and hydrates the same reading surface shape", () => {
    const payload = buildGroupsCurrentPayload({
      memberIds: idsA,
      memberNames: ["Ada", "Bea", "Cara"],
      overlay,
      pairHighlights: [{ pair: "Ada × Bea", summary: "Fault line: uranus Capricorn/Aquarius." }]
    });
    expect(payload.source).toBe(GROUPS_CURRENT_SOURCE);
    expect(payload.member_set_hash).toBe(memberSetHash(idsA));
    expect(payload.memberIds).toEqual(["p-a", "p-b", "p-c"]);

    const state = cohortStateFromGroupsCurrentPayload(payload);
    expect(state).not.toBeNull();
    expect(state!.memberNames).toEqual(["Ada", "Bea", "Cara"]);
    expect(state!.overlay.label).toBe(overlay.label);
    expect(state!.overlay.faultLines[0]?.groups[1]?.names).toEqual(["C"]);
    expect(state!.pairHighlights).toHaveLength(1);
  });

  it("selectGroupsCurrentForRoster returns the matching note for the live roster", () => {
    const payload = buildGroupsCurrentPayload({
      memberIds: idsA,
      memberNames: ["Ada", "Bea", "Cara"],
      overlay,
      pairHighlights: []
    });
    const hit = selectGroupsCurrentForRoster(idsA, [
      { id: "note-old", payload: { source: "vela_cohort_current", overlay }, member_set_hash: null },
      { id: "note-hit", payload, member_set_hash: payload.member_set_hash }
    ]);
    expect(hit?.id).toBe("note-hit");
    expect(cohortStateFromGroupsCurrentPayload(hit!.payload)?.memberIds).toEqual([
      "p-a",
      "p-b",
      "p-c"
    ]);
  });
});

describe("miss-then-compute path", () => {
  it("returns null when no groups_current note matches (caller must compute + upsert)", () => {
    const other = buildGroupsCurrentPayload({
      memberIds: idsB,
      memberNames: ["Ada", "Bea", "Dee"],
      overlay,
      pairHighlights: []
    });
    expect(
      selectGroupsCurrentForRoster(idsA, [
        { id: "note-other", payload: other, member_set_hash: other.member_set_hash }
      ])
    ).toBeNull();
    expect(selectGroupsCurrentForRoster(idsA, [])).toBeNull();
  });
});

describe("roster-change invalidation", () => {
  it("old hash row no longer matches after roster change (structural, not render-time)", () => {
    const oldPayload = buildGroupsCurrentPayload({
      memberIds: idsA,
      memberNames: ["Ada", "Bea", "Cara"],
      overlay,
      pairHighlights: []
    });
    const notes = [
      { id: "stale", payload: oldPayload, member_set_hash: oldPayload.member_set_hash }
    ];
    expect(selectGroupsCurrentForRoster(idsA, notes)?.id).toBe("stale");
    // Roster changed → live hash differs → stale row cannot be selected.
    expect(selectGroupsCurrentForRoster(idsB, notes)).toBeNull();
    // Fresh compute would write a new key:
    const fresh = buildGroupsCurrentPayload({
      memberIds: idsB,
      memberNames: ["Ada", "Bea", "Dee"],
      overlay,
      pairHighlights: []
    });
    expect(fresh.member_set_hash).not.toBe(oldPayload.member_set_hash);
    expect(
      selectGroupsCurrentForRoster(idsB, [
        ...notes,
        { id: "fresh", payload: fresh, member_set_hash: fresh.member_set_hash }
      ])?.id
    ).toBe("fresh");
  });
});

describe("mobile / overlay control-flow guard", () => {
  it("readyMembersForCohortOverlay makes empty or partial input unreachable for cohortOverlay", () => {
    expect(readyMembersForCohortOverlay([])).toBeNull();
    expect(
      readyMembersForCohortOverlay([
        { name: "A", gen: { x: 1 } },
        { name: "B", gen: { x: 1 } }
      ])
    ).toBeNull();
    expect(
      readyMembersForCohortOverlay([
        { name: "A", gen: { x: 1 } },
        { name: "B", gen: null },
        { name: "C", gen: { x: 1 } }
      ])
    ).toBeNull();
    expect(
      readyMembersForCohortOverlay([
        { name: "A", gen: undefined },
        { name: "B", gen: { x: 1 } },
        { name: "C", gen: { x: 1 } }
      ])
    ).toBeNull();

    const ready = readyMembersForCohortOverlay([
      { name: "A", gen: { x: 1 } },
      { name: "B", gen: { x: 2 } },
      { name: "C", gen: { x: 3 } }
    ]);
    expect(ready).toHaveLength(3);
    expect(ready!.every((m) => m.gen != null)).toBe(true);
  });
});
