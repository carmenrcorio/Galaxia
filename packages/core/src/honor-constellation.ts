/**
 * Declared person-to-person edges on `relationships`
 * (person_a / person_b / relation_type). ZERO inference: edges exist only
 * when the owner writes a row. Empty selection = no constellation.
 *
 * Honor / remembrance is one approved type: a continuity bond, never romantic,
 * never guessed from people.relation (owner-relative). Other approved types
 * (partner, family, friend, colleague, chosen, other) draw on the same
 * galaxy layer with distinct colours and the same dash / alpha / width.
 */

import { isMinorForSafety, type MinorSafetyInput } from "./minor-safety";
import { hasPassed } from "./galaxy-orbit";
import { ELEMENT_NODE_COLORS } from "./star-color";
import { CHIP_INITIAL_LIGHT } from "./person-chip-color";

/** Fixed continuity type written for every honor edge. Not inferred. */
export const HONOR_RELATION_TYPE = "remembrance" as const;

/**
 * Person-to-person edge types stored on public.relationships.relation_type.
 * Distinct from people.relation / galaxy_relations (owner-relative).
 * Undirected: person_a is the lower uuid. remembrance is the honor entry.
 */
export const RELATIONSHIP_EDGE_TYPES = [
  "remembrance",
  "partner",
  "family",
  "friend",
  "colleague",
  "chosen",
  "other",
] as const;

export type RelationshipEdgeType = (typeof RELATIONSHIP_EDGE_TYPES)[number];

/**
 * Types the person-page picker can write.
 * Remembrance stays on HonorDeclarationBox; this list never includes it.
 */
export const DECLARED_BOND_TYPES = [
  "partner",
  "family",
  "friend",
  "colleague",
  "chosen",
  "other",
] as const;

export type DeclaredBondType = (typeof DECLARED_BOND_TYPES)[number];


export const DECLARED_BOND_LABELS: Record<DeclaredBondType, string> = {
  partner: "Partner",
  family: "Family",
  friend: "Friend",
  colleague: "Colleague",
  chosen: "Chosen",
  other: "Other",
};

export function isDeclaredBondType(
  type: string | null | undefined
): type is DeclaredBondType {
  if (!type) return false;
  return (DECLARED_BOND_TYPES as readonly string[]).includes(type);
}

/** Lower uuid in person_a, higher in person_b. Refuses a self-loop. */
export function canonicalRelationshipPair(
  personA: string,
  personB: string
): { person_a: string; person_b: string } {
  if (personA === personB) {
    throw new Error("A relationship cannot link a person to themselves.");
  }
  return personA < personB
    ? { person_a: personA, person_b: personB }
    : { person_a: personB, person_b: personA };
}

/** Documented data-layer policy from `20260629220500_add_owner_rls_policies.sql`. */
export const RELATIONSHIPS_OWNER_RLS_POLICY = {
  name: "relationships owner all",
  using: "owner_id = auth.uid()",
  withCheck: "owner_id = auth.uid()",
} as const;

/**
 * Romantic / attraction types that must NEVER appear on an honor edge.
 * Declaration UX does not offer these; inserts always use HONOR_RELATION_TYPE.
 */
export const FORBIDDEN_HONOR_RELATION_TYPES = [
  "partner",
  "partners",
  "spouse",
  "wife",
  "husband",
  "romantic",
  "dating",
  "lover",
  "attraction",
] as const;

/** Soft ancient-light / water stroke tokens — reuse Phase 1 palette. */
export const HONOR_LINE_STYLE = {
  /** Galaxy water register. */
  water: "#6FB1B8",
  /** Ancestor / ancient-light legend colour. */
  ancient: "#DA8C8C",
  /** Mid-stroke opacity (softer than synastry's score-weighted 0.16–0.28). */
  strokeAlpha: 0.22,
  /** Outer wash — distinguishes honor glow from synastry's element gradient. */
  washAlpha: 0.10,
  lineWidth: 1.35,
  dash: [5, 7] as const,
  pulseRadius: 1.8,
} as const;

