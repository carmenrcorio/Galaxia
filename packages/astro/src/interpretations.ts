/**
 * Galaxia — Interpretation Library
 *
 * Curated, hand-written copy. Never LLM-generated. This is what makes the
 * brand promise true: "real astrology, real data — the AI only interprets
 * what's real."
 *
 * VOICE RULES (read before editing):
 *  - Warm, specific, plainspoken. Never fatalistic, never cruel. We are the
 *    opposite of Co-Star's coldness.
 *  - Relational, not solitary. Every line should help the reader understand or
 *    tend a bond with this person.
 *  - Concrete over archetypal. "Says the hard thing before they've felt it"
 *    beats "a natural communicator."
 *  - Never rank a person. Never imply someone is difficult, lesser, or a
 *    problem to solve.
 *  - `short` shows collapsed (a phrase). `long` shows expanded (1-2 sentences,
 *    ideally ending in something the reader can DO or notice).
 */

export type BodyKey =
  | "sun" | "moon" | "mercury" | "venus" | "mars"
  | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

export type SignKey =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export interface Reading { short: string; long: string; }

/** What each body governs, in relational terms. Shown as the row label. */
export const BODY_DOMAIN: Record<BodyKey, string> = {
  sun:     "Core self",
  moon:    "Emotional needs",
  mercury: "Mind & voice",
  venus:   "How they love",
  mars:    "Drive & conflict",
  jupiter: "Where they expand",
  saturn:  "Where they armour",
  uranus:  "Where they break the rules",
  neptune: "Where they dream",
  pluto:   "Where they transform",
};

/** Outer planets move slowly — flag them as generational in the UI. */
export const GENERATIONAL: BodyKey[] = ["uranus", "neptune", "pluto"];

