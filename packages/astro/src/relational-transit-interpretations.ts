/**
 * Static, warm, relationally-framed copy for Generational Transit Alerts.
 * No AI call — deterministic templates keyed by (transit body x aspect
 * class), composed with the real affected names/placements at render time.
 * Reuses ASPECT_NATURE (interpretations.ts) for aspect texture so the
 * "flow/friction/fusion" read stays consistent with the rest of the app,
 * and BODY_GLYPH-style planet framing lives here, purpose-written for the
 * relational (between two+ people) angle the spec calls for — every
 * sentence names the DYNAMIC, never just one person's private experience.
 */

import { ASPECT_CLASS } from "./transit-nudge/types";
import type { AffectedProfileHit, RelationalTransitBody, RelationalTransitEvent } from "./relational-transits";
import type { AspectType } from "./index";

const PLANET_LABEL: Record<RelationalTransitBody, string> = {
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const NATAL_BODY_LABEL: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
};

/** "meeting" / "supporting" / "squaring" / "flowing with" / "opposing" — the headline verb. */
const ASPECT_VERB: Record<AspectType, string> = {
  conjunction: "meeting",
  sextile: "gently supporting",
  square: "squaring",
  trine: "flowing with",
  opposition: "pulling against",
};

function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/** "your Moon and Mom's Venus", or "Alex's Moon, Mom's Venus, and Sam's Sun" for 3+. */
function namedTargetsPhrase(affected: AffectedProfileHit[]): string {
  const parts = affected.map((a) => `${possessive(a.personName)} ${NATAL_BODY_LABEL[a.natalBody] ?? a.natalBody}`);
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** e.g. "Saturn is squaring Alex's Moon and Mom's Venus this week." */
export function interpretRelationalTransitHeadline(event: Pick<RelationalTransitEvent, "transitBody" | "aspectType" | "affected">): string {
  return `${PLANET_LABEL[event.transitBody]} is ${ASPECT_VERB[event.aspectType]} ${namedTargetsPhrase(event.affected)} this week`;
}

// 5 planets x 3 aspect classes (flow/friction/fusion) = 15 body templates,
// each written for the RELATIONSHIP between the affected people, never a
// single person's private experience — the differentiator the spec asks
// for. Combined with the 5-way ASPECT_VERB headline, this covers all 25
// (planet, aspect type) combinations the spec's "~20 templates" scopes.
const RELATIONAL_BODY: Record<RelationalTransitBody, Record<"flow" | "friction" | "fusion", string>> = {
  saturn: {
    fusion: "Saturn is bearing down on both of you at once — the same demand for patience, structure, or follow-through, showing up in each of your lives on its own terms. If the weight of responsibility feels heavier than usual this week, naming it to each other may lighten it more than trying to solve it will.",
    friction: "Saturn is testing both of you at the same time — different pressures, the same underlying demand for patience and follow-through. If you're both a little short this week, it's worth remembering it's not really about each other; Saturn is working on you separately.",
    flow: "Saturn is quietly rewarding steadiness in both of you right now — the discipline you've each been building is paying off on its own schedule. A good week to lean on each other's follow-through instead of going it alone.",
  },
  jupiter: {
    fusion: "Jupiter is expanding something in both of you at once — a shared sense that more is possible right now. Watch for both of you saying yes to too much in the same stretch; a little coordination goes a long way this week.",
    friction: "Jupiter is stretching both of you past your usual limits, in different directions — one of you reaching for more, the other maybe overextending. Worth comparing notes before either of you commits to something big.",
    flow: "Jupiter is opening doors for both of you at the same time — a stretch of good luck or good timing touching you both, even if it looks different from the outside. Worth celebrating together, not just separately.",
  },
  uranus: {
    fusion: "Uranus is jolting something loose in both of you at once — an urge to break a pattern, change a plan, or just shake something up. If you're both feeling restless this week, it's not a coincidence; give each other room for the disruption without taking it personally.",
    friction: "Uranus is pulling at both of you in ways that don't quite match — one of you wanting change, the other maybe caught off guard by it. Give each other more room than usual this week; the timing here is external, not about the relationship.",
    flow: "Uranus is loosening both of you up at the same time — an easier relationship to change or surprise than either of you might expect. A good week to try something neither of you has done before, together.",
  },
  neptune: {
    fusion: "Neptune is blurring something for both of you right now — boundaries, plans, or just what's actually being said out loud. Expect some fog between you this week; be more explicit than usual, since neither of you is reading signals as clearly as normal.",
    friction: "Neptune is creating static for both of you, in different registers — one of you idealizing something, the other maybe feeling unmoored. Say the plain, unglamorous version of what you mean this week; it'll land better than the poetic one.",
    flow: "Neptune is softening both of you at once — a shared openness to imagination, empathy, or just letting things be less defined for a while. A good week for art, dreams, or simply sitting with each other without an agenda.",
  },
  pluto: {
    fusion: "Pluto is bearing down on something both of you are quietly transforming right now — different areas of your lives, the same underlying intensity. If things feel unusually high-stakes between you this week, some of that charge is coming from outside the relationship.",
    friction: "Pluto is putting pressure on both of you at once, in ways that don't line up neatly — power, control, or what each of you is willing to let go of. Give the tension room to be about the transit, not automatically about each other.",
    flow: "Pluto is quietly deepening something in both of you at the same time — more capacity to sit with intensity, or to let go of something that's run its course. A good week to go a little deeper with each other than usual.",
  },
};

/** 2-3 sentence relational body copy — the transit, then how it shows up between the affected people. */
export function interpretRelationalTransitBody(event: Pick<RelationalTransitEvent, "transitBody" | "aspectType">): string {
  const aspectClass = ASPECT_CLASS[event.aspectType];
  return RELATIONAL_BODY[event.transitBody][aspectClass];
}

/** Full card copy — headline + body, ready to render. */
export function interpretRelationalTransit(event: Pick<RelationalTransitEvent, "transitBody" | "aspectType" | "affected">): { headline: string; body: string } {
  return { headline: interpretRelationalTransitHeadline(event), body: interpretRelationalTransitBody(event) };
}