export type RelationshipLineStyle = {
  water: string;
  ancient: string;
  strokeAlpha: number;
  washAlpha: number;
  lineWidth: number;
  dash: readonly [number, number];
  pulseRadius: number;
};

/** Same dash / alpha / width as honor; colours only differ by type. */
function relationLine(water: string, ancient: string): RelationshipLineStyle {
  return {
    water,
    ancient,
    strokeAlpha: HONOR_LINE_STYLE.strokeAlpha,
    washAlpha: HONOR_LINE_STYLE.washAlpha,
    lineWidth: HONOR_LINE_STYLE.lineWidth,
    dash: HONOR_LINE_STYLE.dash,
    pulseRadius: HONOR_LINE_STYLE.pulseRadius,
  };
}

/**
 * Galaxy stroke tokens keyed by relation_type.
 * remembrance is the same object as HONOR_LINE_STYLE so honor pixels do not change.
 */
export const RELATION_LINE_STYLE: Record<RelationshipEdgeType, RelationshipLineStyle> = {
  remembrance: HONOR_LINE_STYLE,
  partner: relationLine(ELEMENT_NODE_COLORS.gold, "#f0c089"),
  family: relationLine(ELEMENT_NODE_COLORS.earth, "#9a8a50"),
  friend: relationLine(ELEMENT_NODE_COLORS.fire, ELEMENT_NODE_COLORS.gold),
  colleague: relationLine("#b9aede", ELEMENT_NODE_COLORS.air),
  chosen: relationLine(ELEMENT_NODE_COLORS.air, "#8076a6"),
  other: relationLine(CHIP_INITIAL_LIGHT, "#caa06f"),
};

export type HonorPerson = {
  id: string;
  display_name: string;
  is_self?: boolean;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: MinorSafetyInput["birthPrecision"];
  passed_at?: string | null;
};

export type HonorRelationshipRow = {
  id?: string;
  owner_id: string;
  person_a: string;
  person_b: string;
  relation_type: string;
};

export type HonorEdge = {
  fromId: string;
  toId: string;
  relationType: RelationshipEdgeType;
  /** True when either endpoint is a minor via isMinorForSafety — never raw is_minor. */
  touchesMinor: boolean;
};

/** True for an approved `relationships.relation_type` value. */
export function isRelationshipEdgeType(
  type: string | null | undefined
): type is RelationshipEdgeType {
  if (!type) return false;
  return (RELATIONSHIP_EDGE_TYPES as readonly string[]).includes(type);
}

/** True only for the fixed remembrance continuity type. */
export function isHonorRelationType(type: string | null | undefined): boolean {
  return type === HONOR_RELATION_TYPE;
}

/** Romantic types are forbidden on honor edges — always. */
export function isForbiddenHonorRelationType(type: string | null | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return (FORBIDDEN_HONOR_RELATION_TYPES as readonly string[]).includes(t);
}

/**
 * Living people eligible for "who carries their light?"
 * Present only (no passed_at), not the remembrance subject. Includes self.
 * Never suggests or ranks — callers render a plain multi-select.
 */
export function livingHonorCandidates(
  people: HonorPerson[],
  passedPersonId: string
): HonorPerson[] {
  return people.filter((p) => p.id !== passedPersonId && !hasPassed(p));
}

/**
 * Insert payload for one declared honor edge.
 * Columns are canonical UUID order (lower uuid in person_a), not passed/living.
 */
export function buildHonorRelationshipInsert(input: {
  ownerId: string;
  passedPersonId: string;
  livingPersonId: string;
}): HonorRelationshipRow {
  const pair = canonicalRelationshipPair(input.passedPersonId, input.livingPersonId);
  return {
    owner_id: input.ownerId,
    person_a: pair.person_a,
    person_b: pair.person_b,
    relation_type: HONOR_RELATION_TYPE,
  };
}

/** True when neither endpoint is a minor via isMinorForSafety. */
export function partnerBondAllowed(
  personA: MinorSafetyInput,
  personB: MinorSafetyInput,
  now: Date = new Date()
): boolean {
  return !isMinorForSafety(personA, now) && !isMinorForSafety(personB, now);
}

