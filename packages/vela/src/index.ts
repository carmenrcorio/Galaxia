import type { VelaFramingMode } from "./framing";
import { velaFramingBlock } from "./framing";

export type VelaMode = "ask" | "shared";
export type Precision = "exact" | "date" | "year";

/** One computed aspect the model is allowed to name. Orb is the engine's value. */
export interface VelaAspectListEntry {
  from: string;
  to: string;
  type: string;
  orb: number;
  kind: "synastry" | "natal";
  /** Natal chart owner. Absent on synastry rows. */
  person?: string;
  /** Synastry: person whose `from` body is used. */
  from_person?: string;
  /** Synastry: person whose `to` body is used. */
  to_person?: string;
}

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
  /** Single discriminated framing mode — never parallel parenting/group flags. */
  framing: VelaFramingMode;
  relationshipType: string;
  user: { name: string };
  /** Present when focus is a named group — answers must cover the whole group. */
  group?: { name: string };
  people: VelaContextPerson[];
  /**
   * Computed natal/synastry aspects already produced by the astrology engine.
   * Vela may only name aspects that appear here. Always serialized, even if empty.
   */
  aspect_list?: VelaAspectListEntry[];
  /**
   * Three tightest aspects of the thread's primary kind (synastry on pair
   * threads, natal otherwise). Empty when aspect_list is empty.
   */
  lead_aspects?: VelaAspectListEntry[];
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

/** ENGINEERING.md §12 — keep in sync with supabase/functions/vela-chat/index.ts. */
export const VELA_ASPECT_LIST_GUARDRAIL =
  "You may only name aspects that appear in the aspect_list field of this payload. If you are not given an aspect, you cannot name it. Never invent or infer an aspect not in the list.";

/** No always-on parenting rule — framing is injected per-request via `velaFramingBlock`. */
// FOUNDER-REVIEW: "Blend chart meaning with concrete relationship advice in plain language. Aspect names are not jargon here: name the aspect first, then say in everyday words what it means for these two people."
// FOUNDER-REVIEW: "When lead_aspects is not empty, name at least one of them by planet and aspect type (for example Venus sextile Jupiter) in your first two sentences. Capitalize planet names."
export const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia: a warm, perceptive astrologer and practical relationship coach who helps someone understand and tend the people they love.

HOW YOU THINK
- You are given COMPUTED astrology facts (planets, signs, aspects, generational signatures). Treat them as ground truth; never invent a placement.
- Blend chart meaning with concrete relationship advice in plain language. Aspect names are not jargon here: name the aspect first, then say in everyday words what it means for these two people.
- When you are reading an aspect, name it in the answer (for example Moon square Saturn). Never describe a dynamic while leaving the aspect unnamed.
- ${VELA_ASPECT_LIST_GUARDRAIL}
- When lead_aspects is not empty, name at least one of them by planet and aspect type (for example Venus sextile Jupiter) in your first two sentences. Capitalize planet names.
- The sky describes how a person is built, not what will happen to them. Guidance, not fortune telling.
- In shared mode, stay neutral and never reference private notes.
- ${VELA_REMEMBRANCE_GUARDRAIL}
- The private notes digest is a short recent sample (at most five), not full recall of every reflection.

SAFETY
- If crisis, abuse, or self-harm language appears, deprioritize astrology and guide immediately toward real-world support.

OUTPUT
- 2–5 sentences, warm and specific.
- End with up to 3 short suggested follow-up prompts, each on its own line, prefixed with "→ ".`;

const VELA_CITATION_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
] as const;

const VELA_CITATION_ASPECTS = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition"
] as const;

const VELA_CITATION_RE = new RegExp(
  `\\b(${VELA_CITATION_PLANETS.join("|")})\\s+(${VELA_CITATION_ASPECTS.join("|")})\\s+(${VELA_CITATION_PLANETS.join("|")})\\b`,
  "gi"
);

function aspectPairKey(from: string, type: string, to: string): string {
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  const t = type.toLowerCase();
  return a < b ? `${a}|${t}|${b}` : `${b}|${t}|${a}`;
}

/** Synastry first, then natal; each group by orb ascending. Does not mutate. */
export function sortVelaAspectList<T extends { kind: "synastry" | "natal"; orb: number }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "synastry" ? -1 : 1;
    return a.orb - b.orb;
  });
}

/** Three tightest entries of the thread's primary kind from an already-sorted list. */
export function selectLeadAspects<T extends { kind: "synastry" | "natal" }>(
  sortedList: T[],
  primaryKind: "synastry" | "natal"
): T[] {
  return sortedList.filter((entry) => entry.kind === primaryKind).slice(0, 3);
}

export interface VelaAspectCitationCounts {
  list_size: number;
  named_in_list: number;
  named_not_in_list: number;
}

/**
 * Count unique "<Planet> <aspect type> <Planet>" mentions in a reply.
 * Planet order does not matter. Used by the edge log and the eval harness.
 */
export function countVelaAspectCitations(
  reply: string,
  aspectList: Array<{ from: string; to: string; type: string }>
): VelaAspectCitationCounts {
  VELA_CITATION_RE.lastIndex = 0;
  const listKeys = new Set(aspectList.map((a) => aspectPairKey(a.from, a.type, a.to)));
  const namedIn = new Set<string>();
  const namedOut = new Set<string>();
  for (const match of reply.matchAll(VELA_CITATION_RE)) {
    const key = aspectPairKey(match[1], match[2], match[3]);
    if (listKeys.has(key)) namedIn.add(key);
    else namedOut.add(key);
  }
  return {
    list_size: aspectList.length,
    named_in_list: namedIn.size,
    named_not_in_list: namedOut.size
  };
}

export function buildVelaContext(input: BuildVelaContextInput): VelaContext {
  return {
    ...input,
    privateNotesDigest: input.mode === "ask" ? input.privateNotes?.slice(0, 5) : undefined
  };
}

export function buildVelaPrompt(context: VelaContext): string {
  const framingBlock = velaFramingBlock(context.framing);
  return JSON.stringify(
    {
      system: VELA_SYSTEM_PROMPT,
      framing: context.framing,
      framingBlock: framingBlock || undefined,
      mode: context.mode,
      relationshipType: context.relationshipType,
      group: context.group,
      people: context.people,
      aspect_list: context.aspect_list ?? [],
      lead_aspects: context.lead_aspects ?? [],
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
 * "general". Keep in sync with `supabase/functions/vela-chat/index.ts` —
 * enforced by `test/safe-relationship-types-parity.test.ts`.
 */
export const SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR = [
  "general",
  "siblings",
  "friends",
  "parent-child",
  "ancestor",
  "platonic",
  "grandparent",
  "grandchild"
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

export type {
  ResolveVelaFramingModeInput,
  VelaFramingMode,
  VelaFramingSubject
} from "./framing";
export {
  groupFramingBlock,
  isUserChildTag,
  parentingFramingBlock,
  resolveVelaFramingMode,
  thirdPersonMinorFramingBlock,
  velaFramingBlock
} from "./framing";

export * from "./parse";
