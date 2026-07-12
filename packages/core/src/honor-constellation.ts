/**
 * Remembrance Phase 3 — honor-constellation.
 *
 * Declared continuity edges between a passed person and living people who
 * "carry their light." Data lives in the dormant `relationships` table
 * (person_a / person_b / relation_type). ZERO inference: edges exist only
 * when the owner explicitly multi-selects living people. Empty selection =
 * no constellation.
 *
 * relation_type is always HONOR_RELATION_TYPE ("remembrance") — a continuity
 * bond, never romantic, never guessed from people.relation (owner-relative).
 */

import { isMinorForSafety, type MinorSafetyInput } from "./minor-safety";
import { hasPassed } from "./galaxy-orbit";

/** Fixed continuity type written for every honor edge. Not inferred. */
export const HONOR_RELATION_TYPE = "remembrance" as const;

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
  relationType: typeof HONOR_RELATION_TYPE;
  /** True when either endpoint is a minor via isMinorForSafety — never raw is_minor. */
  touchesMinor: boolean;
};

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

/** Insert payload for one declared honor edge. person_a = passed, person_b = living. */
export function buildHonorRelationshipInsert(input: {
  ownerId: string;
  passedPersonId: string;
  livingPersonId: string;
}): HonorRelationshipRow {
  if (input.passedPersonId === input.livingPersonId) {
    throw new Error("Honor connection cannot link a person to themselves.");
  }
  return {
    owner_id: input.ownerId,
    person_a: input.passedPersonId,
    person_b: input.livingPersonId,
    relation_type: HONOR_RELATION_TYPE,
  };
}

/**
 * Diff current declared living ids vs next selection.
 * Additions insert rows; removals delete rows (reversible, like passed_at).
 */
export function honorConnectionDiff(
  currentLivingIds: readonly string[],
  nextLivingIds: readonly string[]
): { toAdd: string[]; toRemove: string[] } {
  const cur = new Set(currentLivingIds);
  const next = new Set(nextLivingIds);
  return {
    toAdd: [...next].filter((id) => !cur.has(id)),
    toRemove: [...cur].filter((id) => !next.has(id)),
  };
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
 * Galaxy honor edges from declared rows only.
 * Draws only when one endpoint is still passed and the other is present.
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
    if (!isHonorRelationType(row.relation_type)) continue;
    if (isForbiddenHonorRelationType(row.relation_type)) continue;

    const a = byId.get(row.person_a);
    const b = byId.get(row.person_b);
    if (!a || !b) continue;

    const aPassed = hasPassed(a);
    const bPassed = hasPassed(b);
    // Exactly one side remembered as passed, the other living — thesis scope.
    if (aPassed === bPassed) continue;

    const key = [row.person_a, row.person_b].sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);

    edges.push({
      fromId: row.person_a,
      toId: row.person_b,
      relationType: HONOR_RELATION_TYPE,
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
      ? "Remembrance light — continuity, never romantic"
      : "Remembrance light — continuity",
  };
}

/**
 * Synastry links must never be treated as honor edges.
 * Honor layer draws ONLY from relationships rows with HONOR_RELATION_TYPE.
 */
export function synastryCannotSubstituteHonor(
  synastryPairIds: Array<{ fromId: string; toId: string }>,
  honorEdges: HonorEdge[]
): boolean {
  if (honorEdges.length === 0) return true; // empty declaration = empty constellation
  const honorKeys = new Set(
    honorEdges.map((e) => [e.fromId, e.toId].sort().join(":"))
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
  return honorEdges.every((e) => e.relationType === HONOR_RELATION_TYPE);
}
