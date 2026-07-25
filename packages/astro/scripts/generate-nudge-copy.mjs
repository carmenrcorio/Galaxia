/**
 * One-shot generator for transit-nudge copy-matrix.ts.
 * Every string is a COMPLETE authored sentence (FOUNDER-REVIEW).
 * Resolver never concatenates fragments — it only selects keys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const THEMES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const CLASSES = ["flow", "friction", "fusion"];
const FRAMINGS = ["self", "partner", "child", "family", "friend", "colleague", "general"];

/** Weighted domains per framing — mirrors BODY_PRIORITY_BY_BAND. */
const WEIGHTED = {
  self: ["sun", "moon", "mercury", "venus", "mars"],
  partner: ["venus", "mars", "sun", "moon"],
  child: ["moon", "mercury", "saturn"],
  family: ["mercury", "moon"],
  friend: ["mercury", "jupiter"],
  colleague: ["mercury", "mars", "saturn"],
  general: [],
};

const THEME_WORD = {
  sun: "being seen",
  moon: "the mood",
  mercury: "thoughts and talk",
  venus: "warmth and closeness",
  mars: "drive and heat",
  jupiter: "room to grow",
  saturn: "real limits",
  uranus: "sudden change",
  neptune: "a soft haze",
  pluto: "deep pressure to change",
};

const DOMAIN_WORD = {
  sun: "sense of self",
  moon: "emotional footing",
  mercury: "way of thinking",
  venus: "way of caring",
  mars: "drive",
  jupiter: "sense of what's possible",
  saturn: "need for structure",
  uranus: "need for freedom",
  neptune: "dreams",
  pluto: "deeper self",
};

const CLASS_VERB = {
  flow: "opens gently around",
  friction: "tests",
  fusion: "lands squarely on",
};

const FRAMING_ADDR = {
  self: { who: "you", poss: "your", tip: "Notice it, and keep the day simple." },
  partner: { who: "them", poss: "their", tip: "A little steadiness between you goes far." },
  child: { who: "them", poss: "their", tip: "Stay close; coach with patience, not pressure." },
  family: { who: "them", poss: "their", tip: "Keep the tone ordinary and kind." },
  friend: { who: "them", poss: "their", tip: "A check-in beats a speech." },
  colleague: { who: "them", poss: "their", tip: "Keep it clear and professional." },
  general: { who: "them", poss: "their", tip: "Go gently." },
};

function dropSentence(theme, cls, framing) {
  const a = FRAMING_ADDR[framing];
  const force = THEME_WORD[theme];
  if (framing === "self") {
    if (cls === "flow") return `An easier stretch — ${force} lifts your day. ${a.tip}`;
    if (cls === "friction") return `A day that tests you through ${force}. ${a.tip}`;
    return `A strong dose of ${force} is on you today. ${a.tip}`;
  }
  if (framing === "child") {
    if (cls === "flow") return `${force[0].toUpperCase()}${force.slice(1)} sits easily with them today — good weather for parenting with softness. ${a.tip}`;
    if (cls === "friction") return `${force[0].toUpperCase()}${force.slice(1)} is pressing on them today. ${a.tip}`;
    return `${force[0].toUpperCase()}${force.slice(1)} runs strong in them today. ${a.tip}`;
  }
  if (framing === "partner") {
    if (cls === "flow") return `${force[0].toUpperCase()}${force.slice(1)} opens an easier lane between you. ${a.tip}`;
    if (cls === "friction") return `${force[0].toUpperCase()}${force.slice(1)} adds friction in the bond today. ${a.tip}`;
    return `${force[0].toUpperCase()}${force.slice(1)} is loud in the relationship today. ${a.tip}`;
  }
  if (framing === "colleague") {
    if (cls === "flow") return `Work weather eases — ${force} helps the day. ${a.tip}`;
    if (cls === "friction") return `Work weather tightens around ${force}. ${a.tip}`;
    return `${force[0].toUpperCase()}${force.slice(1)} is front-and-centre at work today. ${a.tip}`;
  }
  if (cls === "flow") return `An easier day around ${force} for ${a.who}. ${a.tip}`;
  if (cls === "friction") return `A testing day shaped by ${force} for ${a.who}. ${a.tip}`;
  return `${force[0].toUpperCase()}${force.slice(1)} runs strong for ${a.who} today. ${a.tip}`;
}

function fullSentence(theme, cls, domain, framing) {
  const a = FRAMING_ADDR[framing];
  const force = THEME_WORD[theme];
  const area = DOMAIN_WORD[domain];
  const verb = CLASS_VERB[cls];

  if (framing === "self") {
    if (cls === "flow") return `Your ${area} gets a lift from ${force}. ${a.tip}`;
    if (cls === "friction") return `Your ${area} is tested by ${force}. ${a.tip}`;
    return `Your ${area} gets a strong dose of ${force}. ${a.tip}`;
  }
  if (framing === "child") {
    if (cls === "flow") {
      return `As their parent, notice how ${force} ${verb} their ${area} — meet it with softness. ${a.tip}`;
    }
    if (cls === "friction") {
      return `As their parent, ${force} is testing their ${area}. ${a.tip}`;
    }
    return `As their parent, ${force} is loud in their ${area} today. ${a.tip}`;
  }
  if (framing === "partner") {
    // Care/bond language by default; adult romance flagged separately in matrix meta.
    if (cls === "flow") return `${force[0].toUpperCase()}${force.slice(1)} eases their ${area} between you. ${a.tip}`;
    if (cls === "friction") return `${force[0].toUpperCase()}${force.slice(1)} presses on their ${area} in the bond. ${a.tip}`;
    return `${force[0].toUpperCase()}${force.slice(1)} amplifies their ${area} with you today. ${a.tip}`;
  }
  if (framing === "colleague") {
    if (cls === "flow") return `At work, ${force} supports their ${area}. ${a.tip}`;
    if (cls === "friction") return `At work, ${force} tests their ${area}. ${a.tip}`;
    return `At work, ${force} is strong in their ${area}. ${a.tip}`;
  }
  if (cls === "flow") return `${force[0].toUpperCase()}${force.slice(1)} lifts their ${area}. ${a.tip}`;
  if (cls === "friction") return `${force[0].toUpperCase()}${force.slice(1)} tests their ${area}. ${a.tip}`;
  return `${force[0].toUpperCase()}${force.slice(1)} runs strong through their ${area}. ${a.tip}`;
}

