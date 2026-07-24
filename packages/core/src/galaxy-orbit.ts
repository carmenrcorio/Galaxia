/**
 * Galaxy orbital / celestial-form helpers for `/app`.
 *
 * P1 ring model (founder sketch — one allowed seat remap after #91):
 *   0 self (visual anchor)
 *   1 partner — tight binary at the core (not a guide ring)
 *   2 children (+ grandchildren)          ← sketch Ring 1
 *   3 parents, siblings, grandparents     ← sketch Ring 2
 *   4 friends / relatives / unknown       ← sketch Ring 3
 *   5 colleagues / outer tracked          ← sketch Ring 4
 *   6 passed + relation `ancestor`        ← outer ancient band until P3
 *
 * Resolution is whole-value only (trimmed, lowercased). No substring matches —
 * "granddaughter" is a child-generation synonym, never an ancestor.
 */

export interface OrbitPerson {
  is_self?: boolean;
  relation?: string | null;
  /** ISO timestamptz when remembered as passed; null/undefined = present. */
  passed_at?: string | null;
}

/** Normalise free-text relation for exact set membership. */
export function normalizeRelation(rel: string | null | undefined): string {
  return (rel ?? "").trim().toLowerCase();
}

/** True when remembrance has been set (reversible; null clears it). */
export function hasPassed(person: { passed_at?: string | null } | null | undefined): boolean {
  return Boolean(person?.passed_at);
}

/**
 * Deceased-forebear tag. Whole value only — never `grandparent` / `grandchild`.
 * Display treats this as outer ancient light; does NOT write `passed_at`.
 */
export function isAncestorRelation(rel: string | null | undefined): boolean {
  return normalizeRelation(rel) === "ancestor";
}

/* ── whole-value synonym sets (explicit resolution; no substring) ─────────── */

const PARTNER_RELS = new Set(["partner", "spouse", "wife", "husband"]);
const CHILD_RELS = new Set([
  "child",
  "son",
  "daughter",
  "kid",
  "stepchild",
  "grandchild",
  "granddaughter",
  "grandson",
]);
const FAMILY_RELS = new Set([
  "parent",
  "sibling",
  "grandparent",
  "mother",
  "father",
  "mom",
  "dad",
  "sister",
  "brother",
  "stepparent",
  "stepsibling",
]);
const CIRCLE_RELS = new Set([
  "friend",
  "cousin",
  "relative",
  "ex",
  "in-law",
  "aunt",
  "uncle",
  "niece",
  "nephew",
]);
const OUTER_RELS = new Set([
  "colleague",
  "coworker",
  "co-worker",
  "boss",
  "professor",
  "mentor",
  "acquaintance",
]);
const PARENT_FORM_RELS = new Set([
  "parent",
  "mother",
  "father",
  "mom",
  "dad",
  "stepparent",
]);

/**
 * Canonical picker values for add/edit flows (web + mobile), ordered inner → outer.
 * `self` is handled separately (is_self). `ancestor` is a deceased-forebear tag.
 * `pet` is intentionally absent — own branch later.
 */
// FOUNDER-REVIEW: picker labels — refine voice before merge.
export const GALAXY_RELATION_PICKER_OPTIONS = [
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
  { value: "grandchild", label: "Grandchild" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "friend", label: "Friend" },
  { value: "cousin", label: "Cousin" },
  { value: "relative", label: "Relative" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "niece", label: "Niece" },
  { value: "nephew", label: "Nephew" },
  { value: "in-law", label: "In-law" },
  { value: "ex", label: "Ex" },
  { value: "colleague", label: "Colleague" },
  { value: "boss", label: "Boss" },
  { value: "professor", label: "Professor" },
  { value: "mentor", label: "Mentor" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "ancestor", label: "Ancestor" },
] as const;

export type GalaxyPickerRelation = (typeof GALAXY_RELATION_PICKER_OPTIONS)[number]["value"];

export type GalaxyRelationBand =
  | "self"
  | "partner"
  | "children"
  | "family"
  | "circle"
  | "outer"
  | "passed"
  | "unknown";

