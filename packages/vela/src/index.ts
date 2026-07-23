export type VelaMode = "ask" | "shared";
export type Precision = "exact" | "date" | "year";

export interface VelaContextPerson {
  name: string;
  role: string;
  isMinor: boolean;
  precision: Precision;
  sun: string;
  moon: string | null;
  rising: string | null;
  venus: string;
  mars: string;
  traits: string;
  generational: {
    uranus: string;
    neptune: string;
    pluto: string;
    cohortLabel: string;
  };
}

export interface VelaContext {
  mode: VelaMode;
  parenting: boolean;
  relationshipType: string;
  user: { name: string };
  /** Present when focus is a named group — answers must cover the whole group. */
  group?: { name: string };
  people: VelaContextPerson[];
  synastry?: {
    scores: Record<string, number>;
    flowAxis: string;
    frictionAxis: string;
  };
  generationalRelation?: {
    sameGeneration: boolean;
    shared: { planet: string; sign: string }[];
    diverged: { planet: string; signA: string; signB: string }[];
    theme: string;
  };
  cohort?: {
    sharedSky: { planet: string; sign: string }[];
    faultLines: { planet: string; groups: { sign: string; names: string[] }[] }[];
    members: string[];
  };
  privateNotesDigest?: string[];
  history: { role: "user" | "vela"; text: string }[];
  userMessage: string;
}

export interface BuildVelaContextInput extends Omit<VelaContext, "privateNotesDigest"> {
  privateNotes?: string[];
}

/** Remembrance Phase 2 — keep in sync with apps/web/lib/remembrance.ts `VELA_REMEMBRANCE_GUARDRAIL`. */
export const VELA_REMEMBRANCE_GUARDRAIL =
  "Draw only on the computed chart facts you are given and the owner's own saved reflections in the private notes digest. Never fabricate memories, events, or facts about the person. Do not invent what they said, did, or felt.";

export const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach.
You interpret computed astrology facts only and never invent positions.
Blend chart meaning with concrete relationship moves in plain language.
In shared mode, stay neutral and never expose private notes.
If someone is a minor, use parenting framing and never address the child directly.
${VELA_REMEMBRANCE_GUARDRAIL}
Note: the private notes digest is a short recent sample (at most five), not full recall of every reflection.
If risk-of-harm language appears, deprioritize astrology and encourage immediate real-world support.
Keep answers short, specific, and warm. End with optional follow-up support and up to three suggested prompts.`;

export function buildVelaContext(input: BuildVelaContextInput): VelaContext {
  return {
    ...input,
    privateNotesDigest: input.mode === "ask" ? input.privateNotes?.slice(0, 5) : undefined
  };
}

export function buildVelaPrompt(context: VelaContext): string {
  return JSON.stringify(
    {
      system: VELA_SYSTEM_PROMPT,
      mode: context.mode,
      parenting: context.parenting,
      relationshipType: context.relationshipType,
      group: context.group,
      people: context.people,
      synastry: context.synastry,
      generationalRelation: context.generationalRelation,
      cohort: context.cohort,
      privateNotesDigest: context.mode === "ask" ? context.privateNotesDigest : undefined,
      history: context.history,
      userMessage: context.userMessage
    },
    null,
    2
  );
}

const crisisPattern =
  /\b(suicid(e|al)|kill myself|self harm|self-harm|hurt myself|end my life|want to die|homicid(e|al)|kill them|abuse)\b/i;

export function detectCrisisLanguage(text: string): boolean {
  return crisisPattern.test(text);
}

/**
 * Safe Vela `relationshipType` values when any person in scope is a minor.
 * Allowlist (not denylist): free-text input is coerced to one of these, or
 * "general". Keep in sync with `supabase/functions/vela-chat/index.ts`.
 * Mirrors Compare's non-romantic RelationType set plus Vela's "general" default
 * and "platonic".
 */
export const SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR = [
  "general",
  "siblings",
  "friends",
  "parent-child",
  "ancestor",
  "platonic"
] as const;

export type SafeVelaRelationshipTypeWithMinor =
  (typeof SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR)[number];

/**
 * When a minor is in scope, coerce free-text relationshipType to the allowlist.
 * Anything outside the safe set becomes "general" — including romantic labels,
 * slang ("bf", "novio"), and misspellings. Adults-only scope is unchanged.
 * Mirror in `supabase/functions/vela-chat/index.ts` (edge cannot import workspace).
 */
export function coerceVelaRelationshipTypeForMinorScope(relType: string): SafeVelaRelationshipTypeWithMinor {
  const key = relType.trim().toLowerCase();
  return (SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR as readonly string[]).includes(key)
    ? (key as SafeVelaRelationshipTypeWithMinor)
    : "general";
}

/** Edge-equivalent: apply allowlist coerce only when scope includes a minor. */
export function resolveVelaRelationshipType(relType: string, scopeHasMinor: boolean): string {
  if (!scopeHasMinor) return relType;
  return coerceVelaRelationshipTypeForMinorScope(relType);
}

export * from "./parse";
