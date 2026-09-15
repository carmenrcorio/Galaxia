// NOTE: the package has no `./types` module — `SignKey` is defined and
// exported from `./interpretations`. Import path adjusted accordingly.
import type { SignKey } from "./interpretations";

/**
 * PHASE 0 DIAGNOSIS (founder review, complete before this ships).
 *
 * What this file describes
 * ------------------------
 * Cohort-level history for the slow planet that names a generation: Pluto's
 * sign. `computeGenerational` (index.ts) also emits Uranus and Neptune; those
 * have their own curated library in `generational-interpretations.ts` (compare
 * call-out essences). This file is the Pluto-sign extended layer: the essay,
 * the figures, the era events, and the family-bridge pairings.
 *
 * Placements that drive it
 * ------------------------
 * Confident natal Pluto sign only. Year-only births that straddle a sign
 * change must not render this copy (person page already gates on
 * `pluto.confident === true`). Uranus and Neptune are not keys here.
 * `GENERATION_BY_YEAR` is a separate Strauss-Howe-style name lookup from
 * birth year (Lost / Greatest / Silent / Boomers / X / Millennials / Z /
 * Alpha). It does not author the essays.
 *
 * How much is curated static copy
 * -------------------------------
 * All of it. `PLUTO_SIGN_EXTENDED`, `FAMILY_BRIDGE`, `GENERATION_BY_YEAR`,
 * and the work / era readings added below are hand-authored tables. Looked
 * up by sign (or by year for the generation name). Never composed, never
 * paraphrased at render time, never generated. Capricorn's
 * `historicalFigures` stays empty rather than inventing names (§12).
 * Unauthored Pluto signs (Aries, Taurus, Gemini, Aquarius, Pisces in this
 * table) return null from the helpers and render nothing.
 *
 * Vocabulary: astrology vs sociology
 * ----------------------------------
 * Framed in astrology vocabulary (planet named in the lead, sign as
 * metaphor): `corruptionSignature` (Leo's gold, Virgo's precision, Libra's
 * scales, Scorpio's gift, Sagittarius's great question), every
 * `plutoBridge`, and `FAMILY_BRIDGE` (opens "You carry Pluto in X").
 * Framed sociologically (era, institutions, historical events, no planet
 * in the lead): `eraEvents` (Depression, Watergate, 9/11, 2008, AIDS,
 * climate), `GENERATION_BY_YEAR` names, and the new `eraReading` /
 * `workView` fields. `eraEvents` already named trust, institutions, and
 * catastrophe; they did not systematically name authority, change, and
 * trust as four equal readings, and they did not lead.
 *
 * Phase 1 adds `eraReading` so every authored Pluto sign leads with a
 * plain-language account of authority, institutions, change, and trust.
 * The placement stays visible as `plutoSourceLine(sign)` ("Source: Pluto
 * in X"), never hidden. Phase 2 adds `workView` (respect, decisions,
 * friction) for professional recorded relationships only.
 */

export const GENERATION_BY_YEAR: ReadonlyArray<{
  from: number; to: number; name: string; span: string;
}> = [
  { from: 1883, to: 1900, name: "The Lost Generation",     span: "born 1883–1900" },
  { from: 1901, to: 1927, name: "The Greatest Generation", span: "born 1901–1927" },
  { from: 1928, to: 1945, name: "The Silent Generation",   span: "born 1928–1945" },
  { from: 1946, to: 1964, name: "Baby Boomers",            span: "born 1946–1964" },
  { from: 1965, to: 1980, name: "Generation X",            span: "born 1965–1980" },
  { from: 1981, to: 1996, name: "Millennials",             span: "born 1981–1996" },
  { from: 1997, to: 2012, name: "Generation Z",            span: "born 1997–2012" },
  { from: 2013, to: 2099, name: "Generation Alpha",        span: "born 2013–present" },
];

export function generationNameForYear(
  year: number
): { name: string; span: string } | null {
  return GENERATION_BY_YEAR.find((g) => year >= g.from && year <= g.to) ?? null;
}

export interface HistoricalFigure {
  name: string;
  /**
   * Publicly documented birth date: "YYYY-MM-DD" when the full date is
   * settled, "YYYY" when only the year is. Never a guessed day: a year-only
   * value stays year-only through `figureBirth`, so the engine reports the
   * sign as unsettled (§12) instead of sampling a fabricated date.
   */
  born: string;
  knownFor: string;
  plutoBridge: string;
}

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_ONLY = /^\d{4}$/;

/**
 * Parse a `HistoricalFigure.born` value into `computeGenerational` arguments.
 *
 * Sampling at noon UTC keeps the result independent of which side of midnight
 * a birth timezone falls on: the three generational planets move well under a
 * degree a day, so no figure can change sign inside their own birth day.
 */
