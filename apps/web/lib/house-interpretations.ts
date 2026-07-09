/**
 * Galaxia — House Interpretation Library
 *
 * Companion to interpretations.ts. Same voice rules apply:
 *  - Warm, specific, plainspoken. Never fatalistic, never cruel.
 *  - Relational: help the reader understand or tend a bond with this person.
 *  - Concrete over archetypal.
 *  - `short` shows collapsed. `long` shows expanded, ideally ending in
 *    something the reader can DO or notice.
 *
 * The sign says HOW a planet behaves. The house says WHERE it lives —
 * which room of a life it furnishes. A chart without houses is a list of
 * traits; a chart with houses is a biography.
 */

import type { BodyKey, Reading } from "./interpretations";

export type HouseKey = 1|2|3|4|5|6|7|8|9|10|11|12;

export interface HouseMeaning {
  name: string;
  domain: string;   // label-caps, shown beside the badge
  short: string;
  long: string;
}

export const HOUSE_MEANING: Record<HouseKey, HouseMeaning> = {
  1:  { name: "First House",   domain: "Self & approach",      short: "the door they come through",        long: "How they arrive, how they're read before they speak, and the self they had to build to get through the door." },
  2:  { name: "Second House",  domain: "Worth & resources",    short: "what they hold, and what they're worth", long: "Money, yes, but underneath it: what they believe they deserve, and what they'd never sell." },
  3:  { name: "Third House",   domain: "Mind & near world",    short: "siblings, streets, and the everyday mind", long: "The people they grew up beside and the way they think in ordinary hours. Small talk is not small here." },
  4:  { name: "Fourth House",  domain: "Home & roots",         short: "the foundation under everything",    long: "Family, the house they grew up in, and the private self nobody at work has met. What happens here quietly determines the rest." },
  5:  { name: "Fifth House",   domain: "Play, romance & making", short: "what they make and who they delight in", long: "Creativity, children, romance, and the pure pleasure of being alive without a purpose attached." },
  6:  { name: "Sixth House",   domain: "Work, health & service", short: "the daily grind and the body",     long: "The unglamorous hours: routines, health, the work nobody applauds. Where devotion looks like a checklist." },
  7:  { name: "Seventh House", domain: "Partnership & the other", short: "who they choose, and who they meet", long: "The one across from them: partner, close collaborator, and sometimes the open enemy. Everything they can't see in themselves shows up here wearing someone else's face." },
  8:  { name: "Eighth House",  domain: "Intimacy & transformation", short: "the shared, the buried, the transformed", long: "Sex, money held in common, grief, and the things people only say at 3am. Where they are changed by another person." },
  9:  { name: "Ninth House",   domain: "Meaning & the far world", short: "belief, distance, and the bigger frame", long: "Faith, philosophy, foreign places, higher study. Where they go looking for a reason." },
  10: { name: "Tenth House",   domain: "Public role & legacy",  short: "what they're known for",             long: "Career, reputation, the thing strangers know about them. Also the parent whose expectation still hums under it all." },
  11: { name: "Eleventh House", domain: "Community & hopes",    short: "their people, and what they're building toward", long: "Friends, chosen family, the collective, and the future they'd like to live in. Where belonging is chosen rather than given." },
  12: { name: "Twelfth House", domain: "The hidden & the undoing", short: "what runs beneath, unwatched",   long: "Solitude, the unconscious, what they hide even from themselves. Not a curse — a private room. Things here operate before they're noticed." },
};

