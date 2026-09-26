/**
 * Chart-specific "What X needs from you" guidance. Extracted from
 * apps/web/app/app/compare/page.tsx so the public Quick Compare (/chart/compare)
 * can reuse the same hand-written copy instead of duplicating it.
 *
 * Deterministic rules over computed synastry — derives guidance from a
 * person's actual Moon, Venus, Mars signs and the cross-aspects between the
 * two charts. Structure follows galaxia.jsx swhy() — different charts must
 * produce different output.
 *
 * "romantic"/"platonic" (added for Quick Chart's compatibility mode — see
 * apps/web/app/chart/compare/page.tsx) are new RelationType values, not a
 * separate system, per the Phase 0 diagnosis: computeSynastry() itself takes
 * no relationship parameter — it always returns every cross-aspect and the
 * same 6 scores. The only honest way to differentiate a "romantic" from a
 * "platonic" reading is to change WHICH already-computed, already-true data
 * gets surfaced and emphasized — never to invent new astrological claims.
 * Venus/Mars aspects are genuinely more relevant to romantic attraction;
 * Mercury/Moon aspects are genuinely more relevant to platonic understanding.
 * Neither branch is fabricated — both draw only from computeSynastry's real
 * aspects[] for these two actual charts.
 */

import { bodyDisplayName } from "./bodies";
import {
  HOUSE_OVERLAY_DESCRIPTIONS,
  type HouseNumber,
  type HouseOverlayDescription,
  type HouseOverlayLens,
} from "./house-overlay-descriptions";
import type { Aspect, BodyName, SynastryResult } from "./index";

function isQuincunxType(type: string | undefined): boolean {
  return (type ?? "").toLowerCase() === "quincunx";
}

/* Sign vibe one-liners — from galaxia.jsx VIBE (was apps/web/lib/design.ts) */
export const SIGN_VIBE: Record<string, string> = {
  Aries:       "bold, fast, all-in",
  Taurus:      "steady, sensual, immovable",
  Gemini:      "quick, curious, talkative",
  Cancer:      "tender, protective, remembers everything",
  Leo:         "warm, proud, generous",
  Virgo:       "precise, caring through usefulness",
  Libra:       "fair, charming, seeks balance",
  Scorpio:     "intense, private, all-or-nothing",
  Sagittarius: "restless, honest, big-picture",
  Capricorn:   "disciplined, ambitious, quietly loyal",
  Aquarius:    "independent, inventive, principled",
  Pisces:      "dreamy, compassionate, absorbent",
};

/* House meaning summaries — from galaxia.jsx HOUSE_AREA */
export const HOUSE_AREA = [
  "self & identity", "money & values", "communication & siblings", "home & roots",
  "creativity & romance", "work & health", "partnership", "intimacy & transformation",
  "beliefs & travel", "career & reputation", "friends & community", "solitude & the unconscious"
];

export type RelationType =
  | "partners"
  | "siblings"
  | "friends"
  | "parent-child"
  | "ancestor"
  | "romantic"
  | "platonic"
  | "colleagues"
  | "manager-report"
  | "mentor-mentee";

/**
 * Relationship types that frame the reading romantically — attraction / Venus
 * "wanting" / partnership-house language. SAFETY (ENGINEERING.md §9 & §13):
 * these must never be reachable for a pairing that includes a minor, or the
 * output becomes romantic content ABOUT a child. This is the single source of
 * truth read by /app/compare's picker gate, its default, and its defense-in-
 * depth render guard.
 */
export const ROMANTIC_RELATION_TYPES: readonly RelationType[] = ["partners", "romantic"];

/** True when the relationship type produces romantic / attraction framing. */
export function isRomanticRelation(relType: RelationType): boolean {
  return ROMANTIC_RELATION_TYPES.includes(relType);
}

/**
 * Working-relationship frames. These read the SAME computed aspects as every
 * other frame; only the interpretation register changes (working style,
 * communication, decision making, how respect is read, deadline friction).
 * They are non-romantic by construction: no entry here may ever appear in
 * ROMANTIC_RELATION_TYPES, so `isRomanticRelation` is false for all of them
 * and no romantic/attraction copy path (`whatTheyNeed`'s Venus branch, the
 * romantic register pool, the OG neutral-summary gate) is reachable from a
 * professional frame. Asserted in
 * `packages/astro/test/professional-frames.test.ts`.
 */
export const PROFESSIONAL_RELATION_TYPES: readonly RelationType[] = [
  "colleagues",
  "manager-report",
  "mentor-mentee",
];

/** True when the relationship type produces working-relationship framing. */
export function isProfessionalRelation(relType: RelationType): boolean {
  return PROFESSIONAL_RELATION_TYPES.includes(relType);
}

/**
 * The relationship types the saved-people /app/compare picker offers: the five
 * personal frames, then the three working frames (see
 * PROFESSIONAL_RELATION_TYPES). Order is picker order.
 */
export const COMPARE_RELATION_TYPES: readonly RelationType[] = [
  "partners",
  "siblings",
  "friends",
  "parent-child",
  "ancestor",
  "colleagues",
  "manager-report",
  "mentor-mentee",
];

/**
 * Human-readable label for a relationship type, so the picker (web + mobile)
 * and the reading header stop printing the raw identifier. Exhaustive by
 * type, so a new RelationType cannot ship without a label.
 */
export const COMPARE_RELATION_LABEL: Record<RelationType, string> = {
  partners: "Partners",
  siblings: "Siblings",
  friends: "Friends",
  "parent-child": "Parent and child",
  ancestor: "Ancestor",
  romantic: "Romantic",
  platonic: "Platonic",
  colleagues: "Colleagues",
  "manager-report": "Manager and report",
  "mentor-mentee": "Mentor and mentee",
};

/** Label for a relationship type, for any surface that shows the frame. */
export function compareRelationLabel(relType: RelationType): string {
  return COMPARE_RELATION_LABEL[relType];
}

/**
 * The relationship types selectable in /app/compare for this pairing. When a
 * minor is present every romantic type is removed entirely — unselectable, not
 * just non-default — so no code path can reach romantic framing about a child.
 * Over-restrict, never under-restrict (ENGINEERING.md §13).
 */
export function availableCompareRelationTypes(pairHasMinor: boolean): RelationType[] {
  return COMPARE_RELATION_TYPES.filter((t) => !(pairHasMinor && isRomanticRelation(t)));
}

/**
 * The relationship type /app/compare should default to. Never "partners": a
 * user must never land on romantic framing by default. When a minor is in the
 * pairing, default to the caregiving, non-romantic parent-child frame.
 */
export function defaultCompareRelationType(pairHasMinor: boolean): RelationType {
  return pairHasMinor ? "parent-child" : "friends";
}

/**
 * Exact `people.relation` tags (user-relative) that map to a Compare type when
 * the OTHER person in the pair is tagged `self`. Tags are unconstrained text
 * in the DB — unrecognized values are unmapped (no fuzzy match).
 *
 * `people.relation` describes each person's relation to the USER, not to each
 * other. Mapping is only sound when one side is the user (`self`); two
 * user-relative tags must never be inferred into a pair relation (e.g. two
 * `child` tags are not evidence of siblings; two `parent` tags are not
 * partners). Romantic (`partners`) may only come from an explicit `partner`
 * tag next to `self` — never from any other combination.
 */
const SELF_OTHER_TO_COMPARE: Readonly<Record<string, RelationType>> = {
  partner: "partners",
  sibling: "siblings",
  friend: "friends",
  parent: "parent-child",
  child: "parent-child",
  // First-run stores "my mother" / "my father" as themselves, not flattened
  // to `parent`. Same caregiving frame as `parent`.
  mother: "parent-child",
  father: "parent-child",
  // Child-generation picker value. Same descent frame as `child`.
  grandchild: "parent-child",
  ancestor: "ancestor",
  // Working relationships. A saved work tag previously fell through to the
  // neutral `friends` fallback, so a colleague was read through a friendship
  // lens by default. These map onto the working frames instead: the tag the
  // user actually recorded decides the register.
  colleague: "colleagues",
  coworker: "colleagues",
  "co-worker": "colleagues",
  boss: "manager-report",
  manager: "manager-report",
  professor: "mentor-mentee",
  mentor: "mentor-mentee",
  // Unmapped on purpose (no sound pair frame, or would fabricate / romanticise):
  // grandparent, cousin, relative, aunt, uncle, niece, nephew, in-law, ex,
  // acquaintance, other, self.
};

/**
 * Saved `people.relation` tags that describe a working relationship to the
 * user. Same tag family the transit-nudge `colleague` framing already
 * recognizes (see src/transit-nudge/framing.ts) so the two surfaces cannot
 * drift on what counts as work. `acquaintance` is deliberately absent: it
 * carries no working claim.
 */
const PROFESSIONAL_RELATION_TAGS: readonly string[] = [
  "colleague",
  "coworker",
  "co-worker",
  "boss",
  "manager",
  "professor",
  "mentor",
];

/**
 * Tags that describe an unambiguous PAIR relation when BOTH sides carry the
 * exact same tag, for the case where NEITHER side is `self`. A
 * `people.relation` tag describes that person's relation to the USER, not to
 * the other person in the pair, so a single tag never describes the A-B pair
 * on its own (see `suggestCompareRelationType` doc). A matching pair is only
 * carried over when the shared tag is symmetric and non-romantic:
 *
 *   - `sibling` + `sibling`: two of the user's siblings are siblings of
 *     each other.
 *   - `friend` + `friend`: a safe, low-stakes default; two of the user's
 *     friends are at minimum framed as friends of each other.
 *
 * Deliberately excluded even on an exact match:
 *   - `partner`: two people the user tagged `partner` (e.g. an ex and a
 *     current partner) are not partners of EACH OTHER. Romantic/attraction
 *     framing must never be auto-selected from a single person's tag, and
 *     that holds even when both tags agree (ENGINEERING.md §13).
 *   - `colleague` (and the rest of the work tag family): handled separately
 *     below, because two work tags do not have to MATCH to describe a working
 *     pair (see `PROFESSIONAL_RELATION_TAGS` and `suggestCompareRelationType`).
 *   - `parent`, `child`, `grandparent`, `grandchild`, `ancestor`: a matching
 *     pair does not describe a sound relation to each other (two of the
 *     user's parents are peers, not parent-child; two ancestors have no
 *     matching picker type).
 */
const NON_SELF_SYMMETRIC_TO_COMPARE: Readonly<Partial<Record<string, RelationType>>> = {
  sibling: "siblings",
  friend: "friends",
};

/**
 * Suggest a Compare relationType from two saved `people.relation` tags.
 * A tag describes that person's relation to the USER, not to the other
 * person in the pair — so it only describes the A-B pair directly when one
 * side is `self` (self + other). When neither side is `self`, a single tag
 * is never carried over; the only carry-overs are two work tags (which read
 * as `colleagues`, the peer working frame) and an exact, symmetric,
 * non-romantic match on both sides (see `NON_SELF_SYMMETRIC_TO_COMPARE`).
 * The strategies never compete: self + other is checked first and, when it
 * applies, is the only source of a suggestion for that pair.
 *
 * Returns null when nothing sound applies (caller falls back to
 * `defaultCompareRelationType(false)`). Never fabricates from names, ages,
 * or gender.
 *
 * Minor safety is NOT applied here — callers must run the existing
 * `selectionHasMinor` clamp AFTER this suggestion so romantic framing is
 * always stripped when a minor is present.
 */
export function suggestCompareRelationType(
  relationA: string | null | undefined,
  relationB: string | null | undefined
): RelationType | null {
  const a = typeof relationA === "string" ? relationA : "";
  const b = typeof relationB === "string" ? relationB : "";
  if (!a || !b) return null;

  const aSelf = a === "self";
  const bSelf = b === "self";

  if (aSelf !== bSelf) {
    // self + other: the tag describes the A-B pair directly.
    const other = aSelf ? b : a;
    return SELF_OTHER_TO_COMPARE[other] ?? null;
  }

  if (aSelf && bSelf) return null; // both self — no sound pair mapping

  // Neither side is self, and BOTH sides carry a work tag: read the pair
  // through the peer working frame. The tags do not have to match, because
  // the shared claim ("both of these people are work to me") is what the
  // frame needs; the asymmetric frames are deliberately NOT inferable here
  // (two people the user tagged `boss` are not a manager and a report of
  // each other, and nothing in the record says which of them would be
  // which). `colleagues` is the least-assuming frame available for two work
  // tags, and it is a strictly better read than the neutral `friends`
  // fallback this path used to land on.
  const bothWork =
    PROFESSIONAL_RELATION_TAGS.includes(a) && PROFESSIONAL_RELATION_TAGS.includes(b);
  if (bothWork) return "colleagues";

  // Otherwise only an exact, symmetric, non-romantic match carries over. A
  // single tag on either side is never enough. Defense in depth: re-check
  // isRomanticRelation here too, so a future edit to
  // NON_SELF_SYMMETRIC_TO_COMPARE could never leak a romantic suggestion
  // into the one path that has no self+other tag to justify it.
  if (a !== b) return null;
  const mapped = NON_SELF_SYMMETRIC_TO_COMPARE[a] ?? null;
  return mapped && !isRomanticRelation(mapped) ? mapped : null;
}

/**
 * Shown next to the Compare relationship-type selector only when
 * `suggestCompareRelationType` returned a real mapping that is currently
 * selected. Never shown on fallback (there is no reason to state).
 */
export const COMPARE_RELATION_SUGGESTION_HINT =
  "Preselected from how you saved them.";

/**
 * Initial Person A / Person B pair for /app/compare on first load, shared by
 * web and mobile so the two surfaces cannot drift. Prefers the user's own
 * `self` record as Person A — so `suggestCompareRelationType`'s self+tag
 * inference (e.g. self + partner → partners) can actually fire on the very
 * first render — paired with the most-recently-created OTHER (non-self)
 * person as Person B. Falls back to today's behavior (the two
 * most-recently-created people) when there is no `self` record.
 *
 * `people` must already be sorted newest-first (created_at desc) — this
 * never reorders, refetches, or reads anything beyond `id`/`relation`.
 *
 * This is ONLY the initial preselection, not a permanent lock: callers keep
 * both slots freely changeable afterward, including swapping self out to
 * compare two non-self people. It does not touch `defaultCompareRelationType`,
 * `suggestCompareRelationType`, or minor-clamp ordering — those still run,
 * unchanged, on whichever pair ends up selected.
 */
export function initialComparePairIds(
  people: readonly { id: string; relation: string | null | undefined }[]
): { personAId: string | null; personBId: string | null } {
  const selfPerson = people.find((p) => p.relation === "self");
  if (selfPerson) {
    const other = people.find((p) => p.id !== selfPerson.id);
    return { personAId: selfPerson.id, personBId: other?.id ?? null };
  }
  const personAId = people[0]?.id ?? null;
  const personBId = people.find((p) => p.id !== personAId)?.id ?? null;
  return { personAId, personBId };
}

/** Bodies whose cross-aspects are most relevant to a romantic reading. */
const ROMANTIC_BODIES = ["venus", "mars", "sun", "moon"];
/** Bodies whose cross-aspects are most relevant to a platonic reading. */
const PLATONIC_BODIES = ["mercury", "moon", "jupiter"];

/**
 * Single priority-band map for Compare AND transit nudges. Do not fork a
 * second map elsewhere — extend this object (or `bodyPriorityForBand`) when a
 * new band is needed. Nudge-only bands (`self`, `colleague`, `general`) live
 * here so selection and Compare share one source of truth.
 *
 * Compare picker types stay on RelationType keys. Transit nudges resolve a
 * framing → band via `bodyPriorityForBand`.
 */
export const BODY_PRIORITY_BY_BAND = {
  romantic:       ROMANTIC_BODIES,
  partners:       ["venus", "mars", "sun", "moon"],
  platonic:       PLATONIC_BODIES,
  friends:        ["mercury", "jupiter"],
  siblings:       ["mercury", "moon"],
  /** Child / parenting — emotional safety, mind, structure. */
  "parent-child": ["moon", "mercury", "saturn"],
  ancestor:       ["pluto", "neptune", "uranus"],
  /** Self sky — personal planets. */
  self:           ["sun", "moon", "mercury", "venus", "mars"],
  /** Colleague / work — communication, drive, structure. */
  colleague:      ["mercury", "mars", "saturn"],
  /** Peers at work — working style, drive, structure. Same bodies as the nudge `colleague` band. */
  colleagues:     ["mercury", "mars", "saturn"],
  /** Reporting line — structure and authority first, then communication and standing. */
  "manager-report": ["saturn", "mercury", "sun"],
  /** Teaching bond — growth, discipline, learning. */
  "mentor-mentee": ["jupiter", "saturn", "mercury"],
  /** Untagged / equal weight — empty means no domain boost. */
  general:        [] as string[],
} as const;

export type PriorityBand = keyof typeof BODY_PRIORITY_BY_BAND;

