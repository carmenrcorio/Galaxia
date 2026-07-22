// packages/astro/src/generational-interpretations.ts
//
// Curated generational interpretation copy for the compare "Generational call-out".
// FOUNDER-REVIEW: every string below is static, hand-authored copy. It is looked up
// by (planet, sign) or by planet. It is NEVER generated, composed, or paraphrased at
// render time. Same discipline as the natal interpretation library.
//
// Generational placements are cohort-level by nature (everyone born in the same window
// shares them). Copy is written to read as honestly cohort-level, never as a personal
// chart insight it isn't.
//
// Bodies covered: uranus, neptune, pluto (the only bodies the engine emits here).
// Signs covered: all 12 per body, so ancestor charts (1800+) never hit the fail-safe.

import type { Sign } from "./index";

export type GenPlanet = "uranus" | "neptune" | "pluto";

export interface GenPlacementEntry {
  // What this generational placement is about. Also reused as the proof/flavor text
  // inside a divergence render ("You: Uranus in X (essence). Them: Uranus in Y (essence).")
  essence: string;
  // Forward "between you two" guidance when BOTH people share this exact placement.
  shared: string;
}

export interface GenPlanetFrame {
  // One line naming the planet's generational domain.
  domain: string;
  // Forward watch-for guidance when A and B differ on this planet.
  diverged: string;
}

// -------------------------------------------------------------------------------------
// PER-PLACEMENT ENTRIES
// -------------------------------------------------------------------------------------