export type ResolvedGalaxyRelation = {
  /** Trimmed lowercased input (empty string when missing). */
  normalized: string;
  /** True when the value is a known synonym or picker value (not the fallback). */
  known: boolean;
  band: GalaxyRelationBand;
  /** Semantic ring id for seats / guides (0–6). */
  ring: number;
};

/**
 * Explicit whole-value resolution. Unknown free-text → band `unknown`, ring 4
 * (sketch Ring 3 — same as friend), `known: false`. Never substring-matches.
 */
export function resolveGalaxyRelation(rel: string | null | undefined): ResolvedGalaxyRelation {
  const normalized = normalizeRelation(rel);
  if (!normalized) {
    return { normalized, known: false, band: "unknown", ring: 4 };
  }
  if (normalized === "self") {
    return { normalized, known: true, band: "self", ring: 0 };
  }
  if (PARTNER_RELS.has(normalized)) {
    return { normalized, known: true, band: "partner", ring: 1 };
  }
  if (CHILD_RELS.has(normalized)) {
    return { normalized, known: true, band: "children", ring: 2 };
  }
  if (FAMILY_RELS.has(normalized)) {
    return { normalized, known: true, band: "family", ring: 3 };
  }
  if (CIRCLE_RELS.has(normalized)) {
    return { normalized, known: true, band: "circle", ring: 4 };
  }
  if (OUTER_RELS.has(normalized)) {
    return { normalized, known: true, band: "outer", ring: 5 };
  }
  if (normalized === "ancestor") {
    /* Deceased forebear — outer ancient band; does not imply writing passed_at. */
    return { normalized, known: true, band: "passed", ring: 6 };
  }
  return { normalized, known: false, band: "unknown", ring: 4 };
}

/**
 * Whether this person should render as ancient light on the constellation.
 * Passed people and the `ancestor` tag share soft outer-band light.
 * Living grandparents are family (ring 3), not ancient.
 */
export function usesAncientLight(person: OrbitPerson): boolean {
  if (person.is_self) return false;
  return hasPassed(person) || isAncestorRelation(person.relation);
}

/* element colours from prototype ELEM / landing EL_SOLID — symbolic register
   from relationship (a proxy until a real chart element is available). */
export function elementFromRelation(rel: string | null | undefined, passedAt?: string | null): string {
  if (passedAt || isAncestorRelation(rel)) return "water";
  const resolved = resolveGalaxyRelation(rel);
  switch (resolved.band) {
    case "partner":
      return "air";
    case "children":
      return "earth";
    case "family":
      return PARENT_FORM_RELS.has(resolved.normalized) || resolved.normalized === "grandparent"
        ? "water"
        : "air";
    case "outer":
      return "earth";
    case "circle":
    case "unknown":
    default:
      return "fire";
  }
}

/* node form from relation (+ remembrance). Forms are the reference legend's
   celestial bodies: binary (partner), moon (child/grandchild), fixed (parent),
   ancient (passed / ancestor tag), star (everyone else). */
export function formFromRelation(
  isSelf: boolean,
  rel: string | null | undefined,
  passedAt?: string | null
): string {
  if (isSelf) return "self";
  if (passedAt || isAncestorRelation(rel)) return "ancient";
  const resolved = resolveGalaxyRelation(rel);
  if (resolved.band === "partner") return "binary";
  if (resolved.band === "children") return "moon";
  if (PARENT_FORM_RELS.has(resolved.normalized)) return "fixed";
  return "star";
}

/**
 * Orbital ring from bond type (P1 sketch numbering).
 *   0 self · 1 partner (tight binary) · 2 children · 3 family ·
 *   4 circle/unknown · 5 outer tracked · 6 passed/ancestor ("ancient light").
 * `passed_at` wins over living relation for the outer band until P3.
 */
export function ringIndex(
  isSelf: boolean,
  rel: string | null | undefined,
  passedAt?: string | null
): number {
  if (isSelf) return 0;
  if (passedAt) return 6;
  return resolveGalaxyRelation(rel).ring;
}