function gentle(framing) {
  switch (framing) {
    case "self":
      return "A quiet sky day for you — nothing urgent to act on; stay kind to yourself.";
    case "partner":
      return "Nothing sharp in their sky to act on today — ordinary warmth is enough.";
    case "child":
      return "No pointed sky weather for them today — keep the day ordinary and close.";
    case "family":
      return "A gentle day in their sky — no special ask beyond ordinary care.";
    case "friend":
      return "Their sky is quiet today — a light check-in is plenty.";
    case "colleague":
      return "Nothing pointed in their work sky today — keep the day clear and steady.";
    case "general":
      return "A quiet sky day — nothing urgent; go gently.";
  }
}

const EMPTY = {
  "hedge:year": "Birth year only — a birth date is needed for daily sky notes.",
  "hedge:none": "No birth data yet — add it to see their sky.",
  "hedge:quiet": "No tight sky weather near an exact pass today.",
};

const drop = {};
const full = {};
const adultKeys = new Set();
let dropCount = 0;
let fullCount = 0;

for (const theme of THEMES) {
  for (const cls of CLASSES) {
    for (const framing of FRAMINGS) {
      const key = `drop:${theme}:${cls}:${framing}`;
      drop[key] = dropSentence(theme, cls, framing);
      dropCount += 1;
    }
  }
}

const gentleMap = {};
for (const framing of FRAMINGS) {
  gentleMap[`gentle:${framing}`] = gentle(framing);
}

for (const framing of FRAMINGS) {
  for (const domain of WEIGHTED[framing]) {
    for (const theme of THEMES) {
      for (const cls of CLASSES) {
        const key = `full:${theme}:${cls}:${domain}:${framing}`;
        full[key] = fullSentence(theme, cls, domain, framing);
        fullCount += 1;
        // Adult/romance keys — partner Venus/Mars friction|fusion only.
        if (
          framing === "partner" &&
          (theme === "venus" || theme === "mars" || domain === "venus" || domain === "mars") &&
          (cls === "friction" || cls === "fusion") &&
          (theme === "venus" || theme === "mars") &&
          (domain === "venus" || domain === "mars" || domain === "sun" || domain === "moon")
        ) {
          // Mark partner mars/venus heat lines as adult-only.
          if ((theme === "mars" || theme === "venus") && (domain === "venus" || domain === "mars")) {
            adultKeys.add(key);
            if (theme === "mars" && domain === "venus" && cls === "friction") {
              full[key] = "Wanting and warmth pull apart between you today — say plainly what you each need.";
            }
            if (theme === "mars" && domain === "venus" && cls === "fusion") {
              full[key] = "Attraction and heat run strong between you today — keep it honest.";
            }
            if (theme === "venus" && domain === "mars" && cls === "fusion") {
              full[key] = "Desire and drive point the same way between you — good chemistry, easy to rush.";
            }
          }
        }
      }
    }
  }
}

const outPath = path.join(__dirname, "../src/transit-nudge/copy-matrix.ts");
const banner = `/**
 * FOUNDER-REVIEW: authored — transit nudge copy matrix.
 * Every value is a COMPLETE sentence. The resolver selects a key and freezes
 * the string; it never concatenates FORCE/AREA/GUIDANCE fragments.
 *
 * Counts: drop_domain=${dropCount}, framing_gentle=${FRAMINGS.length},
 * full_specificity=${fullCount}, empty_hedge=${Object.keys(EMPTY).length}.
 * Total authored=${dropCount + FRAMINGS.length + fullCount + Object.keys(EMPTY).length}.
 *
 * Generated by scripts/generate-nudge-copy.mjs — re-run to regenerate; edit
 * strings in place afterward for voice. Adult-only keys listed in ADULT_ONLY_KEYS.
 */

export const EMPTY_HEDGE: Record<string, string> = ${JSON.stringify(EMPTY, null, 2)};

export const FRAMING_GENTLE: Record<string, string> = ${JSON.stringify(gentleMap, null, 2)};

export const DROP_DOMAIN: Record<string, string> = ${JSON.stringify(drop, null, 2)};

export const FULL_SPECIFICITY: Record<string, string> = ${JSON.stringify(full, null, 2)};

export const ADULT_ONLY_KEYS: ReadonlySet<string> = new Set(${JSON.stringify([...adultKeys])});

export const COPY_MATRIX_COUNTS = {
  drop_domain: ${dropCount},
  framing_gentle: ${FRAMINGS.length},
  full_specificity: ${fullCount},
  empty_hedge: ${Object.keys(EMPTY).length},
  adult_only: ${adultKeys.size},
  total: ${dropCount + FRAMINGS.length + fullCount + Object.keys(EMPTY).length},
} as const;
`;

fs.writeFileSync(outPath, banner);
console.log("Wrote", outPath);
console.log({
  dropCount,
  gentle: FRAMINGS.length,
  fullCount,
  empty: Object.keys(EMPTY).length,
  adult: adultKeys.size,
  total: dropCount + FRAMINGS.length + fullCount + Object.keys(EMPTY).length,
});