export const GEN_PLACEMENTS: Record<GenPlanet, Partial<Record<Sign, GenPlacementEntry>>> = {
  uranus: {
    Aries: {
      essence: "freedom as raw independence, the drive to break new ground and start fresh on your own terms.",
      shared: "You both treat independence as non negotiable, so neither of you smothers the other. Give each other room to run, and check in before you read that space as distance.",
    },
    Taurus: {
      essence: "upheaval in what feels secure, a slow and stubborn change around money, the body, and what you can hold.",
      shared: "You both change at your own deliberate pace and distrust anything rushed, so you can build something durable. Say the plan out loud, because you will both dig in silently otherwise.",
    },
    Gemini: {
      essence: "restless minds and a hunger for new information, ideas, and ways of talking.",
      shared: "You both come alive around ideas and can talk for hours, which is the easy fuel of this bond. Let some conversations land on a decision, not just another interesting tangent.",
    },
    Cancer: {
      essence: "shaking up home and family, redefining what safety and belonging are allowed to look like.",
      shared: "You both feel change most where it touches home, so you protect each other's sense of safety by instinct. Say when something feels unsettled instead of quietly bracing.",
    },
    Leo: {
      essence: "the right to be a bold, unmistakable individual, expressed loudly and creatively.",
      shared: "You both need room to be fully yourselves and will cheer that in each other. Make sure the spotlight passes back and forth, so neither one is only ever the audience.",
    },
    Virgo: {
      essence: "overhauling how work, health, and daily systems get done, a practical and precise rebellion.",
      shared: "You both improve things by instinct and notice what is not working, so you fix problems as a team. Aim that critical eye at the problem, not at each other.",
    },
    Libra: {
      essence: "rewriting the rules of relationship and partnership, and what fairness between people really means.",
      shared: "You both care deeply about fairness and read imbalance quickly, so you self correct well together. Say the small unfairness early, before keeping score becomes the habit.",
    },
    Scorpio: {
      essence: "breaking taboos around power, intimacy, and the things usually kept hidden.",
      shared: "You both go straight to the real thing and distrust surface, so you can be unusually honest. Let some things stay light, because not every moment has to go to the depths.",
    },
    Sagittarius: {
      essence: "freedom of belief and a restless push past every border, the literal ones and the mental ones.",
      shared: "You both need room to explore and hate being fenced in, so you grant each other freedom easily. Come back and connect the adventures, or freedom quietly turns into two separate orbits.",
    },
    Capricorn: {
      essence: "reinventing authority and structure, reforming institutions out of a demand that they be better.",
      shared: "You both want to build something real and respect competence, so you take each other seriously. Schedule the unstructured time too, or the bond becomes all projects and no play.",
    },
    Aquarius: {
      essence: "change as a birthright, wired toward technology, networks, and a collective humanitarian future.",
      shared: "You both think in terms of the bigger system and the greater good, so your values line up fast. Bring it back to the personal, the two of you, not only the cause.",
    },
    Pisces: {
      essence: "dissolving old boundaries, a spiritual, imaginative, and compassionate kind of change.",
      shared: "You both sense the mood beneath the words and move with a lot of empathy, so you attune easily. Name things plainly sometimes, because you will both drift on unspoken feeling.",
    },
  },

  neptune: {
    Leo: {
      essence: "the dream of glamour and the golden spotlight, of romance, drama, and creative shine.",
      shared: "You both quietly long for a life with some magic in it, and you can give each other that sense of occasion. Keep making ordinary days feel a little special, it is how you both feel loved.",
    },
    Virgo: {
      essence: "the ideal of humble service and craft, meaning found in useful, careful, well done work.",
      shared: "You both find something almost sacred in doing things right, so effort reads as devotion between you. Say the appreciation out loud, do not assume the good work speaks for itself.",
    },
    Libra: {
      essence: "the longing for ideal partnership, peace, and real beauty in how people come together.",
      shared: "You both carry a picture of how good togetherness can feel and reach for harmony by instinct. Let the real, imperfect version of each other matter more than the ideal you each picture.",
    },
    Scorpio: {
      essence: "the pull toward intensity and the mystical, toward intimacy, taboo, and what lies underneath.",
      shared: "You both crave depth and are drawn to what is hidden, so shallow does not satisfy either of you. Let the intensity rest sometimes, closeness does not have to be profound to be real.",
    },
    Sagittarius: {
      essence: "the longing for meaning and adventure, for faith, travel, and a bigger truth to believe in.",
      shared: "You both dream in terms of meaning and the open road, so you inspire each other toward something larger. Ground one shared dream into an actual plan, or it stays forever on the horizon.",
    },
    Capricorn: {
      essence: "grounding dreams in the real world, ambition tempered by duty and ideals that have to actually work.",
      shared: "You both distrust a dream that cannot be built and respect the ones who do the work, so you keep each other honest. Let yourselves want something impractical together once in a while.",
    },
    Aquarius: {
      essence: "the dream of a connected humanity, of progress, technology, and a shared future.",
      shared: "You both imagine a better collective future and feel for people at scale, so your ideals travel together. Make sure the two of you are also just close, not only aligned on the big picture.",
    },
    Pisces: {
      essence: "boundless compassion and imagination, the dream of oneness and a gentler world.",
      shared: "You both feel deeply and merge easily with a mood or a person, so you understand each other almost wordlessly. Keep a few edges of your own, or you will both dissolve into the other.",
    },
    Aries: {
      essence: "a new dream being born, of spiritual courage and the ideal of the bold, awakened self.",
      shared: "You both carry a fresh, brave sense of what a person can become, so you encourage each other to begin. Give the new starts time to root, not every spark needs to be chased at once.",
    },
    // Pre-1920 ancestor placements below.
    Taurus: {
      essence: "the dream woven into wealth, beauty, and the comfort of the material world.",
      shared: "You both find the ideal in beauty and steady comfort, and you build a warm, sensory closeness. Make sure the ease does not quietly become the whole point.",
    },
    Gemini: {
      essence: "the dream of ideas and words, of invention, communication, and a restless imagination.",
      shared: "You both romance the world through words and curiosity, so talk is where your bond breathes. Let some things be felt, not only discussed.",
    },
    Cancer: {
      essence: "the dream of home and homeland, a deep longing for roots and emotional belonging.",
      shared: "You both idealize home and the feeling of belonging, so you make each other a refuge. Let the nest have a door, closeness should not require withdrawing from the world.",
    },
  },

  pluto: {
    Cancer: {
      essence: "power rooted in home, family, and belonging, and the deep instinct to protect them.",
      shared: "You both guard what is yours fiercely and feel power through loyalty, so you defend each other without being asked. Watch that protection does not slide into control of each other.",
    },
    Leo: {
      essence: "power through the individual will, the transformation of what a single self is allowed to want.",
      shared: "You both have strong wills and a sense of your own importance, so you take each other seriously as forces. Let there be two centers of gravity, not a contest over whose will wins.",
    },
    Virgo: {
      essence: "power through work and systems, the drive to tear down and rebuild how things function.",
      shared: "You both transform things by fixing and refining them, so you improve each other's lives quietly and constantly. Accept some things, and each other, as good enough rather than always a project.",
    },
    Libra: {
      essence: "power reworked through relationships and justice, the deep question of who gets a fair share.",
      shared: "You both feel power through fairness and read the balance of a bond closely, so inequity between you surfaces fast. Address the imbalance directly instead of quietly rebalancing the ledger.",
    },
    Scorpio: {
      essence: "power faced head on, through intensity, taboo, and the drive to transform by way of what is hidden.",
      shared: "You both go all in and can handle the truths most people avoid, so you reach a depth few pairs do. Let some things be simple, and let each other fully back after the storm, no residue.",
    },
    Sagittarius: {
      essence: "power through belief and truth, the impulse to question every authority and reach past every border.",
      shared: "You both transform through what you believe and refuse to be told how it is, so you push each other to grow. Leave room for the other to change their mind without it being a defeat.",
    },
    Capricorn: {
      essence: "power in the structures themselves, a reckoning with institutions, authority, and who really runs things.",
      shared: "You both see the machinery behind the surface and want real accountability, so you strategize well together. Do not let everything become a matter of control, some things can just be shared.",
    },
    Aquarius: {
      essence: "power moving to the collective, toward networks, technology, and a reordering of who holds it.",
      shared: "You both instinctively distribute power and distrust anyone hoarding it, so your bond stays unusually equal. Let it get personal and particular, not only principled.",
    },
    // Pre-1920 ancestor placements below.
    Pisces: {
      essence: "power through faith and dissolution, transformation in the unseen and the surrendered.",
      shared: "You both sense that real power lies in letting go, so you can face endings together without flinching. Keep one foot in the practical world while you do.",
    },
    Aries: {
      essence: "power as raw force and pioneering will, the drive to seize and begin.",
      shared: "You both meet power head on and would rather act than wait, so you embolden each other. Aim the force at the world, not at each other.",
    },
    Taurus: {
      essence: "power through money, land, and industry, control over the material and the enduring.",
      shared: "You both feel power through what is solid and lasting, so you build security together patiently. Hold possessions, and each other, with an open hand.",
    },
    Gemini: {
      essence: "power through information and ideas, the transformation carried by words, news, and connection.",
      shared: "You both know that information is power and move it quickly, so you keep each other sharp. Let knowing sometimes serve feeling, not stand in for it.",
    },
  },
};