/** Compare-facing view of the shared map (RelationType keys only). */
export const RELATION_BODY_PRIORITY: Record<RelationType, string[]> = {
  romantic:       [...BODY_PRIORITY_BY_BAND.romantic, "north_node", "chiron"],
  partners:       [...BODY_PRIORITY_BY_BAND.partners, "north_node", "chiron"],
  platonic:       [...BODY_PRIORITY_BY_BAND.platonic, "north_node", "chiron"],
  friends:        [...BODY_PRIORITY_BY_BAND.friends, "north_node", "chiron"],
  siblings:       [...BODY_PRIORITY_BY_BAND.siblings, "north_node", "chiron"],
  "parent-child": [...BODY_PRIORITY_BY_BAND["parent-child"], "north_node", "chiron"],
  ancestor:       [...BODY_PRIORITY_BY_BAND.ancestor, "chiron"],
  colleagues:     [...BODY_PRIORITY_BY_BAND.colleagues, "chiron"],
  "manager-report": [...BODY_PRIORITY_BY_BAND["manager-report"], "chiron"],
  "mentor-mentee": [...BODY_PRIORITY_BY_BAND["mentor-mentee"], "north_node", "chiron"],
};

/** Bodies weighted for a priority band — shared Compare / nudge entry point. */
export function bodyPriorityForBand(band: PriorityBand): readonly string[] {
  return BODY_PRIORITY_BY_BAND[band];
}

/**
 * Houses (1-based) most relevant to each relationship type — read from real
 * houseOverlays only, and only when cusps exist (exact-time charts). An empty
 * list means the type has no house lens (ancestor is generational, not
 * house-bound). Never asserts a house for a chart that has none (§12).
 */
const RELATION_HOUSES: Record<RelationType, number[]> = {
  romantic:       [7, 5],
  partners:       [7, 5],
  platonic:       [11],
  friends:        [11, 3],
  siblings:       [3],
  "parent-child": [4, 10],
  ancestor:       [],
  // Work houses: 6 (work & health) is the daily workload, 10 (career &
  // reputation) is standing, 9 (beliefs & travel) is the teaching house.
  colleagues:     [6, 10],
  "manager-report": [10, 6],
  "mentor-mentee": [9, 6],
};

/**
 * Reorders a real, already-computed aspect list so the ones most relevant to
 * the given relationship type surface first. Never adds, removes, or alters
 * an aspect. Used by both the Quick Chart compatibility flow (romantic/
 * platonic) and /app/compare's "Where it flows and catches" list.
 */
export function sortAspectsForFocus<T extends { from: string; to: string }>(
  aspects: T[],
  focus: RelationType | null
): T[] {
  if (!focus) return aspects;
  const relevant = RELATION_BODY_PRIORITY[focus];
  const isRelevant = (a: T) => relevant.includes(a.from.toLowerCase()) || relevant.includes(a.to.toLowerCase());
  const withIndex = aspects.map((a, i) => ({ a, i, relevant: isRelevant(a) }));
  withIndex.sort((x, y) => {
    if (x.relevant !== y.relevant) return x.relevant ? -1 : 1;
    return x.i - y.i; // stable within each group; preserves the original (orb-sorted) order
  });
  return withIndex.map((w) => w.a);
}

/**
 * Rows the Compare flows/catches surface actually renders. Drops same-body
 * aspects (the UI never shows from===to), keeps the tighter orb when the same
 * unordered pair and aspect type appear twice (A→B and B→A share one reading
 * short and one tactic), then applies the relation focus sort and takes the
 * top `limit`. Shared by the UI and the collision gate so they cannot drift.
 */
