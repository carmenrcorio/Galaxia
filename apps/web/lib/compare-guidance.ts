/**
 * Chart-specific "What X needs from you" guidance. Extracted from
 * apps/web/app/app/compare/page.tsx so the public Quick Compare (/chart/compare)
 * can reuse the same hand-written copy instead of duplicating it.
 *
 * Deterministic rules over computed synastry — derives guidance from a
 * person's actual Moon, Venus, Mars signs and the cross-aspects between the
 * two charts. Structure follows galaxia.jsx swhy() — different charts must
 * produce different output.
 */

import type { computeSynastry } from "@galaxia/astro";
import { SIGN_VIBE } from "./design";

export type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor";

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

  const venusLine = venus && venus !== moon ? VENUS_NEED[venus] : null;
  if (venusLine && scores.warmth < 62) {
    parts.push(`With ${venus} Venus, they feel loved through ${venusLine}.`);
  }

  if (tightestFrictionAspect && scores.communication < 60) {
    const bodyA = tightestFrictionAspect.from, bodyB = tightestFrictionAspect.to;
    parts.push(`The tightest friction runs through a ${bodyA}–${bodyB} ${tightestFrictionAspect.type} (${tightestFrictionAspect.orb.toFixed(1)}°) — name the pattern before you're inside it, and it loses its grip.`);
  }

  if (relType === "parent-child") {
    parts.push("As a parent or child dynamic: see the plan before you correct it. They need autonomy with backup, not direction.");
  } else if (relType === "partners" && scores.overall >= 70) {
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
