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

import type { Aspect, BodyName, SynastryResult, computeSynastry } from "@galaxia/astro";
import { HOUSE_AREA, SIGN_VIBE } from "./design";

export type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor" | "romantic" | "platonic";

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
  synastry: ReturnType<typeof computeSynastry> | null
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
    parts.push(`${name}'s ${moon} Moon means they need ${moonLine.replace("NAME", name)}.`);
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
    parts.push(`With ${venus} Venus, they feel loved through ${venusLine}.`);
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
      parts.push(`${frame}, ${name}'s ${mercury} Mercury sets how they need to be talked to: ${mercuryLine}.`);
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
      parts.push(`In a parent-child bond, ${name}'s ${saturn} Saturn shapes how they meet limits and authority: they need ${saturnLine}.`);
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
): { text: string; flows: boolean; aspect: Aspect }[] {
  const priority = RELATION_BODY_PRIORITY[relType];
  const frame = RELATION_ASPECT_FRAME[relType];
  const relevant = synastry.aspects
    .filter((a) => priority.includes(a.from) || priority.includes(a.to))
    .slice()
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3);
  return relevant.map((a) => {
    const flows = a.harmony >= 0;
    const lens = flows ? frame.flows : frame.catches;
    const text = `${nameA}'s ${cap(a.from)} ${a.type} ${nameB}'s ${cap(a.to)} (${a.orb.toFixed(1)}°) ${lens}`;
    return { text, flows, aspect: a as Aspect };
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