export function figureBirth(born: string): { dateUTC: string; precision: "date" | "year" } {
  if (YEAR_ONLY.test(born)) return { dateUTC: `${born}-01-01T12:00:00.000Z`, precision: "year" };
  if (FULL_DATE.test(born)) {
    const dateUTC = `${born}T12:00:00.000Z`;
    const parsed = new Date(dateUTC);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== born) {
      throw new Error(`HistoricalFigure.born is not a real calendar date: "${born}"`);
    }
    return { dateUTC, precision: "date" };
  }
  throw new Error(`HistoricalFigure.born must be "YYYY-MM-DD" or "YYYY", received: "${born}"`);
}

export interface EraEvent {
  label: string;
  detail: string;
}

/**
 * Plain-language lead for one Pluto-sign cohort.
 */
export interface GenerationalEraReading {
  authority: string;
  institutions: string;
  change: string;
  trust: string;
}

/**
 * WORK VIEW BOUNDARY (not negotiable).
 *
 * Static curated copy only. No runtime generation. No performance claims,
 * no hiring guidance, no prediction about a person's competence.
 *
 * This is a cohort reading keyed to a confident Pluto sign: how that era
 * tends to meet respect, decisions, and pressure at work. It is not a
 * forecast of output, not a screen for candidates, and not a verdict on
 * anyone in the room. Shown only when the recorded relationship is
 * professional (`isProfessionalRelation` on compare, or
 * `isProfessionalPersonRelation` on a person record). Missing copy is a
 * skip, never a generated stand-in (§12).
 */
export interface GenerationalWorkView {
  respect: string;
  decisions: string;
  friction: string;
}

export interface PlutoSignExtended {
  eraReading: GenerationalEraReading;
  workView: GenerationalWorkView;
  corruptionSignature: string;
  historicalFigures: HistoricalFigure[];
  eraEvents: EraEvent[];
}

/** Person.relation tags that unlock the work view on a profile. */
export const PROFESSIONAL_PERSON_RELATIONS = [
  "colleague",
  "coworker",
  "co-worker",
  "boss",
  "manager",
  "professor",
  "mentor",
] as const;

export function isProfessionalPersonRelation(
  relation: string | null | undefined
): boolean {
  if (!relation) return false;
  return (PROFESSIONAL_PERSON_RELATIONS as readonly string[]).includes(relation);
}

export const ERA_READING_LABELS = {
  authority: "Authority",
  institutions: "Institutions",
  change: "Change",
  trust: "Trust",
} as const;

export const ERA_READING_HEADING = "How this era shaped them";

export const WORK_VIEW_LABELS = {
  respect: "How they read respect",
  decisions: "How they prefer decisions",
  friction: "Where friction shows under pressure",
} as const;

export const WORK_VIEW_HEADING = "What this era brings to work";

export function plutoSourceLine(sign: SignKey): string {
  return `Source: Pluto in ${sign}`;
}

export function getPlutoEraReading(sign: SignKey): GenerationalEraReading | null {
  return PLUTO_SIGN_EXTENDED[sign]?.eraReading ?? null;
}

export function getPlutoWorkView(sign: SignKey): GenerationalWorkView | null {
  return PLUTO_SIGN_EXTENDED[sign]?.workView ?? null;
}

export type GenerationalPairLists = {
  shared: { planet: string; sign: string }[];
  diverged: { planet: string; signA: string; signB: string }[];
};

