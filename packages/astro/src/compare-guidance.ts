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

import type { Aspect, BodyName, SynastryResult } from "./index";

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

export type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor" | "romantic" | "platonic";

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

/** The five relationship types the saved-people /app/compare picker offers. */
export const COMPARE_RELATION_TYPES: readonly RelationType[] = [
  "partners",
  "siblings",
  "friends",
  "parent-child",
  "ancestor",
];

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
  ancestor: "ancestor",
  // grandparent, colleague, self, and any other string: unmapped
};

/**
 * Suggest a Compare relationType from two saved `people.relation` tags.
 * Returns a type only when exactly one side is `self` and the other maps
 * confidently; otherwise null (caller falls back to
 * `defaultCompareRelationType(false)`). Never fabricates from names, ages,
 * gender, or two non-self user-relative tags.
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
  if (aSelf === bSelf) return null; // neither self, or both self — no sound pair mapping

  const other = aSelf ? b : a;
  return SELF_OTHER_TO_COMPARE[other] ?? null;
}

/**
 * FOUNDER-REVIEW: authored — refine voice.
 * Shown next to the Compare relationship-type selector only when
 * `suggestCompareRelationType` returned a real mapping that is currently
 * selected. Never shown on fallback (there is no reason to state).
 */
export const COMPARE_RELATION_SUGGESTION_HINT =
  "Preselected from how you saved them.";

/** Bodies whose cross-aspects are most relevant to a romantic reading. */
const ROMANTIC_BODIES = ["venus", "mars", "sun", "moon"];
/** Bodies whose cross-aspects are most relevant to a platonic reading. */
const PLATONIC_BODIES = ["mercury", "moon", "jupiter"];

/**
 * Which already-computed bodies matter MOST for each relationship type. This
 * is the SAME mechanism as ROMANTIC_BODIES/PLATONIC_BODIES (built for Quick
 * Chart) extended to the five saved-people relationship types /app/compare
 * offers. It only ever changes WHICH real, already-true aspects surface first
 * — never invents an aspect, never changes an orb or harmony. Per-type groups
 * (confirmed in the Phase 0 plan): partners lead with attraction/partnership
 * bodies, parent-child with emotional-safety + structure, siblings/friends
 * with communication, ancestor with the slow outer planets that carry the
 * generational layer.
 */
const RELATION_BODY_PRIORITY: Record<RelationType, string[]> = {
  romantic:       ROMANTIC_BODIES,
  partners:       ["venus", "mars", "sun", "moon"],
  platonic:       PLATONIC_BODIES,
  friends:        ["mercury", "jupiter"],
  siblings:       ["mercury", "moon"],
  "parent-child": ["moon", "saturn"],
  ancestor:       ["pluto", "neptune", "uranus"],
};

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
};