/** The house each planet occupies: where this force actually lives. */
export const PLANET_IN_HOUSE: Record<BodyKey, Record<HouseKey, Reading>> = {
  sun: {
    1:  { short: "the self is the project",        long: "Identity is worn on the outside; they become themselves in the act of being seen. Rarely a mystery, and rarely still." },
    2:  { short: "worth is the question",          long: "Their sense of self is entangled with what they have and what they've made. Value them for something money can't measure." },
    3:  { short: "alive in the exchange",          long: "They come into focus through conversation, siblings, and the daily traffic of ideas. Silence starves them." },
    4:  { short: "the self is built at home",      long: "Their centre of gravity is private: family, roots, the house behind the door. The public version is a smaller thing than the one you'll meet at their kitchen table." },
    5:  { short: "shines when making something",   long: "They're most themselves at play, in love, or making a thing that didn't exist. Take their joy seriously; it isn't frivolous." },
    6:  { short: "the self, made useful",          long: "They know who they are through the work and the routine. Ask how they're doing and they'll tell you what they've done." },
    7:  { short: "becomes real in relation",       long: "They come into focus across from another person, and lose the thread when alone. It's not weakness; it's how they're wired to see." },
    8:  { short: "made and remade by intimacy",    long: "Their identity gets rebuilt by what they share and what they survive. Nothing about them was inherited unchanged." },
    9:  { short: "the self needs a bigger frame",  long: "They find themselves through belief, distance, or study. A life without a horizon shrinks them fast." },
    10: { short: "known for what they do",         long: "Their identity and their public role are the same thing, which is powerful and a little precarious. Ask who they are when nobody's watching." },
    11: { short: "themselves among their people",  long: "They come alive inside a group, a cause, a chosen family. Solitude isn't restorative here; belonging is." },
    12: { short: "a self kept partly hidden",      long: "Something central about them stays private, even from them. They may not know their own strength until someone names it out loud." },
  },
  moon: {
    1:  { short: "wears the feeling",              long: "Their mood is visible before they've spoken. What you see is genuinely what's happening; there's no lag." },
    2:  { short: "safety is material",             long: "They need to know there's enough. Reassure them about the ground under their feet, not just your feelings." },
    3:  { short: "needs to talk it through",       long: "Feelings resolve out loud. Take away the conversation and they'll take it inside and turn it over for weeks." },
    4:  { short: "home is the whole nervous system", long: "Their emotional weather is made in the house they live in. Fix the home and much of the rest quiets down." },
    5:  { short: "needs delight to feel safe",     long: "Play, children, romance, making things — these aren't extras, they're regulation. A joyless season hurts them physically." },
    6:  { short: "soothes by doing the small task", long: "They handle feeling by handling something. The dishes are not avoidance; the dishes are the processing." },
    7:  { short: "needs someone across from them", long: "Their emotional equilibrium depends on a close other, which makes them devoted and easily destabilised. Consistency matters more than intensity." },
    8:  { short: "feels at depth, in private",     long: "Nothing shallow reaches them. They need one person who can go all the way down with them, and no more than one." },
    9:  { short: "steadied by the bigger picture", long: "They find calm in meaning, distance, or belief. When they spiral, zoom out with them rather than closer in." },
    10: { short: "feelings are public property",   long: "Their inner life leaks into their work and reputation, whether they like it or not. Privacy is a discipline they had to learn." },
    11: { short: "needs a we to feel held",        long: "Their people are their nervous system. Isolation reads to them as danger, not peace." },
    12: { short: "feels it before they know it",   long: "Emotion arrives from underneath, unbidden and unsourced. Ask what they've absorbed; half of it isn't theirs." },
  },
  mercury: {
    1:  { short: "thinks out loud, always",        long: "Their mind is their calling card and it doesn't stop. The chatter is the person, not a mask." },
    2:  { short: "thinks in concrete terms",       long: "Ideas must translate into something usable or they lose interest. Show them the practical end." },
    3:  { short: "a mind built for the everyday",  long: "Quick, curious, endlessly interested in what's nearby. Siblings and neighbours shaped how they reason." },
    4:  { short: "the family voice, still running", long: "How they think was decided at a kitchen table decades ago. Some of what they say in an argument isn't theirs." },
    5:  { short: "a playful, performing mind",     long: "They think in stories and jokes and would rather be delightful than correct. There's real rigour under the wit." },
    6:  { short: "the analytical, worrying mind",  long: "They think in checklists and catch the flaw first. Ask what they'd do about it, or they'll just keep finding more." },
    7:  { short: "thinks by talking to you",       long: "They form opinions in dialogue and can seem to have none until asked. Their best thinking happens across a table." },
    8:  { short: "an investigating mind",          long: "They will find out. Interested in what's hidden, not what's stated, and they don't accept a surface answer." },
    9:  { short: "the mind wants a system",        long: "They reason toward meaning and hate a fact without a frame. Prone to conviction; make them defend it." },
    10: { short: "speaks with authority",          long: "Their voice carries professional weight, and they know it. It can make casual disagreement feel like insubordination." },
    11: { short: "thinks in networks",             long: "Their ideas are social and collective; they think best in a room of people. Ideology can arrive dressed as friendship." },
    12: { short: "the unspoken thought",           long: "They know things they can't yet say. Give them time and silence, and it surfaces whole." },
  },
  venus: {
    1:  { short: "loved for their presence",       long: "Charm arrives before they do. It opens doors and it can hide the person holding them." },
    2:  { short: "loves what lasts",               long: "Affection is expressed in things kept, given, and made comfortable. They show love with their hands and their money." },
    3:  { short: "loves through talk",             long: "Being interesting to each other is the whole romance. Boredom, not conflict, is what kills it." },
    4:  { short: "loves by making a home",         long: "Their love language is a kitchen, a routine, a door that's always open to you. Domesticity is not settling here; it's devotion." },
    5:  { short: "loves the courtship of it",      long: "Romance, play, delight. They need the pleasure to stay in it, and they'll go looking for it if it's gone." },
    6:  { short: "loves by doing your errands",    long: "The affection is in the practical thing they did without being asked. Notice the small ones out loud." },
    7:  { short: "loves the partnership itself",   long: "They believe in the couple as a thing worth serving. Watch that they don't serve the idea over the person." },
    8:  { short: "loves totally or not at all",    long: "Intimacy means being permanently altered by another. They cannot do casual, and pretending to costs them dearly." },
    9:  { short: "loves what widens them",         long: "They fall for a mind, a place, a belief. Show them something they hadn't considered." },
    10: { short: "loves what they respect",        long: "Attraction is bound up with esteem and status, and they'd rather admire you than be comfortable. Be worth admiring; also be soft with them." },
    11: { short: "loves as friendship first",      long: "The romance grows out of companionship or it doesn't grow. They need to like you." },
    12: { short: "loves privately, quietly",       long: "Their tenderness runs underground and they may never fully declare it. Ask directly; they'll tell you, once." },
  },
  mars: {
    1:  { short: "meets the world head-on",        long: "Direct, physical, first through the door. The bluntness is not aggression; it's how they say hello." },
    2:  { short: "fights over what's theirs",      long: "Slow to anger and unmovable about their resources and their worth. Don't test the boundary twice." },
    3:  { short: "argues for sport",               long: "Combative in conversation and doesn't always notice you're bleeding. Say it's not a debate." },
    4:  { short: "the anger comes from home",      long: "What sets them off was installed long before you. The fight is rarely about the dishes." },
    5:  { short: "drive as play",                  long: "Competitive, creative, romantic in the pursuit. They need somewhere to spend it that isn't you." },
    6:  { short: "drive channelled into work",     long: "Enormous capacity for effort, and irritability when the routine breaks. Rest is a skill they resent learning." },
    7:  { short: "conflict happens in partnership", long: "They meet their own aggression through other people, and pick partners who carry it. Notice who keeps starting the fights." },
    8:  { short: "will outlast you",               long: "Their force is strategic, patient, and absolute. They don't spar. They decide." },
    9:  { short: "fights for the principle",       long: "They'll go to war over a belief and be baffled that you took it personally. It genuinely wasn't about you." },
    10: { short: "ambition as an engine",          long: "Their drive is public and career-shaped. They will climb, and they will notice who helped." },
    11: { short: "fights for the group",           long: "Their aggression is collective, mobilised on behalf of others. Effective; occasionally righteous." },
    12: { short: "anger goes underground",         long: "They don't do open conflict, and it doesn't disappear — it surfaces as exhaustion, illness, or a sudden immovable no. Give them a safe way to say it early." },
  },
  jupiter: {
    1:  { short: "life makes room for them",       long: "They walk in expecting welcome, and often get it. The optimism is contagious and occasionally undeserved." },
    2:  { short: "resources tend to arrive",       long: "Money and comfort find them, and they're generous with both. Watch the overreach." },
    3:  { short: "expands through curiosity",      long: "Their luck runs through conversation, learning, and the person they met last Tuesday." },
    4:  { short: "abundance at home",              long: "The family, given or chosen, is where their life gets bigger. They keep the door open and it pays them back." },
    5:  { short: "grows through joy",              long: "Creative work, children, romance. Their pleasure is not indulgence; it's their growth engine." },
    6:  { short: "grows through the daily work",   long: "Meaning arrives in the routine, done well and for someone. They undersell it." },
    7:  { short: "the right person changes everything", long: "Partnership genuinely enlarges their life. They should choose carefully and then commit fully." },
    8:  { short: "grows through what's shared",    long: "They gain from other people's resources and from what they're willing to face. Unafraid of the depths." },
    9:  { short: "made larger by the far world",   long: "Travel, study, belief. Keep them near a horizon or they get small and sour." },
    10: { short: "public life goes well",          long: "Their career expands, sometimes ahead of their readiness. They should say yes and then learn fast." },
    11: { short: "the community carries them",     long: "Friends open doors. Their good fortune is almost always someone else's introduction." },
    12: { short: "a quiet, protected luck",        long: "Things work out in ways they can't trace, and often only in retrospect. Solitude replenishes them." },
  },
  saturn: {
    1:  { short: "armoured at the door",           long: "They learned early to arrive guarded. It reads as gravity; it costs them ease." },
    2:  { short: "never quite feels secure",       long: "Whatever the balance says, some part of them is bracing. Reassure them about the future, plainly." },
    3:  { short: "afraid of saying it wrong",      long: "They edit before they speak, and a sibling or a classroom taught them to. Tell them clumsy is allowed here." },
    4:  { short: "the hard house",                 long: "Something in the early home was cold, absent, or heavy. They rebuild it carefully, brick by brick, and they'll test you before they let you in." },
    5:  { short: "cautious with joy",              long: "Play, romance, and creating feel risky, so they postpone them. Give them permission and stay while they take it." },
    6:  { short: "works past the point of sense",  long: "Duty is how they earn the right to exist. Ask what happens if they stop, and sit with the answer." },
    7:  { short: "commitment is heavy and serious", long: "They marry late, or once, or with great deliberation. When they commit, it's structural." },
    8:  { short: "hard to let anyone all the way in", long: "Control is how they survived intimacy. Trust here is a decision, made slowly, revocable." },
    9:  { short: "belief must be earned",          long: "They're suspicious of easy faith and built their meaning from scratch. Don't hand them a slogan." },
    10: { short: "the weight of the public self",  long: "They carry an expectation nobody asked them to accept, often a parent's. Ask what they'd do if no one were counting." },
    11: { short: "outside the group, watching",    long: "They belong at a slight distance and have decided that's just who they are. Include them before they ask." },
    12: { short: "an old fear with no name",       long: "Something heavy sits below the surface, inherited or forgotten. Therapy, art, and time are the only doors." },
  },
  uranus: {
    1:  { short: "conspicuously themselves",       long: "They cannot perform normal and stopped trying. Others find this either liberating or unbearable." },
    2:  { short: "unorthodox about worth",         long: "They earn strangely, value strangely, and refuse the standard measure of a good life." },
    3:  { short: "an electric mind",               long: "Their thinking jumps. Brilliant and hard to follow; ask them to show the steps." },
    4:  { short: "the home never sat still",       long: "Disruption in the early home, or a deliberate break from it. They may not want the house they were told to want." },
    5:  { short: "unconventional in love and making", long: "Their creativity and romance don't follow the script, and shouldn't be asked to." },
    6:  { short: "cannot do a normal routine",     long: "Rigid schedules break them. Give them autonomy over the how and the work gets done." },
    7:  { short: "needs freedom inside partnership", long: "They'll leave a cage and stay in an open room. Grip loosely; it's not indifference." },
    8:  { short: "intimacy on their own terms",    long: "They break the rules about closeness, money, and merging. Nothing here is assumed." },
    9:  { short: "no inherited belief survives",   long: "They question every faith they were handed and build something odd and honest." },
    10: { short: "an unusual public path",         long: "Their career doesn't look like anyone's. Pushing them to a conventional ladder ends badly." },
    11: { short: "the reformer in the group",      long: "They change the collective they belong to, and sometimes get thrown out of it." },
    12: { short: "a hidden strangeness",           long: "The rebellion runs underground, unnamed even to them, and surfaces suddenly." },
  },
  neptune: {
    1:  { short: "hard to see clearly",            long: "People project onto them, and they let it happen. Ask who they actually are; they may need help answering." },
    2:  { short: "vague about money",              long: "Value and worth stay foggy. Someone should look at the numbers with them, kindly." },
    3:  { short: "thinks in images",               long: "Their reasoning is poetic and slippery. Beautiful, and easy to mistake for agreement." },
    4:  { short: "an idealised or blurred home",   long: "The family story has fog in it, or a myth they've never tested. Gently ask what actually happened." },
    5:  { short: "romantic to the point of fiction", long: "They fall for the version of a person, not the person. Real intimacy is the harder, better thing." },
    6:  { short: "porous in the daily",            long: "The body registers what they won't admit. Their exhaustion is information." },
    7:  { short: "sees the partner they wish for", long: "They idealise the one across from them and are wounded when reality intrudes. Insist on being seen accurately." },
    8:  { short: "dissolves into intimacy",        long: "They lose their edges with someone. Help them keep a self, or they'll disappear and resent it later." },
    9:  { short: "faith without evidence",         long: "Their belief is genuine and hard to argue with. It sustains them and occasionally misleads them." },
    10: { short: "an ambiguous public self",       long: "People aren't sure what they do, including them. The vocation is real; the shape takes years." },
    11: { short: "dreams with the collective",     long: "They give themselves to a cause and may not notice what it costs. Ask who's benefiting." },
    12: { short: "at home in the depths",          long: "Their inner world is enormous and mostly unspoken. Solitude isn't loneliness for them; it's the native country." },
  },
  pluto: {
    1:  { short: "an intensity that precedes them", long: "People react before they've done anything. They learned young that they're a lot." },
    2:  { short: "power and survival tangled with money", long: "Resources carry weight from something old. Losing them feels like dying; ask why." },
    3:  { short: "words as instruments",           long: "They can dismantle someone in a sentence and know it. Restraint here is a moral practice." },
    4:  { short: "the buried thing is at home",    long: "Something in the family history is heavy, unspoken, and formative. Naming it is the whole work." },
    5:  { short: "creation as compulsion",         long: "What they make, and who they love, comes with a force that frightens people. Don't ask them to be lighter." },
    6:  { short: "transformed through the daily",  long: "Crisis and repair, over and over, in work and body. They rebuild themselves in ordinary hours." },
    7:  { short: "relationships remake them",      long: "Their partnerships are the crucible: intense, transformative, occasionally consuming. Power is the recurring question." },
    8:  { short: "unafraid of what others avoid",   long: "Sex, grief, money, truth. They go where everyone else looks away, and they have no patience for the surface." },
    9:  { short: "belief with teeth",              long: "Their convictions are total and hard-won. Conversion, not persuasion, is how they change." },
    10: { short: "power in public",                long: "Their public life carries real force, and real risk of overreach. Ask who they're becoming." },
    11: { short: "changes the group",              long: "They transform the collectives they join, whether or not they meant to." },
    12: { short: "an underground power",           long: "Enormous force runs beneath, unexamined. When it surfaces, it surfaces all at once." },
  },
};

export function interpretHouse(body: BodyKey, house: HouseKey): Reading {
  return PLANET_IN_HOUSE[body]?.[house] ?? { short: "", long: "" };
}

export function houseMeaning(house: HouseKey): HouseMeaning | undefined {
  return HOUSE_MEANING[house];
}

/** Stellium: 3+ bodies in one house or sign. Worth calling out. */
export const STELLIUM_NOTE =
  "Three or more planets gathered here. This is where the weight of the chart falls — a concentration of energy that shapes far more of the life than any single placement would.";