const SIGN_KEYS: readonly SignKey[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function asSignKey(value: string): SignKey | null {
  return SIGN_KEYS.includes(value as SignKey) ? (value as SignKey) : null;
}

/**
 * Pluto signs on each side of a compare, from the engine's shared/diverged
 * lists. Null when Pluto is missing or a sign is not a real sign key.
 * Never samples a default sign (§12).
 */
export function plutoSignsFromRelation(
  generational: GenerationalPairLists
): { signA: SignKey; signB: SignKey } | null {
  const shared = generational.shared.find((entry) => entry.planet.toLowerCase() === "pluto");
  if (shared) {
    const sign = asSignKey(shared.sign);
    if (!sign) return null;
    return { signA: sign, signB: sign };
  }
  const diverged = generational.diverged.find((entry) => entry.planet.toLowerCase() === "pluto");
  if (!diverged) return null;
  const signA = asSignKey(diverged.signA);
  const signB = asSignKey(diverged.signB);
  if (!signA || !signB) return null;
  return { signA, signB };
}

export type GenerationalLeadEntry = {
  sign: SignKey;
  eraReading: GenerationalEraReading;
  workView: GenerationalWorkView | null;
  source: string;
};

/**
 * Lookup-only lead for one or two Pluto signs on a compare. Skips a side
 * whose sign has no authored era reading. Does not generate copy.
 */
export function generationalLeadForPair(
  generational: GenerationalPairLists
): GenerationalLeadEntry[] {
  const signs = plutoSignsFromRelation(generational);
  if (!signs) return [];
  const unique = signs.signA === signs.signB ? [signs.signA] : [signs.signA, signs.signB];
  const leads: GenerationalLeadEntry[] = [];
  for (const sign of unique) {
    const eraReading = getPlutoEraReading(sign);
    if (!eraReading) continue;
    leads.push({
      sign,
      eraReading,
      workView: getPlutoWorkView(sign),
      source: plutoSourceLine(sign),
    });
  }
  return leads;
}

export const WORK_VIEW_FOR_WORK_HREF = "/for-work";
export const WORK_VIEW_FOR_WORK_LINK = "How Galaxia reads this at work";

export const PLUTO_SIGN_EXTENDED: Partial<Record<SignKey, PlutoSignExtended>> = {

  Cancer: {
    eraReading: {
      authority:
        "This era learned that the people in charge spoke the language of home and family, then used it to command. Authority arrived as a parent, a homeland, a household. It asked to be trusted because it claimed to protect you.",
      institutions:
        "The first large institution many of them ever trusted was the government stepping in as protector of the household. That trust was new, and it was earned in collapse: the New Deal after the Depression, the war effort after the hearth was already under threat.",
      change:
        "Change arrived as catastrophe, not as a plan. The Depression, the Dust Bowl, and the war stripped the ground from under a family. This era did not experience change as progress. It experienced change as what happens to you when the land or the market or the border fails.",
      trust:
        "Trust was learned as hold on to what you have, because the ground can vanish. They also learned that family talk could be the cover story for catastrophe. Protecting the circle became the test of whether anyone in charge was telling the truth.",
    },
    workView: {
      respect:
        "This era reads respect as protection of the people who depend on you. Loyalty to the circle counts more than a speech about vision.",
      decisions:
        "They prefer a decision that keeps the household (the team, the room) intact. Name who is being looked after, then act.",
      friction:
        "Friction shows when the group is treated as disposable, or when 'for your own good' is used as a cover for a choice nobody consented to.",
    },
    corruptionSignature:
      "Power weaponized the language of home and family itself. Fascism across Europe and Asia promised to restore the hearth, protect the bloodline, and secure the homeland, then burned the world doing it. At home, the Depression stripped households bare through forces no individual could see or stop. This generation learned early that the things you were told to protect could become instruments of destruction, and that 'family values' could be the cover story for catastrophe.",
    historicalFigures: [
      { name: "Martin Luther King Jr.", born: "1929-01-15", knownFor: "Civil rights leader", plutoBridge: "Pluto in Cancer as the will to protect the beloved community, and the willingness to die for it." },
      { name: "Audrey Hepburn", born: "1929-05-04", knownFor: "Actress and humanitarian", plutoBridge: "A childhood surviving Nazi occupation became the fuel for a life spent feeding the world's most vulnerable children." },
      { name: "Anne Frank", born: "1929-06-12", knownFor: "Diarist, Holocaust victim", plutoBridge: "Wrote about the human need for home and hope from inside the hiding place that couldn't hold." },
      { name: "Grace Kelly", born: "1929-11-12", knownFor: "Actress, Princess of Monaco", plutoBridge: "Transformed the domestic ideal into a public institution: literal royalty reframed as homemaker." },
      { name: "James Dean", born: "1931-02-08", knownFor: "Actor, cultural icon", plutoBridge: "The rebel without a cause, Cancer's wound made visible: belonging nowhere, hungry for a home that never quite existed." },
    ],
    eraEvents: [
      { label: "The Great Depression", detail: "The household economy collapsed. Saving everything, wasting nothing, became survival, a reflex that never left." },
      { label: "The Dust Bowl", detail: "The land itself failed. Home was stripped from hundreds of thousands in the American heartland." },
      { label: "World War II", detail: "A generation sent their sons to war to protect the family. Many never came back." },
      { label: "The Holocaust", detail: "The extreme shadow of Pluto in Cancer: 'home and family' weaponized as justification for genocide." },
      { label: "The New Deal", detail: "Government stepped in as protector of the household, the first time many Americans trusted an institution that large." },
    ],
  },

  Leo: {
    eraReading: {
      authority:
        "This era was handed a postwar world and told it was theirs. Authority looked like the hero, the star, the person who could stand in the lights and speak for the room.",
      institutions:
        "Institutions arrived as spectacle and as superpower: television, the suburb, the Cold War state that needed to be seen as the hero of the story. Civil rights made the demand to be seen, fully, into law.",
      change:
        "Change came as abundance and as a claim on the spotlight: rock and roll, the space race, a generation that refused to be quieted. They experienced change as something you author, not only something you survive.",
      trust:
        "They were told they were special, and many of them believed it. Trust in a leader who needs to be worshipped is the shadow. Trust in a person who will stand in the light and take the hit is the other side of the same era.",
    },
    workView: {
      respect:
        "This era reads respect as being seen as the person who can carry it. Credit and presence matter. Being interchangeable does not.",
      decisions:
        "They prefer a named owner. A decision with no one willing to stand on it feels like no decision at all.",
      friction:
        "Friction shows when they are asked to shrink, or when the work treats the person doing it as furniture.",
    },
    corruptionSignature:
      "The hero's ego, unchecked. This generation was handed a postwar world and told it was theirs: the most prosperous, the most powerful, the most special. The shadow is the narcissism that calcified: the leader who needs to be worshipped, the parent who can't let a child become their own person, the generation that consumed what prior generations built and called it vision. The corruption of Leo's gold is the king who forgets the kingdom exists for the people, not the other way around.",
    historicalFigures: [
      { name: "Tina Turner", born: "1939-11-26", knownFor: "Singer, survivor, icon", plutoBridge: "Power reclaimed entirely on her own terms after years of being held by force: Pluto in Leo's full redemption arc." },
      { name: "Muhammad Ali", born: "1942-01-17", knownFor: "Boxer and activist", plutoBridge: "'I am the greatest' as political act, not vanity: the Boomer who used the spotlight to demand justice." },
      { name: "Jimi Hendrix", born: "1942-11-27", knownFor: "Guitarist, musical revolutionary", plutoBridge: "Sound as pure power. The electric guitar as a way to set the world on fire and mean it." },
      { name: "David Bowie", born: "1947-01-08", knownFor: "Musician, shape-shifter", plutoBridge: "Reinvented himself across five decades and invited a generation to do the same: Leo Pluto as the refusal to be fixed." },
      { name: "Steve Jobs", born: "1955-02-24", knownFor: "Apple co-founder", plutoBridge: "Made the machine personal and beautiful: Leo's insistence that what the world uses should also be worthy of admiration." },
    ],
    eraEvents: [
      { label: "Postwar Boom", detail: "The economy exploded. Suburban homes, new cars, and television arrived all at once: Leo's landscape of abundance and spectacle." },
      { label: "The Cold War", detail: "Two superpowers in a permanent standoff, each convinced it was the hero of the story." },
      { label: "Civil Rights Movement", detail: "The demand to be seen, fully, as a human being: Leo's highest expression made into legislation." },
      { label: "Rock and Roll", detail: "An entire generation claimed its own sound and refused to be quieted." },
      { label: "The Space Race", detail: "Humanity aimed itself at the moon, because we could, and because someone else might get there first." },
    ],
  },

  Virgo: {
    eraReading: {
      authority:
        "This era watched the hero story break on television, then watched the curtain come down on the idea that government was trustworthy. Authority had to prove itself in the details, because the big story had already failed.",
      institutions:
        "Institutions looked away during the AIDS crisis, and a generation learned to organize without permission. The systems they inherited (healthcare, labor, technology, the environment) were the ones they rebuilt through meticulous, largely uncelebrated work.",
      change:
        "Change arrived as repair work: the machine entering the household, the planet understood as in trouble, the daily system that had to be made to function. Progress, for this era, was the unglamorous fix.",
      trust:
        "Trust was learned in the aftermath of Watergate and in rooms where friends died while official bodies stalled. This era trusts the person who stays with the broken thing. It does not trust a promise that cannot be inspected.",
    },
    workView: {
      respect:
        "This era reads respect as staying with the broken thing until it actually works, not as a speech about vision.",
      decisions:
        "They prefer the decision that can be checked in the details. Policy, procedure, and the sentence that names who does what: that is where the choice is real.",
      friction:
        "Friction shows when polish is demanded without the pain being named, or when the person doing the repair is ignored.",
    },
    corruptionSignature:
      "Perfection weaponized into control. This generation rebuilt the systems the Boomers handed them (healthcare, labor, technology, the environment) through meticulous, largely uncelebrated work. The shadow is the self-criticism that became other-criticism: the impossible standard, the body that was never right, the workaholic who burned out serving a corporation that didn't notice. The corruption of Virgo's precision is the healer who turns the scalpel on themselves.",
    historicalFigures: [
      { name: "Princess Diana", born: "1961-07-01", knownFor: "Princess of Wales, humanitarian", plutoBridge: "Brought the camera into AIDS wards and minefields: Virgo Pluto as service that refuses to look away from what's uncomfortable." },
      { name: "Barack Obama", born: "1961-08-04", knownFor: "44th U.S. President", plutoBridge: "The meticulous case for change: Virgo Pluto as the insistence that policy is the detail where justice actually lives or dies." },
      { name: "Michael Jackson", born: "1958-08-29", knownFor: "Musician, global icon", plutoBridge: "The perfectionist who remade popular culture one precise gesture at a time, and was consumed by the standard he set." },
      { name: "Kurt Cobain", born: "1967-02-20", knownFor: "Musician, Nirvana frontman", plutoBridge: "Named the exhaustion of performing competence for a world that wanted polish without pain: Virgo's wound at full volume." },
      { name: "Madonna", born: "1958-08-16", knownFor: "Musician, cultural provocateur", plutoBridge: "Controlled every detail of her own image and used that control to rewrite what women in public were allowed to be." },
      { name: "Biggie Smalls", born: "1972-05-21", knownFor: "Rapper, storyteller", plutoBridge: "Rhymed in exact inventory: names, numbers, consequences, never approximate. Virgo Pluto's eye for exactly what's wrong." },
    ],
    eraEvents: [
      { label: "Vietnam War", detail: "Gen X children watched the war on television and saw what the hero story looked like when it broke." },
      { label: "The AIDS Crisis", detail: "A generation watched friends die while institutions looked away, and learned to organize without permission." },
      { label: "Environmental Movement", detail: "The first generation to grow up understanding the planet itself was in trouble." },
      { label: "Personal Computer", detail: "The machine entered the household. Virgo Pluto built the world that would come to run on it." },
      { label: "Watergate", detail: "The curtain came down on the idea that government was trustworthy. This generation grew up in the aftermath." },
    ],
  },

  Libra: {
    eraReading: {
      authority:
        "This era fought to make the systems fairer, and watched authority smile, stall, and make incremental gestures while the underlying imbalance held. Power learned to sound like a committee.",
      institutions:
        "Institutions promised balance: courts, cameras, relationship recognition as a civil right. The gap between the law's promise and its practice was documented on camera. The internet made information infinitely available and infinitely manipulable.",
      change:
        "Change arrived as negotiation that could become an excuse not to act: the both-sides framing, the compromise that left the most vulnerable exactly where they were. The Cold War ended and called itself peace. A new disorder followed.",
      trust:
        "Trust was tested by fairness talk that delayed the real move. This era learned to ask whether the process was a path or a performance. Beauty used to distract is the same lesson in another register.",
    },
    workView: {
      respect:
        "This era reads respect as a seat at the table that is real: treated as an equal in the process, not consulted after the decision is already made.",
      decisions:
        "They prefer a decision that can survive a fairness check. Consensus is welcome when it is honest. A process that only looks like listening is not a decision.",
      friction:
        "Friction shows when both-sides framing stalls the room, or when the compromise leaves the most exposed people exactly where they were.",
    },
    corruptionSignature:
      "Justice as performance without delivery. This generation fought to make the systems fairer (for women, for queer people, for people of color) and the systems smiled and stalled and made incremental gestures while the underlying imbalance held. The shadow of Libra's scales is the endless negotiation that becomes an excuse not to act: the committee, the both-sides framing, the compromise that leaves the most vulnerable exactly where they were. Beauty used to distract. Fairness invoked to delay.",
    historicalFigures: [
      { name: "Beyoncé", born: "1981-09-04", knownFor: "Musician, cultural force", plutoBridge: "Turned the pop spectacle into a sustained argument about beauty, power, and who gets to write history: Libra Pluto at its most deliberate." },
      { name: "Eminem", born: "1972-10-17", knownFor: "Rapper, songwriter", plutoBridge: "Made white America look at itself through hip-hop's mirror: the Libra instinct for uncomfortable confrontation dressed as entertainment." },
      { name: "Aaliyah", born: "1979-01-16", knownFor: "Singer, actress", plutoBridge: "Quiet authority: the artist who moved with complete ease inside a music industry that routinely consumed women." },
      { name: "Britney Spears", born: "1981-12-02", knownFor: "Singer, survivor", plutoBridge: "Her public unraveling and subsequent legal fight became a generational conversation about who controls women's lives and how." },
    ],
    eraEvents: [
      { label: "The Internet", detail: "Information became infinitely available and infinitely manipulable: Libra's scales tipped in both directions at once." },
      { label: "End of the Cold War", detail: "The world exhaled and called it peace. The generation born into détente came of age in a new disorder." },
      { label: "LA Riots", detail: "The gap between the law's promise and its practice was documented on camera for everyone to see." },
      { label: "LGBTQ+ Rights", detail: "This generation fought for relationship recognition as a civil right: the most Libra framing of justice possible." },
      { label: "Gulf War", detail: "The first war many of them watched in real time, narrated like a sporting event." },
    ],
  },

  Scorpio: {
    eraReading: {
      authority:
        "This era arrived with the tools to see through whoever was in charge: the institutions, the myths, the curated identities. Authority after 9/11 looked like mass security theater that never quite went away.",
      institutions:
        "The financial system built by their parents failed publicly. Every institution's backstage landed on camera. The pain-management system turned predatory. Structures were exposed, and then often monetized.",
      change:
        "Change arrived as naming what had always been there. A generation that grew up post-9/11, through the 2008 crash, and into #MeToo learned that the surface story is usually the last thing to trust.",
      trust:
        "Trust collapsed into cynicism when no institution held, and conspiracy filled some of the void. This era trusts the person who will name the unspeakable. It does not trust a room that demands performed confidence.",
    },
    workView: {
      respect:
        "This era reads respect as honesty about what is actually happening, not the official story.",
      decisions:
        "They prefer to name the real issue before anyone votes. A decision that stays on the surface feels like a stall dressed as process.",
      friction:
        "Friction shows when they are asked to perform trust, when backstage is treated as content, or when pressure arrives to stay polite about a broken thing.",
    },
    corruptionSignature:
      "Power structures exposed, and then monetized. This generation arrived with the tools to see through everything: the institutions, the myths, the curated identities. The shadow is the collapse into cynicism, the conspiracy that fills the void when no institution holds, the intimacy economy that turns vulnerability itself into content. Scorpio's gift is truth-telling; its corruption is the exposure that serves no one except the one holding the camera.",
    historicalFigures: [
      { name: "Taylor Swift", born: "1989-12-13", knownFor: "Musician, cultural figure", plutoBridge: "Documented her own emotional underworld in real time and turned the power struggle over her own catalog into a public education." },
      { name: "Kendrick Lamar", born: "1987-06-17", knownFor: "Rapper, Pulitzer Prize winner", plutoBridge: "Took the Scorpio instinct to excavate (self, community, history) and made it the most precise moral argument in American music." },
      { name: "Ariana Grande", born: "1993-06-26", knownFor: "Singer", plutoBridge: "Performed publicly through collective trauma and personal grief, transforming loss into the most-streamed thing of the year." },
      { name: "Rihanna", born: "1988-02-20", knownFor: "Musician, Fenty founder", plutoBridge: "Had her private life turned into public property young, then spent the next decade buying the machinery that sold it." },
      { name: "Harry Styles", born: "1994-02-01", knownFor: "Musician", plutoBridge: "Dismantled the rules around gender in popular culture simply by refusing to acknowledge them as rules." },
    ],
    eraEvents: [
      { label: "September 11", detail: "The generation that grew up post-9/11 has never known a world where mass security theater wasn't normal." },
      { label: "The 2008 Crash", detail: "The financial system built by their parents failed publicly while they came of age into a destroyed job market." },
      { label: "Rise of the Internet", detail: "Everything became visible. Every institution's backstage was suddenly on camera." },
      { label: "#MeToo", detail: "A generation named what had always been there, Scorpio's full power: naming the unspeakable." },
      { label: "Opioid Epidemic", detail: "The pain-management system turned predatory. An entire generation lost people to it." },
    ],
  },

  Sagittarius: {
    eraReading: {
      authority:
        "This era grew up in infinite information and used it to question every authority that could not explain itself. 'Because we said so' lost its force. A personal truth could be broadcast as if it were everyone's.",
      institutions:
        "Institutions of belief and of school were interrupted (COVID closed the buildings; the world went online). Social media connected and fragmented at once. The climate timeline was taught as fact, while the people making the decisions would not live to see the result.",
      change:
        "Change arrived as range: every culture, every idea, every piece of misinformation, available from a bedroom. The economic floor had already given way before many of them were old enough to stand on it. The risk is going everywhere without landing.",
      trust:
        "Trust was learned as a question that keeps widening. This era trusts a reason that is bigger than the room. It does not trust a fence with no why, and it can miss the landing while it looks for a larger map.",
    },
    workView: {
      respect:
        "This era reads respect as room to ask why, and a reason bigger than 'because we said so'.",
      decisions:
        "They prefer the why first. A process that never looks at the destination feels like a meeting that refuses to land.",
      friction:
        "Friction shows when they are fenced in, when the conversation never lands, or when range is dismissed as scatter.",
    },
    corruptionSignature:
      "Freedom as escape rather than expansion. This generation grew up in the age of infinite information and used it to go everywhere mentally without necessarily landing anywhere. The shadow of Sagittarius's great question is the belief that the answer is always somewhere else: the influencer who travels everywhere and is at home nowhere, the algorithm-shaped conviction that one's personal truth is everyone's universal truth. The archer who fires without looking at where the arrow lands.",
    historicalFigures: [
      { name: "Billie Eilish", born: "2001-12-18", knownFor: "Musician", plutoBridge: "Built a global audience from her childhood bedroom and used the reach to refuse the image the industry wanted: the Sagittarian who named the cage." },
      { name: "Greta Thunberg", born: "2003-01-03", knownFor: "Climate activist", plutoBridge: "Turned a school strike into a planetary movement: Sagittarius Pluto as the individual voice that insists the biggest possible problem is everyone's business." },
      { name: "Olivia Rodrigo", born: "2003-02-20", knownFor: "Musician", plutoBridge: "Documented the specific emotional vocabulary of her generation with enough precision that it became universal." },
      { name: "Malala Yousafzai", born: "1997-07-12", knownFor: "Activist, Nobel Peace Prize laureate", plutoBridge: "Carried the case for every girl's education from one valley to the floor of the UN: Sagittarius Pluto as a conviction that will not stop widening its audience." },
    ],
    eraEvents: [
      { label: "Social Media", detail: "The world connected and fragmented simultaneously. Everyone's opinion became a broadcast." },
      { label: "The 2008 Crash", detail: "The economic floor gave way before they were old enough to stand on it." },
      { label: "Climate Crisis", detail: "The first generation raised knowing the planet's timeline, and that the decisions were being made by people who wouldn't live to see the result." },
      { label: "COVID-19", detail: "Their formative years interrupted by a global stop. Schools closed. The world went online." },
      { label: "Global Internet", detail: "For the first time in history, a generation grew up with access to every culture, every idea, and every piece of misinformation." },
    ],
  },

  Capricorn: {
    eraReading: {
      authority:
        "This era arrived into institutions already mid-collapse: financial systems exposed, governments destabilized, the planet in measurable crisis. Authority looked like the person or the algorithm still willing to be responsible for a number.",
      institutions:
        "The tools arrived faster than the rules. Democratic institutions came under pressure worldwide. Mechanisms that promised democratization often consolidated power at the top. They will inherit both the damage and the responsibility.",
      change:
        "Change is not an abstract future. They were born into a world already mid-restructure, into a climate crisis you can observe, into a childhood documented in masks. The long work is rebuilding what broke, with a real constraint, not a slogan.",
      trust:
        "Trust attaches to a structure that can be inspected: who decided, what it cost, whether a person is still in the loop. Efficiency that erases the community is the corruption of the same instinct that wants a system to actually hold.",
    },
    workView: {
      respect:
        "This era reads respect as accountability that can be inspected: a structure that actually holds, not a speech about holding.",
      decisions:
        "They prefer a named owner and a real constraint. Who is responsible, and what the number costs, are the questions that make a decision feel real.",
      friction:
        "Friction shows when efficiency erases people, when a broken system is handed over with a smile, or when the rules arrive after the tools.",
    },
    corruptionSignature:
      "Systems optimized past the point of humanity. This generation arrived into institutions already mid-collapse: financial systems exposed, governments destabilized, the planet in measurable crisis. The corruption signature is efficiency weaponized: the AI that makes the decision, the algorithm that determines the outcome, the restructuring that makes the quarterly number and destroys the community. Power consolidated at the top through the exact mechanisms that promised democratization.",
    historicalFigures: [],
    eraEvents: [
      { label: "The 2008 Crash", detail: "The world they were born into was already mid-restructure. They never knew the world before the fall." },
      { label: "Climate Crisis", detail: "Not an abstract future threat: an observable present they're inheriting." },
      { label: "COVID-19", detail: "Their earliest years marked by a global interruption. The first generation whose childhood is documented in masks." },
      { label: "AI Revolution", detail: "The tools arrived faster than the rules. This generation will decide what they become." },
      { label: "Global Instability", detail: "Democratic institutions under pressure worldwide. They'll inherit both the damage and the responsibility." },
    ],
  },

};

// Family Bridge: viewer's Pluto sign → subject's Pluto sign
// Only the most common intergenerational pairings are authored.
// Returns null when a pair is not covered — the card is simply not rendered.
export const FAMILY_BRIDGE: Partial<Record<SignKey, Partial<Record<SignKey, string>>>> = {

  Scorpio: {
    Cancer: "You carry Pluto in Scorpio: your generation was built to see through power, strip it to bone, and name what others couldn't bear to say. They carry Pluto in Cancer: their generation learned that the very ground beneath a family can be stripped away, that home itself is something you fight for. Your instinct is to expose. Theirs was to hold. The conflict between you isn't betrayal: it's two survival strategies shaped by different catastrophes.",
    Leo: "You carry Pluto in Scorpio: intensity, investigation, the demand for truth below the surface. They carry Pluto in Leo: a generation that claimed the spotlight and built their identity around being seen. Your instinct is to question what's underneath. Theirs was to perform what was on top. What looks like ego from your angle was often how they survived a world that told them to shrink. What looks like suspicion from their angle is often care.",
    Virgo: "You carry Pluto in Scorpio: your generation transformed through crisis and the refusal to look away. They carry Pluto in Virgo: a generation that reshaped work, health, and daily life through precision and largely uncelebrated labor. Your approach is intense and confrontational. Theirs was methodical and service-oriented. You both want to fix what's broken; you just disagree on whether the whole system has to burn first.",
    Libra: "You carry Pluto in Scorpio: your generation rewrote the rules around power and intimacy. They carry Pluto in Libra: a generation that fought to redefine fairness and justice inside the institutions they inherited. You're one generation apart but the shift was real: they believed in balance and worked toward it inside the system; you decided the scales were rigged and went looking for what was underneath them.",
  },

  Sagittarius: {
    Virgo: "You carry Pluto in Sagittarius: your generation expanded belief, borders, and information beyond anything that came before. They carry Pluto in Virgo: a generation that rebuilt systems from the inside through service and craft. Your instinct is to question everything and keep moving. Theirs was to perfect and maintain. When you call their world small, they're watching you fail to land. When they call you scattered, they're watching you fly. Both observations are correct.",
    Libra: "You carry Pluto in Sagittarius: your generation was shaped by globalization and the collapse of old belief systems. They carry Pluto in Libra: a generation that fought hard for the idea of fairness inside the institutions they were handed. You grew up questioning whether any system was worth saving. They were the ones who built those systems trying to make them fairer. What you reject, they worked for.",
    Scorpio: "You carry Pluto in Sagittarius: expansion, freedom, the relentless asking of why. They carry Pluto in Scorpio: intensity, depth, the refusal to accept anything at surface level. You're close in age but shaped differently: they came of age in crisis and learned to read danger; you came of age in information overload and learned to keep moving. They trust depth. You trust range. Neither is wrong, and neither is fully comfortable with the other.",
  },

  Capricorn: {
    Scorpio: "You carry Pluto in Capricorn: your generation arrived into a world mid-restructure, institutions already cracking. They carry Pluto in Scorpio: the generation that did much of the cracking. What they exposed, you're being asked to rebuild. The weight they handed you isn't indifference: it's the thing they fought to surface so you'd have something real to work with.",
    Sagittarius: "You carry Pluto in Capricorn: structure, accountability, the long work of rebuilding what broke. They carry Pluto in Sagittarius: the generation that questioned everything and went everywhere looking for the answer. They gave you the map and the questions. The terrain is yours to hold.",
  },

  Cancer: {
    Scorpio: "You carry Pluto in Cancer: your generation defended home and family through catastrophes that threatened to erase both. They carry Pluto in Scorpio: a generation trained to see beneath the surface of exactly that kind of sacrifice, and to name the cost. What looks like questioning from where you stand was shaped, in part, by what you carried and couldn't always put down. They're not rejecting the home you built. They're trying to understand what it took.",
  },

  Leo: {
    Scorpio: "You carry Pluto in Leo: your generation claimed its power and built its identity in full view. They carry Pluto in Scorpio: a generation trained to see beneath exactly that kind of power and ask what it costs. The child who questions everything you built isn't ungrateful. They're doing what their Pluto told them to do. And it's more uncomfortable than they expected, too.",
  },

  Virgo: {
    Scorpio: "You carry Pluto in Virgo: your generation rebuilt systems from the inside, through labor and precision that mostly went unnoticed. They carry Pluto in Scorpio: a generation shaped by crisis and the demand to name what had been hidden. Your instinct is to fix methodically. Theirs is to expose first and rebuild later. You both care about what actually works. You'll argue about the order of operations for the rest of your lives, and the argument is worth having.",
    Sagittarius: "You carry Pluto in Virgo: the quiet architects, the ones who made the systems run. They carry Pluto in Sagittarius: the generation that questioned whether those systems were worth running. When they seem reckless, they're following a map you didn't give them. When you seem cautious, they're reading it as fear. The frustration is mutual and it's also love.",
  },

  Libra: {
    Scorpio: "You carry Pluto in Libra: your generation fought to make the systems fairer for everyone inside them. They carry Pluto in Scorpio: a generation that decided the systems themselves were the problem. You built toward balance; they torched toward truth. The arguments between you matter. Neither of you is wrong. And the work you did made it safer for them to say what they're saying.",
    Sagittarius: "You carry Pluto in Libra: your generation believed that fairness, made real through negotiation, was the path. They carry Pluto in Sagittarius: a generation that wanted to blow past the negotiating table and just go. Your instinct was to work within what exists. Theirs was to question whether existing is a good enough reason to keep something. The tension between you is also a conversation worth having.",
  },

};

export function getFamilyBridge(
  viewerPluto: SignKey,
  subjectPluto: SignKey
): string | null {
  return FAMILY_BRIDGE[viewerPluto]?.[subjectPluto] ?? null;
}
