/**
 * Galaxia — Memorial Timeline interpretation copy.
 *
 * Curated, hand-written plain-language meaning for a `LifespanTransitEvent`
 * (see lifespan-transits.ts). Never LLM-generated — same discipline as
 * interpretations.ts and transit-interpretations.ts.
 *
 * VOICE RULES (memorial-specific — read before editing):
 *  - Reverent, never casual. This describes a real chapter in a life that has
 *    ended; it is read by grieving family. No jokes, no "vibes" language.
 *  - Warm and accessible over technical. "A turning point, a reckoning with
 *    who they'd become" — not "transiting Saturn conjunct natal Saturn".
 *  - Every line is an honest translation of the real geometry the engine
 *    found (ENGINEERING.md §12) — never invents what the person actually
 *    experienced or felt; it names the astrological weather of that season,
 *    not a fabricated biographical fact.
 */

import type { LifespanTransitEvent } from "./lifespan-transits";
import type { BodyName } from "./index";

const OUTER_PLANET_THEME: Partial<Record<BodyName, string>> = {
  // FOUNDER-REVIEW: rewritten (no U+2014).
  uranus: "a break from the familiar: change arriving whether or not it was invited",
  neptune: "a softening of the edges: dreams, faith, or loss loosening the grip of the everyday",
  pluto: "a deep, slow-moving pressure to shed something and become someone a little different",
};

const NATAL_POINT_LABEL: Record<string, string> = {
  sun: "their sense of self",
  moon: "their emotional world",
  ascendant: "the face they showed the world",
};

/** One entry's headline (leads the timeline card) and body (1–2 sentences). */
export interface MemorialTimelineCopy {
  headline: string;
  body: string;
}

/**
 * The plain-language, reverent meaning of one lifespan transit event.
 * Never empty — every kind has a curated composed line.
 */
export function interpretLifespanTransitEvent(event: LifespanTransitEvent): MemorialTimelineCopy {
  switch (event.kind) {
    case "saturn_return":
      return {
        headline: `Saturn return, around age ${event.approxAge}`,
        body:
          "A turning point: a reckoning with who they'd become, and the quiet work of building something that could last.",
      };
    case "jupiter_return":
      return {
        headline: `Jupiter return, around age ${event.approxAge}`,
        body:
          "A season that widened their world: a chance to grow, to reach further, to say yes to more of what was possible.",
      };
    case "progressed_moon_sign_change":
      return {
        headline: event.sign
          ? `Their inner world shifted into ${event.sign}, around age ${event.approxAge}`
          : `Their inner world shifted, around age ${event.approxAge}`,
        body: event.sign
          ? `What steadied them emotionally changed its shape around this time: a new, ${event.sign}-toned chapter of what they needed to feel safe and at home in themselves.`
          : "What steadied them emotionally changed its shape around this time.",
      };
    case "outer_conjunction": {
      const theme = (event.transitBody && OUTER_PLANET_THEME[event.transitBody]) ?? "a slow-moving shift";
      const point = (event.natalBody && NATAL_POINT_LABEL[event.natalBody]) ?? "who they were";
      return {
        headline: `${cap(event.transitBody ?? "A planet")} met ${point}, around age ${event.approxAge}`,
        body: `A season of ${theme}, landing on ${point}. Whatever happened in their life then, this was the sky underneath it.`,
      };
    }
  }
}

function cap(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