export function selectCompareAspectRows<T extends { from: string; to: string; type: string; orb: number }>(
  aspects: T[],
  relationType: RelationType,
  limit = 6
): T[] {
  const distinct = aspects
    .filter((a) => a.from.toLowerCase() !== a.to.toLowerCase())
    .slice()
    .sort((a, b) => a.orb - b.orb);
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const a of distinct) {
    const pair = [a.from.toLowerCase(), a.to.toLowerCase()].sort().join("-");
    const key = `${pair}:${a.type.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(a);
  }
  const majors = unique.filter((a) => !isQuincunxType(a.type));
  const adjusts = unique.filter((a) => isQuincunxType(a.type));
  return [...sortAspectsForFocus(majors, relationType).slice(0, limit), ...adjusts.slice(0, limit)];
}

export interface GuidancePerson {
  display_name: string;
  sun?: string; moon?: string; venus?: string; mars?: string;
  mercury?: string; saturn?: string;
}

const MOON_NEED: Partial<Record<string, string>> = {
  Aries:       "lead fast; NAME needs you to match their urgency, then let them reset",
  Taurus:      "steadiness above all: don't rush them; they need to feel the ground is solid",
  Gemini:      "to talk it through, not just feel it. Bring the conversation, not the silence",
  Cancer:      "to feel the bond is safe before they'll open. Reassurance isn't weakness here",
  Leo:         "to be genuinely seen and celebrated. Acknowledgement matters more than you might expect",
  Virgo:       "to feel useful and appreciated for the practical care they give. Notice the small acts",
  Libra:       "to be invited, not pressured. They close when judged and open when it feels fair",
  Scorpio:     "honesty over reassurance. Soft untruths feel like betrayal; give them the real thing",
  Sagittarius: "room to breathe and range freely. Cages, even loving ones, make them pull away",
  Capricorn:   "to feel competent and respected, not managed. Let them do it their way first",
  Aquarius:    "space to process as themselves before they can close the distance",
  Pisces:      "gentleness and a feeling of being truly heard. They absorb the tone more than the words",
};

/**
 * Every value MUST be a noun phrase: it fills the blank in "they feel loved
 * through {X}" (see whatTheyNeed() below), and "through" can only govern a
 * noun phrase, never a to-infinitive or a second independent sentence.
 * PHASE 1 GRAMMAR FIX: the previous Virgo value ("to have the details
 * noticed. Effort is how they give...") produced "loved through to have the
 * details noticed" — ungrammatical, plus a stray second sentence duplicating
 * VENUS_HOW.Virgo. Rewrote all twelve as single noun phrases (never a
 * to-infinitive, never a bare independent clause after a period) so every
 * sign reads as one grammatical sentence — read each aloud in
 * "With {sign} Venus, they feel loved through {value}." before editing.
 */
const VENUS_NEED: Partial<Record<string, string>> = {
  Aries:       "direct pursuit, the feeling of being chosen rather than merely convenient",
  Taurus:      "tangible gestures and unhurried time together",
  Gemini:      "curiosity and real conversation, treated as its own love language",
  Cancer:      "warmth made domestic, being folded into their ordinary life",
  Leo:         "public appreciation, not only private affection",
  Virgo:       "having the small details noticed, since effort is how they give and how they want to receive",
  Libra:       "harmony and reciprocity, warmth given generously and returned in kind",
  Scorpio:     "depth and full presence, intensity over pleasantry",
  Sagittarius: "shared adventure, not stability alone",
  Capricorn:   "reliability shown consistently, the simplest proof there is",
  Aquarius:    "having their independence respected inside the bond",
  Pisces:      "quiet, genuine tenderness rather than grand gestures",
};

// ─────────────────────────────────────────────────────────────────────────
// PHASE 2 "how to deliver it" lines. Each is the concrete, chart-specific move
// that ACTS ON the same-sign need above — keyed to the person's REAL, engine-
// computed sign, never shown when the sign is missing/uncertain. These turn a
// description ("Sarah needs to be seen") into an action ("say the specific
// thing you admire, out loud, this week"). Every line is specific to the sign
// it is keyed under — a Leo line could not be swapped onto a Virgo Moon.
// MOON_HOW pairs with MOON_NEED (all relationship types).
// ─────────────────────────────────────────────────────────────────────────
const MOON_HOW: Partial<Record<string, string>> = {
  Aries:       "match their pace when it spikes. Move on it in the moment, then let them cool without a post-mortem",
  Taurus:      "keep the plan you already made; the follow-through itself is the reassurance, more than any words",
  Gemini:      "talk it through out loud with them, even the half-formed parts; for them the conversation IS the comfort",
  Cancer:      "say the bond is safe before you raise the hard thing, so a boundary doesn't read as a door closing",
  Leo:         "name the specific thing you admire, out loud and where others can hear, not \"good job\" but the actual detail",
  Virgo:       "notice one small practical thing they did and thank them for it by name; the noticing lands harder than praise",
  Libra:       "invite instead of instruct, and let them weigh in before you decide. Being consulted is how they feel safe",
  Scorpio:     "give them the unvarnished version even when a softer one is available; the honesty is the intimacy",
  Sagittarius: "give them room and a clear exit, then trust them to come back. Holding loosely is the reassurance",
  Capricorn:   "let them run it their own way first, and praise the effort over the talent; respect is how they read love",
  Aquarius:    "give them space to process alone before you ask them to close the distance. Don't chase the pause",
  Pisces:      "mind your tone over your words, and let them feel heard before you move to fixing it",
};

const VENUS_HOW: Partial<Record<string, string>> = {
  Aries:       "pursue directly: choose them out loud instead of waiting to be chosen",
  Taurus:      "make it tangible: unhurried time, a made meal, the seat kept for them",
  Gemini:      "keep the conversation alive. A genuinely curious question reads as a love letter",
  Cancer:      "fold them into ordinary life: the errand, the small plan. That domestic inclusion is the intimacy they feel",
  Leo:         "appreciate them in front of others, not only in private; witnessed warmth is the real thing",
  Virgo:       "let them see you noticed the details of their effort, and name them one by one",
  Libra:       "return the gesture evenly. They give generously and need to feel it come back",
  Scorpio:     "give them your full, undistracted presence: depth over frequency",
  Sagittarius: "share an actual adventure instead of only offering stability. Go somewhere with them",
  Capricorn:   "show up consistently over time; here the reliability IS the romance",
  Aquarius:    "protect their freedom inside the bond. Don't make closeness cost their independence",
  Pisces:      "offer sincere tenderness over grand gestures. The small true thing lands deepest",
};

const FRIEND_MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "This friend moves fast and says it straight. Match their pace and get to the point; circling makes them restless, not comforted.",
  Taurus:      "This friend thinks it through before they answer. Give them room and don't push for a fast reply; pressure just makes them dig in.",
  Gemini:      "This friend feels closest mid-conversation. Keep it curious and let it wander; a genuinely interested question reads to them like affection.",
  Cancer:      "This friend reads your tone before your words. Lead with warmth on anything hard, or the feeling lands before the message does.",
  Leo:         "This friend wants their take treated as it matters. Give it real weight before you push back, and warmth opens them faster than logic.",
  Virgo:       "This friend deals in specifics. Be concrete and accurate; vague reassurance slides off, but a precise point lands and sticks.",
  Libra:       "This friend wants it fair before they want it fast. Show you've weighed both sides, and frame hard things as a question, not a verdict.",
  Scorpio:     "This friend wants the real thing named. Say the subtext out loud, because with them a comfortable half-truth reads as a small betrayal.",
  Sagittarius: "This friend wants the big frame before the detail, and honesty over politeness. Give them the wide view first, then fill it in.",
  Capricorn:   "This friend wants to be talked to like they've got it handled. Bring the point, skip the over-explaining, and respect that they've thought about it.",
  Aquarius:    "This friend needs room to process as themselves before they meet you halfway. Give them the space and don't chase the pause.",
  Pisces:      "With this friend, how you say it matters more than what you say. Lead with warmth on anything difficult, or the feeling lands before the message does.",
};

const SIBLING_MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "Your sibling wants it direct, no cushioning. Say the real thing plainly; with them, hedging reads as talking down.",
  Taurus:      "Your sibling settles into a view and stays there. Bring things up early and let them sit, because rushing a decision is the fastest way to a wall.",
  Gemini:      "Your sibling talks to figure out what they think, so don't hold them to the first version. Let the idea move before you pin it down.",
  Cancer:      "Your sibling clocks your mood instantly, and old family tone carries weight. Watch how you say it; with them, delivery is half the message.",
  Leo:         "Your sibling needs their thinking respected, not managed. Acknowledge the point first; dismissiveness from family stings longer than from anyone else.",
  Virgo:       "Your sibling notices the details and the gaps. Come with the specifics, because with them a hand-wave reads as not having thought it through.",
  Libra:       "Your sibling wants to feel the scales were balanced. Lay out the whole picture; landing straight on a conclusion reads as steamrolling.",
  Scorpio:     "Your sibling already senses what you're not saying. Name it directly; with them, softening the truth does more damage than the truth would.",
  Sagittarius: "Your sibling would rather have it blunt than gentle. Lead with the honest headline; over-softening reads to them as a dodge.",
  Capricorn:   "Your sibling reads over-explaining as being managed. Say it once, cleanly, and trust them to take it from there.",
  Aquarius:    "Your sibling steps back to think, and closing in makes them close off. Say your piece and let them come back on their own clock.",
  Pisces:      "Your sibling hears the tone under the words, so leave room for what isn't said directly. Not everything they mean will arrive in the sentence.",
};

const SATURN_HOW: Partial<Record<string, string>> = {
  Aries:       "set the limit once, then let them push against it. The resistance is how they accept it",
  Taurus:      "hold the rule consistently; the boundary that never moves is the one they trust",
  Gemini:      "give the reason behind the rule. They follow what they understand and resent what they don't",
  Cancer:      "make the authority feel protective, not policing. Reassure while you hold the line",
  Leo:         "give them responsibility in front of others; dignity is how they take a limit",
  Virgo:       "set clear, meetable standards. A vague expectation feels like being set up to fail",
  Libra:       "keep every rule visibly fair; an uneven rule reads to them as a broken promise",
  Scorpio:     "hold the boundary without a power struggle: steady, not a contest of wills",
  Sagittarius: "give the why and room to roam inside the limit; a cage just breeds escape",
  Capricorn:   "give them real stakes and take them seriously. They rise to high expectations, not low ones",
  Aquarius:    "appeal to the principle, not the hierarchy. \"Because it's right\" keeps them; \"because I said so\" loses them",
  Pisces:      "deliver firmness gently. Keep the edge kind or they dissolve instead of pushing back",
};

// ─────────────────────────────────────────────────────────────────────────
// Saturn-by-sign "what structure / authority this person needs" lines, used
// ONLY by the parent-child lens (Saturn is the genuine structure/authority
// body). Each line is keyed to the person's REAL, engine-computed Saturn sign;
// nothing is shown when the sign is missing or the engine flagged it uncertain.
// Mirror the density and second-person voice of MOON_NEED / VENUS_NEED above.
// ─────────────────────────────────────────────────────────────────────────
const SATURN_NEED: Partial<Record<string, string>> = {
  Aries:       "structure they can push against, not a wall. Set the limit, then let them test it",
  Taurus:      "consistency over intensity; the rule that never moves is the one they trust",
  Gemini:      "reasons, not decrees. They follow a boundary they understand and resent one they don't",
  Cancer:      "authority that feels protective, not policing; they harden when safety turns to control",
  Leo:         "to be trusted with responsibility in front of others. Dignity is how they accept limits",
  Virgo:       "clear standards they can actually meet; vague expectations read as being set up to fail",
  Libra:       "fairness they can see. An inconsistent rule lands as a broken promise",
  Scorpio:     "boundaries held without a power struggle; they respect strength that isn't cruelty",
  Sagittarius: "the why behind the rule and room to roam inside it. Cages breed escape",
  Capricorn:   "to be taken seriously and given real stakes; they meet high expectations, not low ones",
  Aquarius:    "principle over hierarchy: 'because I said so' loses them; 'because it's right' keeps them",
  Pisces:      "firmness delivered gently; they need the edge to be kind, or they dissolve rather than push back",
};

// ─────────────────────────────────────────────────────────────────────────
// Mercury-by-sign "how this person needs to be communicated with" lines, used
// by the siblings and friends lenses (communication is the genuine register
// there). Keyed to the person's REAL, engine-computed Mercury sign; omitted
// when missing or uncertain. Match MOON_NEED / VENUS_NEED density and voice.
// ─────────────────────────────────────────────────────────────────────────
const MERCURY_NEED: Partial<Record<string, string>> = {
  Aries:       "the point first. They hear directness as respect and hedging as evasion",
  Taurus:      "time to chew on it; don't mistake a slow reply for disagreement",
  Gemini:      "to think out loud without it being held against them. Half of it is drafting, not deciding",
  Cancer:      "tone read before content; how you say it lands harder than what you say",
  Leo:         "to feel heard, not corrected in front of others. Praise the idea before you edit it",
  Virgo:       "precision. Sloppy claims derail them faster than hard truths do",
  Libra:       "the conversation kept fair; they shut down when it tips into winning and losing",
  Scorpio:     "the real subtext named. They already sense the thing you're not saying",
  Sagittarius: "the big frame before the detail, and honesty even when it's blunt",
  Capricorn:   "useful over pleasant; they trust the person who tells them the load-bearing thing",
  Aquarius:    "room to disagree without it being personal. Ideas are how they connect",
  Pisces:      "space for the unspoken; not everything they mean arrives in words",
};

// ═════════════════════════════════════════════════════════════════════════
// WORKING-RELATIONSHIP REGISTER (colleagues / manager-report / mentor-mentee)
//
//
// These tables are the interpretation register for the three working frames.
// They read the SAME engine-computed signs every other frame reads (Mercury,
// Saturn, Mars), keyed to the person's REAL sign, and are omitted entirely
// when the sign is missing or the engine flagged it uncertain. No new
// astrological claim is made here and no aspect computation changes: Mercury
// is already the communication/decision body, Saturn already the
// structure/authority body, Mars already the drive body. Only the register in
// which those true placements are described is professional instead of
// personal.
//
// HARD CONSTRAINT: no romantic, attraction, or intimacy language of any kind
// may appear in any string below, and none of it may leak the personal
// register (no "loved", "closeness", "affection", "the bond"). Enforced by
// packages/astro/test/professional-frames.test.ts, which scans every rendered
// professional reading against a forbidden-term list.
//
// WHY THREE MERCURY TABLES BUT ONE SATURN AND ONE MARS TABLE: a previous
// audit (see the FRIEND_MERCURY_HOW / SIBLING_MERCURY_HOW note above) found
// that a swapped prefix over one shared sign table is not real
// differentiation. So the lead body register, Mercury, is authored once per
// working frame: peer voice, reporting-line voice, teaching voice. Respect
// (Saturn) and deadline behavior (Mars) are genuinely the same reading in all
// three working frames, so they are ONE shared table each, used unprefixed by
// all three, in the same way MOON_NEED is shared by every frame in the file.
// ═════════════════════════════════════════════════════════════════════════

/** Colleagues: peer-to-peer working style, keyed to the real Mercury sign. */
const COLLEAGUE_MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "This colleague decides fast and says it plainly. Bring the recommendation, not the whole deck, and let them react before you fill in the detail",
  Taurus:      "This colleague wants the plan to hold still. Flag a change early and give them a beat to absorb it, because a late pivot costs more with them than the pivot is worth",
  Gemini:      "This colleague thinks out loud and will float three options before settling. Treat the first version as a draft, then write down what you actually agreed",
  Cancer:      "This colleague reads the tone of a message before its content. Say why you are asking, or a short request lands as a complaint",
  Leo:         "This colleague needs their contribution named where the team can see it. Credit the specific piece first, then edit the work",
  Virgo:       "This colleague deals in specifics and spots the gap. Bring the numbers and the caveats, because a rounded answer buys you a second round trip",
  Libra:       "This colleague wants both options weighed before a call is made. Show them the one you chose against, or the decision reads as a shortcut",
  Scorpio:     "This colleague already senses what got left out of the update. Name the risk yourself, because with them a tidy status reads worse than a hard one",
  Sagittarius: "This colleague wants the point of the work before the steps. Give them the wide frame first, then the task list",
  Capricorn:   "This colleague wants to be briefed like someone who has done this before. Say it once, cleanly, and skip the reassurance",
  Aquarius:    "This colleague argues with the approach, not with you. Leave room to challenge the plan and the challenge usually improves it",
  Pisces:      "This colleague hears the pressure behind an ask. Say what is genuinely urgent and what is not, or everything arrives urgent",
};

/** Manager and report: how to talk across a reporting line, keyed to the real Mercury sign. */
const MANAGER_MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "Keep it short and direct with them: the headline first, the reasoning second. Cushioning reads as hedging, and hedging reads as a problem being hidden",
  Taurus:      "Give them a change in writing and give it time. A decision sprung in the meeting gets resisted; the same decision seen a week earlier gets carried",
  Gemini:      "Let them talk a decision through before it is fixed, then confirm the outcome in one line. Otherwise two versions of the plan leave the room",
  Cancer:      "Say where they stand before you say what has to change, or a routine note gets read as a warning",
  Leo:         "Acknowledge what they own before you edit it. Credit given where others can see it buys you a private correction",
  Virgo:       "Be exact about scope and about what finished means. A vague brief makes them perfect the wrong part and then carry the miss as their fault",
  Libra:       "Show the reasoning behind the call. A decision handed down without the tradeoff reads as arbitrary and quietly loses them",
  Scorpio:     "Give them the real reason. They will find the part you left out, and a half answer costs more than the hard answer would have",
  Sagittarius: "Give them the purpose, then the constraint. They will follow a reason a long way and a rule about ten feet",
  Capricorn:   "Talk to them about the standard rather than the supervision. They will hold a high bar; being watched over it only makes them slower",
  Aquarius:    "Let them disagree on the record. Room to argue the approach keeps them in the work; being answered with rank does not",
  Pisces:      "Rank the priorities out loud. Without an order, they take every signal as equally urgent and spread themselves thin",
};

/** Mentor and mentee: teaching register, keyed to the real Mercury sign. */
const MENTOR_MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "They learn by trying it and getting it wrong quickly. Hand them one small thing to attempt this week instead of a long explanation",
  Taurus:      "They learn by repetition and want one thing solid before the next. Do not stack a second lesson onto an unfinished one",
  Gemini:      "They learn by asking around the subject. Let the questions wander, then bring it back to the one thing they will practice",
  Cancer:      "They will not admit confusion until they trust you. Say plainly that not knowing yet is the normal part, and they will ask sooner",
  Leo:         "They learn in front of people and want the progress noticed. Give them something to present, then correct it in private",
  Virgo:       "They want the method and the reason it works. Give them the standard to check their own work against and they will use it",
  Libra:       "They want to see how a good decision actually gets weighed. Walk them through a call you made and what you traded away",
  Scorpio:     "They want the part most advice leaves out. Tell them what it cost you, or the guidance sounds polished and unusable",
  Sagittarius: "They want the whole map before the first step, even the parts still out of reach. Sketch the arc, then name the next move",
  Capricorn:   "They want real stakes and an honest assessment. Praise the work accurately and leave the bar where it is",
  Aquarius:    "They will test the received way of doing it. Let them argue with the method and hold only the parts that are load bearing",
  Pisces:      "They take in more than they can repeat back yet. Let it sit, then ask what landed before you add the next piece",
};

/**
 * How this person reads respect at work, from their real Saturn sign. Shared
 * by all three working frames. Each value is a NOUN PHRASE: it completes
 * "{Name} reads respect through their {sign} Saturn: {value}." Read it aloud
 * in that template before editing (a to-infinitive or a bare clause here
 * produces the ungrammatical output that the VENUS_NEED note above documents).
 */
const WORK_SATURN_RESPECT: Partial<Record<string, string>> = {
  Aries:       "room to move first and answer for it after. Asking them to clear every step reads as doubt",
  Taurus:      "consistency. A deadline or a rule that keeps moving costs more trust with them than a hard one ever would",
  Gemini:      "being told why. A decision they understand is one they will carry; one they do not, they quietly work around",
  Cancer:      "being protected in front of the room. Correct them privately, or the correction lands as exposure",
  Leo:         "visible responsibility. Being trusted with something that carries their name reads as respect, and being quietly reassigned reads as a verdict",
  Virgo:       "accuracy about what good means. A vague brief followed by a critique reads as a setup, not a standard",
  Libra:       "the same rule applied to everyone. An exception made for someone else is the fastest way to lose them",
  Scorpio:     "being told the real stakes. Managed optimism reads as being handled, and they do not unhear it",
  Sagittarius: "room inside the requirement. Give them the point and the boundary, then leave the route to them",
  Capricorn:   "real weight to carry. Low expectations read to them as a judgment on what they are capable of",
  Aquarius:    "principle over rank. Explain the standard and they will hold it; invoke position and they check out",
  Pisces:      "firmness delivered kindly. They will meet a clear expectation, but a harsh delivery is remembered long after the point is forgotten",
};

/**
 * Where the friction shows up under deadline, from their real Mars sign.
 * Shared by all three working frames. Each value is a NOUN PHRASE completing
 * "Under a deadline, {Name}'s {sign} Mars shows up as {value}."
 */
const WORK_MARS_DEADLINE: Partial<Record<string, string>> = {
  Aries:       "immediate action and a short fuse. They move before the plan is agreed, so give them the first real task early",
  Taurus:      "digging in at the pace they already set. Pushing harder slows them down, so move the checkpoint earlier instead",
  Gemini:      "several things half started and a running commentary. Ask them to name the one that ships",
  Cancer:      "protecting the people over the plan, and going quiet when they feel rushed. Ask them directly what should be dropped",
  Leo:         "taking it over so it gets done properly. Give them a visible piece to own before they annex the rest",
  Virgo:       "polishing the part nobody is waiting on. Tell them explicitly what is allowed to stay rough",
  Libra:       "consulting one more person instead of deciding. Give them a deadline for the decision, not only for the delivery",
  Scorpio:     "quiet, total focus and a long memory for who did not show up. Say out loud who is covering what",
  Sagittarius: "widening the scope late. Restate what is out of scope before the last stretch, not after it",
  Capricorn:   "absorbing the whole load without mentioning it. Ask what they have taken on before it is finished",
  Aquarius:    "changing the method mid crunch. Ask for the improvement in writing for next time and hold this run steady",
  Pisces:      "drifting on the timeline while the quality stays high. Give them a mid point check rather than one at the end",
};

// ─────────────────────────────────────────────────────────────────────────
// Relationship-type LENS applied to a REAL computed cross-aspect. The bodies,
// aspect type, orb, and harmony sign are all from the engine — these strings
// only reframe that true aspect in the register of the chosen relationship
// (attraction for partners, safety/authority for parent-child, etc.). Two
// variants per type: one when the aspect flows (harmony ≥ 0), one when it
// catches (harmony < 0). Never shown when no matching aspect exists.
// ─────────────────────────────────────────────────────────────────────────
const RELATION_ASPECT_FRAME: Record<RelationType, { flows: string; catches: string }> = {
  partners: {
    flows:   "reads as easy attraction: wanting and warmth point the same way, so closeness needs no translation.",
    catches: "is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.",
  },
  romantic: {
    flows:   "reads as easy attraction: wanting and warmth point the same way, so closeness needs no translation.",
    catches: "is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.",
  },
  "parent-child": {
    flows:   "is a channel of felt safety. Support and steadiness reach the child without a fight.",
    catches: "is where care can land as control; see the plan before you correct it, and offer autonomy with backup.",
  },
  siblings: {
    flows:   "keeps the line open. You can say the hard thing to each other and still be fine after.",
    catches: "is the old loop you both fall into; name the pattern before you're inside it and it loosens its grip.",
  },
  friends: {
    flows:   "is where the friendship grows. Curiosity and shared momentum feed each other here.",
    catches: "is where wires cross; assume a misread, not a slight, and check the intent before the reaction.",
  },
  platonic: {
    flows:   "keeps the understanding easy. How you think together is the real bond here.",
    catches: "is where you talk past each other; slow down and confirm you mean the same thing.",
  },
  ancestor: {
    flows:   "carries across the generations between you. An inherited current that still runs true.",
    catches: "is where two different eras pull apart; the friction is the era gap, not the person.",
  },
  colleagues: {
    flows:   "is where the work moves without translation, so a handoff between you costs less explaining than it usually would.",
    catches: "is where two working styles grind, and it shows up first as a dropped handoff in a busy week.",
  },
  "manager-report": {
    flows:   "is where direction and delivery line up, so an instruction arrives as it was meant.",
    catches: "is where authority reads as pressure; say what the standard is before you say what is missing.",
  },
  "mentor-mentee": {
    flows:   "is where teaching actually gets used, so guidance turns into practice instead of notes.",
    catches: "is where advice arrives as judgment; ask what they have already tried before adding to it.",
  },
};

/** One-line caption describing what the reordered aspect list is leading with, per type. */
export function relationLensCaption(relType: RelationType): string {
  switch (relType) {
    case "partners":
    case "romantic":
      return "Leading with attraction and partnership aspects (Venus, Mars, Sun, Moon) first.";
    case "parent-child":
      return "Leading with emotional-safety, mind, and structure aspects (Moon, Mercury, Saturn) first.";
    case "siblings":
      return "Leading with communication and understanding aspects (Mercury, Moon) first.";
    case "friends":
      return "Leading with communication and shared-growth aspects (Mercury, Jupiter) first.";
    case "platonic":
      return "Leading with communication and understanding aspects (Mercury, Moon, Jupiter) first.";
    case "ancestor":
      return "Leading with the slow outer-planet aspects (Pluto, Neptune, Uranus) that carry the generational layer.";
    case "colleagues":
      return "Leading with working-style, drive, and structure aspects (Mercury, Mars, Saturn) first.";
    case "manager-report":
      return "Leading with structure, communication, and standing aspects (Saturn, Mercury, Sun) first.";
    case "mentor-mentee":
      return "Leading with growth, discipline, and learning aspects (Jupiter, Saturn, Mercury) first.";
  }
}

/**
 *
 * Exported so callers that must never read `synastry.scores` (e.g. the `/s`
 * OG image route) can index this map directly instead of going through
 * `compareHeadline()`, whose fallback for a type with no entry here needs a
 * score-derived `overall`. Index this map with a scores-free fallback
 * (never `scoreBandHeadline`) for any type not covered here.
 */
export const RELATION_HEADLINE: Partial<Record<RelationType, string>> = {
  partners: "This is a partnership you're both building on purpose. Below is where it moves easily, and where it asks for tending.",
  siblings: "You two share a history and a floor neither of you can walk off. Here's what runs smooth between you, and where the old patterns catch.",
  friends: "This is chosen closeness, kept alive by showing up. Here's what comes easy, and where it needs a little care.",
  "parent-child": "This is love read through respect and room to grow. Here's where care lands clean, and where it can tip into control.",
  ancestor: "This is a bond that reaches across time. Here's what still connects you, and where the eras pull apart.",
  // PHASE 3. Quick Compare's own
  // relTypes (see apps/web/app/chart/compare/page.tsx FOCUS_TYPES) previously
  // had no entry here and fell through to `scoreBandHeadline` — the only
  // score-derived line on a surface that otherwise never reads
  // `synastry.scores` for its copy. Matches the two-sentence voice above.
  romantic: "This is a spark you're both curious about. Here's where it comes easily, and where it takes real care to turn into something steady.",
  platonic: "This is a connection you have chosen to read together, kept easy by staying open with each other. Here is what comes easy, and where it needs a little care.",
  colleagues: "This is a working relationship you both have to keep functional. Here is where the work moves easily between you, and where it snags once the pressure is on.",
  "manager-report": "This is a working relationship with a reporting line running through it. Here is where direction lands cleanly, and where authority and autonomy pull against each other.",
  "mentor-mentee": "This is a teaching relationship, built on one of you having gone first. Here is where the guidance lands, and where it tips into pressure.",
};

function scoreBandHeadline(overall: number): string {
  if (overall >= 70) return "High flow. Momentum comes naturally here.";
  if (overall >= 50) return "Balanced. Ease and growth in equal measure.";
  return "Growth-heavy. Real warmth under intentional care.";
}

/**
 * The Compare result headline shown at the top of a reading. relType-keyed
 * for the five core picker types (COMPARE_RELATION_TYPES); score-band
 * fallback for every other type. Single source of truth for web
 * (/app/compare) and mobile (Compare) so both surfaces render identical
 * copy — no web/mobile drift.
 */
export function compareHeadline(relType: RelationType, overall: number): string {
  return RELATION_HEADLINE[relType] ?? scoreBandHeadline(overall);
}

export function whatTheyNeed(
  scores: Record<string, number>,
  person: GuidancePerson,
  relType: RelationType,
  synastry: SynastryResult | null
): string {
  const name = person.display_name;
  const moon = person.moon ?? "";
  const venus = person.venus ?? "";

  const receivingAspects = synastry?.aspects
    .filter((a) => a.orb < 4)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3) ?? [];

  const tightestFrictionAspect = receivingAspects.find((a) => a.harmony < -0.5);

  /**
   * Clauses that must OPEN the reading, ahead of `parts`. Only the working
   * frames use it (working style and decision making lead a work reading);
   * it stays empty for every other relType, so their output is byte-identical
   * to before this branch existed.
   */
  const leadParts: string[] = [];
  const parts: string[] = [];

  // The Moon (emotional need) clause is the one body every personal frame
  // shares. The working frames deliberately skip it: MOON_NEED / MOON_HOW and
  // the low-emotional fallback are written in the personal register ("the bond
  // is safe", "close the distance", "reassurance"), which is the wrong
  // register for a colleague, a report, or a mentee, and would put closeness
  // language into a working reading. Those frames read Mercury, Saturn, and
  // Mars instead (see the working-relationship block below). Nothing is
  // hidden and nothing is invented: which real bodies a frame surfaces is
  // already frame-specific throughout this file (Venus is romantic-only,
  // Saturn was parent-child-only).
  const moonLine = moon && !isProfessionalRelation(relType) ? MOON_NEED[moon] : null;
  if (moonLine) {
    // PHASE 2: description ("they need X") + how to actually deliver it, both
    // keyed to the same real Moon sign.
    const moonHow = moon ? MOON_HOW[moon] : null;
    parts.push(
      `${name}'s ${moon} Moon means they need ${moonLine.replace("NAME", name)}.` +
      (moonHow ? ` To actually give it: ${moonHow}.` : "")
    );
  } else if (scores.emotional < 52 && !isProfessionalRelation(relType)) {
    parts.push(`${name} needs reassurance that the bond holds when the conversation gets hard. Lead with the feeling, not the verdict.`);
  }

  // Venus ("how they feel loved") is a romance/attraction frame, so it only
  // fits the partner-type lenses. Every other relationship type reads a
  // different, type-appropriate body below (Saturn for parent-child, Mercury
  // for siblings/friends) instead of borrowing the romantic register — that
  // would be a label applied to the wrong data.
  const isPartnerLens = isRomanticRelation(relType);
  const mercury = person.mercury ?? "";
  const saturn = person.saturn ?? "";
  const mars = person.mars ?? "";
  const venusLine = venus && venus !== moon ? VENUS_NEED[venus] : null;
  if (venusLine && scores.warmth < 62 && isPartnerLens) {
    // PHASE 2: how they feel loved + the concrete way to show it (same Venus sign).
    const venusHow = venus ? VENUS_HOW[venus] : null;
    parts.push(
      `With ${venus} Venus, they feel loved through ${venusLine}.` +
      (venusHow ? ` The way to show it: ${venusHow}.` : "")
    );
  }

  // Platonic relationship-level watch line used to live here, so both
  // "What X needs from you" cards ended with the same Mercury-aspect
  // sentence. It is a pair-level insight, not a per-person need: render it
  // once via `relationshipWatchLine()`, never inside this function.

  // Siblings & friends read this person's REAL Mercury sign (communication is
  // the genuine register for these bonds). Omitted when Mercury is missing or
  // uncertain — never invented. The "how" clause is relType-specific
  // (FRIEND_MERCURY_HOW / SIBLING_MERCURY_HOW) so the same Mercury sign reads
  // differently for a sibling than a friend — not just a swapped prefix.
  if ((relType === "siblings" || relType === "friends") && mercury) {
    const mercuryLine = MERCURY_NEED[mercury];
    if (mercuryLine) {
      const frame = relType === "siblings" ? "Between siblings" : "As friends";
      // PHASE 2: how they need to be talked to + the concrete practice (same Mercury sign).
      const mercuryHow: string | undefined =
        relType === "siblings" ? SIBLING_MERCURY_HOW[mercury] : FRIEND_MERCURY_HOW[mercury];
      parts.push(
        `${frame}, ${name}'s ${mercury} Mercury sets how they need to be talked to: ${mercuryLine}.` +
        (mercuryHow ? ` In practice: ${mercuryHow}.` : "")
      );
    }
  }

  // Parent-child reads this person's REAL Saturn sign (structure/authority is
  // the genuine register for the bond) alongside the Moon safety line above.
  // Replaces the single hardcoded parent-child sentence that used to stand in
  // here. Omitted when Saturn is missing or uncertain.
  if (relType === "parent-child" && saturn) {
    const saturnLine = SATURN_NEED[saturn];
    if (saturnLine) {
      // PHASE 2: what structure they need + how to hold it (same Saturn sign).
      const saturnHow = SATURN_HOW[saturn];
      parts.push(
        `In a parent-child bond, ${name}'s ${saturn} Saturn shapes how they meet limits and authority: they need ${saturnLine}.` +
        (saturnHow ? ` How to hold it: ${saturnHow}.` : "")
      );
    }
  }

  // The three working frames lead with working style and decision making
  // (Mercury), then how this person reads respect (Saturn), then where the
  // friction shows under deadline (Mars). These are collected in `leadParts`
  // and joined AHEAD of the Moon line and everything else below, so a working
  // reading opens on the work rather than on emotional need. Every clause is
  // keyed to a real, engine-computed sign and omitted when that sign is
  // missing or uncertain; nothing here is generated, and no aspect
  // computation is involved. Venus (the attraction register) is unreachable
  // for these frames because `isRomanticRelation` is false for all of them.
  if (isProfessionalRelation(relType)) {
    if (mercury) {
      const mercuryLine = MERCURY_NEED[mercury];
      const workMercuryHow =
        relType === "colleagues"
          ? COLLEAGUE_MERCURY_HOW[mercury]
          : relType === "manager-report"
            ? MANAGER_MERCURY_HOW[mercury]
            : MENTOR_MERCURY_HOW[mercury];
      if (mercuryLine) {
        leadParts.push(
          `${name}'s ${mercury} Mercury sets how they think a problem through and what they need from a conversation: ${mercuryLine}.` +
          (workMercuryHow ? ` In practice: ${workMercuryHow}.` : "")
        );
      }
    }
    if (saturn) {
      const respect = WORK_SATURN_RESPECT[saturn];
      if (respect) {
        leadParts.push(`${name} reads respect through their ${saturn} Saturn: ${respect}.`);
      }
    }
    if (mars) {
      const deadline = WORK_MARS_DEADLINE[mars];
      if (deadline) {
        leadParts.push(`Under a deadline, ${name}'s ${mars} Mars shows up as ${deadline}.`);
      }
    }
  }

  if (tightestFrictionAspect && scores.communication < 60 && relType !== "platonic") {
    const bodyA = tightestFrictionAspect.from, bodyB = tightestFrictionAspect.to;
    parts.push(`The tightest friction runs through a ${bodyA}–${bodyB} ${tightestFrictionAspect.type} (${tightestFrictionAspect.orb.toFixed(1)}°). Name the pattern before you're inside it, and it loses its grip.`);
  }

  // Type-specific closing note. Parent-child fallback only fires when Saturn
  // was unavailable above (so the lens still says something true); ancestor
  // frames across eras; the partner high-flow note is unchanged.
  if (relType === "parent-child" && !saturn) {
    parts.push("See the plan before you correct it. Autonomy with backup, not direction, is what keeps the trust intact.");
  } else if (relType === "ancestor") {
    parts.push(`Across the years between you, meet ${name} in the era that shaped them before you translate it into yours.`);
  } else if (isPartnerLens && scores.overall >= 70) {
    parts.push("The overall flow is strong. The real work is making sure you both say the tender thing out loud while it's easy.");
  } else if (isProfessionalRelation(relType) && !mars) {
    parts.push("Pressure is where the difference between you shows. Agree who decides what before the next deadline rather than during it.");
  }

  const all = [...leadParts, ...parts];

  if (all.length === 0) {
    const vibe = moon ? SIGN_VIBE[moon] : null;
    if (vibe) {
      all.push(`${name}'s ${moon} Moon (${vibe}) is the register they speak first. Meet them there.`);
    } else {
      all.push(`${name} needs to be met in their own language before the connection can deepen.`);
    }
  }

  return all.join(" ");
}