/**
 * Reorders a real, already-computed aspect list so the ones most relevant to
 * the given relationship type surface first — never adds, removes, or alters
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
    return x.i - y.i; // stable within each group — preserves the original (orb-sorted) order
  });
  return withIndex.map((w) => w.a);
}

export interface GuidancePerson {
  display_name: string;
  sun?: string; moon?: string; venus?: string; mars?: string;
  mercury?: string; saturn?: string;
}

const MOON_NEED: Partial<Record<string, string>> = {
  Aries:       "lead fast; NAME needs you to match their urgency, then let them reset",
  Taurus:      "steadiness above all — don't rush them; they need to feel the ground is solid",
  Gemini:      "to talk it through, not just feel it — bring the conversation, not the silence",
  Cancer:      "to feel the bond is safe before they'll open. Reassurance isn't weakness here",
  Leo:         "to be genuinely seen and celebrated. Acknowledgement matters more than you might expect",
  Virgo:       "to feel useful and appreciated for the practical care they give. Notice the small acts",
  Libra:       "to be invited, not pressured — they close when judged and open when it feels fair",
  Scorpio:     "honesty over reassurance. Soft untruths feel like betrayal; give them the real thing",
  Sagittarius: "room to breathe and range freely. Cages, even loving ones, make them pull away",
  Capricorn:   "to feel competent and respected, not managed. Let them do it their way first",
  Aquarius:    "space to process as themselves before they can close the distance",
  Pisces:      "gentleness and a feeling of being truly heard — they absorb the tone more than the words",
};

const VENUS_NEED: Partial<Record<string, string>> = {
  Aries:       "direct pursuit — they want to feel chosen, not convenient",
  Taurus:      "tangible gestures and unhurried time together",
  Gemini:      "curiosity and conversation as a love language",
  Cancer:      "warmth made domestic — being included in ordinary life",
  Leo:         "public appreciation, not just private affection",
  Virgo:       "to have the details noticed — effort is how they give, and how they want to receive",
  Libra:       "harmony and reciprocity; they give generously but need it returned",
  Scorpio:     "depth and full presence — they'd rather have intensity than pleasantry",
  Sagittarius: "adventure shared, not just stability offered",
  Capricorn:   "reliability as a love language — showing up consistently is the whole thing",
  Aquarius:    "unconventionality respected; they need to feel free within the bond",
  Pisces:      "romance in the real sense — not grand gestures, but genuine tenderness",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored — refine voice.
// PHASE 2 "how to deliver it" lines. Each is the concrete, chart-specific move
// that ACTS ON the same-sign need above — keyed to the person's REAL, engine-
// computed sign, never shown when the sign is missing/uncertain. These turn a
// description ("Sarah needs to be seen") into an action ("say the specific
// thing you admire, out loud, this week"). Every line is specific to the sign
// it is keyed under — a Leo line could not be swapped onto a Virgo Moon.
// MOON_HOW pairs with MOON_NEED (all relationship types).
// ─────────────────────────────────────────────────────────────────────────
const MOON_HOW: Partial<Record<string, string>> = {
  Aries:       "match their pace when it spikes — move on it in the moment, then let them cool without a post-mortem",
  Taurus:      "keep the plan you already made; the follow-through itself is the reassurance, more than any words",
  Gemini:      "talk it through out loud with them, even the half-formed parts — for them the conversation IS the comfort",
  Cancer:      "say the bond is safe before you raise the hard thing, so a boundary doesn't read as a door closing",
  Leo:         "name the specific thing you admire, out loud and where others can hear — not \"good job\" but the actual detail",
  Virgo:       "notice one small practical thing they did and thank them for it by name; the noticing lands harder than praise",
  Libra:       "invite instead of instruct, and let them weigh in before you decide — being consulted is how they feel safe",
  Scorpio:     "give them the unvarnished version even when a softer one is available; the honesty is the intimacy",
  Sagittarius: "give them room and a clear exit, then trust them to come back — holding loosely is the reassurance",
  Capricorn:   "let them run it their own way first, and praise the effort over the talent; respect is how they read love",
  Aquarius:    "give them space to process alone before you ask them to close the distance — don't chase the pause",
  Pisces:      "mind your tone over your words, and let them feel heard before you move to fixing it",
};

// FOUNDER-REVIEW: authored — refine voice. Pairs with VENUS_NEED (partner lens only).
const VENUS_HOW: Partial<Record<string, string>> = {
  Aries:       "pursue directly — choose them out loud instead of waiting to be chosen",
  Taurus:      "make it tangible: unhurried time, a made meal, the seat kept for them",
  Gemini:      "keep the conversation alive — a genuinely curious question reads as a love letter",
  Cancer:      "fold them into ordinary life — the errand, the small plan — that domestic inclusion is the intimacy they feel",
  Leo:         "appreciate them in front of others, not only in private; witnessed warmth is the real thing",
  Virgo:       "let them see you noticed the details of their effort, and name them one by one",
  Libra:       "return the gesture evenly — they give generously and need to feel it come back",
  Scorpio:     "give them your full, undistracted presence — depth over frequency",
  Sagittarius: "share an actual adventure instead of only offering stability — go somewhere with them",
  Capricorn:   "show up consistently over time; here the reliability IS the romance",
  Aquarius:    "protect their freedom inside the bond — don't make closeness cost their independence",
  Pisces:      "offer sincere tenderness over grand gestures — the small true thing lands deepest",
};

// FOUNDER-REVIEW: authored — refine voice. Pairs with MERCURY_NEED (siblings/friends).
const MERCURY_HOW: Partial<Record<string, string>> = {
  Aries:       "get to the point fast and skip the wind-up — they hear directness as respect",
  Taurus:      "give them time to chew on it, and don't read a slow reply as a no",
  Gemini:      "let them think out loud without holding the drafts against them",
  Cancer:      "watch your tone first; how you say it reaches them before what you say does",
  Leo:         "acknowledge the idea before you edit it, and never correct them in front of others",
  Virgo:       "bring precise, specific claims — vagueness derails them faster than a hard truth",
  Libra:       "keep it fair and two-sided; drop the scorekeeping and they stay in the room",
  Scorpio:     "name the subtext directly — they already sense the thing you're not saying",
  Sagittarius: "give the big frame first, then the detail, and stay blunt-honest over polite",
  Capricorn:   "lead with the useful, load-bearing thing; they trust competence over pleasantry",
  Aquarius:    "let them disagree without making it personal — ideas are how they connect",
  Pisces:      "leave room for the unspoken; not everything they mean arrives in words",
};

// FOUNDER-REVIEW: authored — refine voice. Pairs with SATURN_NEED (parent-child).
const SATURN_HOW: Partial<Record<string, string>> = {
  Aries:       "set the limit once, then let them push against it — the resistance is how they accept it",
  Taurus:      "hold the rule consistently; the boundary that never moves is the one they trust",
  Gemini:      "give the reason behind the rule — they follow what they understand and resent what they don't",
  Cancer:      "make the authority feel protective, not policing — reassure while you hold the line",
  Leo:         "give them responsibility in front of others; dignity is how they take a limit",
  Virgo:       "set clear, meetable standards — a vague expectation feels like being set up to fail",
  Libra:       "keep every rule visibly fair; an uneven rule reads to them as a broken promise",
  Scorpio:     "hold the boundary without a power struggle — steady, not a contest of wills",
  Sagittarius: "give the why and room to roam inside the limit; a cage just breeds escape",
  Capricorn:   "give them real stakes and take them seriously — they rise to high expectations, not low ones",
  Aquarius:    "appeal to the principle, not the hierarchy — \"because it's right\" keeps them, \"because I said so\" loses them",
  Pisces:      "deliver firmness gently — keep the edge kind or they dissolve instead of pushing back",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored placeholder — refine voice.
// Saturn-by-sign "what structure / authority this person needs" lines, used
// ONLY by the parent-child lens (Saturn is the genuine structure/authority
// body). Each line is keyed to the person's REAL, engine-computed Saturn sign;
// nothing is shown when the sign is missing or the engine flagged it uncertain.
// Mirror the density and second-person voice of MOON_NEED / VENUS_NEED above.
// ─────────────────────────────────────────────────────────────────────────
const SATURN_NEED: Partial<Record<string, string>> = {
  Aries:       "structure they can push against, not a wall — set the limit, then let them test it",
  Taurus:      "consistency over intensity; the rule that never moves is the one they trust",
  Gemini:      "reasons, not decrees — they follow a boundary they understand and resent one they don't",
  Cancer:      "authority that feels protective, not policing; they harden when safety turns to control",
  Leo:         "to be trusted with responsibility in front of others — dignity is how they accept limits",
  Virgo:       "clear standards they can actually meet; vague expectations read as being set up to fail",
  Libra:       "fairness they can see — an inconsistent rule lands as a broken promise",
  Scorpio:     "boundaries held without a power struggle; they respect strength that isn't cruelty",
  Sagittarius: "the why behind the rule and room to roam inside it — cages breed escape",
  Capricorn:   "to be taken seriously and given real stakes; they meet high expectations, not low ones",
  Aquarius:    "principle over hierarchy — 'because I said so' loses them; 'because it's right' keeps them",
  Pisces:      "firmness delivered gently; they need the edge to be kind, or they dissolve rather than push back",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored placeholder — refine voice.
// Mercury-by-sign "how this person needs to be communicated with" lines, used
// by the siblings and friends lenses (communication is the genuine register
// there). Keyed to the person's REAL, engine-computed Mercury sign; omitted
// when missing or uncertain. Match MOON_NEED / VENUS_NEED density and voice.
// ─────────────────────────────────────────────────────────────────────────
const MERCURY_NEED: Partial<Record<string, string>> = {
  Aries:       "the point first — they hear directness as respect and hedging as evasion",
  Taurus:      "time to chew on it; don't mistake a slow reply for disagreement",
  Gemini:      "to think out loud without it being held against them — half of it is drafting, not deciding",
  Cancer:      "tone read before content; how you say it lands harder than what you say",
  Leo:         "to feel heard, not corrected in front of others — praise the idea before you edit it",
  Virgo:       "precision — sloppy claims derail them faster than hard truths do",
  Libra:       "the conversation kept fair; they shut down when it tips into winning and losing",
  Scorpio:     "the real subtext named — they already sense the thing you're not saying",
  Sagittarius: "the big frame before the detail, and honesty even when it's blunt",
  Capricorn:   "useful over pleasant; they trust the person who tells them the load-bearing thing",
  Aquarius:    "room to disagree without it being personal — ideas are how they connect",
  Pisces:      "space for the unspoken; not everything they mean arrives in words",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored placeholder — refine voice.
// Relationship-type LENS applied to a REAL computed cross-aspect. The bodies,
// aspect type, orb, and harmony sign are all from the engine — these strings
// only reframe that true aspect in the register of the chosen relationship
// (attraction for partners, safety/authority for parent-child, etc.). Two
// variants per type: one when the aspect flows (harmony ≥ 0), one when it
// catches (harmony < 0). Never shown when no matching aspect exists.
// ─────────────────────────────────────────────────────────────────────────
const RELATION_ASPECT_FRAME: Record<RelationType, { flows: string; catches: string }> = {
  partners: {
    flows:   "reads as easy attraction — wanting and warmth point the same way, so closeness needs no translation.",
    catches: "is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.",
  },
  romantic: {
    flows:   "reads as easy attraction — wanting and warmth point the same way, so closeness needs no translation.",
    catches: "is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.",
  },
  "parent-child": {
    flows:   "is a channel of felt safety — support and steadiness reach the child without a fight.",
    catches: "is where care can land as control; see the plan before you correct it, and offer autonomy with backup.",
  },
  siblings: {
    flows:   "keeps the line open — you can say the hard thing to each other and still be fine after.",
    catches: "is the old loop you both fall into; name the pattern before you're inside it and it loosens its grip.",
  },
  friends: {
    flows:   "is where the friendship grows — curiosity and shared momentum feed each other here.",
    catches: "is where wires cross; assume a misread, not a slight, and check the intent before the reaction.",
  },
  platonic: {
    flows:   "keeps the understanding easy — how you think together is the real bond here.",
    catches: "is where you talk past each other; slow down and confirm you mean the same thing.",
  },
  ancestor: {
    flows:   "carries across the generations between you — an inherited current that still runs true.",
    catches: "is where two different eras pull apart; the friction is the era gap, not the person.",
  },
};

/** One-line caption describing what the reordered aspect list is leading with, per type. */
export function relationLensCaption(relType: RelationType): string {
  switch (relType) {
    case "partners":
    case "romantic":
      return "Leading with attraction and partnership aspects (Venus, Mars, Sun, Moon) first.";
    case "parent-child":
      return "Leading with emotional-safety and structure aspects (Moon, Saturn) first.";
    case "siblings":
      return "Leading with communication and understanding aspects (Mercury, Moon) first.";
    case "friends":
      return "Leading with communication and shared-growth aspects (Mercury, Jupiter) first.";
    case "platonic":
      return "Leading with communication and understanding aspects (Mercury, Moon, Jupiter) first.";
    case "ancestor":
      return "Leading with the slow outer-planet aspects (Pluto, Neptune, Uranus) that carry the generational layer.";
  }
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

  const parts: string[] = [];

  const moonLine = moon ? MOON_NEED[moon] : null;
  if (moonLine) {
    // PHASE 2: description ("they need X") + how to actually deliver it, both
    // keyed to the same real Moon sign.
    const moonHow = moon ? MOON_HOW[moon] : null;
    parts.push(
      `${name}'s ${moon} Moon means they need ${moonLine.replace("NAME", name)}.` +
      (moonHow ? ` To actually give it: ${moonHow}.` : "")
    );
  } else if (scores.emotional < 52) {
    parts.push(`${name} needs reassurance that the bond holds when the conversation gets hard — lead with the feeling, not the verdict.`);
  }

  // Venus ("how they feel loved") is a romance/attraction frame, so it only
  // fits the partner-type lenses. Every other relationship type reads a
  // different, type-appropriate body below (Saturn for parent-child, Mercury
  // for siblings/friends) instead of borrowing the romantic register — that
  // would be a label applied to the wrong data.
  const isPartnerLens = relType === "partners" || relType === "romantic";
  const mercury = person.mercury ?? "";
  const saturn = person.saturn ?? "";
  const venusLine = venus && venus !== moon ? VENUS_NEED[venus] : null;
  if (venusLine && scores.warmth < 62 && isPartnerLens) {
    // PHASE 2: how they feel loved + the concrete way to show it (same Venus sign).
    const venusHow = venus ? VENUS_HOW[venus] : null;
    parts.push(
      `With ${venus} Venus, they feel loved through ${venusLine}.` +
      (venusHow ? ` The way to show it: ${venusHow}.` : "")
    );
  }

  // Platonic surfaces a real Mercury-domain aspect (communication is the
  // platonic-relevant register) when one exists among the aspects already
  // computed for these two actual charts — never invented, never shown if
  // none exists.
  if (relType === "platonic") {
    const mercuryAspect = receivingAspects.find((a) => a.from.toLowerCase() === "mercury" || a.to.toLowerCase() === "mercury");
    if (mercuryAspect) {
      parts.push(`As friends, how you talk matters more than how you feel about each other: the ${mercuryAspect.from}–${mercuryAspect.to} ${mercuryAspect.type} (${mercuryAspect.orb.toFixed(1)}°) is the real signal to watch.`);
    } else if (scores.communication < 60) {
      parts.push(`As friends, the honest read is in how you talk to each other, not how you feel about each other — that's the register worth tending here.`);
    }
  }

  // FOUNDER-REVIEW: authored placeholder — refine voice.
  // Siblings & friends read this person's REAL Mercury sign (communication is
  // the genuine register for these bonds). Omitted when Mercury is missing or
  // uncertain — never invented.
  if ((relType === "siblings" || relType === "friends") && mercury) {
    const mercuryLine = MERCURY_NEED[mercury];
    if (mercuryLine) {
      const frame = relType === "siblings" ? "Between siblings" : "As friends";
      // PHASE 2: how they need to be talked to + the concrete practice (same Mercury sign).
      const mercuryHow = MERCURY_HOW[mercury];
      parts.push(
        `${frame}, ${name}'s ${mercury} Mercury sets how they need to be talked to: ${mercuryLine}.` +
        (mercuryHow ? ` In practice: ${mercuryHow}.` : "")
      );
    }
  }

  // FOUNDER-REVIEW: authored placeholder — refine voice.
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

  if (tightestFrictionAspect && scores.communication < 60 && relType !== "platonic") {
    const bodyA = tightestFrictionAspect.from, bodyB = tightestFrictionAspect.to;
    parts.push(`The tightest friction runs through a ${bodyA}–${bodyB} ${tightestFrictionAspect.type} (${tightestFrictionAspect.orb.toFixed(1)}°) — name the pattern before you're inside it, and it loses its grip.`);
  }

  // FOUNDER-REVIEW: authored placeholder — refine voice.
  // Type-specific closing note. Parent-child fallback only fires when Saturn
  // was unavailable above (so the lens still says something true); ancestor
  // frames across eras; the partner high-flow note is unchanged.
  if (relType === "parent-child" && !saturn) {
    parts.push("See the plan before you correct it — autonomy with backup, not direction, is what keeps the trust intact.");
  } else if (relType === "ancestor") {
    parts.push(`Across the years between you, meet ${name} in the era that shaped them before you translate it into yours.`);
  } else if (isPartnerLens && scores.overall >= 70) {
    parts.push("The overall flow is strong — the real work is making sure you both say the tender thing out loud while it's easy.");
  }

  if (parts.length === 0) {
    const vibe = moon ? SIGN_VIBE[moon] : null;
    if (vibe) {
      parts.push(`${name}'s ${moon} Moon — ${vibe} — is the register they speak first. Meet them there.`);
    } else {
      parts.push(`${name} needs to be met in their own language before the connection can deepen.`);
    }
  }

  return parts.join(" ");
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
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
 * Relationship-type REGISTER: the type-specific lead clause that sets WHO acts
 * and HOW, so the same real aspect yields different guidance for a parent-child
 * vs. friends vs. partners. Ends with an em dash; the body tactic continues it.
 * FOUNDER-REVIEW: authored — refine voice.
 */
const RELATION_ACTION_REGISTER: Record<RelationType, { flows: string; catches: string }> = {
  partners:       { flows: "Don't let this ease go unspoken between you —", catches: "Say the tender thing out loud before it hardens into scorekeeping —" },
  romantic:       { flows: "Don't let this ease go unspoken between you —", catches: "Say the tender thing out loud before it hardens into scorekeeping —" },
  "parent-child": { flows: "Use this open channel on purpose —",             catches: "As the parent, lead with backup over correction —" },
  siblings:       { flows: "Keep the line this open —",                       catches: "Head off the old loop before you're inside it —" },
  friends:        { flows: "Feed the momentum —",                            catches: "Assume a misread, not a slight —" },
  platonic:       { flows: "Feed the friendship where it already flows —",    catches: "Assume a misread, not a slight —" },
  ancestor:       { flows: "Carry this inherited current forward —",          catches: "Bridge the era, not the person —" },
};

/**
 * Body-pair TACTICS: the concrete, planet-specific move. Keyed by the unordered
 * pair (sorted, matching interpretations.ts). `catches` minimizes the clash;
 * `flows` nurtures the ease. Each is specific to the two domains named — it
 * could not be swapped onto a different pair. FOUNDER-REVIEW: authored — refine voice.
 */
const PAIR_KEY = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join("-");
const ASPECT_ACTION: Record<string, { flows: string; catches: string }> = {
  [PAIR_KEY("sun", "moon")]: {
    catches: "when what they want and what they need split, ask what they need — not what they want — and don't make them justify the gap",
    flows:   "back their pride and their comfort at once; you rarely have to choose between the two here, so say you see both",
  },
  [PAIR_KEY("moon", "venus")]: {
    catches: "when they reach and then pull back, hold steady instead of chasing — steadiness reads as safety, pursuit reads as pressure",
    flows:   "let the easy affection show; warmth comes cheap here, so spend it before it gets taken for granted",
  },
  [PAIR_KEY("mars", "venus")]: {
    catches: "when wanting and comfort pull opposite ways, name the pull in words instead of acting it out — handle the friction out loud",
    flows:   "keep making the deliberate warm gesture that keeps this lit; the pull is easy, so it's the tending that's the work",
  },
  [PAIR_KEY("mars", "moon")]: {
    catches: "when heat comes up fast, give it a beat — the anger is sitting on a hurt, so answer the feeling, not the volume",
    flows:   "use the quick read you have on each other; act on the feeling early, before it has to be spelled out",
  },
  [PAIR_KEY("mercury", "moon")]: {
    catches: "when the words won't match the feeling, ask in writing or give them quiet — pushing for it out loud makes them go clinical",
    flows:   "trade the plain naming of feelings you're both good at, and keep asking how it actually landed",
  },
  [PAIR_KEY("mercury", "mars")]: {
    catches: "when a conversation turns into a debate, slow the pace and say \"I want to get this right with you\" before you argue the point — the drive to win is drowning the drive to be understood",
    flows:   "put your quick, decisive back-and-forth to work; this is a pair that can talk a thing through and move on it fast",
  },
  [PAIR_KEY("mercury", "venus")]: {
    catches: "say what you appreciate before you critique — the correction only lands after the warmth does",
    flows:   "let the easy, affectionate way you talk carry the harder conversations too",
  },
  [PAIR_KEY("saturn", "moon")]: {
    catches: "they learned early that needing is unsafe, so offer before they ask — they won't ask; unprompted care softens the wall",
    flows:   "lean on the steadiness here; reliable presence is exactly the reassurance this bond runs on",
  },
  [PAIR_KEY("saturn", "venus")]: {
    catches: "they think warmth has to be earned, so give it when they've done nothing to earn it — the unprompted kind is what lands",
    flows:   "let commitment and warmth reinforce each other; consistency here reads as the deepest kind of care",
  },
  [PAIR_KEY("saturn", "mercury")]: {
    catches: "when caution meets quick talk, put the ask in writing with a clear why and a timeline they can plan around",
    flows:   "use how you can be both careful and clear together; this pair makes agreements that hold",
  },
  [PAIR_KEY("saturn", "sun")]: {
    catches: "make the expectation explicit and give it dignity — respect, not management, is what they'll meet",
    flows:   "name the way you steady each other's ambitions; quiet backing like this is easy to leave unsaid",
  },
  [PAIR_KEY("sun", "mercury")]: {
    catches: "when identity and opinion collide, praise the person before you edit the idea",
    flows:   "keep thinking out loud together; your minds meet easily, so use it for the real decisions",
  },
  [PAIR_KEY("jupiter", "sun")]: {
    catches: "when one of you sizes it bigger, agree how far this actually goes before you both commit",
    flows:   "make a plan that stretches a little; shared optimism is a resource — point it at something you both want",
  },
  [PAIR_KEY("jupiter", "moon")]: {
    catches: "when big-picture hope meets a tender mood, don't cheer them out of the feeling — sit in it first, then widen the frame",
    flows:   "let their warmth and the optimism feed each other; this bond grows by dreaming out loud together",
  },
  [PAIR_KEY("moon", "moon")]: {
    catches: "when both moods spike at once, one of you name it first — two raw feelings need a witness, not a match",
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
};

/**
 * Fallback tactics when a specific pair isn't authored — keyed to a SINGLE
 * body's domain, so the line is still specific to that real planet (never
 * "communicate better"). `aspectActionLine` picks the more relationship-
 * relevant of the two bodies as the lead. FOUNDER-REVIEW: authored — refine voice.
 */
const BODY_FRICTION_ACTION: Record<string, string> = {
  sun:     "acknowledge the person before you take issue with the choice — their need to be recognized is what's really bristling",
  moon:    "treat the flare as a feeling that arrived early, not a verdict; name what's underneath before you answer the words",
  mercury: "slow the exchange down and play it back in their words before you respond — most of this is a misread, not a disagreement",
  venus:   "protect what each of you treasures out loud; it eases when neither feels their values got overruled",
  mars:    "give the drive somewhere to go — decide who leads this one before it turns into a contest over who's in charge",
  jupiter: "check the scale before you commit — one of you is sizing this bigger, so agree how far it actually goes",
  saturn:  "make the limit explicit and the reason visible; the wall only becomes a fight when it feels arbitrary",
  uranus:  "leave room for the unexpected move instead of pinning it down — the tension is a need for freedom, not rejection",
  neptune: "get specific where things blur — confirm what was actually meant before you fill the gap with a story",
  pluto:   "don't try to manage the intensity for them; name it plainly and let it move through without a power struggle",
};
const BODY_FLOW_ACTION: Record<string, string> = {
  sun:     "reflect back what you admire in who they are; this natural recognition is easy to leave unsaid",
  moon:    "lean on the instinctive read you have on each other's moods, and check in early — before either of you has to ask",
  mercury: "keep talking about the small stuff; this easy back-and-forth is the maintenance the bond runs on",
  venus:   "say the affection out loud even when it feels obvious — warmth this easy is exactly what gets taken for granted",
  mars:    "point the shared drive at something real together; this is momentum to build on, not just enjoy",
  jupiter: "make plans that stretch a little; shared optimism is a resource, so spend it on something you both want",
  saturn:  "name the reliability you count on in each other; steady support this quiet rarely gets thanked for",
  uranus:  "protect the freedom you give each other; this easy room to be different is worth guarding",
  neptune: "make space for the shared imaginative thread; it deepens when you honor it out loud",
  pluto:   "trust each other with the deep stuff; the capacity to go all the way in is rare, so use it deliberately",
};

/** Global personal-relevance order, for choosing a lead body when neither is in the type priority. */
const PERSONAL_RANK = ["moon", "venus", "mars", "mercury", "sun", "saturn", "jupiter", "pluto", "neptune", "uranus"];

/** The more relationship-relevant of the aspect's two bodies (drives the fallback tactic). */
function leadBody(a: { from: string; to: string }, relType: RelationType): string {
  const pri = RELATION_BODY_PRIORITY[relType];
  const score = (b: string) => {
    const i = pri.indexOf(b.toLowerCase());
    return i === -1 ? 100 + PERSONAL_RANK.indexOf(b.toLowerCase()) : i;
  };
  return score(a.from) <= score(a.to) ? a.from : a.to;
}

/**
 * Split the actionable line into the shared register opener (same for every
 * flows row / every catches row of a relation type) and the body-pair tactic
 * tail (row-specific). Same strings `aspectActionLine` concatenates — never
 * reworded. Used by FlowsAndCatchesSection so openers render once per group.
 */
export function aspectActionParts(
  a: { from: string; to: string; harmony: number },
  relType: RelationType
): { flows: boolean; opener: string; tactic: string } {
  const flows = a.harmony >= 0;
  const pair = ASPECT_ACTION[PAIR_KEY(a.from, a.to)];
  const tactic = (pair && (flows ? pair.flows : pair.catches))
    ?? (flows ? BODY_FLOW_ACTION[leadBody(a, relType).toLowerCase()] : BODY_FRICTION_ACTION[leadBody(a, relType).toLowerCase()])
    ?? "";
  const opener = RELATION_ACTION_REGISTER[relType][flows ? "flows" : "catches"];
  return { flows, opener, tactic };
}

/**
 * The actionable "what to do" line for one REAL computed aspect: a concrete way
 * to MINIMIZE the clash (friction) or NURTURE the ease (flow), grounded in the
 * actual bodies and framed for the relationship type. Never fabricates — reads
 * only `from`/`to`/`harmony` off the engine's aspect.
 */
export function aspectActionLine(a: { from: string; to: string; harmony: number }, relType: RelationType): string {
  const { opener, tactic } = aspectActionParts(a, relType);
  return `${opener} ${tactic}.`;
}

/**
 * FOUNDER-REVIEW: strength words from orb thresholds (one shared source).
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
  const frame = RELATION_ASPECT_FRAME[relType];
  const relevantAll = synastry.aspects
    .filter((a) => priority.includes(a.from) || priority.includes(a.to))
    .slice()
    .sort((a, b) => a.orb - b.orb);

  // Surface up to 3, but guarantee at least one FLOW (nurture) and one CATCH
  // (minimize) when both exist — so the user always sees a way to reduce a
  // clash AND a way to use an ease, not three of one kind.
  const flowsList = relevantAll.filter((a) => a.harmony >= 0);
  const catchesList = relevantAll.filter((a) => a.harmony < 0);
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
    const flows = a.harmony >= 0;
    const lens = flows ? frame.flows : frame.catches;
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

// FOUNDER-REVIEW: authored placeholder — refine voice.
// Turns a real houseOverlay into a relationship-framed sentence. House number,
// area, body, and owner are all real; the closing clause is the type lens.
export function narrateHouseOverlay(line: HouseOverlayLine, relType: RelationType, nameA: string, nameB: string): string {
  const owner = line.owner === "A" ? nameA : nameB;
  const host = line.owner === "A" ? nameB : nameA;
  const ordinal = ordinalHouse(line.house);
  const base = `${owner}'s ${cap(line.body)} lands in ${host}'s ${ordinal} house (${line.area})`;
  const lens: Partial<Record<RelationType, string>> = {
    partners:       "— a natural pull toward each other's partnership territory.",
    romantic:       "— a natural pull toward each other's partnership territory.",
    "parent-child": "— it activates the home-and-authority axis the bond is built on.",
    siblings:       "— it lights up the everyday-communication sector siblings share.",
    friends:        "— it grounds the friendship in shared community and growth.",
    platonic:       "— it grounds the friendship in shared community and growth.",
  };
  return `${base} ${lens[relType] ?? ""}`.trim();
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

// FOUNDER-REVIEW: authored placeholder — refine voice.
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
    return `You both run mostly ${domA} — a shared temperature that makes the baseline feel familiar, for better and worse.`;
  }
  const missingInA = a[domB] === 0;
  const missingInB = b[domA] === 0;
  if (missingInA || missingInB) {
    return `${nameA} leads with ${domA} and ${nameB} with ${domB} — where one is thin the other is strong, so you can cover each other's blind spots if you let it.`;
  }
  return `${nameA} leans ${domA}, ${nameB} leans ${domB} — different default weather, so translate before you assume the other felt what you felt.`;
}
