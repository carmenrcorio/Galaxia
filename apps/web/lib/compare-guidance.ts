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

import type { computeSynastry } from "@galaxia/astro";
import { SIGN_VIBE } from "./design";

export type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor" | "romantic" | "platonic";

/** Bodies whose cross-aspects are most relevant to a romantic reading. */
const ROMANTIC_BODIES = ["venus", "mars", "sun", "moon"];
/** Bodies whose cross-aspects are most relevant to a platonic reading. */
const PLATONIC_BODIES = ["mercury", "moon", "jupiter"];

/**
 * Reorders a real, already-computed aspect list so the ones most relevant to
 * the given focus surface first — never adds, removes, or alters an aspect.
 * Used only by the compatibility flow's "Where it flows and catches" list.
 */
export function sortAspectsForFocus<T extends { from: string; to: string }>(
  aspects: T[],
  focus: "romantic" | "platonic" | null
): T[] {
  if (!focus) return aspects;
  const relevant = focus === "romantic" ? ROMANTIC_BODIES : PLATONIC_BODIES;
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

  // Romantic keeps the Venus "how they feel loved" line — Venus is genuinely
  // the attraction/romance-relevant body. Platonic skips it: "how they feel
  // loved" is a romantic frame that doesn't fit a friendship reading, so
  // showing it there would be the toggle applying a label without changing
  // anything real. Every other relType keeps the existing behavior.
  const venusLine = venus && venus !== moon ? VENUS_NEED[venus] : null;
  if (venusLine && scores.warmth < 62 && relType !== "platonic") {
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

  if (tightestFrictionAspect && scores.communication < 60 && relType !== "platonic") {
    const bodyA = tightestFrictionAspect.from, bodyB = tightestFrictionAspect.to;
    parts.push(`The tightest friction runs through a ${bodyA}–${bodyB} ${tightestFrictionAspect.type} (${tightestFrictionAspect.orb.toFixed(1)}°) — name the pattern before you're inside it, and it loses its grip.`);
  }

  if (relType === "parent-child") {
    parts.push("As a parent or child dynamic: see the plan before you correct it. They need autonomy with backup, not direction.");
  } else if ((relType === "partners" || relType === "romantic") && scores.overall >= 70) {
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
