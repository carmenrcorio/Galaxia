/**
 * Galaxy orbital / celestial-form helpers for `/app`.
 *
 * Extracted so Remembrance ("passed") can reuse the EXISTING ancient-light
 * visual language without inventing a new one, and so the mapping is unit-
 * testable. Source of truth for forms/rings:
 *   design/reference/galaxia-constellation-prototype.html
 *   apps/web/app/app/page.tsx (renderer)
 *
 * A passed person adopts the ancestor/"ancient light" treatment — soft,
 * diffuse outer-ring light — regardless of their living relation (parent,
 * friend, etc.). Relation is preserved for Compare and the person page;
 * only the constellation form/ring/element register changes.
 */

export interface OrbitPerson {
  is_self?: boolean;
  relation?: string | null;
  /** ISO timestamptz when remembered as passed; null/undefined = present. */
  passed_at?: string | null;
}

/** True when remembrance has been set (reversible; null clears it). */
export function hasPassed(person: { passed_at?: string | null } | null | undefined): boolean {
  return Boolean(person?.passed_at);
}

/** Ancestor / grandparent bond — the original ancient-light cohort. */
export function isAncestorRelation(rel: string | null | undefined): boolean {
  const r = rel?.toLowerCase() ?? "";
  return r === "ancestor" || r === "grandparent" || r.includes("grand");
}

/**
 * Whether this person should render as ancient light on the constellation.
 * Passed people share the ancestor visual — same soft disc + outer pulse —
 * without changing their stored relation or chart.
 */
export function usesAncientLight(person: OrbitPerson): boolean {
  if (person.is_self) return false;
  return hasPassed(person) || isAncestorRelation(person.relation);
}

/* element colours from prototype ELEM / landing EL_SOLID — symbolic register
   from relationship (a proxy until a real chart element is available). */
export function elementFromRelation(rel: string | null | undefined, passedAt?: string | null): string {
  if (passedAt) return "water";
  const r = rel?.toLowerCase() ?? "";
  if (r === "partner") return "air";
  if (r === "child" || r === "son" || r === "daughter") return "earth";
  if (r === "parent" || r === "mother" || r === "father" || r.includes("mom") || r.includes("dad")) return "water";
  if (r === "sibling" || r === "sister" || r === "brother") return "air";
  if (r === "colleague" || r === "coworker" || r === "co-worker") return "earth";
  if (isAncestorRelation(r)) return "water";
  return "fire";
}

/* node form from relation (+ remembrance). Forms are the reference legend's
   celestial bodies: binary (partner), moon (child), fixed (parent), ancient
   (ancestor / passed), star (friend/sibling/colleague). */
export function formFromRelation(isSelf: boolean, rel: string | null | undefined, passedAt?: string | null): string {
  if (isSelf) return "self";
  if (passedAt) return "ancient";
  const r = rel?.toLowerCase() ?? "";
  if (r === "partner" || r === "spouse" || r === "wife" || r === "husband") return "binary";
  if (r === "child" || r === "son" || r === "daughter") return "moon";
  if (r === "parent" || r === "mother" || r === "father" || r.includes("mom") || r.includes("dad")) return "fixed";
  if (isAncestorRelation(r)) return "ancient";
  /* sibling / colleague / friend / unknown → star (peer main-sequence star) */
  return "star";
}

/* Orbital ring from bond type. Closeness of bond = closeness in space.
     0 self · 1 partner · 2 children · 3 parents · 4 siblings ·
     5 friends · 6 colleagues · 7 grandparents/ancestors/passed ("ancient light").
   Passed people share ring 7 with ancestors — light still arriving. */
export function ringIndex(isSelf: boolean, rel: string | null | undefined, passedAt?: string | null): number {
  if (isSelf) return 0;
  if (passedAt) return 7;
  const r = rel?.toLowerCase() ?? "";
  if (r === "partner" || r === "spouse" || r === "wife" || r === "husband") return 1;
  if (r === "child" || r === "son" || r === "daughter" || r === "kid") return 2;
  if (r === "parent" || r === "mother" || r === "father" || r.includes("mom") || r.includes("dad")) return 3;
  if (r === "sibling" || r === "sister" || r === "brother") return 4;
  if (r === "friend") return 5;
  if (r === "colleague" || r === "coworker" || r === "co-worker") return 6;
  if (isAncestorRelation(r)) return 7;
  return 5;
}