/**
 * Relationship-level closer that used to be appended inside every
 * `whatTheyNeed()` card for `relType === "platonic"`. It reads the pair's
 * synastry (the tightest Mercury-domain aspect, or a communication-score
 * fallback), so it is the same sentence for both people. Callers must
 * render it once, in a shared location, not inside each person card.
 */
export function relationshipWatchLine(
  scores: Record<string, number>,
  relType: RelationType,
  synastry: SynastryResult | null
): string | null {
  if (relType !== "platonic") return null;

  const receivingAspects = synastry?.aspects
    .filter((a) => a.orb < 4)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3) ?? [];
  const mercuryAspect = receivingAspects.find(
    (a) => a.from.toLowerCase() === "mercury" || a.to.toLowerCase() === "mercury"
  );
  if (mercuryAspect) {
    return `As friends, how you talk matters more than how you feel about each other: the ${mercuryAspect.from}-${mercuryAspect.to} ${mercuryAspect.type} (${mercuryAspect.orb.toFixed(1)}°) is the real signal to watch.`;
  }
  if (scores.communication < 60) {
    return "As friends, the honest read is in how you talk to each other, not how you feel about each other. That's the register worth tending here.";
  }
  return null;
}

function cap(s: string): string {
  return bodyDisplayName(s);
}

// ═════════════════════════════════════════════════════════════════════════
// PHASE 1 — ACTIONABLE, CHART-GROUNDED GUIDANCE PER ASPECT.
//
// Every string below is authored to be SPECIFIC to the bodies (and, for the
// register, the relationship type) it is keyed under — never generic advice.
// A friction line is a concrete way to MINIMIZE the clash between those two
// planets' domains; a flow line is a concrete way to NURTURE and USE the ease.
// Nothing here invents an aspect: `aspectActionLine` reads only the real
// `from`/`to`/`type`/`harmony` the engine computed for these two charts.
//
// MINOR SAFETY (ENGINEERING.md §9/§13): these render only inside the
// `!blockRomanticMinorRender` branch (see apps/web/app/app/compare/page.tsx),
// so they inherit the exact same gate as the rest of Compare. For a pairing
// with a minor, only non-romantic relationship types are reachable, and the
// non-romantic REGISTERs below are the only ones that fire — so the guidance
// is never romantic/attraction-framed. The body tactics themselves are written
// in warmth/values terms (never desire/attraction), so even a Venus aspect
// surfaced under a family lens stays family-safe.
// ═════════════════════════════════════════════════════════════════════════

/**
 * PHASE 2 OPENER VARIETY.
 *
 * DEFECT A audit: `RELATION_ACTION_REGISTER` used to hold exactly ONE opener
 * per relationship type per nature (flows/catches) — a single fixed string
 * that every row of that nature rendered, on every Compare page, regardless
 * of which two bodies were actually aspected. A page with several
 * same-nature rows (e.g. four "catches" rows) showed the identical opener
 * sentence above every one of them.
 *
 * Fix: each relationship type + nature now holds a POOL of
 * `OPENER_POOL_SIZE` distinct, hand-authored paraphrases of the same
 * register/tone (never a different meaning — just different wording), and
 * `pickOpener()` below selects one deterministically from the real aspect's
 * two bodies. Selection is a pure function of the (sorted) body pair only —
 * never the row's position on the page, never Math.random — so the exact
 * same pair always renders the exact same opener, on every load
 * ("Galaxia never fabricates and never varies its reading between loads").
 *
 * Pool size: `selectCompareAspectRows` caps a Compare page at 6 rows, and
 * `distinct` there already dedupes so a given (unordered body pair, aspect
 * type) can appear at most once, so a body PAIR appears at most once per
 * page. Note also that the one shipped consumer of this opener
 * (`FlowsAndCatchesSection`) only ever prints ONE heading per nature per
 * page (`showOpener` shows it before the first flows row and the first
 * catches row, then suppresses it for every later row of that nature) — so
 * a single page can never itself render two different (or two repeated)
 * opener headings side by side today. What the pool actually fixes is
 * CROSS-comparison repetition: every couple used to see the exact same
 * hardcoded heading regardless of which bodies were involved; now the
 * heading a given couple sees is a deterministic function of their
 * highest-priority row's real body pair, so different pairings read
 * differently. A pool of 8 was chosen and verified (see
 * `aspect-opener-variety.test.ts`) against the real production case that
 * shipped this bug (Stacy/Randall, romantic: jupiter-sun, jupiter-mars,
 * uranus-sun, uranus-mars, all "square"/catches) — all four resolve to
 * distinct indices, so even a future consumer that renders one heading per
 * row (instead of once per nature) would show variety for that exact case.
 * This is a deterministic hash over a fixed pool, not an exhaustive
 * injective proof across all 55 possible body pairs; if a future real
 * pairing or a new per-row consumer surfaces a same-page collision, grow
 * the pool rather than special-case it.
 */
const OPENER_POOL_SIZE = 8;

/** Stable (non-cryptographic) string hash — same input always yields the same output. */
function stablePairHash(bodyA: string, bodyB: string): number {
  const key = PAIR_KEY(bodyA, bodyB);
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h % OPENER_POOL_SIZE;
}

/** Picks one opener from a relationship type's pool, deterministic by the aspect's real body pair. */
function pickOpener(pool: readonly string[], bodyA: string, bodyB: string): string {
  return pool[stablePairHash(bodyA, bodyB)] ?? pool[0];
}

/**
 * Relationship-type REGISTER: the type-specific lead clause that sets WHO acts
 * and HOW, so the same real aspect yields different guidance for a parent-child
 * vs. friends vs. partners. Each entry ends in a colon; the body tactic
 * continues it. "partners" and "romantic" intentionally share one pool (both
 * are the romantic register — see `isRomanticRelation`); "friends" and
 * "platonic" have distinct pools since their "flows" voice differs.
 */
/** Shared romantic register pool — "partners" and "romantic" are the same register (see `isRomanticRelation`). */
const ROMANTIC_ACTION_REGISTER = {
  flows: [
    "Don't let this ease go unspoken between you:",
    "Let this ease show instead of assuming they already know:",
    "Say the warm thing while it's easy, not just when it's hard:",
    "Give this ease a voice instead of letting it stay silent:",
    "Name the good part out loud, the same way you'd name the hard one:",
    "Let the ease be known between you, not just felt:",
    "Speak the warmth plainly instead of taking it as understood:",
    "Put words to this ease before it becomes something assumed:",
  ],
  catches: [
    "Say the tender thing out loud before it hardens into scorekeeping:",
    "Name what you're actually feeling before the moment turns into a tally:",
    "Speak the soft part now, before it becomes a complaint:",
    "Say what's true for you before it curdles into resentment:",
    "Get ahead of the sting: name it kindly before it festers:",
    "Don't let this sit quietly. Say it while it's still soft:",
    "Speak first, before the feeling calcifies into a grievance:",
    "Put the tender part into words before it turns into a silent score:",
  ],
} as const;

