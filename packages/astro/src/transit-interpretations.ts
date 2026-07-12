/**
 * Galaxia — Transit Interpretation Library
 *
 * Curated, hand-written plain-language meaning for a REAL transit
 * (a transiting body forming an aspect to a person's natal body). Never
 * LLM-generated. This is the transit equivalent of lib/interpretations.ts
 * (placements) — it exists so "Today in your sky" and "Active today" can LEAD
 * with human meaning instead of raw jargon, while the notation stays underneath
 * as quiet proof.
 *
 * VOICE RULES (same as interpretations.ts — read before editing):
 *  - Warm, specific, plainspoken. No jargon required to understand the line.
 *  - Never fatalistic, never cruel, never grandiose. A transit is weather, not
 *    fate — hedge with "a day", "a stretch", "today", never "you will".
 *  - Concrete over archetypal. End on something the reader can notice or do.
 *
 * NO FABRICATION (ENGINEERING.md §8/§12): every line is an honest TRANSLATION
 * of the real geometry the engine computed — the transiting body's function,
 * the natal body's function, and the aspect's quality (flow / friction /
 * fusion). It never invents significance or overstates. The composed fallback
 * guarantees every real hit gets an accurate line even when no curated pair is
 * authored, so we never show notation we can't explain — and never explain a
 * transit that isn't real (year-only charts are excluded upstream in
 * lib/transits.ts, so nothing reaches here to be fabricated about).
 *
 * MINOR SAFETY (ENGINEERING.md §9/§13): `opts.minorSafe` guarantees the line is
 * age-appropriate and never romance/attraction-framed. The base Venus wording
 * is already written in warmth/care terms (never desire), and the few curated
 * lines that could read romantically are flagged `adultOnly` and skipped for a
 * minor — falling through to the neutral composed line.
 */

import type { TransitHit } from "./index";
import type { AspectKey, BodyKey, Reading } from "./interpretations";

export interface TransitInterpretOptions {
  /** "your" for the signed-in person, "their" for everyone else. */
  possessive?: "your" | "their";
  /** When true, force an age-appropriate, non-romantic reading (see file header). */
  minorSafe?: boolean;
}

/** The three aspect qualities, matching ASPECT_NATURE.tone in interpretations.ts. */
type Tone = "flow" | "friction" | "fusion";