export const PLANET_IN_SIGN: Record<BodyKey, Record<SignKey, Reading>> = {
  // ─────────────────────────── SUN ───────────────────────────
  sun: {
    Aries:       { short: "burns bright, moves first", long: "They come alive by starting things, and they'd rather act and correct course than wait and be sure. Let them go first; they lose themselves in too much deliberation." },
    Taurus:      { short: "steady, sensory, hard to rush", long: "They become most themselves through what lasts: a home, a craft, a person they've chosen. Rushing them reads as an attack on the thing they're building." },
    Gemini:      { short: "alive in the exchange", long: "They think by talking and become themselves in conversation, which is why silence from you lands harder than disagreement. Give them the dialogue and they'll give you their mind." },
    Cancer:      { short: "shines by caring for someone", long: "Their sense of self is bound up in who they protect. If you want to see them at full strength, let them look after you and don't call it fussing." },
    Leo:         { short: "needs to be seen to feel real", long: "Warmth and generosity are how they show up, and they need it reflected back. Withholding praise doesn't humble them, it dims them." },
    Virgo:       { short: "self through usefulness", long: "They express love by fixing, refining, noticing what's off. The critique is the affection; the trick is asking them to say the affection out loud too." },
    Libra:       { short: "becomes real in relation", long: "They find themselves through other people, which makes them gracious company and slow to know their own preference. Ask what they want, then wait longer than feels comfortable." },
    Scorpio:     { short: "all-or-nothing, nothing shallow", long: "They live at depth and have no talent for the casual. They will not give you a little of themselves; it's the whole thing or the door." },
    Sagittarius: { short: "self through the open road", long: "They need the horizon to stay honest, and a life that closes in makes them restless before it makes them angry. Give them room and they come back on their own." },
    Capricorn:   { short: "built, not given", long: "They trust what they've earned and are suspicious of ease. Praise for effort lands; praise for talent slides right off." },
    Aquarius:    { short: "themselves by refusing the script", long: "They'd rather be honest than belong, which costs them and they'd pay it again. Don't ask them to perform normal for your comfort." },
    Pisces:      { short: "porous, and it costs them", long: "They take on the feeling in the room without deciding to. When they get strange and distant, ask what they've absorbed rather than what they're hiding." },
  },

  // ─────────────────────────── MOON ───────────────────────────
  moon: {
    Aries:       { short: "feels fast, forgives fast", long: "The flare is real and it's over in minutes; they're baffled that you're still holding it an hour later. Say the hard thing directly, then let it go as fast as they do." },
    Taurus:      { short: "soothed by the physical", long: "Safety is sensory: the same meal, the same side of the bed, a hand on their back. In a crisis, don't process — feed them and sit close." },
    Gemini:      { short: "talks its way to calm", long: "They need to narrate a feeling before they can feel it, and it will change three times while they do. Don't hold them to the first version." },
    Cancer:      { short: "tidal, and remembers everything", long: "Their moods have weather and their memory keeps receipts, especially for tenderness. A small ritual of care will steady them faster than any conversation." },
    Leo:         { short: "needs warmth spoken aloud", long: "They need to be told, not shown, and they'll wilt while insisting they're fine. It costs you one sentence and it lasts them a week." },
    Virgo:       { short: "worries as a love language", long: "Anxiety is how they metabolise care; the list is a form of devotion. Don't tell them to relax — help them do one thing on the list." },
    Libra:       { short: "settled by fairness and peace", long: "Conflict genuinely destabilises them, so they'll agree to things they resent. Ask twice, and make it safe for the second answer to be different." },
    Scorpio:     { short: "intense, private, all or nothing", long: "They feel at a depth they won't narrate, and being watched too closely makes them close. Loyalty opens them; interrogation seals them shut." },
    Sagittarius: { short: "needs air to feel safe", long: "They soothe by moving, by leaving the room, by planning something far away. Following them out is a kindness; cornering them is not." },
    Capricorn:   { short: "self-soothes by handling it", long: "They meet feeling with competence and would rather manage than be comforted. Don't offer to fix it — sit with them while they do." },
    Aquarius:    { short: "steps back to feel", long: "They go clinical under emotional pressure, which reads as cold and is actually self-protection. Give them the distance and they'll return with something honest." },
    Pisces:      { short: "absorbent, permeable, tender", long: "They cry at things that aren't theirs and feel the room before anyone speaks. Ask what they're carrying — half of it belongs to someone else." },
  },

  // ─────────────────────────── MERCURY ───────────────────────────
  mercury: {
    Aries:       { short: "says it before they've felt it", long: "They think out loud at speed and mean less of it than you assume. The first sentence is a draft; wait for the third." },
    Taurus:      { short: "slow, plain, immovable once decided", long: "They will not be hurried into agreeing, and pressure hardens them. Say it once, then leave it alone and let it sit." },
    Gemini:      { short: "quick, curious, six ideas deep", long: "They argue for the pleasure of it and can take your side mid-sentence. Don't mistake the play for a position." },
    Cancer:      { short: "speaks in feeling, not fact", long: "Their reasoning runs on tone and memory, so a fair point delivered coldly will still land as an attack. Warmth first, content second." },
    Leo:         { short: "declarative, and takes it personally", long: "They speak with conviction and hear criticism of an idea as criticism of them. Separate the two out loud and they can hear anything." },
    Virgo:       { short: "precise, and edits you", long: "They notice the flawed detail before the good argument and will say so. It's how they pay attention; it just doesn't feel like it." },
    Libra:       { short: "diplomatic to the point of vanishing", long: "They'll frame their real view as a question to spare you. Ask what they actually think, then don't flinch when it arrives." },
    Scorpio:     { short: "says little, means all of it", long: "They withhold until certain, then say the exact true thing. Silence isn't absence, it's assessment." },
    Sagittarius: { short: "blunt, and surprised you're hurt", long: "They value honesty above tact and don't always notice the difference. They meant it plainly, not cruelly, and will say sorry the moment they see." },
    Capricorn:   { short: "dry, structured, allergic to fluff", long: "They speak in conclusions and skip the feeling that got them there. Ask for the middle of the thought." },
    Aquarius:    { short: "abstract, contrarian, oddly literal", long: "They'll debate the principle while you're describing your day. Name that you want to be heard, not solved." },
    Pisces:      { short: "circles the point, arrives sideways", long: "They communicate in image and impression, and a direct question can make it vanish. Let them wander; the thing they're avoiding is usually the point." },
  },

  // ─────────────────────────── VENUS ───────────────────────────
  venus: {
    Aries:       { short: "loves in pursuit", long: "They love hard and immediately, and they need some spark of chase to stay interested. Total availability doesn't reassure them, it bores them." },
    Taurus:      { short: "loves by staying", long: "Devotion looks like presence, touch, and the same thing on a Tuesday for ten years. They show love by not leaving." },
    Gemini:      { short: "loves by talking to you", long: "Attention is their affection; if they're texting you nonsense all day, that's it. Boredom, not conflict, is what ends things." },
    Cancer:      { short: "loves by feeding and keeping", long: "They fold you into their care and remember what you like. Withdrawal terrifies them more than any argument." },
    Leo:         { short: "loves generously, needs it named", long: "They give lavishly and need to be adored back out loud. Take them for granted and you lose them slowly, then all at once." },
    Virgo:       { short: "loves by noticing", long: "They show it in the errand you didn't ask for and the thing they fixed quietly. Say thank you for the small ones or they stop." },
    Libra:       { short: "loves the us of it", long: "They're happiest inside a partnership and will keep the peace past the point of honesty. Make disagreement safe or you'll never know what they want." },
    Scorpio:     { short: "loves totally, guards fiercely", long: "There's no shallow end. They'll test you before they trust you, and once they do, it's absolute and they expect the same." },
    Sagittarius: { short: "loves without a cage", long: "They stay when they're free to leave, and freedom is the price of their loyalty. Grip tighter and you'll get less." },
    Capricorn:   { short: "loves by building with you", long: "They're not effusive; they're reliable. The mortgage, the ride at 4am, the plan for ten years out — that's the love letter." },
    Aquarius:    { short: "loves as friend first", long: "They need intellectual companionship more than romance and get claustrophobic in intensity. Space is not rejection here." },
    Pisces:      { short: "loves without edges", long: "They merge, sometimes past where they end. Help them keep a self, or they'll dissolve into you and resent it later." },
  },

  // ─────────────────────────── MARS ───────────────────────────
  mars: {
    Aries:       { short: "fights fast, fights clean", long: "It's hot, it's direct, it's over. They'd rather have the fight now than the tension for a week." },
    Taurus:      { short: "won't be moved", long: "Slow to anger and immovable once there. Pushing harder is the one thing guaranteed to fail." },
    Gemini:      { short: "fights with words, moves the target", long: "They'll out-argue you and change the subject twice. Slow the argument down to one question at a time." },
    Cancer:      { short: "goes sideways, not at you", long: "Anger comes out as hurt, withdrawal, or a cold quiet. Ask what wound it landed on, not what the point was." },
    Leo:         { short: "roars, then wants to reconcile", long: "Big display, short duration, and a real need to repair. Wounded pride is usually the actual injury." },
    Virgo:       { short: "fights by listing your flaws", long: "The criticism is anxiety wearing a suit. Ask what they're afraid of underneath the audit." },
    Libra:       { short: "avoids, then resents", long: "They will not fight, and it will come out six weeks later as a strange chill. Invite the conflict early and make it survivable." },
    Scorpio:     { short: "waits, remembers, cuts once", long: "They don't spar; they assess and act. Once they've decided you're not safe, the door is already closed." },
    Sagittarius: { short: "blunt, then gone", long: "They say the true thing carelessly and then leave to cool off. The leaving isn't abandonment; it's how they stay kind." },
    Capricorn:   { short: "cold, contained, strategic", long: "They don't lose control; they lose interest. Their fury looks like an efficiently shortened list of your privileges." },
    Aquarius:    { short: "detaches, argues principle", long: "They'll go abstract while you're bleeding. Bring it back to what happened between the two of you, not what's true in general." },
    Pisces:      { short: "dissolves rather than fights", long: "They go vague, tearful, elsewhere. Direct confrontation floods them; a slow, gentle question gets further." },
  },

  // ─────────────────────────── JUPITER ───────────────────────────
  jupiter: {
    Aries:       { short: "grows by daring", long: "Luck arrives when they move before they're ready. Their worst outcomes come from waiting for permission." },
    Taurus:      { short: "grows by keeping", long: "They expand through patience and accumulation. Ask them for their long game; it's better than yours." },
    Gemini:      { short: "grows by curiosity", long: "Their good fortune comes through conversation, connection, and the thing they read last week. Introduce them to people." },
    Cancer:      { short: "grows through belonging", long: "Family, chosen or given, is where their life gets bigger. They flourish when someone needs them." },
    Leo:         { short: "grows by being generous", long: "Their abundance is real and meant to be shared, and sharing it is what brings more. Let them treat you." },
    Virgo:       { short: "grows through service", long: "Meaning arrives through useful work done well. They undersell themselves; say the compliment specifically." },
    Libra:       { short: "grows through partnership", long: "Their luck runs through other people. The right relationship genuinely changes their life's trajectory." },
    Scorpio:     { short: "grows by going under", long: "They gain from what most people avoid: the crisis, the truth, the buried thing. They're not morbid; they're unafraid." },
    Sagittarius: { short: "grows by going far", long: "Travel, study, belief — anything that widens the frame. A small life makes them small." },
    Capricorn:   { short: "grows by earning", long: "Their expansion is slow and permanent. Nothing they've built will need rebuilding." },
    Aquarius:    { short: "grows in the collective", long: "They flourish where the work is bigger than them and shared. Community, cause, or nothing." },
    Pisces:      { short: "grows by letting go", long: "Their abundance comes through compassion, art, and surrender. Grasping is the one thing that closes it." },
  },

  // ─────────────────────────── SATURN ───────────────────────────
  saturn: {
    Aries:       { short: "afraid of their own anger", long: "They learned that wanting things loudly was dangerous, so they hesitate where they should act. Encourage the want." },
    Taurus:      { short: "fears there won't be enough", long: "Scarcity sits under the calm, whether or not the bank account agrees. Reassurance about the future lands deeper than gifts." },
    Gemini:      { short: "fears saying it wrong", long: "They rehearse, self-edit, and go quiet in the moment. Tell them clumsy is welcome here." },
    Cancer:      { short: "armoured around the home", long: "Something in the early home wasn't safe, so they built walls where warmth should be. Consistency, not intensity, gets you in." },
    Leo:         { short: "fears being too much", long: "They shrank once and never fully unshrank. Praise them plainly and watch how badly they need it." },
    Virgo:       { short: "fears not being enough", long: "The perfectionism is armour, and the standard is unmeetable by design. Value them for something other than output." },
    Libra:       { short: "fears being left", long: "They keep the peace because the alternative feels like abandonment. Fight with them, gently, until it stops feeling fatal." },
    Scorpio:     { short: "fears being at anyone's mercy", long: "Control is how they survived. Trust is not a feeling they'll have; it's a decision they'll make slowly, watching." },
    Sagittarius: { short: "fears being trapped", long: "Commitment reads as a closing door. Show them the door stays unlocked and watch them stay." },
    Capricorn:   { short: "fears failing publicly", long: "They carry a weight nobody asked them to pick up. Ask what they'd do if nobody was counting on them." },
    Aquarius:    { short: "fears belonging", long: "They've decided they're an outsider, and it's half true and half a wall. Include them before they ask." },
    Pisces:      { short: "fears their own softness", long: "They armour the tenderness because it's been used against them. Prove you're safe by being boring and consistent." },
  },

  // ────────────────── URANUS (generational) ──────────────────
  uranus: {
    Aries:       { short: "a generation that broke first", long: "Born to a cohort that trusted the impulse and started before it was safe. Rebellion as instinct, not argument." },
    Taurus:      { short: "a generation upending what things are worth", long: "Their cohort came of age questioning money, ownership, and the value of land itself." },
    Gemini:      { short: "a generation that rewrote how we talk", long: "Their era broke the old channels of information. They think in networks without noticing." },
    Cancer:      { short: "a generation that redefined home", long: "The shape of family shifted under them. They may not believe in the household they were told to want." },
    Leo:         { short: "a generation that made the self a project", long: "Their cohort broke the rules about how much attention a person may claim." },
    Virgo:       { short: "a generation that overhauled the work", long: "Their era broke health, labour, and craft open and rebuilt them. Efficiency is their radicalism." },
    Libra:       { short: "a generation that renegotiated the couple", long: "Marriage, partnership, and fairness all shifted under them. They can't take a relationship's form for granted." },
    Scorpio:     { short: "a generation unafraid of the buried thing", long: "Their era dragged sex, death, and power into the daylight. Nothing is unspeakable to them." },
    Sagittarius: { short: "a generation that broke belief open", long: "Their cohort questioned every inherited faith and border. Restless, and immune to received truth." },
    Capricorn:   { short: "a generation that distrusts the institution", long: "The structures cracked as they were coming up, so they build their own and expect nothing to hold." },
    Aquarius:    { short: "a generation wired to question the rules", long: "Reformers by cohort. They assume the system is changeable, which is either naive or exactly right." },
    Pisces:      { short: "a generation dissolving the boundary", long: "Their era blurred the line between real and imagined, self and other. Mystics and screen-dwellers alike." },
  },

  // ────────────────── NEPTUNE (generational) ──────────────────
  neptune: {
    Aries:       { short: "dreams of the heroic act", long: "Their cohort's fantasy is the individual who moves first and alone." },
    Taurus:      { short: "dreams of enough", long: "A generation whose ideal is security, land, and a body at rest in a safe place." },
    Gemini:      { short: "dreams in information", long: "Their cohort imagined that knowing everything would set us free." },
    Cancer:      { short: "dreams of home as salvation", long: "Their era romanticised belonging and the family that never quite existed." },
    Leo:         { short: "dreams of the star", long: "A generation raised on glamour, and on the belief that being seen is being saved." },
    Virgo:       { short: "dreams of the perfected life", long: "Their cohort idealised health, order, and the well-run self." },
    Libra:       { short: "dreams of the perfect other", long: "A generation that believed the right relationship would complete them." },
    Scorpio:     { short: "dreams at the edge", long: "Their era found transcendence in intensity, taboo, and the extremity of feeling." },
    Sagittarius: { short: "dreams of somewhere else", long: "A generation whose ideal is escape, expansion, and a truth over the next horizon." },
    Capricorn:   { short: "a practical kind of dreaming", long: "Their cohort translates ideals into structure and is sceptical of vague promises. They build the utopia or don't discuss it." },
    Aquarius:    { short: "dreams of the collective", long: "A generation that imagined technology and community could dissolve the old cruelties." },
    Pisces:      { short: "dreams without a shore", long: "Their era's ideal is compassion without limit, and they are prone to drowning in it." },
  },

  // ────────────────── PLUTO (generational) ──────────────────
  pluto: {
    Aries:       { short: "a generation that transforms by force", long: "Their cohort's power is initiation — beginning the thing that cannot be taken back." },
    Taurus:      { short: "a generation remaking value itself", long: "What is worth something, who owns the earth, what a body is for. That's their upheaval." },
    Gemini:      { short: "a generation transformed by ideas", long: "Their power moves through language, and so does their damage." },
    Cancer:      { short: "a generation that rebuilt the family", long: "Their cohort was forged by upheaval in home and homeland, and rebuilt both." },
    Leo:         { short: "a generation that seized the self", long: "Their era made individual will an engine — creative, and hard to govern." },
    Virgo:       { short: "a generation transformed through crisis and repair", long: "Their power is in the work of healing what broke, exactingly." },
    Libra:       { short: "a generation that broke and remade the couple", long: "Their era rewrote marriage, fairness, and what people owe each other." },
    Scorpio:     { short: "intensity, loyalty, all-or-nothing depth", long: "This cohort treats trust as absolute and betrayal as final. Deep instincts around honesty, and no patience for the surface." },
    Sagittarius: { short: "a generation that burned the map", long: "Restless and free, less guarded than the ones before them. Belief itself was up for grabs." },
    Capricorn:   { short: "a generation that dismantles the structure", long: "Their era's work is tearing down institutions that no longer hold, whether or not there's a plan." },
    Aquarius:    { short: "a generation remaking the collective", long: "Power moves to the network. Their upheaval is about who decides, and who is counted." },
    Pisces:      { short: "a generation dissolving the old certainties", long: "Their transformation happens through surrender, faith, and the loss of the solid ground." },
  },
};

