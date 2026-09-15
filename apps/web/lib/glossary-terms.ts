/**
 * Static glossary for `/glossary`. Terms were extracted from published
 * `public.posts` bodies (status = 'published', 10 rows) by counting
 * distinct-post mentions; the list is curated to 35 technique and
 * placement words that show up in at least two posts, plus the remaining
 * major aspect (sextile) and outer planets (Uranus, Neptune) so the
 * closed sets stay complete. Saturn return and retrograde did not appear
 * in the corpus and are omitted.
 *
 * Definitions are authored copy, never generated (ENGINEERING.md §12).
 */

export interface GlossaryReadMore {
  slug: string;
  title: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  /** Distinct published posts that mention this term (or a close form). */
  postCount: number;
  definition: string;
  readMore: GlossaryReadMore | null;
}

export interface GlossaryLetterGroup {
  letter: string;
  terms: GlossaryTerm[];
}

// FOUNDER-REVIEW: every `term`, `definition`, and `readMore.title` below.
// Titles of existing posts are quoted as published; definitions are new.

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  {
    id: "aspect",
    term: "Aspect",
    postCount: 8,
    definition:
      "An aspect is the angle between two placements in one chart, or between two people's charts. Some angles move together easily; others produce friction that does not go away. Naming the aspect gives two people a shared word for a pattern they have already been living.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "birth-chart",
    term: "Birth chart",
    postCount: 3,
    definition:
      "A birth chart is a map of where the planets actually were at the moment and place of a birth. It is the same object as a natal chart: the placements, the signs, the houses, and the aspects between them. One placement standing in for that whole map is how a person ends up feeling misread.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "birth-time",
    term: "Birth time",
    postCount: 5,
    definition:
      "Birth time is the local clock time at the birth place, converted to UTC with that place's historical timezone. It is what locks the rising sign and the houses; without it, those layers stay uncertain rather than guessed. Galaxia will say when a time is missing instead of filling one in.",
    readMore: {
      slug: "reading-chart-of-someone-who-died",
      title: "Reading the Chart of Someone Who Has Died",
    },
  },
  {
    id: "compatibility-score",
    term: "Compatibility score",
    postCount: 3,
    definition:
      "A compatibility score grades two sun signs, or a thin slice of two charts, as a percentage. The number answers a question about categories, not about two specific people. Synastry is the alternative: a map of contacts, not a grade.",
    readMore: {
      slug: "compatibility-scores-wrong-question",
      title: "Why Compatibility Scores Are the Wrong Question",
    },
  },
  {
    id: "conjunction",
    term: "Conjunction",
    postCount: 3,
    definition:
      "A conjunction is two placements sitting at or very near the same degree. They do not take turns; they move as one charge. In one person that fusion is hard to see from inside; between two people it reads as merged and amplified.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "flows-and-catches",
    term: "Flows and catches",
    postCount: 6,
    definition:
      "Flows are the structurally easy contacts in a synastry: ease neither person had to build. Catches are the structurally effortful ones, a place two people reliably snag, often for years, without either being at fault. Both are permanent, and naming them is the useful work; scoring them is not.",
    readMore: {
      slug: "synastry-chart-meaning",
      title: "What a Synastry Chart Tells You About Your Relationship",
    },
  },
  {
    id: "generational-astrology",
    term: "Generational astrology",
    postCount: 2,
    definition:
      "Generational astrology is the slow outer-planet layer (Pluto, Neptune, Uranus) that a whole birth window shares. It describes shared premises about authority, loyalty, and what work is for, not a personality. Year of birth is enough to see this layer; it is not a substitute for a natal chart.",
    readMore: {
      slug: "nobody-has-your-grandmother",
      title: "Nobody's Astrology App Has Your Grandmother In It",
    },
  },
  {
    id: "horoscope",
    term: "Horoscope",
    postCount: 3,
    definition:
      "A horoscope, in the magazine sense, is a sun-sign paragraph written for one twelfth of the population. It is not a natal chart. The gap a person feels when their sign does not fit is usually this format, not someone who failed astrology.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "house",
    term: "House",
    postCount: 5,
    definition:
      "A house is one of twelve life arenas in a natal chart: where in a person's life a placement tends to show up. Mars in a partnership house and Mars in a work house are the same planet in different rooms. A sign has no concept of a house, which is why a one-word sign cannot carry this layer.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "jupiter",
    term: "Jupiter",
    postCount: 2,
    definition:
      "Jupiter describes where a person grows, hopes, and looks for a bigger frame. It is the placement of meaning and appetite, the places they want more life. It does not promise those places will arrive.",
    readMore: null,
  },
  {
    id: "mars",
    term: "Mars",
    postCount: 6,
    definition:
      "Mars describes how a person acts, pursues, and handles friction. Two Mars placements in a relationship show what happens when those two conflict styles share a room. The chart names the wiring; it does not decide who wins a fight.",
    readMore: {
      slug: "what-a-chart-cannot-tell-you",
      title: "What a Chart Cannot Tell You",
    },
  },
  {
    id: "mercury",
    term: "Mercury",
    postCount: 5,
    definition:
      "Mercury describes how a person thinks, talks, and takes in information. When two Mercuries sit close together, conversation often needs less translation. When they do not, the same sentence can land as two different conversations.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "moon",
    term: "Moon",
    postCount: 10,
    definition:
      "The Moon is the placement of emotional need and instinctive reaction: what someone requires to feel received, and what they offer when they want to repair. It moves fast, so a birth date usually places it; a birth time is needed when the date sits near a sign change. Two people's Moons in contact describe whether emotional life between them feels like a shared language or a translation problem.",
    readMore: {
      slug: "mothers-moon-sign-apology",
      title: "What Your Mother's Moon Sign Says About How She Says Sorry",
    },
  },
  {
    id: "moon-conjunct-moon",
    term: "Moon conjunct Moon",
    postCount: 2,
    definition:
      "Moon conjunct Moon is both people's Moons at or near the same degree. Moods land the same way, comfort looks similar, and feelings do not need as much translation. It shows up in romance, family, and friendship the same way: an emotional shorthand other people notice first.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "moon-sign",
    term: "Moon sign",
    postCount: 5,
    definition:
      "The Moon sign describes how a person processes emotion and what they need to feel safe. It is often more accurate than the Sun sign for understanding someone's private behavior. Two people with very different Moon signs can love each other completely and still spend years speaking slightly past each other.",
    readMore: {
      slug: "mothers-moon-sign-apology",
      title: "What Your Mother's Moon Sign Says About How She Says Sorry",
    },
  },
  {
    id: "moon-square-saturn",
    term: "Moon square Saturn",
    postCount: 4,
    definition:
      "Moon square Saturn is one person's Moon at a 90-degree angle to the other person's Saturn: emotional need meeting structure, limits, or containment. Neither person is usually trying to hurt the other; the Moon brings feeling and Saturn compresses or redirects it. Named out loud, it stops being a character flaw and becomes a pattern two people can work with.",
    readMore: {
      slug: "moon-square-saturn-parent-child",
      title: "Moon Square Saturn Between a Parent and a Child",
    },
  },
  {
    id: "natal-chart",
    term: "Natal chart",
    postCount: 7,
    definition:
      "A natal chart is the computed map of planetary positions at a birth: signs, houses, and aspects, from astronomical data rather than a generated paragraph. It describes how a person is built, what they reach toward, what they pull back from, and where they hold tension. It does not forecast events, assign moral character, or decide a life.",
    readMore: {
      slug: "what-a-chart-cannot-tell-you",
      title: "What a Chart Cannot Tell You",
    },
  },
  {
    id: "neptune",
    term: "Neptune",
    postCount: 1,
    definition:
      "Neptune describes where a person, and more often a generation, aims idealism: meaning, a functioning structure, or a fair system, depending on the sign. In a natal chart it is the placement of dreams, blur, and the places someone can get lost in an ideal. It does not say whether they will be deceived or will deceive.",
    readMore: {
      slug: "colleague-you-cannot-read",
      title: "The Colleague You Cannot Read",
    },
  },
  {
    id: "north-node",
    term: "North Node",
    postCount: 1,
    definition:
      "The North Node is a mathematical point, not a planet: a marker for the direction of growth this lifetime. When it sits on another person's Sun, Moon, or personal planet, people often describe an early sense of significance that is hard to explain from outside. It is a contact to name, not a verdict that the two people were supposed to stay.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "opposition",
    term: "Opposition",
    postCount: 3,
    definition:
      "An opposition is a 180-degree angle: two placements pulling in opposite directions. In one chart a person can swing between the poles and mistake one for the enemy. Between two people it often reads as a mirroring that needs integration, not victory.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "outer-planets",
    term: "Outer planets",
    postCount: 3,
    definition:
      "The outer planets are Uranus, Neptune, and Pluto: they move slowly enough that a birth window shares them. They describe a generation's premises more than one person's style. Year of birth is enough to compute them; Galaxia will not invent a rising sign from the same year.",
    readMore: {
      slug: "colleague-you-cannot-read",
      title: "The Colleague You Cannot Read",
    },
  },
  {
    id: "personal-planets",
    term: "Personal planets",
    postCount: 3,
    definition:
      "The personal planets are the Sun, Moon, Mercury, Venus, and Mars. They belong to a person, not a decade, and they are the layer a date-and-place chart can still read when a birth time is missing. They are also the usual targets in synastry: how two people think, care, fight, and need.",
    readMore: {
      slug: "colleague-you-cannot-read",
      title: "The Colleague You Cannot Read",
    },
  },
  {
    id: "placement",
    term: "Placement",
    postCount: 8,
    definition:
      "A placement is one body or point in one sign and, when the time is known, one house. Sign describes the style; house describes the room of life. Stacked together, a placement stops being a trait and becomes closer to a specific instruction: this energy, showing up here.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "pluto",
    term: "Pluto",
    postCount: 2,
    definition:
      "Pluto describes where a person meets power, intensity, and the things that do not stay on the surface. In a natal chart it is a personal underworld; shared by a generation, it is the drive underneath a whole cohort's relationship to authority and truth. It carries no moral information.",
    readMore: {
      slug: "colleague-you-cannot-read",
      title: "The Colleague You Cannot Read",
    },
  },
  {
    id: "rising-sign",
    term: "Rising sign",
    postCount: 5,
    definition:
      "The rising sign (the Ascendant) is the sign that was coming up over the eastern horizon at the birth time. It is the first-impression layer: how a person meets the room before the Sun or Moon is obvious. Without a birth time it cannot be computed honestly, and Galaxia will not invent one.",
    readMore: {
      slug: "reading-chart-of-someone-who-died",
      title: "Reading the Chart of Someone Who Has Died",
    },
  },
  {
    id: "saturn",
    term: "Saturn",
    postCount: 7,
    definition:
      "Saturn describes structure, limits, duty, and the instinct toward containment. In a person it is where they feel the need to get it right, and the cost of that. In synastry, Saturn on another person's Moon or personal planet is often the architecture of help that does not feel like care.",
    readMore: {
      slug: "moon-square-saturn-parent-child",
      title: "Moon Square Saturn Between a Parent and a Child",
    },
  },
  {
    id: "sextile",
    term: "Sextile",
    postCount: 1,
    definition:
      "A sextile is a 60-degree angle: an easy, available talent that works when someone reaches for it and sits idle when they do not. In synastry it is a door left unlocked between two people, not a guarantee they will walk through it.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "square",
    term: "Square",
    postCount: 5,
    definition:
      "A square is a 90-degree angle: two parts that do not easily cooperate. In a natal chart it is productive friction inside one person; in synastry it is two people's wiring meeting at that same awkward angle. It never fully resolves, and it is not supposed to.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "sun",
    term: "Sun",
    postCount: 6,
    definition:
      "The Sun describes the core self: what a person wants to be seen as, and where they shine. It is one placement among many, not a personality. Two people who share a Sun sign can still handle conflict, need, and love in completely different ways.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "sun-sign",
    term: "Sun sign",
    postCount: 3,
    definition:
      "The Sun sign is the sign the Sun occupied at birth: roughly one twelfth of a natal chart, doing its best to stand in for the rest. It describes a core style of identity, not how someone thinks, needs, or fights. When a horoscope feels wrong, this is usually the missing data, not a person who is a bad fit for astrology.",
    readMore: {
      slug: "sun-sign-not-personality",
      title: "Your Sun Sign Is Not Your Personality",
    },
  },
  {
    id: "synastry",
    term: "Synastry",
    postCount: 9,
    definition:
      "Synastry is the comparison of two natal charts: every placement in one against every placement in the other, aspect by aspect. A synastry chart is that overlay: a map of flows and catches, not a compatibility score, and not a verdict on whether to stay or who is at fault.",
    readMore: {
      slug: "synastry-chart-meaning",
      title: "What a Synastry Chart Tells You About Your Relationship",
    },
  },
  {
    id: "transit",
    term: "Transit",
    postCount: 2,
    definition:
      "A transit is a planet in the sky right now making an aspect to a natal placement. It describes a weather system moving over a fixed chart, landing differently in each person it touches. It is not a forecast of a specific event; it is a period of activity in a specific part of the wiring.",
    readMore: {
      slug: "nobody-has-your-grandmother",
      title: "Nobody's Astrology App Has Your Grandmother In It",
    },
  },
  {
    id: "trine",
    term: "Trine",
    postCount: 2,
    definition:
      "A trine is a 120-degree angle: so easy the people involved often do not notice it. In a natal chart it is often a greatest gift and a least developed one. In synastry it is unforced ease, the kind of contact people undersell because it never demanded their attention.",
    readMore: {
      slug: "synastry-aspects-explained",
      title: "7 Synastry Aspects That Predict How Relationships Feel",
    },
  },
  {
    id: "uranus",
    term: "Uranus",
    postCount: 1,
    definition:
      "Uranus describes how a person, or a seven-year cohort, handles disruption: naming what is not working, pushing back on unjustified authority, finding workarounds when systems fail. It is a wiring toward honesty about broken things, not opposition for its own sake.",
    readMore: {
      slug: "colleague-you-cannot-read",
      title: "The Colleague You Cannot Read",
    },
  },
  {
    id: "venus",
    term: "Venus",
    postCount: 7,
    definition:
      "Venus describes how a person loves, what they are drawn to, and what they decide is worth keeping. It is the placement of attachment style, not a verdict on faithfulness or kindness. In synastry, Venus contacts describe how care gets expressed and whether it lands.",
    readMore: {
      slug: "what-a-chart-cannot-tell-you",
      title: "What a Chart Cannot Tell You",
    },
  },
];

export function groupGlossaryByLetter(
  terms: readonly GlossaryTerm[] = GLOSSARY_TERMS,
): GlossaryLetterGroup[] {
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, "en"));
  const groups: GlossaryLetterGroup[] = [];
  for (const item of sorted) {
    const letter = item.term[0]!.toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.terms.push(item);
    } else {
      groups.push({ letter, terms: [item] });
    }
  }
  return groups;
}

// FOUNDER-REVIEW: page title, meta description, and visible lede.
export const GLOSSARY_TITLE = "Astrology terms, plainly defined";
export const GLOSSARY_DESCRIPTION =
  "Plain-English definitions of natal charts, synastry, aspects, and houses. What each term is, and why it matters for understanding a person.";
export const GLOSSARY_LEDE =
  "The words Galaxia uses to describe how a person is built. Not a horoscope. Not a prediction. A shared vocabulary for natal charts, synastry, and the contacts between them.";
