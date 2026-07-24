import { describe, expect, it } from "vitest";
import {
  SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR,
  buildVelaContext,
  coerceVelaRelationshipTypeForMinorScope,
  resolveVelaRelationshipType
} from "../src/index";

const adultPerson = {
  name: "Rosa",
  role: "grandmother",
  isMinor: false,
  precision: "date" as const,
  sun: "Leo",
  moon: "Virgo",
  rising: null,
  venus: "Cancer",
  mars: "Aries",
  traits: "steady",
  generational: {
    uranus: "Cancer",
    neptune: "Libra",
    pluto: "Leo",
    cohortLabel: "test"
  }
};

const minorPerson = {
  ...adultPerson,
  name: "Gabriel",
  role: "grandchild",
  isMinor: true
};

function ctxWithRelType(relationshipType: string) {
  return buildVelaContext({
    mode: "ask",
    framing: { kind: "third_person_minor", subjectName: "Gabriel" },
    relationshipType,
    user: { name: "Carmen" },
    people: [minorPerson],
    history: [],
    userMessage: "What do we need most from each other?"
  });
}

describe("coerceVelaRelationshipTypeForMinorScope — allowlist", () => {
  it("keeps every safe enumerated value", () => {
    for (const safe of SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR) {
      expect(coerceVelaRelationshipTypeForMinorScope(safe)).toBe(safe);
    }
  });

  it("is case-insensitive and trims", () => {
    expect(coerceVelaRelationshipTypeForMinorScope("  Friends ")).toBe("friends");
    expect(coerceVelaRelationshipTypeForMinorScope("PARENT-CHILD")).toBe("parent-child");
  });

  it("coerces romantic labels to general", () => {
    expect(coerceVelaRelationshipTypeForMinorScope("partner")).toBe("general");
    expect(coerceVelaRelationshipTypeForMinorScope("partners")).toBe("general");
    expect(coerceVelaRelationshipTypeForMinorScope("romantic")).toBe("general");
  });

  it("coerces slang and misspellings to general (not a denylist gap)", () => {
    expect(coerceVelaRelationshipTypeForMinorScope("bf")).toBe("general");
    expect(coerceVelaRelationshipTypeForMinorScope("novio")).toBe("general");
    expect(coerceVelaRelationshipTypeForMinorScope("dating")).toBe("general");
    expect(coerceVelaRelationshipTypeForMinorScope("boyfreind")).toBe("general");
  });
});

describe("resolveVelaRelationshipType — scope gate (asserts coerced value in context)", () => {
  it("1:1 with a minor + partner → general reaches context", () => {
    const relationshipType = resolveVelaRelationshipType("partner", true);
    expect(relationshipType).toBe("general");
    expect(ctxWithRelType(relationshipType).relationshipType).toBe("general");
  });

  it("1:1 with a minor + bf → general reaches context", () => {
    const relationshipType = resolveVelaRelationshipType("bf", true);
    expect(relationshipType).toBe("general");
    expect(ctxWithRelType(relationshipType).relationshipType).toBe("general");
  });

  it("group with a minor + romantic → general reaches context", () => {
    // Group vs 1:1 is the same gate: scopeHasMinor, not group-only.
    const relationshipType = resolveVelaRelationshipType("romantic", true);
    expect(relationshipType).toBe("general");
    const ctx = buildVelaContext({
      mode: "ask",
      framing: { kind: "group", groupName: "QATEST Group1" },
      relationshipType,
      user: { name: "Carmen" },
      group: { name: "QATEST Group1" },
      people: [
        { ...adultPerson, name: "Abuelita Rosa" },
        { ...adultPerson, name: "Frankie", role: "grandmother" },
        minorPerson
      ],
      history: [],
      userMessage: "What do we need most from each other?"
    });
    expect(ctx.relationshipType).toBe("general");
  });

  it("group of adults + partner is unaffected", () => {
    const relationshipType = resolveVelaRelationshipType("partner", false);
    expect(relationshipType).toBe("partner");
  });

  it("adults-only 1:1 + partner is unaffected", () => {
    const relationshipType = resolveVelaRelationshipType("partner", false);
    expect(relationshipType).toBe("partner");
    const ctx = buildVelaContext({
      mode: "ask",
      framing: { kind: "default" },
      relationshipType,
      user: { name: "Carmen" },
      people: [adultPerson],
      history: [],
      userMessage: "How do we reconnect?"
    });
    expect(ctx.relationshipType).toBe("partner");
  });

  it("grandchild relationshipType stays when a minor is in scope", () => {
    expect(resolveVelaRelationshipType("grandchild", true)).toBe("grandchild");
    expect(resolveVelaRelationshipType("grandparent", true)).toBe("grandparent");
  });
});