/** The Ascendant: the door people come through to reach them. */
export const RISING: Record<SignKey, Reading> = {
  Aries:       { short: "arrives at speed", long: "First impression: direct, a little combative, impossible to ignore. The urgency is the doorway, not the room." },
  Taurus:      { short: "calm, and slow to open", long: "They read as unhurried and grounded, and they take their time deciding about you. Patience is the entry fee." },
  Gemini:      { short: "bright, quick, hard to pin", long: "They meet you with talk and curiosity, and it can take years to notice how little they've said about themselves." },
  Cancer:      { short: "guarded warmth", long: "They approach sideways, feeling out whether it's safe. Kindness comes first; the truth comes much later." },
  Leo:         { short: "warm, and takes up the room", long: "They arrive with generosity and a certain performance, and the performance is sincere. Applause is not vanity here, it's oxygen." },
  Virgo:       { short: "reserved, observant, tidy", long: "They notice everything and volunteer little. The reticence is modesty, not coldness." },
  Libra:       { short: "charming, accommodating, hard to read", long: "They meet you with grace and match your temperature. Ask what they think; the answer is genuinely in there." },
  Scorpio:     { short: "watchful, magnetic, unreadable", long: "They give nothing away and take everything in. Being assessed by them feels like being seen, because it is." },
  Sagittarius: { short: "open, roaming, unfiltered", long: "They arrive friendly and unguarded, and they'll say the true thing on day one. The openness is real, and so is the exit." },
  Capricorn:   { short: "composed, competent, keeps the distance", long: "They present as capable and slightly formal. It thaws, but on their schedule, not yours." },
  Aquarius:    { short: "friendly and far away", long: "They are easy to meet and hard to reach. The distance isn't disinterest; it's the shape of them." },
  Pisces:      { short: "soft-edged, elusive, kind", long: "They meet you with gentleness and a certain haze, and they'll mirror you before they show you themselves. Ask a second time." },
};