const RELATION_ACTION_REGISTER: Record<RelationType, { flows: readonly string[]; catches: readonly string[] }> = {
  partners: ROMANTIC_ACTION_REGISTER,
  romantic: ROMANTIC_ACTION_REGISTER,
  "parent-child": {
    flows: [
      "Use this open channel on purpose:",
      "Put this ease to work instead of letting it pass by:",
      "Lean on this open channel when it counts:",
      "Use the trust this channel gives you, deliberately:",
      "Make good use of this easy opening between you:",
      "Reach for this channel first, before things get hard:",
      "Put this natural opening to work, on purpose:",
      "Use this ease as the bridge it already is:",
    ],
    catches: [
      "As the parent, lead with backup over correction:",
      "As the parent, offer support before you offer the fix:",
      "As the parent, meet the moment with backup, not a lecture:",
      "As the parent, choose steadiness over managing the outcome:",
      "As the parent, give room before you give a correction:",
      "As the parent, hold the line gently instead of tightening it:",
      "As the parent, lead with trust before you lead with a rule:",
      "As the parent, notice the need under the behavior before you address the behavior:",
    ],
  },
  siblings: {
    flows: [
      "Keep the line this open:",
      "Keep using this open line while it's easy:",
      "Protect this openness between you:",
      "Keep this channel clear; it's worth the upkeep:",
      "Lean on this open line while it's working:",
      "Keep talking through this open channel:",
      "Hold onto this easy openness on purpose:",
      "Use this open line before it needs reopening:",
    ],
    catches: [
      "Head off the old loop before you're inside it:",
      "Name the old pattern before it pulls you both in again:",
      "Catch the familiar loop early, before it runs its course:",
      "Call out the old dynamic before it takes over:",
      "Step outside the pattern before it closes around you both:",
      "See the loop coming and name it, before you're in it:",
      "Break the old script early, before either of you is playing a part:",
      "Notice the familiar groove before you fall back into it:",
    ],
  },
  friends: {
    flows: [
      "Feed the momentum:",
      "Keep the momentum going while it's easy:",
      "Put this energy toward something real:",
      "Ride this momentum on purpose:",
      "Give this easy pull somewhere to go:",
      "Keep this going; it's worth the follow-through:",
      "Use this momentum before it needs restarting:",
      "Build on this while it's already moving:",
    ],
    catches: [
      "Assume a misread, not a slight:",
      "Check the intent before you react to the sting:",
      "Read it as a mixed signal, not a message:",
      "Ask what they meant before you decide what they meant:",
      "Give the benefit of the doubt before the annoyance sets in:",
      "Treat it as noise, not a verdict, until you check:",
      "Take the confusion at face value, not as an insult:",
      "Clarify before you conclude:",
    ],
  },
  platonic: {
    flows: [
      "Feed the friendship where it already flows:",
      "Put this ease toward the friendship on purpose:",
      "Lean into what already works between you:",
      "Keep feeding the part that's already easy:",
      "Use this natural flow while it's here:",
      "Build on the part of the friendship that already runs smooth:",
      "Keep this easy current going:",
      "Make the most of what already comes naturally:",
    ],
    catches: [
      "Assume a misread, not a slight:",
      "Check what they meant before you take it personally:",
      "Read it as static, not a statement:",
      "Ask before you assume the worst:",
      "Give the mixed signal room before you react to it:",
      "Treat the confusion as noise until you check it:",
      "Clarify the intent before you carry the sting:",
      "Take it as unclear, not unkind, until proven otherwise:",
    ],
  },
  ancestor: {
    flows: [
      "Carry this inherited current forward:",
      "Keep this inherited current running:",
      "Pass this current along on purpose:",
      "Let this old current keep moving through you both:",
      "Carry what still runs true between the generations:",
      "Keep this inherited thread alive on purpose:",
      "Let the old current keep doing its quiet work:",
      "Honor this current by keeping it moving:",
    ],
    catches: [
      "Bridge the era, not the person:",
      "Meet the gap in years, not a flaw in them:",
      "Cross the era before you judge the person in it:",
      "See the different time first, then the person in it:",
      "Translate across the years before you take offense:",
      "Bridge the decades between you before the disagreement:",
      "Read the era gap before you read it as a slight:",
      "Close the distance in years, not in affection:",
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // One pool per working frame, eight paraphrases of the same register per
  // nature (the pool size `pickOpener` hashes into; a shorter pool would
  // collapse onto its first entry, which `aspect-opener-variety.test.ts`
  // fails on). Peer voice for colleagues, authority-aware but role-neutral
  // for manager-report (Compare never knows which of the two people the
  // reader is), teaching voice for mentor-mentee. No intimacy or attraction
  // language in any of them.
  // ─────────────────────────────────────────────────────────────────────────
  colleagues: {
    flows: [
      "Put this ease to work on the actual job:",
      "Use this open channel on the work, not just the small talk:",
      "Lean on this when the workload spikes:",
      "Build the working rhythm on this part:",
      "Give this ease a real task instead of leaving it social:",
      "Route the harder work through this opening:",
      "Make this the part of the process you two keep:",
      "Spend this ease on the work that actually matters:",
    ],
    catches: [
      "Handle this before a deadline handles it for you:",
      "Sort this out in a calm week, not a crunch week:",
      "Name the working difference out loud instead of routing around it:",
      "Fix the handoff before the next one is due:",
      "Say what you need from each other before the clock says it:",
      "Agree how this gets decided before it has to be decided fast:",
      "Deal with this while it is still a process problem, not a people problem:",
      "Get this into the open before the pressure adds interest to it:",
    ],
  },
  "manager-report": {
    flows: [
      "Put this working ease on the record, not just in the room:",
      "Use this open line before the next review, not during it:",
      "Let this ease carry the harder conversations too:",
      "Give this strength a name in writing:",
      "Route the real decisions through this opening:",
      "Spend this trust on scope, not only on tone:",
      "Use this to hand over genuine ownership:",
      "Make this the default way work gets set and reported:",
    ],
    catches: [
      "Say what the standard is before you say what is missing:",
      "Set the expectation out loud before the deadline sets it:",
      "Separate the work from the standing before this gets raised:",
      "Name the constraint, not just the correction:",
      "Agree what good looks like before judging what happened:",
      "Ask what got in the way before assigning the fix:",
      "Put the disagreement on the work, never on the rank:",
      "Give the context first, then the change you want:",
    ],
  },
  "mentor-mentee": {
    flows: [
      "Turn this ease into something practiced, not just discussed:",
      "Use this open channel while there is something to learn on it:",
      "Let the teaching run down this line:",
      "Spend this ease on the harder lesson:",
      "Give this understanding a real piece of work to prove it on:",
      "Push a little further while this is still easy:",
      "Use this opening to hand over the reasoning, not just the answer:",
      "Make this where the next skill gets built:",
    ],
    catches: [
      "Ask what they have already tried before adding to it:",
      "Offer the reasoning, not the verdict:",
      "Let them get it wrong once before you step in:",
      "Check what they actually need before handing over experience:",
      "Slow the advice to the pace it can be used at:",
      "Say it as one option, not as the answer:",
      "Name the standard without standing over it:",
      "Make room for their attempt before you improve it:",
    ],
  },
};

/**
 * Body-pair TACTICS: the concrete, planet-specific move. Keyed by the unordered
 * pair (sorted, matching interpretations.ts). `catches` minimizes the clash;
 * `flows` nurtures the ease. Each is specific to the two domains named — it
 * could not be swapped onto a different pair.
 */
const PAIR_KEY = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join("-");
const ASPECT_ACTION: Record<string, { flows: string; catches: string }> = {
  [PAIR_KEY("sun", "moon")]: {
    catches: "when what they want and what they need split, ask what they need, not what they want, and don't make them justify the gap",
    flows:   "back their pride and their comfort at once; you rarely have to choose between the two here, so say you see both",
  },
  [PAIR_KEY("moon", "venus")]: {
    catches: "when they reach and then pull back, hold steady instead of chasing. Steadiness reads as safety; pursuit reads as pressure",
    flows:   "let the easy affection show; warmth comes cheap here, so spend it before it gets taken for granted",
  },
  [PAIR_KEY("mars", "venus")]: {
    catches: "when wanting and comfort pull opposite ways, name the pull in words instead of acting it out. Handle the friction out loud",
    flows:   "keep making the deliberate warm gesture that keeps this lit; the pull is easy, so it's the tending that's the work",
  },
  [PAIR_KEY("mars", "moon")]: {
    catches: "when heat comes up fast, give it a beat. The anger is sitting on a hurt, so answer the feeling, not the volume",
    flows:   "use the quick read you have on each other; act on the feeling early, before it has to be spelled out",
  },
  [PAIR_KEY("mercury", "moon")]: {
    catches: "when the words won't match the feeling, ask in writing or give them quiet. Pushing for it out loud makes them go clinical",
    flows:   "trade the plain naming of feelings you're both good at, and keep asking how it actually landed",
  },
  [PAIR_KEY("mercury", "mars")]: {
    catches: "when a conversation turns into a debate, slow the pace and say \"I want to get this right with you\" before you argue the point. The drive to win is drowning the drive to be understood",
    flows:   "put your quick, decisive back-and-forth to work; this is a pair that can talk a thing through and move on it fast",
  },
  [PAIR_KEY("mercury", "venus")]: {
    catches: "say what you appreciate before you critique. The correction only lands after the warmth does",
    flows:   "let the easy, affectionate way you talk carry the harder conversations too",
  },
  [PAIR_KEY("saturn", "moon")]: {
    catches: "they learned early that needing is unsafe, so offer before they ask. They won't ask; unprompted care softens the wall",
    flows:   "lean on the steadiness here; reliable presence is exactly the reassurance this bond runs on",
  },
  [PAIR_KEY("saturn", "venus")]: {
    catches: "they think warmth has to be earned, so give it when they've done nothing to earn it. The unprompted kind is what lands",
    flows:   "let commitment and warmth reinforce each other; consistency here reads as the deepest kind of care",
  },
  [PAIR_KEY("saturn", "mercury")]: {
    catches: "when caution meets quick talk, put the ask in writing with a clear why and a timeline they can plan around",
    flows:   "use how you can be both careful and clear together; this pair makes agreements that hold",
  },
  [PAIR_KEY("saturn", "sun")]: {
    catches: "make the expectation explicit and give it dignity. Respect, not management, is what they'll meet",
    flows:   "name the way you steady each other's ambitions; quiet backing like this is easy to leave unsaid",
  },
  [PAIR_KEY("sun", "mercury")]: {
    catches: "when identity and opinion collide, praise the person before you edit the idea",
    flows:   "keep thinking out loud together; your minds meet easily, so use it for the real decisions",
  },
  [PAIR_KEY("jupiter", "sun")]: {
    catches: "when one of you sizes it bigger, agree how far this actually goes before you both commit",
    flows:   "make a plan that stretches a little; shared optimism is a resource. Point it at something you both want",
  },
  [PAIR_KEY("jupiter", "moon")]: {
    catches: "when big-picture hope meets a tender mood, don't cheer them out of the feeling. Sit in it first, then widen the frame",
    flows:   "let their warmth and the optimism feed each other; this bond grows by dreaming out loud together",
  },
  [PAIR_KEY("moon", "moon")]: {
    catches: "when both moods spike at once, one of you name it first. Two raw feelings need a witness, not a match",
    flows:   "use the instinctive read you have on each other; check in early, because you feel the shift before it's said",
  },
  [PAIR_KEY("mercury", "mercury")]: {
    catches: "when you talk past each other, slow down and confirm you mean the same thing before you react to it",
    flows:   "keep the everyday back-and-forth going; this easy channel is the maintenance the whole bond depends on",
  },
  [PAIR_KEY("sun", "sun")]: {
    catches: "when two strong selves collide, make room for each to be seen without turning it into a contest",
    flows:   "celebrate what you each are, out loud; this natural recognition is easy to assume and leave unsaid",
  },
  [PAIR_KEY("venus", "venus")]: {
    catches: "when what you each treasure differs, name the value under the preference before you negotiate the thing",
    flows:   "keep giving warmth in the shared language you both read; it's easy here, so don't let it go quiet",
  },
  [PAIR_KEY("mars", "mars")]: {
    catches: "when two drives push at once, decide who leads this one before it becomes a fight over who's in charge",
    flows:   "aim the shared drive at a real project together; this is momentum you can build with, not just spend",
  },

  // ─────────────────────────────────────────────────────────────────────
  // ASPECT_ACTION Tier-1 coverage sprint: the remaining 36 body pairs, so
  // every real (from,to) the engine can produce resolves via Tier 1 instead
  // of falling to the single-body BODY_FRICTION_ACTION/BODY_FLOW_ACTION
  // fallback below. Voice matched to the 19 pairs above.
  // ─────────────────────────────────────────────────────────────────────
  [PAIR_KEY("jupiter", "jupiter")]: {
    catches: "when you both inflate the same plan, one of you play the check; two people sizing it bigger need someone counting the cost, not just the upside",
    flows:   "dream the big version out loud together; shared optimism this matched is rare fuel, so aim it at something you'll actually build",
  },
  [PAIR_KEY("jupiter", "mars")]: {
    catches: "when the drive and the big idea egg each other on, decide the actual size before you move; unchecked, this pair commits to more than it can carry",
    flows:   "point the eagerness at one real target; when energy and optimism line up like this, the risk is scattering it, not lacking it",
  },
  [PAIR_KEY("jupiter", "mercury")]: {
    catches: "when the talk runs ahead of what's real, pin one claim down to specifics before you build on it; enthusiasm inflates the details here",
    flows:   "think the big picture out loud together; you widen each other's frame, so use it to plan and not just to riff",
  },
  [PAIR_KEY("jupiter", "neptune")]: {
    catches: "when the vision gets rosy and vague at once, ask what it actually requires this week; this pair believes hardest right where it's least specific",
    flows:   "imagine the ideal version together, then name one true next step; the dream is a gift only if it touches ground",
  },
  [PAIR_KEY("jupiter", "pluto")]: {
    catches: "when the stakes and the ambition both climb, say plainly what you each want out of it; this drive runs deep, so keep the aim in the open instead of underground",
    flows:   "aim the shared conviction at something worth it; when belief runs this deep, use it deliberately instead of letting it just build",
  },
  [PAIR_KEY("jupiter", "saturn")]: {
    catches: "when one wants to widen and the other wants to secure, treat both as the plan, not opposing votes; growth with no floor and a floor with no growth both stall",
    flows:   "let the optimism and the caution balance each other; this is a pair that can dream big and still keep its footing, so plan for both",
  },
  [PAIR_KEY("jupiter", "uranus")]: {
    catches: "when the urge to leap hits, agree what stays fixed before you change everything; the excitement is real, but not all of it needs deciding today",
    flows:   "chase the new possibility together while it's live; this pair sees the opening early, so move on it before the moment cools",
  },
  [PAIR_KEY("jupiter", "venus")]: {
    catches: "when generosity tips into too much, check what's actually wanted before you give bigger; overdoing warmth can bury the plainer thing they needed",
    flows:   "be openly generous with each other; affection comes easy and large here, so spend it out loud before it gets assumed",
  },
  [PAIR_KEY("mars", "neptune")]: {
    catches: "when the drive goes murky and the effort scatters, name the actual want out loud; this pair loses steam when what it's chasing stays vague",
    flows:   "let the imagination steer the action for once; when drive and vision cooperate here, you can move on a feeling before it's fully spelled out",
  },
  [PAIR_KEY("mars", "pluto")]: {
    catches: "when the push turns into a power contest, step back from the win and name what you actually want; this pair can go all the way in, so keep the fight from becoming the point",
    flows:   "aim the combined force at a real obstacle together; intensity this focused moves things, so give it something outside the two of you to push against",
  },
  [PAIR_KEY("mars", "saturn")]: {
    catches: "when the drive keeps hitting the brake, get the plan explicit instead of pushing harder; this pair grinds when heat meets caution, so make the pace something you both agreed to",
    flows:   "use the way you can push and pace at once; drive with discipline behind it is how this pair actually finishes things",
  },
  [PAIR_KEY("mars", "sun")]: {
    catches: "when the drive reads as a challenge to who they are, back the person before you contest the move; the heat here is really about being taken seriously",
    flows:   "let the shared energy make each of you bolder; you spur each other on, so put that toward something instead of at each other",
  },
  [PAIR_KEY("mars", "uranus")]: {
    catches: "when the impulse fires fast, put one beat between the urge and the act; this pair moves before it thinks, and the spark is worth keeping but not obeying blindly",
    flows:   "let the fast, inventive energy loose on a real problem; this pair improvises well under pressure, so give it something live to solve",
  },
  [PAIR_KEY("mercury", "neptune")]: {
    catches: "when the words go foggy or you fill the gap with a story, ask them to say it plainly again; most of the trouble here is imagined, not said",
    flows:   "use the way you can talk in half-said things; you catch each other's drift easily, so trust the read but still check it landed",
  },
  [PAIR_KEY("mercury", "pluto")]: {
    catches: "when a talk turns into an interrogation, drop the pressure and ask instead of digging; this pair goes deep, so make it safe to say the real thing rather than extract it",
    flows:   "use how you can go to the hard subject without flinching; few pairs can talk about the buried stuff this directly, so do it on purpose",
  },
  [PAIR_KEY("mercury", "uranus")]: {
    catches: "when the thinking jumps track mid-conversation, land one point before you leap to the next; the pair is fast and original but loses each other in the jumps",
    flows:   "let the ideas spark off each other; this is quick, unexpected thinking that gets somewhere, so chase the tangent while it's alive",
  },
  [PAIR_KEY("moon", "neptune")]: {
    catches: "when the mood turns hazy and you can't tell whose feeling it is, name your own first; this pair absorbs each other, so separate the weather before you answer it",
    flows:   "lean on the wordless read you have on each other; you feel each other's states early here, so honor it out loud instead of just sensing it",
  },
  [PAIR_KEY("moon", "pluto")]: {
    catches: "when the feeling comes up huge, let it be big without making it a threat; this pair feels at full volume, so meet the intensity plainly instead of managing it down",
    flows:   "trust each other with the feelings that go deep; the capacity to sit in the heavy stuff together is rare, so don't keep it shallow",
  },
  [PAIR_KEY("moon", "uranus")]: {
    catches: "when the mood shifts without warning, give room instead of pinning down the cause; this pair needs comfort that doesn't cage, so offer closeness that leaves an exit",
    flows:   "let the emotional honesty be as unconventional as it wants; you give each other space to feel oddly, so protect that rather than smoothing it out",
  },
  [PAIR_KEY("neptune", "neptune")]: {
    catches: "when you both drift into the ideal and lose the plan, one of you name the concrete; two dreamers need a fact between them, not another vision",
    flows:   "make room for the shared imaginative thread; you dream in the same key here, so build something with it instead of just floating in it",
  },
  [PAIR_KEY("neptune", "pluto")]: {
    catches: "when the depth gets murky and hard to name, go slow and stay specific; this runs deep and quiet, so don't let the important thing dissolve before it's said",
    flows:   "honor the deep, quiet current you share; this bond works underground, so trust it while still naming what's actually happening",
  },
  [PAIR_KEY("neptune", "saturn")]: {
    catches: "when the dream meets the hard limit, build the small real version instead of grieving the whole; this pair can ground a vision, but only if it stops mourning the ideal one",
    flows:   "let the structure give the dream a shape; realism and imagination cooperate here, so turn the ideal into one thing you can actually hold",
  },
  [PAIR_KEY("neptune", "sun")]: {
    catches: "when you're loving the idea of them more than the person, look at who's actually there; this pair projects easily, so meet the real one, not the imagined",
    flows:   "let yourselves see the best in each other and say it; there's a gentle, inspired quality here, so name what you admire without inflating it",
  },
  [PAIR_KEY("neptune", "uranus")]: {
    catches: "when the vision keeps shifting shape, agree on one thing that stays true; this pair reinvents the ideal constantly, so anchor something before you remake it again",
    flows:   "let the unconventional imagination run; you see past the usual together here, so use it to picture something genuinely new",
  },
  [PAIR_KEY("neptune", "venus")]: {
    catches: "when the affection goes dreamy and unreal, ask for the plain version of what they feel; this pair idealizes love, so keep the warmth attached to the actual person",
    flows:   "let the tender, imaginative warmth show; affection has a soft, generous quality here, so give it freely and keep it honest",
  },
  [PAIR_KEY("pluto", "pluto")]: {
    catches: "when you both grip the same thing hard, one of you loosen first; two people this intense need someone to let go, not two who won't",
    flows:   "use the shared capacity to go all the way in; you don't flinch from the deep stuff together, so take something real all the way down",
  },
  [PAIR_KEY("pluto", "saturn")]: {
    catches: "when the control tightens on both sides, name the fear under the grip; this pair holds hard, so say what you're afraid to lose before it becomes a standoff",
    flows:   "build something that lasts with the seriousness you share; this pair commits deep and holds, so put that toward a thing worth the endurance",
  },
  [PAIR_KEY("pluto", "sun")]: {
    catches: "when the intensity aims at who they are, back off the remake and let them be; this pair can want to transform each other, so admire the person instead of managing them",
    flows:   "let each other's depth strengthen who you are; there's real power to draw on here, so use it to back each other rather than overwhelm",
  },
  [PAIR_KEY("pluto", "uranus")]: {
    catches: "when the urge to blow it up and the urge to go deep collide, decide what's actually being changed; this pair can mistake destruction for depth, so aim the upheaval at something specific",
    flows:   "use the appetite for real change you both have; this pair can go deep and break the old pattern at once, so point it at the thing that needs to move",
  },
  [PAIR_KEY("pluto", "venus")]: {
    catches: "when love goes to obsession or a test, name the fear instead of tightening the hold; affection runs deep here, so let it be intense without making it a grip",
    flows:   "let yourselves love with the full depth this has; warmth here goes all the way down, so trust it instead of guarding it",
  },
  [PAIR_KEY("saturn", "saturn")]: {
    catches: "when you both wait for the other to give first, one of you go first anyway; two people who think warmth is earned can stand there forever",
    flows:   "rely on the steadiness you both bring; two careful people make agreements that actually hold, so build the long thing together",
  },
  [PAIR_KEY("saturn", "uranus")]: {
    catches: "when one holds the line and the other breaks it, put the fixed and the free in the same plan; this pair fights structure against freedom, so decide what each of those gets",
    flows:   "let the discipline and the invention balance each other; you can steady a new idea here, so keep what works while you change what doesn't",
  },
  [PAIR_KEY("sun", "uranus")]: {
    catches: "when being seen collides with needing to be free, give the recognition and the room at once; this pair reads control into attention, so admire them without pinning them",
    flows:   "celebrate what's original in each of you; there's an easy respect for difference here, so name the thing that makes them un-ordinary",
  },
  [PAIR_KEY("sun", "venus")]: {
    catches: "when pride and affection tangle, lead with what you appreciate before anything else; this pair needs to feel liked, not just handled, so let the warmth come first",
    flows:   "say plainly what you admire and enjoy in each other; there's an easy, flattering warmth here, so spend it out loud before it's assumed",
  },
  [PAIR_KEY("uranus", "uranus")]: {
    catches: "when you both bolt at the same restriction, agree on the one thing you'll keep steady; two people who need this much room can drift right apart",
    flows:   "protect the freedom you give each other; you let one another be genuinely different here, so guard that as the thing that makes it work",
  },
  [PAIR_KEY("uranus", "venus")]: {
    catches: "when affection needs room and consistency at once, ask which one they need today; this pair loves in an unusual key, so give the warmth without demanding it look normal",
    flows:   "let the affection be as unconventional as it is; there's an electric, easy warmth here, so enjoy the spark without trying to make it settle",
  },

  // FOUNDER-REVIEW: North Node pair tactics (True Node × each body, plus Node–Node).
  [PAIR_KEY("north_node", "sun")]: {
    catches: "when one of you treats the other as a project, stop and ask who they already are; the contact is significance, not a rewrite of their self",
    flows:   "name the stretch you see in them and back the person they are today; becoming is easier when it is not a performance for you",
  },
  [PAIR_KEY("moon", "north_node")]: {
    catches: "when comfort and the next chapter fight, ask which one this hour needs; do not make the soft landing the enemy of the assignment",
    flows:   "use the feeling you already have on each other to name the next honest step; care can point at growth without turning into a pep talk",
  },
  [PAIR_KEY("mercury", "north_node")]: {
    catches: "when advice about their path lands as a lecture, play it back in their words first; the map is not yours to assign",
    flows:   "keep talking about the next stretch in plain language; this pair can name the step without making it a speech",
  },
  [PAIR_KEY("north_node", "venus")]: {
    catches: "when what you value and where they are headed chafe, name the value under the preference; do not convert their path into your taste",
    flows:   "say specifically what you value in who they are becoming; warmth aimed at the stretch is the kindness this pair already has",
  },
  [PAIR_KEY("mars", "north_node")]: {
    catches: "when the push arrives before they asked for it, decide who is leading this step; heat is not the same as the assignment",
    flows:   "aim the shared drive at one real next step; this is momentum for the path, not a contest over who is more ready",
  },
  [PAIR_KEY("jupiter", "north_node")]: {
    catches: "when the bigger version crowds out the actual stretch, agree how far this goes; more is not always the assignment",
    flows:   "spend the extra room on one growth that has a shape; optimism helps the path when it has a container",
  },
  [PAIR_KEY("north_node", "saturn")]: {
    catches: "when the rule and the stretch lock, say what must hold and what is allowed to change; a wall is not automatically wisdom",
    flows:   "let the container hold the next chapter; steady backing is the kindness, not a looser plan",
  },
  [PAIR_KEY("north_node", "uranus")]: {
    catches: "when the exit and the assignment get confused, ask which change is the path and which is just leaving; difference is not the whole story",
    flows:   "protect the unconventional step that actually serves the stretch; room to be different can be the growth, if you name it",
  },
  [PAIR_KEY("neptune", "north_node")]: {
    catches: "when the vision goes foggy, ask for the simple next step; an ideal is not a substitute for the assignment",
    flows:   "keep the shared picture attached to a real day; imagining together can open the path if it stays specific",
  },
  [PAIR_KEY("north_node", "pluto")]: {
    catches: "when intensity turns the path into a test, name the fear instead of raising the bar; becoming is not a power struggle",
    flows:   "use the capacity to finish a real change; go all the way in on one stretch, then let it end",
  },
  [PAIR_KEY("north_node", "north_node")]: {
    catches: "when two growth paths compete, pick whose stretch this week is; two assignments at once will starve both",
    flows:   "name the direction each of you is growing and protect both; two paths can sit side by side if neither has to win",
  },
};

/**
 *
 * `ASPECT_ACTION` is shared by every frame, and a large part of it is written
 * in the personal register: Venus and Moon pairs talk about affection,
 * warmth, and comfort. That copy is correct for partners, siblings, or a
 * parent, and wrong for a colleague, a report, or a mentee, so a working
 * frame reading it verbatim would put attraction and intimacy language into a
 * working reading (which is exactly what
 * `packages/astro/test/professional-frames.test.ts` fails the build on).
 *
 * WHICH CELLS ARE OVERRIDDEN, and why it is not a judgment call: exactly the
 * cells whose shared copy trips the professional register gate (the forbidden
 * term list in that test). Everything else keeps the shared tactic, because a
 * shared tactic that is already register-neutral (`mars-saturn`,
 * `jupiter-mercury`, `mercury-saturn`, and 30 more) is BETTER than a
 * paraphrase of it: same claim, one source, nothing to drift. The test scans
 * all 55 body pairs in both harmony directions, so a future edit that puts
 * personal-register language into a shared cell fails the build until that
 * cell is either reworded or added here.
 *
 * SAME ASTROLOGY, DIFFERENT REGISTER. No cell here changes which bodies are
 * involved, the aspect, the orb, or whether it reads as flow or friction. The
 * shift is only in what the body means at work: Venus is what someone rates
 * as good work and how they want it credited, and the Moon is morale and how
 * a person needs to be handled, rather than affection and comfort.
 * Partial by half: a pair whose `catches` is register-neutral but whose
 * `flows` is not overrides only `flows`.
 */
const WORK_ASPECT_ACTION: Record<string, Partial<{ flows: string; catches: string }>> = {
  [PAIR_KEY("moon", "sun")]: {
    flows:   "back their standing and their footing at once; you rarely have to trade one for the other here, so say out loud that you see both",
  },
  [PAIR_KEY("moon", "venus")]: {
    catches: "when they raise something and then drop it, do not press it in the moment; ask once when it is quieter, because pressure makes them take the ask back",
    flows:   "say what you rate in their work out loud; goodwill costs you nothing here, so spend it where the room can hear it",
  },
  [PAIR_KEY("mars", "venus")]: {
    catches: "when the push to get it shipped runs over what the other one counts as good work, say the tradeoff out loud instead of acting on it; the friction is pace against standards",
    flows:   "keep making the small deliberate courtesy that keeps this running; the drive lines up easily here, so the upkeep is the actual work",
  },
  [PAIR_KEY("mercury", "venus")]: {
    catches: "say what is working before you say what is not; the correction only gets heard after the credit does",
    flows:   "let the easy way you two talk carry the awkward conversations too, not only the routine ones",
  },
  [PAIR_KEY("moon", "saturn")]: {
    flows:   "lean on the steadiness here; turning up predictably is the reassurance this working relationship actually runs on",
  },
  [PAIR_KEY("saturn", "venus")]: {
    catches: "they think credit has to be earned twice, so give it once when nothing has been earned; the unprompted version is the one that lands",
    flows:   "let reliability and recognition reinforce each other; being consistent reads here as the most serious kind of respect",
  },
  [PAIR_KEY("mercury", "mercury")]: {
    flows:   "keep the everyday back-and-forth going; this easy channel is the upkeep the whole working relationship depends on",
  },
  [PAIR_KEY("neptune", "pluto")]: {
    flows:   "trust the deep, quiet understanding you two have; it works underground here, so keep saying out loud what is actually happening",
  },
  [PAIR_KEY("jupiter", "moon")]: {
    catches: "when the big plan lands in a rough week, do not talk them past the objection; take it seriously first, then widen the frame",
    flows:   "let the optimism and the steadier read of the room feed each other; this pair plans better out loud than either of you does alone",
  },
  [PAIR_KEY("venus", "venus")]: {
    flows:   "keep naming what you each rate in the other's work; you already speak the same language about it, so do not let it go quiet",
  },
  [PAIR_KEY("jupiter", "venus")]: {
    catches: "when the generosity tips into too much, check what was actually asked for before you give bigger; overdoing it buries the plainer thing they needed",
    flows:   "be openly generous with credit and with time; it comes easily and at scale here, so spend it on the record before it gets assumed",
  },
  [PAIR_KEY("moon", "uranus")]: {
    catches: "when the mood shifts without warning, give room instead of hunting for the cause; this pair needs steadiness that does not hover, so stay available and stop short of managing them",
  },
  [PAIR_KEY("neptune", "sun")]: {
    catches: "when you are backing the idea of them rather than the work in front of you, look at what is actually there; this pair projects easily, so review the real thing",
  },
  [PAIR_KEY("neptune", "venus")]: {
    catches: "when the praise goes vague and glowing, ask for the specific version; this pair compliments in general terms, so keep the credit attached to a real piece of work",
    flows:   "let the appreciation be generous and keep it specific; the good will is real here, so make sure it names something they actually did",
  },
  [PAIR_KEY("pluto", "venus")]: {
    catches: "when approval turns into a test, name the concern instead of quietly raising the bar; the regard runs deep here, so let it stay serious without becoming a hold",
    flows:   "let the regard you have for each other's work carry real weight; it goes all the way down here, so put it on the record instead of keeping it private",
  },
  [PAIR_KEY("saturn", "saturn")]: {
    catches: "when you both wait for the other to move first, one of you go anyway; two people who think trust has to be earned can stand there forever",
  },
  [PAIR_KEY("sun", "venus")]: {
    catches: "when pride and appreciation tangle, lead with what you rate in their work before anything else; this pair needs to be valued, not just managed",
    flows:   "say plainly what you rate in each other's work; the regard is easy here, so put it in front of other people before it gets assumed",
  },
  [PAIR_KEY("uranus", "venus")]: {
    catches: "when they need room and consistency at once, ask which one this week actually needs; this pair counts things as good in an unusual key, so give the credit without requiring it look conventional",
    flows:   "let the working style stay as unconventional as it is; the regard here is easy and a little electric, so use it instead of standardizing it",
  },
  [PAIR_KEY("moon", "north_node")]: {
    catches: "when the mood and the next stretch fight, ask which one this hour of work needs; do not make the steadier read the enemy of the assignment",
    flows:   "use the instinctive read you already have to name the next honest step; a check-in can point at growth without becoming a pep talk",
  },
  [PAIR_KEY("north_node", "venus")]: {
    catches: "when what you rate and where they are headed chafe, name the standard under the preference; do not convert their path into your taste",
    flows:   "say specifically what you rate in who they are becoming; credit aimed at the stretch is the kindness this pair already has",
  },
};

/**
 * Fallback tactics when a specific pair isn't authored — keyed to a SINGLE
 * body's domain, so the line is still specific to that real planet (never
 * "communicate better"). `aspectActionLine` picks the more relationship-
 * relevant of the two bodies as the lead.
 *
 * Unreachable for a real engine aspect: `ASPECT_ACTION` covers every pair of
 * bodies the natal pass places (ten planets plus True Node), and
 * `professional-frames.test.ts` asserts a non-empty pair tactic for every one
 * of them, so the working frames never fall through to these personal-register
 * lines (`venus` and `mercury` here would trip the gate).
 */
const BODY_FRICTION_ACTION: Record<string, string> = {
  sun:     "acknowledge the person before you take issue with the choice. Their need to be recognized is what's really bristling",
  moon:    "treat the flare as a feeling that arrived early, not a verdict; name what's underneath before you answer the words",
  mercury: "slow the exchange down and play it back in their words before you respond. Most of this is a misread, not a disagreement",
  venus:   "protect what each of you treasures out loud; it eases when neither feels their values got overruled",
  mars:    "give the drive somewhere to go. Decide who leads this one before it turns into a contest over who's in charge",
  jupiter: "check the scale before you commit. One of you is sizing this bigger, so agree how far it actually goes",
  saturn:  "make the limit explicit and the reason visible; the wall only becomes a fight when it feels arbitrary",
  uranus:  "leave room for the unexpected move instead of pinning it down. The tension is a need for freedom, not rejection",
  neptune: "get specific where things blur. Confirm what was actually meant before you fill the gap with a story",
  pluto:   "don't try to manage the intensity for them; name it plainly and let it move through without a power struggle",
};
const BODY_FLOW_ACTION: Record<string, string> = {
  sun:     "reflect back what you admire in who they are; this natural recognition is easy to leave unsaid",
  moon:    "lean on the instinctive read you have on each other's moods, and check in early, before either of you has to ask",
  mercury: "keep talking about the small stuff; this easy back-and-forth is the maintenance the bond runs on",
  venus:   "say the affection out loud even when it feels obvious. Warmth this easy is exactly what gets taken for granted",
  mars:    "point the shared drive at something real together; this is momentum to build on, not just enjoy",
  jupiter: "make plans that stretch a little; shared optimism is a resource, so spend it on something you both want",
  saturn:  "name the reliability you count on in each other; steady support this quiet rarely gets thanked for",
  uranus:  "protect the freedom you give each other; this easy room to be different is worth guarding",
  neptune: "make space for the shared imaginative thread; it deepens when you honor it out loud",
  pluto:   "trust each other with the deep stuff; the capacity to go all the way in is rare, so use it deliberately",
};

/** Global personal-relevance order, for choosing a lead body when neither is in the type priority. */
const PERSONAL_RANK = ["moon", "venus", "mars", "mercury", "sun", "saturn", "jupiter", "pluto", "neptune", "uranus", "north_node", "chiron"];

/** The more relationship-relevant of the aspect's two bodies (drives the fallback tactic). */
function leadBody(a: { from: string; to: string }, relType: RelationType): string {
  const pri = RELATION_BODY_PRIORITY[relType];
  const score = (b: string) => {
    const i = pri.indexOf(b.toLowerCase());
    return i === -1 ? 100 + PERSONAL_RANK.indexOf(b.toLowerCase()) : i;
  };
  return score(a.from) <= score(a.to) ? a.from : a.to;
}

export type AspectGroup = "flows" | "catches" | "adjusts";

export const ADJUST_BADGE = "~ adjusts";
export const ADJUST_TACTIC_PREFIX = "Adjust it:";
export const ADJUST_OPENER = "This one asks for a different angle:";
export const ADJUST_TACTIC = "Name the gap, then change the angle of approach";

export function aspectGroup(a: { type?: string; harmony: number }): AspectGroup {
  if (isQuincunxType(a.type)) return "adjusts";
  return a.harmony >= 0 ? "flows" : "catches";
}

/**
 * Split the actionable line into the shared register opener (same for every
 * flows row / every catches row of a relation type) and the body-pair tactic
 * tail (row-specific). Same strings `aspectActionLine` concatenates — never
 * reworded. Used by FlowsAndCatchesSection so openers render once per group.
 */
export function aspectActionParts(
  a: { from: string; to: string; harmony: number; type?: string },
  relType: RelationType
): { flows: boolean; adjusts: boolean; group: AspectGroup; opener: string; tactic: string } {
  const group = aspectGroup(a);
  const adjusts = group === "adjusts";
  const flows = group === "flows";
  if (adjusts) {
    return { flows: false, adjusts: true, group, opener: ADJUST_OPENER, tactic: ADJUST_TACTIC };
  }
  const half = flows ? "flows" : "catches";
  const key = PAIR_KEY(a.from, a.to);
  const pair = ASPECT_ACTION[key];
  // Working frames read the same pair, in the working register, wherever the
  // shared tactic is written in the personal one (see WORK_ASPECT_ACTION).
  const workTactic = isProfessionalRelation(relType) ? WORK_ASPECT_ACTION[key]?.[half] : undefined;
  const involvesChiron =
    a.from.toLowerCase() === "chiron" || a.to.toLowerCase() === "chiron";
  // Chiron pair copy is a later batch. Do not invent a planet-keyed tactic
  // (ENGINEERING.md §12) and do not leak personal-register fallbacks.
  const tactic = workTactic
    ?? (pair && pair[half])
    ?? (involvesChiron
      ? ""
      : (flows ? BODY_FLOW_ACTION[leadBody(a, relType).toLowerCase()] : BODY_FRICTION_ACTION[leadBody(a, relType).toLowerCase()]))
    ?? "";
  const pool = RELATION_ACTION_REGISTER[relType][flows ? "flows" : "catches"];
  const opener = pickOpener(pool, a.from, a.to);
  return { flows, adjusts: false, group, opener, tactic };
}

/**
 * The actionable "what to do" line for one REAL computed aspect: a concrete way
 * to MINIMIZE the clash (friction) or NURTURE the ease (flow), grounded in the
 * actual bodies and framed for the relationship type. Never fabricates — reads
 * only `from`/`to`/`harmony` off the engine's aspect.
 */
export function aspectActionLine(a: { from: string; to: string; harmony: number; type?: string }, relType: RelationType): string {
  const { opener, tactic } = aspectActionParts(a, relType);
  return tactic ? `${opener} ${tactic}.` : opener;
}

/**
 * Derives a human-readable strength from an already-computed/stored orb —
 * never recomputes the orb. Thresholds: under 1.0 deg = strong,
 * 1.0 to 2.5 deg = clear, over 2.5 deg = subtle.
 */
export type OrbStrength = "strong" | "clear" | "subtle";

export function orbStrength(orb: number): OrbStrength {
  if (orb < 1.0) return "strong";
  if (orb <= 2.5) return "clear";
  return "subtle";
}

/**
 *
 * Pair-keyed aspect-summary lens. `relationshipAspectFraming` used to append
 * `RELATION_ASPECT_FRAME[relType]` (one flows string and one catches string
 * per relationship type) to every line. Two distinct catching aspects then
 * rendered byte-identical bodies: the live DANIEL & SARAH platonic share
 * showed Mercury square Mars (0.9°) and Uranus square Jupiter (1.0°) both
 * ending "is where you talk past each other; slow down and confirm you mean
 * the same thing." Same class of bug as the earlier ASPECT_ACTION
 * leadBody collapse: the lookup ignored the actual unordered pair. Keyed by
 * PAIR_KEY, like ASPECT_ACTION. RELATION_ASPECT_FRAME remains a last-resort
 * fallback if a future BodyName has no pair entry.
 *
 * Grammar: each value is a predicate that continues
 * "{NameA}'s {Body} {aspect} {NameB}'s {Body} (orb°) {lens}".
 * Family-safe: no attraction/desire/romance language (this list renders for
 * every RelationType, including parent-child).
 */
const ASPECT_SUMMARY_FRAME: Record<string, { flows: string; catches: string }> = {
  [PAIR_KEY("sun", "moon")]: {
    catches: "is where being seen and feeling safe pull different ways, so one of you performs while the other hides.",
    flows: "is where pride and comfort point the same way, and you rarely have to choose between them.",
  },
  [PAIR_KEY("moon", "venus")]: {
    catches: "is where reaching for warmth and needing safety take turns, so closeness arrives and then pulls back.",
    flows: "is where affection and comfort are cheap to give, and the bond runs on that easy warmth.",
  },
  [PAIR_KEY("mars", "venus")]: {
    catches: "is where wanting and comfort pull opposite ways, so the heat shows up as friction instead of ease.",
    flows: "is where wanting and warmth point the same way, and a small deliberate gesture keeps it lit.",
  },
  [PAIR_KEY("mars", "moon")]: {
    catches: "is where heat sits on a hurt, so the volume arrives before the feeling has a name.",
    flows: "is where you read each other fast, and acting on the feeling early saves the speech later.",
  },
  [PAIR_KEY("mercury", "moon")]: {
    catches: "is where the words will not match the feeling, and pushing for it out loud makes them go clinical.",
    flows: "is where naming the feeling comes easily, and asking how it landed keeps the channel honest.",
  },
  [PAIR_KEY("mercury", "mars")]: {
    catches: "is where talk turns into a contest, and being right starts to matter more than being understood.",
    flows: "is where you can think out loud and move on it in the same breath, without the talk stalling the act.",
  },
  [PAIR_KEY("mercury", "venus")]: {
    catches: "is where the critique arrives before the warmth, so the correction lands as a chill instead of help.",
    flows: "is where the easy, affectionate way you talk can carry the harder conversations too.",
  },
  [PAIR_KEY("saturn", "moon")]: {
    catches: "is where needing learned to feel unsafe, so they will not ask, and unprompted care is what softens the wall.",
    flows: "is where reliable presence is the reassurance the bond actually runs on.",
  },
  [PAIR_KEY("saturn", "venus")]: {
    catches: "is where warmth feels like it has to be earned, so the unprompted kind is the only kind that lands.",
    flows: "is where commitment and warmth reinforce each other, and consistency reads as care.",
  },
  [PAIR_KEY("saturn", "mercury")]: {
    catches: "is where caution meets quick talk, so the ask needs a why and a timeline they can plan around.",
    flows: "is where you can be both careful and clear, and the agreements you make actually hold.",
  },
  [PAIR_KEY("saturn", "sun")]: {
    catches: "is where an unspoken expectation reads as management, and dignity is what they will actually meet.",
    flows: "is where you steady each other's ambitions, a quiet backing that is easy to leave unsaid.",
  },
  [PAIR_KEY("sun", "mercury")]: {
    catches: "is where identity and opinion collide, and editing the idea lands as editing the person.",
    flows: "is where your minds meet easily, so thinking out loud together is how the real decisions get made.",
  },
  [PAIR_KEY("jupiter", "sun")]: {
    catches: "is where one of you sizes it bigger, and the real work is agreeing how far this actually goes.",
    flows: "is where shared optimism is a resource, and pointing it at something you both want makes it count.",
  },
  [PAIR_KEY("jupiter", "moon")]: {
    catches: "is where big-picture hope meets a tender mood, and cheering them out of the feeling misses it.",
    flows: "is where warmth and optimism feed each other, and the bond grows by dreaming out loud together.",
  },
  [PAIR_KEY("moon", "moon")]: {
    catches: "is where two raw feelings spike at once, and they need a witness more than they need a match.",
    flows: "is where you feel the shift before it is said, so a check-in early is the whole maintenance.",
  },
  [PAIR_KEY("mercury", "mercury")]: {
    catches: "is where you talk past each other until someone slows down and confirms you mean the same thing.",
    flows: "is where the everyday back-and-forth is the maintenance the whole bond depends on.",
  },
  [PAIR_KEY("sun", "sun")]: {
    catches: "is where two strong selves collide, and being seen turns into a contest instead of a welcome.",
    flows: "is where you recognize what the other is, and saying it out loud stops it from being assumed.",
  },
  [PAIR_KEY("venus", "venus")]: {
    catches: "is where what you each treasure differs, so name the value under the preference before you negotiate the thing.",
    flows: "is where you already speak a shared language of warmth, and it goes quiet if you stop spending it.",
  },
  [PAIR_KEY("mars", "mars")]: {
    catches: "is where two drives push at once, and it becomes a fight over who leads unless you decide first.",
    flows: "is where shared momentum wants a real project, not just a spark to spend.",
  },
  [PAIR_KEY("jupiter", "jupiter")]: {
    catches: "is where you both inflate the same plan, and two people sizing it bigger need someone counting the cost.",
    flows: "is where matched optimism is rare fuel, so aim it at something you will actually build.",
  },
  [PAIR_KEY("jupiter", "mars")]: {
    catches: "is where drive and the big idea egg each other on, and the pair commits to more than it can carry.",
    flows: "is where energy and optimism line up, so the risk is scattering it, not lacking it.",
  },
  [PAIR_KEY("jupiter", "mercury")]: {
    catches: "is where the talk runs ahead of what is real, and enthusiasm inflates the details before anyone pins them.",
    flows: "is where you widen each other's frame, so use it to plan and not just to riff.",
  },
  [PAIR_KEY("jupiter", "neptune")]: {
    catches: "is where the vision gets rosy and vague at once, and you believe hardest right where it is least specific.",
    flows: "is where the ideal version is a gift, but only if one true next step touches ground.",
  },
  [PAIR_KEY("jupiter", "pluto")]: {
    catches: "is where stakes and ambition both climb, so keep the aim in the open instead of underground.",
    flows: "is where shared conviction runs deep, and it counts when you aim it on purpose.",
  },
  [PAIR_KEY("jupiter", "saturn")]: {
    catches: "is where one wants to widen and the other wants to secure, and treating them as opposing votes stalls both.",
    flows: "is where optimism and caution can balance, so you can dream big and still keep your footing.",
  },
  [PAIR_KEY("jupiter", "uranus")]: {
    catches: "is where the urge to leap outruns the plan, and excitement is not the same as agreeing what stays fixed.",
    flows: "is where you spot a new opening early and can actually move on it before the moment cools.",
  },
  [PAIR_KEY("jupiter", "venus")]: {
    catches: "is where generosity tips into too much, and overdoing warmth buries the plainer thing they needed.",
    flows: "is where affection comes easy and large, so spend it out loud before it gets assumed.",
  },
  [PAIR_KEY("mars", "neptune")]: {
    catches: "is where the drive goes murky and the effort scatters, because what it is chasing stayed unnamed.",
    flows: "is where imagination can steer the action, and you move on a feeling before it is fully spelled out.",
  },
  [PAIR_KEY("mars", "pluto")]: {
    catches: "is where the push turns into a power contest, and the fight becomes the point instead of the want.",
    flows: "is where combined force wants a real obstacle outside the two of you to push against.",
  },
  [PAIR_KEY("mars", "saturn")]: {
    catches: "is where the drive keeps hitting the brake, and pushing harder just grinds; the pace needs to be agreed.",
    flows: "is where you can push and pace at once, which is how this pair actually finishes things.",
  },
  [PAIR_KEY("mars", "sun")]: {
    catches: "is where the drive reads as a challenge to who they are, and the heat is really about being taken seriously.",
    flows: "is where you spur each other on, so put that toward something instead of at each other.",
  },
  [PAIR_KEY("mars", "uranus")]: {
    catches: "is where the impulse fires before the thought, and the spark is worth keeping but not obeying blindly.",
    flows: "is where fast, inventive energy improvises well under pressure, if you give it something live to solve.",
  },
  [PAIR_KEY("mercury", "neptune")]: {
    catches: "is where the words go foggy and you fill the gap with a story; most of the trouble here is imagined, not said.",
    flows: "is where you catch each other's drift in half-said things, so trust the read but still check it landed.",
  },
  [PAIR_KEY("mercury", "pluto")]: {
    catches: "is where a talk turns into an interrogation, and digging extracts less than making it safe to say the real thing.",
    flows: "is where you can go to the hard subject without flinching, which few pairs can, so do it on purpose.",
  },
  [PAIR_KEY("mercury", "uranus")]: {
    catches: "is where the thinking jumps track mid-conversation, and the pair loses each other in the leaps.",
    flows: "is where quick, unexpected thinking gets somewhere, so chase the tangent while it is alive.",
  },
  [PAIR_KEY("moon", "neptune")]: {
    catches: "is where the mood turns hazy and you cannot tell whose feeling it is, so name your own first.",
    flows: "is where you feel each other's states early, and it deepens when you honor that out loud instead of just sensing it.",
  },
  [PAIR_KEY("moon", "pluto")]: {
    catches: "is where the feeling comes up huge, and managing it down reads as a threat; meet the intensity plainly.",
    flows: "is where you can sit in the heavy stuff together, which is rare, so do not keep it shallow.",
  },
  [PAIR_KEY("moon", "uranus")]: {
    catches: "is where the mood shifts without warning, and pinning down the cause cages the comfort they actually need.",
    flows: "is where you give each other room to feel oddly, and protecting that matters more than smoothing it out.",
  },
  [PAIR_KEY("neptune", "neptune")]: {
    catches: "is where you both drift into the ideal and lose the plan, so two dreamers need a fact between them.",
    flows: "is where you dream in the same key, so build something with it instead of just floating in it.",
  },
  [PAIR_KEY("neptune", "pluto")]: {
    catches: "is where the depth gets murky and hard to name, so go slow and stay specific or the important thing dissolves.",
    flows: "is where the bond works underground; trust it, and still name what is actually happening.",
  },
  [PAIR_KEY("neptune", "saturn")]: {
    catches: "is where the dream meets the hard limit, and grieving the ideal blocks the small real version you could build.",
    flows: "is where structure can give the dream a shape, so turn the ideal into one thing you can actually hold.",
  },
  [PAIR_KEY("neptune", "sun")]: {
    catches: "is where you are loving the idea of them more than the person, so look at who is actually there.",
    flows: "is where you see the best in each other; name what you admire without inflating it into someone they are not.",
  },
  [PAIR_KEY("neptune", "uranus")]: {
    catches: "is where the vision keeps shifting shape, so agree on one thing that stays true before you remake it again.",
    flows: "is where you see past the usual together, and can picture something genuinely new.",
  },
  [PAIR_KEY("neptune", "venus")]: {
    catches: "is where the affection goes dreamy and unreal, so keep the warmth attached to the actual person.",
    flows: "is where tender, imaginative warmth wants to be given freely, and still kept honest.",
  },
  [PAIR_KEY("pluto", "pluto")]: {
    catches: "is where you both grip the same thing hard, and two people this intense need someone to loosen first.",
    flows: "is where you do not flinch from the deep stuff together, so take something real all the way down.",
  },
  [PAIR_KEY("pluto", "saturn")]: {
    catches: "is where control tightens on both sides; name the fear under the grip before it becomes a standoff.",
    flows: "is where you can commit deep and hold, so put that toward a thing worth the endurance.",
  },
  [PAIR_KEY("pluto", "sun")]: {
    catches: "is where the intensity aims at who they are, and the urge to remake them crowds out admiring them.",
    flows: "is where each other's depth can strengthen who you are, if you back rather than overwhelm.",
  },
  [PAIR_KEY("pluto", "uranus")]: {
    catches: "is where the urge to blow it up and the urge to go deep collide, and destruction gets mistaken for depth.",
    flows: "is where you can go deep and break an old pattern at once, if you point it at the thing that needs to move.",
  },
  [PAIR_KEY("pluto", "venus")]: {
    catches: "is where warmth goes to a test or a hold, so let it be intense without making it a grip.",
    flows: "is where warmth goes all the way down, so trust it instead of guarding it.",
  },
  [PAIR_KEY("saturn", "saturn")]: {
    catches: "is where you both wait for the other to give first, and two people who think warmth is earned can stand there forever.",
    flows: "is where two careful people make agreements that actually hold, so build the long thing together.",
  },
  [PAIR_KEY("saturn", "uranus")]: {
    catches: "is where one holds the line and the other breaks it, so put the fixed and the free in the same plan.",
    flows: "is where discipline and invention can balance: keep what works while you change what does not.",
  },
  [PAIR_KEY("sun", "uranus")]: {
    catches: "is where being seen collides with needing to be free, and attention reads as control unless it leaves room.",
    flows: "is where there is easy respect for difference, so name the thing that makes them un-ordinary.",
  },
  [PAIR_KEY("sun", "venus")]: {
    catches: "is where pride and affection tangle, and they need to feel liked, not just handled, so let the warmth come first.",
    flows: "is where there is an easy, flattering warmth, so say what you enjoy in each other before it is assumed.",
  },
  [PAIR_KEY("uranus", "uranus")]: {
    catches: "is where you both bolt at the same restriction, and two people who need this much room can drift right apart.",
    flows: "is where you let one another be genuinely different, and that freedom is the thing that makes it work.",
  },
  [PAIR_KEY("uranus", "venus")]: {
    catches: "is where affection needs room and consistency at once, so ask which one they need today instead of assuming.",
    flows: "is where the warmth is electric and unconventional, so enjoy the spark without trying to make it settle.",
  },

  // FOUNDER-REVIEW: North Node pair summary lenses.
  [PAIR_KEY("north_node", "sun")]: {
    catches: "is where one self gets treated as a project, so significance turns into a rewrite they did not ask for.",
    flows: "is where who they are and where they are headed can back each other, if you name the stretch without staging it.",
  },
  [PAIR_KEY("moon", "north_node")]: {
    catches: "is where comfort and the next chapter fight, so the soft landing gets mistaken for a brake.",
    flows: "is where feeling can point at the next honest step, and care does not have to become a pep talk.",
  },
  [PAIR_KEY("mercury", "north_node")]: {
    catches: "is where advice about the path lands as a lecture, and one mind tries to become the map.",
    flows: "is where you can name the next stretch in plain words without making it a speech.",
  },
  [PAIR_KEY("north_node", "venus")]: {
    catches: "is where taste and the assigned path chafe, so one person's valued thing tries to convert the other.",
    flows: "is where warmth can aim at who they are becoming, specifically, instead of a role.",
  },
  [PAIR_KEY("mars", "north_node")]: {
    catches: "is where the push arrives before they asked, and heat gets mistaken for the assignment.",
    flows: "is where aimed effort can move the next chapter, if you decide who is leading the step.",
  },
  [PAIR_KEY("jupiter", "north_node")]: {
    catches: "is where the bigger version crowds the actual stretch, and more pretends to be the assignment.",
    flows: "is where extra room helps the path land, if you spend it on one growth that has a shape.",
  },
  [PAIR_KEY("north_node", "saturn")]: {
    catches: "is where the rule and the stretch lock, and a wall gets called wisdom before anyone names the fear.",
    flows: "is where a real container can hold the next chapter, and steady backing is the kindness.",
  },
  [PAIR_KEY("north_node", "uranus")]: {
    catches: "is where the exit and the assignment get confused, and leaving pretends to be growth.",
    flows: "is where an unconventional step can serve the stretch, if you name the difference on purpose.",
  },
  [PAIR_KEY("neptune", "north_node")]: {
    catches: "is where the vision goes foggy, and an ideal stands in for the next actual step.",
    flows: "is where a shared picture can open the path, if it stays attached to a real day.",
  },
  [PAIR_KEY("north_node", "pluto")]: {
    catches: "is where intensity turns the path into a test, and becoming becomes a hold.",
    flows: "is where you can finish a real change together, then let that stretch actually end.",
  },
  [PAIR_KEY("north_node", "north_node")]: {
    catches: "is where two growth paths compete, and both starve because neither week has a chosen lead.",
    flows: "is where two directions of becoming can sit side by side, if neither has to win.",
  },
};

/**
 *
 * Exactly the counterpart of `WORK_ASPECT_ACTION`, for the other shared
 * pair-keyed layer, chosen by the same rule: override precisely the cells
 * whose shared lens trips the professional register gate, and keep the shared
 * lens everywhere else. The doc comment on `ASPECT_SUMMARY_FRAME` claims the
 * table is family-safe, and it holds for attraction and desire, but it does
 * still describe Venus and Moon pairs as affection, warmth, and comfort, so
 * those cells need the working register here.
 *
 * Grammar is the same as the table it overrides: each value is a predicate
 * continuing "{NameA}'s {Body} {aspect} {NameB}'s {Body} (orb°) ...", ending
 * in a period. Same bodies, same aspect, same orb, same flow/friction sign:
 * only the register changes.
 */
const WORK_ASPECT_SUMMARY_FRAME: Record<string, Partial<{ flows: string; catches: string }>> = {
  [PAIR_KEY("moon", "sun")]: {
    flows: "is where standing and steadiness point the same way, and you rarely have to trade one against the other.",
  },
  [PAIR_KEY("moon", "venus")]: {
    catches: "is where wanting the credit and needing the ground steady take turns, so the ask arrives and then gets withdrawn.",
    flows: "is where goodwill and steady morale are cheap to give, and the working relationship runs on that.",
  },
  [PAIR_KEY("mars", "venus")]: {
    catches: "is where the push to ship and the standard for good work pull opposite ways, so the pace shows up as friction.",
    flows: "is where the drive and the standard point the same way, and one small courtesy keeps it running.",
  },
  [PAIR_KEY("mercury", "venus")]: {
    catches: "is where the critique arrives before the credit, so the correction lands as a verdict instead of help.",
    flows: "is where the easy way you talk can carry the awkward conversations too, not only the routine ones.",
  },
  [PAIR_KEY("moon", "saturn")]: {
    flows: "is where reliable presence is the reassurance this working relationship actually runs on.",
  },
  [PAIR_KEY("mercury", "mercury")]: {
    flows: "is where the everyday back-and-forth is the upkeep the whole working relationship depends on.",
  },
  [PAIR_KEY("saturn", "venus")]: {
    catches: "is where credit feels like it has to be earned twice, so the unprompted kind is the only kind that lands.",
    flows: "is where reliability and recognition reinforce each other, and consistency reads as respect.",
  },
  [PAIR_KEY("jupiter", "moon")]: {
    catches: "is where a big plan meets a rough week, and cheering them past the objection misses it.",
    flows: "is where optimism and a steady read of the room feed each other, and the planning goes better out loud.",
  },
  [PAIR_KEY("venus", "venus")]: {
    flows: "is where you already agree about what good work looks like, and it goes quiet if you stop saying so.",
  },
  [PAIR_KEY("jupiter", "venus")]: {
    catches: "is where generosity tips into too much, and overdoing it buries the plainer thing they needed.",
    flows: "is where credit comes easily and at scale, so spend it out loud before it gets assumed.",
  },
  [PAIR_KEY("moon", "uranus")]: {
    catches: "is where the mood shifts without warning, and hunting for the cause costs you the steadiness they need.",
  },
  [PAIR_KEY("neptune", "pluto")]: {
    flows: "is where the real understanding runs underground; trust it, and still name what is actually happening.",
  },
  [PAIR_KEY("neptune", "sun")]: {
    catches: "is where you are backing the idea of them more than the work in front of you, so look at what is actually there.",
  },
  [PAIR_KEY("neptune", "venus")]: {
    catches: "is where the praise goes vague and glowing, so keep the credit attached to a real piece of work.",
    flows: "is where the appreciation is generous and imaginative, and it holds only while it stays specific.",
  },
  [PAIR_KEY("pluto", "venus")]: {
    catches: "is where approval turns into a test, so let the standard stay serious without becoming a hold.",
    flows: "is where regard for each other's work goes all the way down, so put it on the record instead of keeping it private.",
  },
  [PAIR_KEY("saturn", "saturn")]: {
    catches: "is where you both wait for the other to move first, and two people who think trust is earned can stand there forever.",
  },
  [PAIR_KEY("sun", "venus")]: {
    catches: "is where pride and appreciation tangle, and they need to be valued, not just managed.",
    flows: "is where the regard is easy and openly flattering, so say what you rate in their work before it is assumed.",
  },
  [PAIR_KEY("uranus", "venus")]: {
    catches: "is where they need room and consistency at once, so ask which one this week needs instead of assuming.",
    flows: "is where the regard is easy and a little electric, so use the unconventional working style instead of standardizing it.",
  },
  [PAIR_KEY("moon", "north_node")]: {
    catches: "is where the mood and the next stretch fight, so the steadier read gets mistaken for a brake on the work.",
    flows: "is where the instinctive read can point at the next honest step, without turning into a pep talk.",
  },
  [PAIR_KEY("north_node", "venus")]: {
    catches: "is where taste and the assigned path chafe, so one person's standard tries to convert the other.",
    flows: "is where credit can aim at who they are becoming, specifically, instead of a role.",
  },
};

/** Pair-keyed summary lens, with RELATION_ASPECT_FRAME as last-resort fallback. */
export function aspectSummaryLens(
  a: { from: string; to: string; harmony: number; type?: string },
  relType: RelationType
): string {
  if (aspectGroup(a) === "adjusts") {
    return ADJUST_TACTIC;
  }
  const flows = a.harmony >= 0;
  const half = flows ? "flows" : "catches";
  const key = PAIR_KEY(a.from, a.to);
  const workLens = isProfessionalRelation(relType) ? WORK_ASPECT_SUMMARY_FRAME[key]?.[half] : undefined;
  if (workLens) return workLens;
  const pair = ASPECT_SUMMARY_FRAME[key];
  if (pair) return pair[half];
  const frame = RELATION_ASPECT_FRAME[relType];
  return flows ? frame.flows : frame.catches;
}

/**
 * 2-3 aspect-framing lines that read the TIGHTEST type-relevant aspects in
 * relationship terms. Everything factual (bodies, aspect type, orb, harmony
 * sign) is straight from computeSynastry — `from` is Person A's body, `to` is
 * Person B's body — so the sentence only reframes a true aspect for the chosen
 * relationship. Returns [] when no matching aspect exists (never fabricates).
 */
export function relationshipAspectFraming(
  synastry: Pick<SynastryResult, "aspects">,
  relType: RelationType,
  nameA: string,
  nameB: string
): { text: string; action: string; flows: boolean; aspect: Aspect }[] {
  const priority = RELATION_BODY_PRIORITY[relType];
  const relevantAll = synastry.aspects
    .filter((a) => !isQuincunxType(a.type))
    .filter((a) => priority.includes(a.from) || priority.includes(a.to))
    .slice()
    .sort((a, b) => a.orb - b.orb);

  // Surface up to 3, but guarantee at least one FLOW (nurture) and one CATCH
  // (minimize) when both exist — so the user always sees a way to reduce a
  // clash AND a way to use an ease, not three of one kind.
  const flowsList = relevantAll.filter((a) => aspectGroup(a) === "flows");
  const catchesList = relevantAll.filter((a) => aspectGroup(a) === "catches");
  let picked: Aspect[];
  if (flowsList.length && catchesList.length) {
    const chosen: Aspect[] = [catchesList[0] as Aspect, flowsList[0] as Aspect];
    for (const a of relevantAll) {
      if (chosen.length >= 3) break;
      if (!chosen.includes(a as Aspect)) chosen.push(a as Aspect);
    }
    picked = chosen.slice(0, 3).sort((a, b) => a.orb - b.orb);
  } else {
    picked = relevantAll.slice(0, 3) as Aspect[];
  }

  return picked.map((a) => {
    const group = aspectGroup(a);
    const flows = group === "flows";
    const lens = aspectSummaryLens(a, relType);
    const text = `${nameA}'s ${cap(a.from)} ${a.type} ${nameB}'s ${cap(a.to)} (${a.orb.toFixed(1)}°) ${lens}`;
    return { text, action: aspectActionLine(a, relType), flows, aspect: a as Aspect };
  });
}

export interface HouseOverlayLine {
  /** Whose planet: A = Person A's body in B's house, B = Person B's body in A's house. */
  owner: "A" | "B";
  body: BodyName;
  house: number;
  /** HOUSE_AREA meaning for the house, e.g. "home & roots". */
  area: string;
}

/**
 * Surfaces the RELATIONSHIP-RELEVANT house overlays for this type from real
 * houseOverlays. `available` is false for date-only charts (no cusps → the
 * engine returns empty overlay arrays), which is the signal to hedge rather
 * than assert a house that was never computed (§12). Never invents a house.
 */
export function relationHouseOverlays(
  synastry: Pick<SynastryResult, "houseOverlays">,
  relType: RelationType
): { available: boolean; lines: HouseOverlayLine[] } {
  const { aInB, bInA } = synastry.houseOverlays;
  const available = aInB.length > 0 || bInA.length > 0;
  const houses = RELATION_HOUSES[relType];
  if (!available || houses.length === 0) return { available, lines: [] };

  const priority = RELATION_BODY_PRIORITY[relType];
  const rank = (body: BodyName) => {
    const i = priority.indexOf(body);
    return i === -1 ? priority.length : i;
  };
  const pick = (overlays: { body: BodyName; house: number }[], owner: "A" | "B"): HouseOverlayLine[] =>
    overlays
      .filter((o) => houses.includes(o.house))
      .sort((x, y) => rank(x.body) - rank(y.body) || houses.indexOf(x.house) - houses.indexOf(y.house))
      .map((o) => ({ owner, body: o.body, house: o.house, area: HOUSE_AREA[o.house - 1] ?? "" }));

  // Lead with priority-body placements; keep both directions of the overlay.
  const lines = [...pick(aInB, "A"), ...pick(bInA, "B")].sort((x, y) => rank(x.body) - rank(y.body));
  return { available, lines };
}

const HOUSE_OVERLAY_LENS_BY_RELATION: Record<RelationType, HouseOverlayLens> = {
  partners: "partner",
  romantic: "partner",
  friends: "friend",
  platonic: "friend",
  siblings: "family",
  "parent-child": "family",
  ancestor: "family",
  colleagues: "coworker",
  "manager-report": "coworker",
  "mentor-mentee": "coworker",
};

function isHouseNumber(house: number): house is HouseNumber {
  return Number.isInteger(house) && house >= 1 && house <= 12;
}

/** Returns curated copy for a computed overlay and relationship frame. */
export function houseOverlayDescription(
  line: Pick<HouseOverlayLine, "house">,
  relType: RelationType
): HouseOverlayDescription | null {
  if (!isHouseNumber(line.house)) return null;
  return HOUSE_OVERLAY_DESCRIPTIONS[HOUSE_OVERLAY_LENS_BY_RELATION[relType]][line.house];
}

function renderHouseOverlayDetail(template: string, owner: string, planet: string): string {
  return template.replaceAll("{name}", owner).replaceAll("{planet}", planet);
}

// Turns a real houseOverlay into a relationship-framed sentence. House number,
// area, body, and owner are all real; the interpretation comes from the
// relationship-and-house copy matrix.
export function narrateHouseOverlay(line: HouseOverlayLine, relType: RelationType, nameA: string, nameB: string): string {
  const owner = line.owner === "A" ? nameA : nameB;
  const host = line.owner === "A" ? nameB : nameA;
  const ordinal = ordinalHouse(line.house);
  const base = `${owner}'s ${cap(line.body)} lands in ${host}'s ${ordinal} house (${line.area})`;
  const description = houseOverlayDescription(line, relType);
  return description ? `${base}. ${description.short}` : base;
}

/**
 * Expands a computed overlay with the curated detail. The template's "you"
 * means the owner of the receiving house, so the prefix makes that perspective
 * explicit when comparing any two saved people.
 */
export function narrateHouseOverlayDetail(
  line: HouseOverlayLine,
  relType: RelationType,
  nameA: string,
  nameB: string
): string | null {
  const owner = line.owner === "A" ? nameA : nameB;
  const host = line.owner === "A" ? nameB : nameA;
  const description = houseOverlayDescription(line, relType);
  if (!description) return null;
  return `From ${host}'s perspective: ${renderHouseOverlayDetail(description.detail, owner, cap(line.body))}`;
}

function ordinalHouse(h: number): string {
  const suffix = h === 1 ? "st" : h === 2 ? "nd" : h === 3 ? "rd" : "th";
  return `${h}${suffix}`;
}

/** True when this relationship type has a house lens at all (ancestor does not). */
export function relationHasHouseLens(relType: RelationType): boolean {
  return RELATION_HOUSES[relType].length > 0;
}

/** Human-readable list of the houses this type leans on, e.g. "4th house (home & roots) and 10th house (career & reputation)". */
export function relationHouseHint(relType: RelationType): string {
  const houses = RELATION_HOUSES[relType];
  if (houses.length === 0) return "";
  return houses.map((h) => `${ordinalHouse(h)} house (${HOUSE_AREA[h - 1] ?? ""})`).join(" and ");
}

// Reads real elementBalance counts into one comparison line. Only asserts what
// the counts actually show (shared dominant element, or a complement/gap).
export function relationElementSignal(
  synastry: Pick<SynastryResult, "elementBalance">,
  nameA: string,
  nameB: string
): string | null {
  const { a, b } = synastry.elementBalance;
  const domOf = (c: Record<string, number>) =>
    (Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null) as "fire" | "earth" | "air" | "water" | null;
  const domA = domOf(a);
  const domB = domOf(b);
  if (!domA || !domB) return null;
  if (domA === domB) {
    return `You both run mostly ${domA}. A shared temperature that makes the baseline feel familiar, for better and worse.`;
  }
  const missingInA = a[domB] === 0;
  const missingInB = b[domA] === 0;
  if (missingInA || missingInB) {
    return `${nameA} leads with ${domA} and ${nameB} with ${domB}. Where one is thin the other is strong, so you can cover each other's blind spots if you let it.`;
  }
  return `${nameA} leans ${domA}, ${nameB} leans ${domB}. Different default weather, so translate before you assume the other felt what you felt.`;
}