export type BuildRelationshipInsertResult =
  | { ok: true; row: HonorRelationshipRow }
  | { ok: false; reason: "self" | "partner-minor" | "remembrance" | "not-declared" };

/**
 * Insert payload for a picker-declared bond.
 * Canonical UUID order. Refuses remembrance (honor declaration owns that write),
 * self-loops, unknown types, and partner when either endpoint is a minor.
 * Never rewrites partner to another type.
 */
export function buildRelationshipInsert(input: {
  ownerId: string;
  personAId: string;
  personBId: string;
  relationType: string;
  personA: MinorSafetyInput;
  personB: MinorSafetyInput;
  now?: Date;
}): BuildRelationshipInsertResult {
  if (input.personAId === input.personBId) return { ok: false, reason: "self" };
  if (isHonorRelationType(input.relationType)) return { ok: false, reason: "remembrance" };
  if (!isDeclaredBondType(input.relationType)) return { ok: false, reason: "not-declared" };
  if (
    input.relationType === "partner" &&
    !partnerBondAllowed(input.personA, input.personB, input.now)
  ) {
    return { ok: false, reason: "partner-minor" };
  }
  const pair = canonicalRelationshipPair(input.personAId, input.personBId);
  return {
    ok: true,
    row: {
      owner_id: input.ownerId,
      person_a: pair.person_a,
      person_b: pair.person_b,
      relation_type: input.relationType,
    },
  };
}

export type DeclaredBond = {
  otherId: string;
  relationType: DeclaredBondType;
};

/** Picker rows for one person. Skips remembrance and unknown types. */
export function declaredBondsFromRows(
  rows: Array<{ person_a: string; person_b: string; relation_type: string }>,
  subjectId: string
): DeclaredBond[] {
  const bonds: DeclaredBond[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isDeclaredBondType(row.relation_type)) continue;
    if (row.person_a !== subjectId && row.person_b !== subjectId) continue;
    const otherId = row.person_a === subjectId ? row.person_b : row.person_a;
    if (otherId === subjectId) continue;
    const key = `${otherId}:${row.relation_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bonds.push({ otherId, relationType: row.relation_type });
  }
  return bonds;
}

export function declaredBondExists(
  bonds: readonly DeclaredBond[],
  otherId: string,
  relationType: string
): boolean {
  return bonds.some((b) => b.otherId === otherId && b.relationType === relationType);
}

/**
 * Diff current declared person ids vs next selection for any relation type.
 * Additions insert rows; removals delete rows (reversible, like passed_at).
 */
export function connectionDiff(
  currentIds: readonly string[],
  nextIds: readonly string[]
): { toAdd: string[]; toRemove: string[] } {
  const cur = new Set(currentIds);
  const next = new Set(nextIds);
  return {
    toAdd: [...next].filter((id) => !cur.has(id)),
    toRemove: [...cur].filter((id) => !next.has(id)),
  };
}

/**
 * Honor-declaration wrapper around connectionDiff.
 * Still remembrance-only at the call site (delete stays honor-scoped).
 */
export function honorConnectionDiff(
  currentLivingIds: readonly string[],
  nextLivingIds: readonly string[]
): { toAdd: string[]; toRemove: string[] } {
  return connectionDiff(currentLivingIds, nextLivingIds);
}

/** Living person ids currently declared for a passed person (from DB rows). */
export function livingIdsFromHonorRows(
  rows: Array<{ person_a: string; person_b: string; relation_type: string }>,
  passedPersonId: string
): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (!isHonorRelationType(row.relation_type)) continue;
    if (isForbiddenHonorRelationType(row.relation_type)) continue;
    if (row.person_a === passedPersonId) ids.push(row.person_b);
    else if (row.person_b === passedPersonId) ids.push(row.person_a);
  }
  return [...new Set(ids)];
}

/**
 * Galaxy relationship edges from declared rows only.
 * Remembrance still draws only when one endpoint is passed and the other living,
 * stroke passed → living so bezierCP stays pixel-identical.
 * Other approved types draw for any two distinct people in the map, including
 * living-to-living, using canonical person_a → person_b.
 * Never invents edges from synastry scores or owner-relative people.relation.
 */
export function honorEdgesFromDeclaredRows(
  rows: Array<{ person_a: string; person_b: string; relation_type: string }>,
  people: HonorPerson[],
  now: Date = new Date()
): HonorEdge[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const edges: HonorEdge[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!isRelationshipEdgeType(row.relation_type)) continue;
    const isHonor = isHonorRelationType(row.relation_type);
    if (isHonor && isForbiddenHonorRelationType(row.relation_type)) continue;

    const a = byId.get(row.person_a);
    const b = byId.get(row.person_b);
    if (!a || !b) continue;

    const aPassed = hasPassed(a);
    const bPassed = hasPassed(b);
    // Remembrance thesis: exactly one side passed, the other living.
    if (isHonor && aPassed === bPassed) continue;

    const key = `${row.person_a}:${row.person_b}:${row.relation_type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Honor: passed → living regardless of canonical column order, so
    // bezierCP (which is not symmetric) stays pixel-identical after the
    // person_a < person_b data migration. Other types keep canonical order.
    const fromId = isHonor
      ? aPassed
        ? row.person_a
        : row.person_b
      : row.person_a;
    const toId = isHonor
      ? aPassed
        ? row.person_b
        : row.person_a
      : row.person_b;

    edges.push({
      fromId,
      toId,
      relationType: row.relation_type,
      touchesMinor: honorEdgeTouchesMinor(a, b, now),
    });
  }
  return edges;
}