/** Aspect readings: what the geometry does to a bond. */
export type AspectKey = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export const ASPECT_NATURE: Record<AspectKey, { tone: "flow" | "friction" | "fusion"; short: string; long: string }> = {
  conjunction: { tone: "fusion",   short: "fused into one charge", long: "These two forces don't take turns; they move as one. Powerful, and hard to see clearly from inside." },
  sextile:     { tone: "flow",     short: "an easy, available talent", long: "It works when they reach for it, and it sits idle when they don't. A door left unlocked." },
  square:      { tone: "friction", short: "friction that makes them grow", long: "These two pull against each other, and the tension is productive. It never fully resolves, and it isn't supposed to." },
  trine:       { tone: "flow",     short: "so easy they don't notice it", long: "This comes naturally enough to be taken for granted. Often their greatest gift and their least developed one." },
  opposition:  { tone: "friction", short: "a balancing act, pulled two ways", long: "They swing between these poles and mistake one for the enemy. Integration, not victory, is the way through." },
};

/** Named readings for the pairs that matter most in a relationship. */
const PAIR = (a: BodyKey, b: BodyKey) => [a, b].sort().join("-");

export const ASPECT_PAIR: Record<string, Partial<Record<AspectKey, Reading>>> = {
  [PAIR("sun", "moon")]: {
    conjunction: { short: "what they want and what they need agree", long: "Their identity and their emotional needs point the same way, which makes them coherent and a little unexamined." },
    square:      { short: "wants one thing, needs another", long: "What makes them proud isn't what makes them safe, and they will keep choosing the first. Ask what they need, not what they want." },
    opposition:  { short: "at odds with themselves", long: "Their public self and private self were built in different rooms. Don't take the contradiction personally; it predates you." },
  },
  [PAIR("moon", "venus")]: {
    conjunction: { short: "loves the way they feel", long: "Affection and emotional need are the same instinct in them. Withdrawing love is felt as withdrawing safety." },
    square:      { short: "wants closeness, flinches at it", long: "They reach and then retreat, and it isn't a game. Steadiness is the answer, not pursuit." },
    trine:       { short: "loves easily and knows it", long: "Warmth comes without effort. Watch that it isn't spent on people who don't return it." },
  },
  [PAIR("mars", "venus")]: {
    conjunction: { short: "desire and affection, one fire", long: "They don't separate wanting from loving. It's intense, and it burns through anything lukewarm." },
    square:      { short: "wants what unsettles them", long: "Attraction and comfort pull opposite ways here. The tension is real chemistry and also real trouble." },
    opposition:  { short: "chases what it can't hold", long: "They're drawn to what resists them. Name the pattern out loud and it loosens." },
  },
  [PAIR("mars", "moon")]: {
    square:      { short: "anger sits close to hurt", long: "The heat comes up fast because the feeling did. The fight is almost never about the thing." },
    conjunction: { short: "feels it and acts on it, instantly", long: "No gap between the emotion and the response. Give them a beat before they speak and they'll thank you." },
  },
  [PAIR("mercury", "moon")]: {
    square:      { short: "can't say what they feel", long: "The words and the feeling live in different rooms, so they go quiet or clinical under pressure. Ask in writing." },
    trine:       { short: "says the feeling plainly", long: "A rare, quiet gift: they can name what's happening inside them while it's happening." },
  },
  [PAIR("saturn", "moon")]: {
    square:      { short: "learned not to need", long: "Someone taught them early that needing was unsafe, so they manage instead of asking. Offer before they ask; they won't ask." },
    conjunction: { short: "carries the feeling alone", long: "Emotion arrives with a weight and a duty attached. Being allowed to be a mess is the most generous thing you can give them." },
  },
  [PAIR("saturn", "venus")]: {
    square:      { short: "believes love must be earned", long: "They work for affection they've already got. Say it unprompted, when they've done nothing, and watch it land." },
  },
  [PAIR("pluto", "moon")]: {
    square:      { short: "feelings arrive as weather systems", long: "Emotion comes with an intensity that frightens even them. Don't fear it, and don't try to manage it for them." },
  },
  [PAIR("jupiter", "sun")]: {
    conjunction: { short: "generous, expansive, easy to like", long: "Life gives them a little more room than it gives others, and they mostly share it." },
  },
};