// -------------------------------------------------------------------------------------
// PER-PLANET FRAMES (used for divergence)
// -------------------------------------------------------------------------------------
// Divergence render pattern (wired by the component, not composed here):
//   domain line  ->  diverged guidance  ->  proof: "You: {planet} in {signA} ({essenceA}).
//   Them: {planet} in {signB} ({essenceB})."
// The essences are pulled from GEN_PLACEMENTS above, so nothing is authored twice.

export const GEN_PLANET_FRAMES: Record<GenPlanet, GenPlanetFrame> = {
  uranus: {
    domain: "Uranus is how a whole generation meets change and freedom.",
    diverged:
      "Your Uranus signs differ, so your gut sense of what progress and independence should look like was set by different eras. Watch for reading each other's pace as wrong rather than differently timed. Name the moment each of you grew up in, and the gap usually turns into range.",
  },
  neptune: {
    domain: "Neptune is the dream a generation grows up inside.",
    diverged:
      "Your Neptune signs differ, so what you each quietly long for and romanticize comes from different wells. Watch for mistaking a different ideal for no ideal at all. Ask what the other actually reaches toward, and you stop talking past each other.",
  },
  pluto: {
    domain: "Pluto is how a generation handles power and what it is willing to tear down.",
    diverged:
      "Your Pluto signs differ, so your instincts about control, trust, and what has to change run on different settings. Watch for each reading the other as too intense or not serious enough. Respect that you are each reacting to a different thing your era taught you to fear.",
  },
};

// -------------------------------------------------------------------------------------
// SECTION HEADLINES (replace the vague theme ternary)
// -------------------------------------------------------------------------------------
// Selected by the same shared/diverged mix the engine already computes.

export const GEN_HEADLINES = {
  // diverged.length === 0
  allShared:
    "You grew up under the same generational sky. The slow, era defining planets sat in the same signs for both of you, so many of your deepest instincts about change, dreams, and power trace back to the same moment in history.",
  // sameGeneration (shared >= 2) with at least one diverged
  mostlyShared:
    "Most of your generational sky is shared, with a place or two where your eras part. Here is what you carry in common, and the fault line worth naming.",
  // shared < 2
  mostlyDiverged:
    "You were shaped by different chapters of history. Here is where your generational instincts still align, and where they were set by different eras.",
} as const;

// -------------------------------------------------------------------------------------
// Lookup helpers (fail safe: missing entry returns null so the render can skip it or
// fall back to an honest generic cohort line, never fabricate a specific one).
// -------------------------------------------------------------------------------------

export function genPlacement(planet: GenPlanet, sign: Sign): GenPlacementEntry | null {
  return GEN_PLACEMENTS[planet]?.[sign] ?? null;
}

export function genFrame(planet: GenPlanet): GenPlanetFrame {
  return GEN_PLANET_FRAMES[planet];
}

/** Headline from the engine's shared/diverged mix. No other branches. */
export function genHeadline(sharedCount: number, divergedCount: number): string {
  if (divergedCount === 0) return GEN_HEADLINES.allShared;
  if (sharedCount >= 2) return GEN_HEADLINES.mostlyShared;
  return GEN_HEADLINES.mostlyDiverged;
}