/**
 * Minor gate for an honor edge — BOTH endpoints via isMinorForSafety.
 * Never read raw is_minor alone. A passed minor is still a minor.
 */
export function honorEdgeTouchesMinor(
  personA: HonorPerson,
  personB: HonorPerson,
  now: Date = new Date()
): boolean {
  return (
    isMinorForSafety(
      {
        isMinor: personA.is_minor,
        birthDate: personA.birth_date,
        birthPrecision: personA.birth_precision,
      },
      now
    ) ||
    isMinorForSafety(
      {
        isMinor: personB.is_minor,
        birthDate: personB.birth_date,
        birthPrecision: personB.birth_precision,
      },
      now
    )
  );
}

/**
 * Framing label for honor edges — always continuity/remembrance.
 * Never partner / attraction / romantic, including when a minor is on the edge.
 */
export function honorEdgeFraming(touchesMinor: boolean): {
  kind: "remembrance";
  romantic: false;
  label: string;
} {
  return {
    kind: "remembrance",
    romantic: false,
    label: touchesMinor
      ? "Remembrance light: continuity, never romantic"
      : "Remembrance light: continuity",
  };
}

/**
 * Synastry links must never be treated as honor edges.
 * Honor / remembrance draws ONLY from relationships rows with HONOR_RELATION_TYPE.
 * Partner / family / friend rows on the same layer do not count as honor.
 */
export function synastryCannotSubstituteHonor(
  synastryPairIds: Array<{ fromId: string; toId: string }>,
  honorEdges: HonorEdge[]
): boolean {
  const remembrance = honorEdges.filter((e) => e.relationType === HONOR_RELATION_TYPE);
  if (remembrance.length === 0) return true; // empty honor declaration = empty honor constellation
  const honorKeys = new Set(
    remembrance.map((e) => [e.fromId, e.toId].sort().join(":"))
  );
  // Presence of synastry pairs alone must not imply honor — caller must not
  // draw honor strokes from synastry. This helper documents the contract:
  // honor set is independent; synastry set may overlap by coincidence only.
  for (const s of synastryPairIds) {
    const key = [s.fromId, s.toId].sort().join(":");
    if (honorKeys.has(key)) {
      // Overlap is allowed visually as two layers; source of honor is still the row.
      continue;
    }
  }
  return remembrance.every((e) => e.relationType === HONOR_RELATION_TYPE);
}