/** Resolve a reading for a specific aspect between two bodies. */
export function interpretAspect(a: BodyKey, b: BodyKey, aspect: AspectKey): Reading {
  const named = ASPECT_PAIR[PAIR(a, b)]?.[aspect];
  if (named) return named;
  const nature = ASPECT_NATURE[aspect];
  return { short: nature.short, long: nature.long };
}

/** Resolve a placement reading. Never returns empty. */
export function interpretPlacement(body: BodyKey, sign: SignKey): Reading {
  return PLANET_IN_SIGN[body]?.[sign] ?? { short: "", long: "" };
}

export function interpretRising(sign: SignKey): Reading {
  return RISING[sign] ?? { short: "", long: "" };
}

/** Element / modality balance readings, keyed by what's dominant or absent. */
export const ELEMENT_DOMINANT: Record<"fire"|"earth"|"air"|"water", string> = {
  fire:  "Runs hot. Acts first, feels it later, and needs somewhere to burn.",
  earth: "Built on the tangible. Slow, reliable, and unmoved by an argument that has no evidence.",
  air:   "Lives in the idea. Needs to talk it through, and cools down by thinking.",
  water: "Feels everything, including what's yours. Reads the room before anyone speaks.",
};

export const ELEMENT_ABSENT: Record<"fire"|"earth"|"air"|"water", string> = {
  fire:  "Little fire. They may wait for permission to want things. Encourage the want.",
  earth: "Little earth. Ideas and feelings outrun the practical. Help them land one thing.",
  air:   "Little air. They feel it fully before they can name it. Give them time before you ask them to explain.",
  water: "Little water. They handle rather than feel, and may not notice the emotional weather. Say it out loud.",
};