const ASPECT_TONE: Record<AspectKey, Tone> = {
  conjunction: "fusion",
  sextile: "flow",
  trine: "flow",
  square: "friction",
  opposition: "friction",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored — refine voice.
// TRANSIT_FORCE — what the TRANSITING body is doing in the sky right now, in
// plain language (no planet-name jargon). Written as a phrase that reads
// naturally as the OBJECT of "against" / "from" / "a dose of", so it never has
// to agree with a verb. Keyed to the real transiting body the engine reported.
// ─────────────────────────────────────────────────────────────────────────
const TRANSIT_FORCE: Record<BodyKey, string> = {
  sun:     "a push to be seen",
  moon:    "a passing shift in mood",
  mercury: "a busy rush of thoughts and talk",
  venus:   "warmth and a pull toward closeness",
  mars:    "restless drive and a shorter fuse",
  jupiter: "room to grow and a bit of luck",
  saturn:  "real limits",
  uranus:  "sudden change",
  neptune: "a dreamy, softening haze",
  pluto:   "deep pressure to change",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored — refine voice.
// NATAL_AREA — the part of the PERSON the transit is touching, in plain terms.
// Always used as "{poss} {area}" (a possessive determiner + noun), so `{poss}`
// is never a subject pronoun. Mirrors BODY_DOMAIN in interpretations.ts but
// phrased for "what's being touched today". Venus is deliberately written in
// care/values terms, never romance, so it is safe for a minor by default.
// ─────────────────────────────────────────────────────────────────────────
const NATAL_AREA: Record<BodyKey, string> = {
  sun:     "sense of self",
  moon:    "emotional footing",
  mercury: "way of thinking and talking",
  venus:   "way of caring and what they value",
  mars:    "drive and temper",
  jupiter: "sense of what's possible",
  saturn:  "need for structure and limits",
  uranus:  "need for freedom",
  neptune: "dreams and ideals",
  pluto:   "deeper self",
};

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored — refine voice.
// TRANSIT_GUIDANCE — the small "what helps" tail, keyed to the transiting body
// (i.e. what genuinely helps when THIS planet is pressing). Specific to the
// planet's function; never generic "stay positive" filler.
// ─────────────────────────────────────────────────────────────────────────
const TRANSIT_GUIDANCE: Record<BodyKey, string> = {
  sun:     "let it be acknowledged",
  moon:    "let the feeling move through and pass",
  mercury: "say the thing plainly",
  venus:   "reach out — small warmth counts",
  mars:    "aim the energy before it spikes",
  jupiter: "say yes to a little more than usual",
  saturn:  "patience and steady effort go far",
  uranus:  "stay flexible; don't grip too hard",
  neptune: "rest, and don't force clarity today",
  pluto:   "let what's ending actually end",
};

/** Uppercase the first letter (for the small "what helps" clause in `long`). */
function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * The honest composed line for any (transitBody, natalBody, tone) — an accurate
 * translation of the geometry. `flow` reads as an opening, `friction` as a
 * workable tension, `fusion` as an amplified theme. Never fabricates: the words
 * come straight from the three tables above, all keyed to the real hit.
 */
function composeShort(force: string, area: string, guidance: string, poss: string, tone: Tone): string {
  switch (tone) {
    case "friction":
      return `A day that tests ${poss} ${area} against ${force} — ${guidance}.`;
    case "flow":
      return `An easier day — ${poss} ${area} gets a lift from ${force}; ${guidance}.`;
    case "fusion":
      return `A day when ${poss} ${area} gets a strong dose of ${force} — ${guidance}.`;
  }
}

function composeLong(force: string, area: string, guidance: string, poss: string, tone: Tone): string {
  switch (tone) {
    case "friction":
      return `Right now ${force} is pressing on ${poss} ${area}. It can feel like friction, but it's workable — ${guidance}.`;
    case "flow":
      return `Right now ${force} sits easily with ${poss} ${area} — a natural opening rather than a push. ${cap(guidance)}.`;
    case "fusion":
      return `Right now ${force} is landing squarely on ${poss} ${area}, so the theme runs strong today. ${cap(guidance)}.`;
  }
}

interface CuratedLine {
  short: string;
  /** Optional richer line; falls back to the composed long when absent. */
  long?: string;
  /** Romance/attraction-tinged — skipped for a minor (falls back to composed). */
  adultOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// FOUNDER-REVIEW: authored — refine voice.
// TRANSIT_PAIR — curated meaning for the highest-signal transits, keyed by the
// DIRECTIONAL pair `transitBody-natalBody` (transit → natal; unlike synastry,
// order matters) then by aspect tone. Every string is specific to those two
// real bodies and that aspect quality — a Saturn-square line could not be
// swapped onto a Jupiter-trine. `{poss}` is substituted with your/their.
// Anything not authored here still gets an accurate composed line above.
// ─────────────────────────────────────────────────────────────────────────
const PAIR = (t: BodyKey, n: BodyKey) => `${t}-${n}`;

const TRANSIT_PAIR: Record<string, Partial<Record<Tone, CuratedLine>>> = {
  // ── Saturn: limits, weight, the slow maturing pressure ──
  [PAIR("saturn", "moon")]: {
    friction: { short: "A heavier stretch where {poss} emotional footing feels tested — steady routines and rest help more than pushing.", long: "Transiting Saturn is putting weight on how safe {poss} feels. Things can read as lonelier or heavier than they are; small, reliable routines steady it faster than forcing a mood." },
    fusion:   { short: "Feelings turn serious and a little heavy today — {poss} need for security is front and centre. Go gently, keep it simple." },
    flow:     { short: "A steadying day for {poss} emotional life — good for building one habit that makes {poss} days feel safer." },
  },
  [PAIR("saturn", "sun")]: {
    friction: { short: "A day that asks a lot of {poss} sense of self — progress feels slow, but the effort counts. Pace it." },
    fusion:   { short: "A serious, consolidating day for who {poss} is — less flash, more foundation." },
    flow:     { short: "Quiet, solid progress on what {poss} is building — reliable work pays off now." },
  },
  [PAIR("saturn", "venus")]: {
    friction: { short: "Warmth feels a little rationed today — {poss} bonds meet real limits. Reassurance lands better than pressure." },
    flow:     { short: "A grounded, steady day for {poss} closest bonds — consistency and showing up feel good." },
  },
  [PAIR("saturn", "uranus")]: {
    friction: { short: "A day that tests {poss} need for freedom against real limits — patience goes far.", long: "Transiting Saturn is pressing on {poss} urge to break out and do it differently. The pull between changing everything and staying put is real today; neither has to win right now — patience buys the better answer." },
    fusion:   { short: "Freedom and structure collide head-on today — {poss} feels the tug between breaking out and settling down. No rush to resolve it." },
  },
  [PAIR("saturn", "mars")]: {
    friction: { short: "{poss} drive meets a wall today — frustration is likely, so put it into one steady task instead of forcing all of it." },
    flow:     { short: "Disciplined energy today — a good day for {poss} to grind out real, patient work." },
  },
  // ── Jupiter: opening, optimism, room to grow ──
  [PAIR("jupiter", "sun")]: {
    flow:   { short: "A day that widens {poss} horizons — confidence and timing are on {poss} side. Reach a little further." },
    fusion: { short: "A genuinely expansive day for {poss} — say yes to the bigger version." },
  },
  [PAIR("jupiter", "moon")]: {
    flow:   { short: "An emotionally generous day — {poss} heart has more room than usual. Good for reaching out and being reached." },
    fusion: { short: "Warm, hopeful feelings run high today — {poss} outlook lifts on its own." },
  },
  [PAIR("jupiter", "venus")]: {
    flow:   { short: "A warm, sociable day for {poss} — generosity and good company flow easily. A good time to connect." },
    fusion: { short: "A big-hearted day for {poss} bonds — affection and generosity come easily." },
  },
  // ── Mars: heat, drive, the short fuse ──
  [PAIR("mars", "sun")]: {
    friction: { short: "{poss} energy runs hot and patience runs short today — pick the one thing worth the push and skip the rest." },
    fusion:   { short: "High drive and a bit of a temper today — great for action, risky for arguments. Aim it well." },
  },
  [PAIR("mars", "moon")]: {
    friction: { short: "Feelings and irritation sit close together today — a small thing can spark {poss} temper. Name the hurt under the heat." },
    fusion:   { short: "Emotions run hot and fast today — the reaction comes before the thought, so give it a beat." },
  },
  [PAIR("mars", "venus")]: {
    friction: { short: "Wanting and warmth pull in different directions today — {poss} may feel restless in {poss} bonds. Say plainly what {poss} actually needs.", adultOnly: true },
    fusion:   { short: "Attraction and heat run strong today for {poss} — good chemistry, quick to spark. Keep it honest.", adultOnly: true },
    flow:     { short: "An easy, affectionate energy for {poss} today — warmth and get-up-and-go point the same way." },
  },
  [PAIR("mars", "mars")]: {
    fusion: { short: "A high-energy day — {poss} drive is turbocharged. Point it at something physical or productive." },
  },
  // ── Pluto: deep, slow, transformative pressure ──
  [PAIR("pluto", "moon")]: {
    friction: { short: "Deep feelings surface today, stronger than the moment seems to call for — let them move through without trying to control them." },
    fusion:   { short: "An emotionally intense day — something under the surface wants to shift. Don't force it; let it." },
  },
  [PAIR("pluto", "sun")]: {
    friction: { short: "A day of quiet power struggles — {poss} sense of self is being reshaped. Hold steady without needing to win." },
    fusion:   { short: "A day of real inner change for {poss} — an old version is loosening its grip. Let it." },
  },
  // ── Uranus: the jolt, the break from routine ──
  [PAIR("uranus", "moon")]: {
    friction: { short: "Restlessness and a need to shake things up today — {poss} emotional routine feels too tight. Change one small thing." },
    fusion:   { short: "A jolt to {poss} emotional world today — something wants to change. Stay loose." },
  },
  [PAIR("uranus", "sun")]: {
    fusion: { short: "A day that breaks {poss} routine open — expect the unexpected and let it land." },
  },
  // ── Neptune: the soft, blurring, dreamy fog ──
  [PAIR("neptune", "moon")]: {
    fusion:   { short: "A tender, dreamy, slightly foggy day — {poss} feelings blur at the edges. Rest and quiet help; big decisions can wait." },
    friction: { short: "Emotional signals are hard to read today — don't trust the fog to tell {poss} the whole story." },
  },
  [PAIR("neptune", "sun")]: {
    friction: { short: "{poss} sense of direction feels hazy today — a day to drift a little, not to decide." },
  },
  // ── Venus: warmth, ease, connection (all family-safe) ──
  [PAIR("venus", "moon")]: {
    flow:   { short: "A soft, affectionate day — {poss} closest bonds feel easy and warm. Enjoy the closeness." },
    fusion: { short: "Warmth is front and centre today — a lovely day for {poss} to feel connected." },
  },
  [PAIR("venus", "venus")]: {
    flow: { short: "An easy, pleasant day for {poss} — good company and small comforts land well." },
  },
  // ── Mercury: thinking, talking, small decisions ──
  [PAIR("mercury", "moon")]: {
    friction: { short: "Thoughts and feelings tangle today — {poss} may say it sideways. Ask what {poss} actually feels." },
    flow:     { short: "A good day for {poss} to say how {poss} feels — words and emotions line up." },
  },
  [PAIR("mercury", "mercury")]: {
    flow: { short: "A quick, clear-thinking day for {poss} — good for conversations and decisions." },
  },
  // ── Sun: vitality, focus, being seen ──
  [PAIR("sun", "sun")]: {
    fusion: { short: "A day that puts {poss} in the spotlight — energy and focus return. Use it." },
  },
  [PAIR("sun", "moon")]: {
    flow: { short: "A day when {poss} outer life and inner needs line up — things feel a little more whole." },
  },
  // ── Moon: the fast, monthly emotional weather ──
  [PAIR("moon", "moon")]: {
    fusion: { short: "The monthly reset of {poss} emotional weather — a day to notice how {poss} actually feel and recalibrate." },
  },
};

function applyPoss(s: string, poss: string): string {
  return s.split("{poss}").join(poss);
}

/**
 * The plain-language meaning of a real transit hit. Returns { short, long }:
 * `short` is the one-line headline the UI leads with, `long` a fuller 1-2
 * sentence version. Never empty, never fabricated — a curated pair when one is
 * authored for these two bodies + this aspect quality, otherwise an accurate
 * composed translation of the geometry.
 */
export function interpretTransit(hit: TransitHit, opts: TransitInterpretOptions = {}): Reading {
  const poss = opts.possessive ?? "their";
  const t = hit.transitBody as BodyKey;
  const n = hit.natalBody as BodyKey;
  const tone = ASPECT_TONE[hit.type as AspectKey] ?? "friction";

  const curated = TRANSIT_PAIR[PAIR(t, n)]?.[tone];
  if (curated && !(curated.adultOnly && opts.minorSafe)) {
    const force = TRANSIT_FORCE[t];
    const area = NATAL_AREA[n];
    const guidance = TRANSIT_GUIDANCE[t];
    return {
      short: applyPoss(curated.short, poss),
      long: curated.long
        ? applyPoss(curated.long, poss)
        : composeLong(force, area, guidance, poss, tone),
    };
  }

  const force = TRANSIT_FORCE[t] ?? "a passing influence";
  const area = NATAL_AREA[n] ?? "inner life";
  const guidance = TRANSIT_GUIDANCE[t] ?? "notice it, and let it pass";
  return {
    short: composeShort(force, area, guidance, poss, tone),
    long: composeLong(force, area, guidance, poss, tone),
  };
}

/**
 * The quiet notation "receipt" shown small under the meaning, e.g.
 * "Saturn square Uranus". Title-cases the bodies and keeps the aspect word;
 * the caller appends the orb (e.g. " · 0.0°"). No "transiting/natal" prose —
 * this is the compact proof for astrology-literate readers, not the headline.
 */
export function transitNotation(hit: TransitHit): string {
  return `${cap(hit.transitBody)} ${hit.type} ${cap(hit.natalBody)}`;
}
