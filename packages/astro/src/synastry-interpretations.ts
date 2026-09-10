// packages/astro/src/synastry-interpretations.ts
//
// Curated SYNASTRY aspect interpretations for the compare flows-and-catches rows.
// FOUNDER-REVIEW: every string is static, hand-authored, between-you voice. Never generated.
//
// WHY A SEPARATE TABLE (do not merge into ASPECT_PAIR):
// interpretAspect() also powers natal aspects on person pages, which are written in
// third-person natal voice ("They..."). This table is second-person relationship voice
// ("you two..."). They must not share a table or the natal person page voice breaks.
// interpretSynastryAspect() below checks THIS table, then falls back to the neutral
// ASPECT_NATURE per-type phrase. It never falls back to the natal ASPECT_PAIR table.
//
// KEYING: keys are the alphabetically-sorted, lowercase body pair joined by "-",
// same PAIR() convention as interpretations.ts. One entry per unordered pair covers
// both directions. AspectKey = conjunction | sextile | square | trine | opposition.
//
// PASS 1: the 7 personal/social bodies, all 21 pairs, all 5 types = 105.
// PASS 2: every unordered pair that includes uranus, neptune, or pluto
// (7 core x 3 outer = 21, plus the 3 outer-outer pairs = 24 pairs x 5 types = 120).
// Same-body pairs (sun-sun, uranus-uranus, ...) stay unauthored; the compare surface
// drops from===to, so they never render. Relation type is not in the lookup, so every
// string here can appear on parent-child / ancestor / friends as well as partners.
// Voice is between-you, family-safe: no sexual, romantic, or possessive charge.

import type { BodyKey, AspectKey, Reading } from "./interpretations";
import { ASPECT_NATURE } from "./interpretations";

const PAIR = (a: BodyKey, b: BodyKey) => [a, b].sort().join("-");

export const SYNASTRY_PAIR: Record<string, Partial<Record<AspectKey, Reading>>> = {
  // ---- SUN / MOON --------------------------------------------------------------
  "moon-sun": {
    conjunction: {
      short: "identity and feeling pointed the same way",
      long: "One of you leads with self, the other with feeling, and here they fuse. You instinctively get what makes the other tick, which is rare. Watch that you do not blur into one person.",
    },
    trine: {
      short: "you get each other without trying",
      long: "What one of you needs to feel safe, the other tends to supply by reflex. This is the easy warmth a bond runs on, so name it out loud instead of taking it for granted.",
    },
    sextile: {
      short: "an easy fit when you lean in",
      long: "Comfort and confidence come naturally once you engage. It will not carry the relationship on autopilot, but it is a reliable well to draw from whenever you turn toward each other.",
    },
    square: {
      short: "wants one thing, needs another",
      long: "One of you pushes to be seen while the other pulls toward safety, and those aims scrape. It is not a flaw in either of you, just different settings. Say which you need in the moment.",
    },
    opposition: {
      short: "pulled two ways, drawn together",
      long: "You sit on opposite ends of self and feeling, so you each carry what the other lacks. That is the magnetic part and the tiring part. Treat the difference as a completion, not a correction.",
    },
  },

  // ---- SUN / MERCURY -----------------------------------------------------------
  "mercury-sun": {
    conjunction: {
      short: "you think and speak as one",
      long: "The way one of you sees the world and the other puts it into words line up closely, so you finish each other's thoughts. Just make sure both voices stay in the room.",
    },
    trine: {
      short: "easy to be understood here",
      long: "You explain yourselves to each other with little friction. Ideas move cleanly between you, which makes the hard conversations easier than most pairs ever get.",
    },
    sextile: {
      short: "understanding that opens when you talk",
      long: "Talk it through and clarity comes fast. The ease is there for the taking, but it rewards the pair who keeps talking rather than assuming.",
    },
    square: {
      short: "heard, but not quite gotten",
      long: "One of you feels their point lands sideways. The intent is fine; the wiring differs. Check what was actually meant before you react to what you think you heard.",
    },
    opposition: {
      short: "two ways of seeing one thing",
      long: "You process from opposite angles, so you can inform each other or talk right past each other. Used well, one of you spots the blind spot the other cannot.",
    },
  },

  // ---- SUN / VENUS -------------------------------------------------------------
  "sun-venus": {
    conjunction: {
      short: "you delight in who the other is",
      long: "Warmth and identity blend, so you tend to simply enjoy each other. This is one of the sweetest contacts to have. Let it be as easy as it wants to be.",
    },
    trine: {
      short: "affection that comes naturally",
      long: "You appreciate each other without effort, and it shows. This is steady, uncomplicated fondness, the kind that quietly holds a bond together over time.",
    },
    sextile: {
      short: "easy liking, there when you use it",
      long: "The affection is available whenever you turn toward it. It will not demand attention, so the pair that keeps choosing each other gets the most from it.",
    },
    square: {
      short: "warmth that rubs on taste",
      long: "You care, but what one of you finds worth valuing can chafe the other. The feeling is real; the taste differs. Respect the difference instead of trying to convert it.",
    },
    opposition: {
      short: "drawn together across a gap in taste",
      long: "Attraction pulls you close while your values sit on opposite sides. That tension is part of the draw. Let each of you keep your own sense of what is good.",
    },
  },

  // ---- SUN / MARS --------------------------------------------------------------
  "mars-sun": {
    conjunction: {
      short: "you fire each other up",
      long: "Two engines running together. You energize and provoke each other in equal measure, which is exciting and occasionally combustible. Point the drive at a shared target.",
    },
    trine: {
      short: "drive that moves in step",
      long: "You act well together and rarely trip over each other's pace. Shared projects flow, because your wills tend to want the same tempo.",
    },
    sextile: {
      short: "get-up-and-go on tap",
      long: "When you take something on together, the momentum is right there. It rewards initiative, so start the thing rather than waiting for it to start itself.",
    },
    square: {
      short: "two wills that push",
      long: "You both want to lead, and that grinds. Badly handled it is a turf war; well handled it is healthy heat. Decide who drives which parts before it becomes a contest.",
    },
    opposition: {
      short: "attraction with friction in it",
      long: "Your drives point opposite ways, so you strike sparks, wanted and unwanted. The heat that pulls you together is the same heat that argues. Aim it outward, not at each other.",
    },
  },

  // ---- SUN / JUPITER -----------------------------------------------------------
  "jupiter-sun": {
    conjunction: {
      short: "you make each other bigger",
      long: "One of you tends to believe in and expand the other. This is a lucky, generous contact that lifts confidence. Keep the optimism honest so it does not tip into overpromising.",
    },
    trine: {
      short: "easy encouragement both ways",
      long: "You bring out each other's confidence without trying. Being around each other simply feels like room to grow, which is a quietly powerful thing to have.",
    },
    sextile: {
      short: "growth that opens when you reach",
      long: "Encouragement and opportunity are here for the taking. Lean in and you sharpen each other's faith; ignore it and it just idles.",
    },
    square: {
      short: "generous, but overshoots",
      long: "The warmth is real, but one of you can inflate the other or promise past what holds up. Enjoy the lift and keep one foot on the ground.",
    },
    opposition: {
      short: "big energy pulling two ways",
      long: "You expand each other, sometimes past the point of realism. Great for morale, risky for judgment. Let each of you be the other's reality check.",
    },
  },

  // ---- SUN / SATURN ------------------------------------------------------------
  "saturn-sun": {
    conjunction: {
      short: "serious, steady, built to last",
      long: "One of you grounds and commits to the other. This is the contact of longevity and duty; it can feel like bedrock or like pressure. Treated with respect, it is what makes a bond durable.",
    },
    trine: {
      short: "steady respect that holds",
      long: "You take each other seriously and it stabilizes you both. Not flashy, but this is the quiet spine that keeps a relationship standing through the hard seasons.",
    },
    sextile: {
      short: "reliability you can build on",
      long: "Commitment and structure are available when you choose them. It rewards the pair willing to do the unglamorous work of showing up consistently.",
    },
    square: {
      short: "care that can feel like weight",
      long: "One of you can come across as critical or limiting to the other, even meaning well. The steadiness is real; so is the friction. Name the pressure before it hardens into resentment.",
    },
    opposition: {
      short: "freedom and duty facing off",
      long: "One of you leans toward expression, the other toward caution, and you feel the pull. It can mature you both or box you in. Let the structure serve the bond, not police it.",
    },
  },

  // ---- MOON / MERCURY ----------------------------------------------------------
  "mercury-moon": {
    conjunction: {
      short: "you talk the way you feel",
      long: "Feeling and words merge, so you tend to say what is really going on inside. Emotional honesty comes easily here; just watch that a bad mood does not run the conversation.",
    },
    trine: {
      short: "feelings that put themselves into words",
      long: "You find it easy to talk about the tender stuff. What one of you feels, the other can hear and name, which spares you a lot of the usual misreads.",
    },
    sextile: {
      short: "easy talk about real things",
      long: "Open the subject and the emotional conversation flows. It is a ready tool for closeness, best used by the pair who actually raises the hard topics.",
    },
    square: {
      short: "head and heart cross wires",
      long: "One of you leads with logic, the other with feeling, and they snag. A reasonable point can land cold; a feeling can read as unreasonable. Translate before you react.",
    },
    opposition: {
      short: "thinking it through versus feeling it out",
      long: "You process opposite ways, so you can balance or frustrate each other. At best, one supplies the head when the other is all heart, and the reverse.",
    },
  },

  // ---- MOON / VENUS ------------------------------------------------------------
  "moon-venus": {
    conjunction: {
      short: "tenderness that comes easily",
      long: "Care and comfort blend here, so being together simply feels good. This is one of the gentlest, most nurturing contacts. Let yourselves enjoy the softness of it.",
    },
    trine: {
      short: "natural warmth and ease",
      long: "You soothe each other without effort. Affection flows in the small daily ways, which is exactly the maintenance a close bond quietly runs on.",
    },
    sextile: {
      short: "comfort there when you reach for it",
      long: "Tenderness is available whenever you turn toward it. It asks only that you keep choosing the small gestures rather than assuming they are automatic.",
    },
    square: {
      short: "different ideas of feeling loved",
      long: "You both care, but what feels like love to one may not to the other. The warmth is genuine; the language differs. Learn the other's dialect instead of repeating your own.",
    },
    opposition: {
      short: "reaching across different needs",
      long: "Your ways of giving comfort sit opposite, so you can complete or miss each other. Ask what actually lands for the other rather than giving what you would want.",
    },
  },

  // ---- MOON / MARS -------------------------------------------------------------
  "mars-moon": {
    conjunction: {
      short: "feelings run hot",
      long: "Emotion and drive fuse, so your reactions are strong and fast, in passion and in temper. It makes for real heat and real fights. Give the feelings a place to move before they move you.",
    },
    trine: {
      short: "emotion and action in sync",
      long: "What you feel, you can act on cleanly together. There is a healthy directness here; upsets tend to move through rather than fester.",
    },
    sextile: {
      short: "healthy heat when you engage",
      long: "Passion and momentum are on hand when you lean in. It rewards the pair who acts on a feeling rather than sitting in it.",
    },
    square: {
      short: "quick to spark",
      long: "One of you can feel provoked by the other's pace or heat, and it flares fast. Not malice, just friction between mood and momentum. Cool the burner before you settle it.",
    },
    opposition: {
      short: "passion pulling against comfort",
      long: "Drive and need face off, so you can inflame or balance each other. The same heat that attracts can tip into conflict. Learn each other's fuse.",
    },
  },

  // ---- MOON / JUPITER ----------------------------------------------------------
  "jupiter-moon": {
    conjunction: {
      short: "you lift each other's spirits",
      long: "One of you tends to buoy the other emotionally. This is a warm, generous, feel-good contact. Just keep it honest, so comfort does not slide into papering over the real thing.",
    },
    trine: {
      short: "easy emotional generosity",
      long: "You are naturally good to each other's feelings. Being together tends to feel like more room to breathe, which is a genuine gift in a close bond.",
    },
    sextile: {
      short: "warmth that grows when tended",
      long: "Emotional generosity is here for the taking. Turn toward it and you expand each other's sense of safety and hope.",
    },
    square: {
      short: "big-hearted, sometimes too much",
      long: "The generosity is real but can overpromise or overfeed. Enjoy the warmth and keep it grounded in what is actually true.",
    },
    opposition: {
      short: "comfort and expansion pulling apart",
      long: "One of you reaches out, the other pulls in, and you feel the stretch. Balanced well, one supplies faith when the other supplies grounding.",
    },
  },

  // ---- MOON / SATURN -----------------------------------------------------------
  "moon-saturn": {
    conjunction: {
      short: "steady but guarded feeling",
      long: "One of you grounds the other's emotions, which can feel like safety or like a chill. This is a serious bond that can go the distance if the guarded one lets warmth through.",
    },
    trine: {
      short: "emotional steadiness that holds",
      long: "You give each other a calm, reliable base. Feelings are safe here because they are handled with care rather than drama, which is its own kind of intimacy.",
    },
    sextile: {
      short: "dependable comfort you can build",
      long: "Emotional security is available when you choose it. It rewards patience and consistency over grand gestures.",
    },
    square: {
      short: "warmth meeting a wall",
      long: "One of you can read as cold or withholding to the other, usually out of self-protection rather than indifference. Name the wall gently instead of taking it personally.",
    },
    opposition: {
      short: "openness against restraint",
      long: "One of you reaches for feeling, the other for control, and you feel the gap. At best you teach each other: warmth learns steadiness, steadiness learns to thaw.",
    },
  },

  // ---- MERCURY / VENUS ---------------------------------------------------------
  "mercury-venus": {
    conjunction: {
      short: "you talk to each other kindly",
      long: "Words and affection blend, so conversation between you tends to be warm and easy. This is the gift that keeps a bond pleasant day to day.",
    },
    trine: {
      short: "affectionate, easy conversation",
      long: "You naturally say the nice thing and hear it well. Communication carries warmth here, which smooths over a lot of ordinary friction.",
    },
    sextile: {
      short: "warm talk when you use it",
      long: "Kind, easy conversation is on hand whenever you turn toward it. The pair that keeps talking keeps the affection topped up.",
    },
    square: {
      short: "nice words, different taste",
      long: "You mean well but can disagree on tone or what counts as charming. The affection is real; the style clashes. Do not mistake a style gap for a values gap.",
    },
    opposition: {
      short: "charm across a difference",
      long: "You appeal to each other from opposite angles, which keeps things interesting. Let the difference in taste be a draw, not a debate.",
    },
  },

  // ---- MERCURY / MARS ----------------------------------------------------------
  "mars-mercury": {
    conjunction: {
      short: "quick, sharp, fast-talking",
      long: "Words and drive fuse, so your exchanges are lively and pointed. Great for solving things, prone to cutting when heated. Aim the sharpness at the problem.",
    },
    trine: {
      short: "you think and act fast together",
      long: "Ideas turn into action cleanly between you. Debate energizes rather than wounds, and you get things decided quickly.",
    },
    sextile: {
      short: "decisive back-and-forth on tap",
      long: "Quick, effective exchange is there when you engage. This is a pair that can talk a thing through and move on it fast.",
    },
    square: {
      short: "a conversation that turns to debate",
      long: "One of you can feel argued at rather than talked with. The drive to win drowns the drive to understand. Slow the pace before you make the point.",
    },
    opposition: {
      short: "sharp minds pulling opposite",
      long: "You spar from opposite corners, which sharpens or exhausts depending on the day. Used well, the friction cuts to the truth faster than agreement would.",
    },
  },

  // ---- MERCURY / JUPITER -------------------------------------------------------
  "jupiter-mercury": {
    conjunction: {
      short: "big ideas, bigger conversations",
      long: "Thinking and expansion blend, so you dream out loud well together. Great for vision; watch that enthusiasm does not outrun the details.",
    },
    trine: {
      short: "ideas grow easily between you",
      long: "You broaden each other's thinking without effort. Conversations open outward, which makes you good at planning and possibility together.",
    },
    sextile: {
      short: "learning that opens when you talk",
      long: "Curiosity is rewarded here. Engage and you expand each other's view; the more you explore together, the more it gives.",
    },
    square: {
      short: "optimism outrunning the facts",
      long: "The ideas are exciting but can skip the fine print. One of you may generalize past what holds up. Enjoy the vision, check the math.",
    },
    opposition: {
      short: "detail against big picture",
      long: "One of you zooms in, the other zooms out. Balanced, you cover each other's blind spots; unbalanced, you argue scale instead of substance.",
    },
  },

  // ---- MERCURY / SATURN --------------------------------------------------------
  "mercury-saturn": {
    conjunction: {
      short: "careful, serious communication",
      long: "Thought and structure blend, so you say what you mean and make agreements that hold. It can feel heavy at times; keep room for lightness too.",
    },
    trine: {
      short: "you make agreements that stick",
      long: "You think clearly and carefully together, so plans and commitments between you are solid. This is a quietly reliable, grown-up kind of communication.",
    },
    sextile: {
      short: "clear, careful talk you can build on",
      long: "Sound, structured conversation is available when you choose it. It rewards the pair willing to be precise rather than vague.",
    },
    square: {
      short: "talk that lands as criticism",
      long: "One of you can sound critical or dismissive without meaning to. The care is real; the delivery bruises. Soften the edge, or the other stops opening up.",
    },
    opposition: {
      short: "open thinking versus caution",
      long: "One of you wants to explore, the other to pin down, and you feel the pull. At best, curiosity gets grounded and caution gets stretched.",
    },
  },

  // ---- VENUS / MARS ------------------------------------------------------------
  "mars-venus": {
    conjunction: {
      short: "wanting and warmth, fused",
      long: "The classic chemistry contact: affection and desire in the same place. The attraction is immediate. Keep tending the warmth so it does not burn down to just heat.",
    },
    trine: {
      short: "attraction that flows easily",
      long: "Desire and affection move in sync, so the spark feels natural rather than fraught. This is the easy chemistry that keeps a bond alive; do not let it go unspoken.",
    },
    sextile: {
      short: "easy chemistry when you engage",
      long: "The attraction is available and uncomplicated once you turn toward it. It rewards the pair who keeps choosing each other rather than coasting.",
    },
    square: {
      short: "heat with friction in it",
      long: "You want each other and you rub each other, often at once. The tension is part of the charge. Let it drive you toward each other, not into a fight.",
    },
    opposition: {
      short: "magnetic pull across a gap",
      long: "Desire and affection sit opposite, so the attraction runs hot and a little combustible. The very difference that pulls you can also spark conflict. Ride it consciously.",
    },
  },

  // ---- VENUS / JUPITER ---------------------------------------------------------
  "jupiter-venus": {
    conjunction: {
      short: "generous, easy affection",
      long: "Warmth and abundance blend, so love here feels expansive and good-natured. One of the most pleasant contacts there is; enjoy it, and keep it from tipping into overindulgence.",
    },
    trine: {
      short: "warmth that comes freely",
      long: "You are simply good to each other. Affection flows generously and without much effort, which makes the relationship feel like a soft place to land.",
    },
    sextile: {
      short: "easy generosity, there for the taking",
      long: "Warmth and goodwill are on hand whenever you reach for them. Say the affection out loud even when it feels obvious; this is exactly the kind that gets taken for granted.",
    },
    square: {
      short: "big-hearted, sometimes over the top",
      long: "The affection is generous but can overdo it, in spending, indulging, or promising. Lovely energy; keep it a little grounded.",
    },
    opposition: {
      short: "warmth pulling two ways",
      long: "You lavish each other from opposite angles, which feels great and occasionally excessive. Let the generosity flow, just keep it honest.",
    },
  },

  // ---- VENUS / SATURN ----------------------------------------------------------
  "saturn-venus": {
    conjunction: {
      short: "love that commits",
      long: "Affection and structure fuse, so love here is serious and built to last. It can feel like devotion or like restraint. Given trust, it is the contact of a bond that endures.",
    },
    trine: {
      short: "steady, committed warmth",
      long: "Your affection has staying power. Not the fireworks kind so much as the reliable, keeps-showing-up kind, which is what actually lasts.",
    },
    sextile: {
      short: "durable affection you can build",
      long: "Committed warmth is available when you choose it. It rewards consistency, the small steady proofs of care over the grand gesture.",
    },
    square: {
      short: "warmth meeting hesitation",
      long: "One of you can feel held at arm's length by the other, often out of caution rather than coldness. Name the hesitation gently; do not read distance as rejection.",
    },
    opposition: {
      short: "affection against caution",
      long: "One reaches for closeness, the other for care and control, and you feel the pull. Balanced, it becomes love that is both warm and dependable.",
    },
  },

  // ---- MARS / JUPITER ----------------------------------------------------------
  "jupiter-mars": {
    conjunction: {
      short: "big drive, bold moves",
      long: "Action and expansion fuse, so together you go big and go for it. Exciting and productive; just make sure the ambition is aimed before you fire it.",
    },
    trine: {
      short: "momentum that builds easily",
      long: "You spur each other toward action and it works. Shared goals gain speed here; you are good at actually getting off the ground together.",
    },
    sextile: {
      short: "drive that grows when you act",
      long: "Ambition and energy are available when you engage. Start the thing together and it tends to gather its own momentum.",
    },
    square: {
      short: "drive that overreaches",
      long: "The energy is big but can overshoot, taking on too much or pushing too hard. Great engine, needs a steering wheel. Decide the limit before you start.",
    },
    opposition: {
      short: "ambition pulling opposite ways",
      long: "You each push hard from different directions, which can amplify or scatter. Point the drive at one shared target and it becomes force instead of friction.",
    },
  },

  // ---- MARS / SATURN -----------------------------------------------------------
  "mars-saturn": {
    conjunction: {
      short: "drive meeting the brakes",
      long: "Action and restraint fuse, a demanding mix: real staying power, but also stop-and-start frustration. Used well it is disciplined effort; used badly it stalls. Agree on the pace.",
    },
    trine: {
      short: "disciplined action that lasts",
      long: "You channel each other's energy productively. One supplies drive, the other endurance, and together you sustain effort most pairs would burn out on.",
    },
    sextile: {
      short: "steady effort when you apply it",
      long: "Controlled, durable action is available when you choose it. It rewards the pair willing to pace themselves rather than sprint and crash.",
    },
    square: {
      short: "gas and brake at once",
      long: "One of you pushes while the other holds back, and it grinds. Frustration is the usual result. Decide who leads which parts before it turns into a fight over control.",
    },
    opposition: {
      short: "drive against restraint",
      long: "Momentum and caution face off directly, so you can frustrate or steady each other. At best, drive learns patience and patience learns to move.",
    },
  },

  // ---- JUPITER / SATURN --------------------------------------------------------
  "jupiter-saturn": {
    conjunction: {
      short: "big plans, built carefully",
      long: "Expansion and structure fuse, so you can dream and build in the same breath. This is the contact of ambitions that actually get made, if you balance the faith with the follow-through.",
    },
    trine: {
      short: "vision and discipline in balance",
      long: "One of you brings the possibility, the other the plan, and they fit. You are good at turning ideas into things that hold, which is rarer than it sounds.",
    },
    sextile: {
      short: "grounded growth when you work it",
      long: "Balanced ambition is available when you engage. Reach and rigor are both here; the pair that uses both builds something lasting.",
    },
    square: {
      short: "optimism against caution",
      long: "One of you wants to leap, the other to look first, and you feel the tension. It is not a deadlock, it is a natural check. Let each pull temper the other.",
    },
    opposition: {
      short: "expand versus consolidate",
      long: "Faith and caution sit opposite, so you can balance or stall each other. Used well, one keeps the other from either overreaching or standing still.",
    },
  },

  // ---- PASS 2: SUN / URANUS ----------------------------------------------------
  "sun-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "identity colliding with the need to be free",
      long: "Being recognized and being uncaged arrive as the same event, so attention can feel like a pin. The person is real; so is the flinch. Give the recognition and the room at once.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "easy respect for what is original",
      long: "You take each other's un-ordinary streak as a given, not a problem. Difference does not have to be negotiated here. Name the thing that makes them unlike anyone else, and leave it uncorrected.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "room to be different, there when you use it",
      long: "Freedom inside the bond is available, but it sits idle if you only praise sameness. Reach for the odd part on purpose. The respect is real once you spend it.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "being seen reads as being pinned",
      long: "One of you offers attention and the other hears control. Neither is inventing it; the wiring treats focus as a cage. Admire them without requiring them to hold still for it.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "recognition and freedom sitting opposite",
      long: "One of you needs to be witnessed, the other needs an exit, and those aims face off. You can complete each other or chase each other out of the room. Let both be true in the same hour.",
    },
  },

  // ---- PASS 2: SUN / NEPTUNE ---------------------------------------------------
  "neptune-sun": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the idea of them fuses with who they are",
      long: "Projection and identity occupy the same place, so you can love a version that is only half in the room. The glow is real; so is the blur. Look at who is actually there before you answer the picture.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you see the best in each other, gently",
      long: "There is a soft, inspired quality to how you regard one another. It lifts without much effort. Say what you admire, and keep it attached to the person in front of you, not an improved edition.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "inspired regard, there when you look",
      long: "The kinder reading of each other is available whenever you turn toward it. It will not insist. Use it on purpose, and do not inflate it past what you can stand behind.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "holding the picture more than the person",
      long: "One of you is answering an ideal the other cannot live up to, or will not. Disappointment follows the glow. Drop the rewrite and meet the one who showed up.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "real self versus the imagined one",
      long: "You sit on opposite sides of glamour and fact. One carries the dream, the other the person, and they pull. Integration is seeing both without making either the enemy.",
    },
  },

  // ---- PASS 2: SUN / PLUTO -----------------------------------------------------
  "pluto-sun": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "intensity aimed at who they are",
      long: "Power and identity occupy the same ground, so the bond can want to transform the person, not just stand beside them. That force is not nothing. Back who they are instead of managing who they should become.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "depth that steadies who you each are",
      long: "There is real ballast here. You draw strength from each other without having to perform it. Use it to back the person, not to overwhelm them into a smaller shape.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "real power to back each other, when you use it",
      long: "The capacity to stand behind someone at full depth is here, and it idles if you keep things light out of caution. Reach for it on purpose. Intensity this useful is rare; spend it on backing, not on a remake.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "the urge to remake the person",
      long: "One of you feels the other's will pressed against who they are. It can read as care. It can also read as a takeover. Admire the person rather than treating them as a project.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "being strengthened or being overwhelmed",
      long: "You stand on opposite ends of force and self. The same depth that could steel you can flatten you. Let the power back the person, and say when it has gone past that.",
    },
  },

  // ---- PASS 2: MOON / URANUS ---------------------------------------------------
  "moon-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "a nervous system that will not settle",
      long: "Feeling and disruption occupy the same body, so the mood can shift without a scene you can name. Comfort that pins them down makes it worse. Offer closeness that leaves an exit.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "comfort that leaves an exit",
      long: "You already know how to soothe without caging. The honesty here is allowed to be unconventional. Protect that rather than smoothing it into something more ordinary.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "odd feelings given room, when you allow it",
      long: "Space to feel strangely is available, and it withers if you demand a tidy explanation. Give the mood somewhere to go that is not a verdict. The ease is real once you stop requiring it to look normal.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "closeness that lands as a cage",
      long: "One of you reaches to soothe and the other bolts, because the care arrived as a pin. Neither is cruel. Give room first, then the comfort; the order is the whole move.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "needing comfort and needing to bolt",
      long: "Safety and freedom sit opposite in the feeling body. You can teach each other both, or spend years chasing a mood that already left. Let the closeness include a door.",
    },
  },

  // ---- PASS 2: MOON / NEPTUNE --------------------------------------------------
  "moon-neptune": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "you cannot tell whose feeling it is",
      long: "Moods merge, so one of you is often carrying weather that started in the other. That is intimacy and it is confusion. Name your own first, then answer what is left.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "a wordless read on each other's weather",
      long: "You feel the shift before it is spoken, which is a rare kind of attunement. Honor it out loud instead of only sensing it. The read is a gift; it still needs a sentence.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "the mood travels between you when you let it",
      long: "Emotional osmosis is available, and it becomes a fog if nobody claims their own state. Check whose feeling it is before you treat it as shared fact. The channel works when it has a name on it.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "fog where a feeling should be named",
      long: "The mood is thick and hard to locate, so you fill the gap with a story. Most of the trouble is imagined, not said. Separate the weather before you answer it.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "absorbing each other until nobody is separate",
      long: "One of you dissolves into the other's state, the other cannot find the edge, and you both lose the plot. Closeness is not the same as fusion. Keep a self in the room.",
    },
  },

  // ---- PASS 2: MOON / PLUTO ----------------------------------------------------
  "moon-pluto": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "feeling at full volume, no dimmer",
      long: "Emotion arrives at a scale that can scare both of you, including the one who feels it. This is not a performance. Meet the intensity plainly instead of managing it down.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you can sit in the heavy stuff together",
      long: "The capacity to stay with a hard feeling without fleeing is actually here. Few pairs have it. Do not keep the bond in the shallows just because the deep end exists.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "depth of feeling, there when you trust it",
      long: "The heavy register is available, and it stays locked if either of you treats intensity as a problem to solve. Trust each other with what goes all the way down. Use it; do not only survive it.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "a feeling that arrives as a threat",
      long: "When the mood comes up huge, one of you hears danger and the other hears abandonment. The volume is the fact; the threat is the story. Let it be big without making it a weapon.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "intensity versus the need to keep it shallow",
      long: "One of you lives at full depth, the other needs air, and those settings scrape. Neither is the defect. Agree how far in you are going before you are already there.",
    },
  },

  // ---- PASS 2: MERCURY / URANUS ------------------------------------------------
  "mercury-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "thoughts that jump the track mid-sentence",
      long: "The mind here is fast and original, and it loses the other person in the leaps. The spark is worth keeping. Land one point before you take the next turn.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "ideas sparking off each other, fast",
      long: "You think in jumps that actually get somewhere. The tangent is often the useful part. Chase it while it is alive, and still check that both of you are on the same jump.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "original thinking on tap when you chase it",
      long: "Unexpected, useful thought is available, and it idles in small talk. Ask the odd question. The pair that follows the spark gets the conversation nobody else is having.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "you lose each other in the leaps",
      long: "One of you has already arrived at the next idea while the other is still on the last sentence. It reads as dismissal. It is speed. Land before you leap.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "two minds leaping in opposite directions",
      long: "You are both original, and you original in contrary ways, so brilliance can sound like talking past each other. Used well, each of you catches the skip the other cannot see.",
    },
  },

  // ---- PASS 2: MERCURY / NEPTUNE -----------------------------------------------
  "mercury-neptune": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "words that blur into a story",
      long: "Speech and imagination occupy the same channel, so a gap gets filled with a tale before anyone notices. Most of the trouble here is imagined, not said. Ask them to say it plainly again.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you catch the drift before it is said",
      long: "Half-spoken things land between you, which is a rare fluency. Trust the read, then still confirm it arrived. The gift is the drift; the work is checking it.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "half-said things that still land, when you check",
      long: "The unspoken channel is available, and it becomes a mess if you never verify. Use the sensitivity, then ask. Guessing is how this pair writes a second conversation on top of the first.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "not knowing if you were told the truth or a story",
      long: "One of you heard a fact, the other offered a feeling, and the sentence cannot tell you which. That uncertainty is the whole friction. Get specific where it blurs. Do not fill the gap yourself.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the plain version versus the imagined one",
      long: "Literal and atmospheric sit opposite, so you can illuminate each other or talk right past what was actually meant. Ask for the plain version of what they feel, and give it.",
    },
  },

  // ---- PASS 2: MERCURY / PLUTO -------------------------------------------------
  "mercury-pluto": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "talk that goes straight to the buried thing",
      long: "Conversation here does not stay on the surface even when you try. That is a gift and a pressure. Make it safe to say the real thing rather than extracting it.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you can name the hard subject without flinching",
      long: "Few pairs can go to the buried stuff this directly and stay in the room. Do it on purpose. Depth like this goes unused if you only ever talk around it.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "depth in conversation, there when you open it",
      long: "The hard subject is available, and it stays locked if the tone is an interrogation. Ask instead of digging. The channel works when the other person can walk into it, not get pulled.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "a question that feels like an interrogation",
      long: "One of you is trying to understand; the other hears a cross-examination. The intensity is the point and the problem. Drop the pressure and ask once, then wait.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "extracting the truth versus being safe to say it",
      long: "One of you needs the buried thing named, the other needs not to be mined for it. Those aims face off. The truth arrives when it is offered, not when it is taken.",
    },
  },

  // ---- PASS 2: VENUS / URANUS --------------------------------------------------
  "uranus-venus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "warmth that will not look ordinary",
      long: "Care here has an unusual key, so trying to make it look like everyone else's closeness kills the thing that works. Give the warmth without demanding it settle into a familiar shape.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "affection with room built in",
      long: "You already know how to be kind without crowding. The spark is the freedom inside the care. Enjoy that, and do not try to domesticate it into a tighter hold.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "an unusual kindness, there when you spend it",
      long: "Unconventional warmth is available, and it goes quiet if you only offer the standard gestures. Spend the odd kindness on purpose. This pair reads a surprising care as the real one.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "care that needs consistency and room at once",
      long: "One of you needs the same warmth tomorrow, the other needs not to be scheduled. Both are legitimate. Ask which one they need today instead of forcing a single style of care.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "closeness versus the need to stay uncaged",
      long: "Tenderness and freedom sit opposite, so a kind move can feel like a claim. You can have both if the care includes air. Smothering this pair is how you lose it.",
    },
  },

  // ---- PASS 2: VENUS / NEPTUNE -------------------------------------------------
  "neptune-venus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "care gone dreamy and hard to pin down",
      long: "Warmth and idealizing occupy the same place, so you can be genuinely kind to a version of them that is not quite here. Keep the tenderness attached to the actual person. The glow fades when it has to meet a Tuesday.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "tender, unguarded warmth that shows",
      long: "Affection has a soft, generous quality here, and it costs little to give. Give it freely, and keep it honest. This is care that lands because it is not performing.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "imaginative kindness, there when you give it",
      long: "A gentler, more inspired way of caring is available, and it idles if you only ever do the practical thing. Offer the small true gesture. Grand fog helps no one.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "you are caring for the ideal, not the person",
      long: "One of you is feeding a dream of the bond while the other is standing in the room unmet. The kindness is real; the target is wrong. Ask for the plain version of what they feel.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the plain feeling versus the gilded one",
      long: "You sit on opposite sides of simple care and enchanted care. One needs the unadorned thing, the other needs the shimmer. Do not make either of those a failing.",
    },
  },

  // ---- PASS 2: VENUS / PLUTO ---------------------------------------------------
  "pluto-venus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "attachment that goes all the way down",
      long: "Care here is not casual. It runs to the root, which is why the fear of losing them can sit right under the warmth. Let it be intense without turning it into a grip.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "warmth you can trust with the deep stuff",
      long: "The capacity to care at full depth, and to be cared for that way, is actually present. Trust it instead of guarding it. Shallow is the waste of this contact, not the safety.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "full-depth care, there when you stop guarding it",
      long: "The deep register of warmth is available, and it stays locked if either of you treats intensity as a test. Stop making them prove it. The care is already the proof.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "fear of losing them tightening the hold",
      long: "When the bond matters this much, the fear of losing it can start running the care. That is not devotion. Name the fear instead of tightening. Intensity without a grip is still intensity.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "grip versus the trust that would loosen it",
      long: "One of you holds because they care, the other needs to not be held that hard, and those are the same bond pulling apart. Loosen first. The care survives honesty better than it survives a test.",
    },
  },

  // ---- PASS 2: MARS / URANUS ---------------------------------------------------
  "mars-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the move fires before the thought does",
      long: "Impulse and action occupy the same nerve, so you can be out of the chair before anyone agreed to stand. The spark is worth keeping. It is not worth obeying blindly. Put one beat between the urge and the act.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "fast, inventive force aimed at a real problem",
      long: "You improvise well under pressure, and the solution often arrives sideways. Give this pair something live to solve. Unused, the same voltage turns into restlessness with nowhere to go.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "improvisation under pressure, there when it is live",
      long: "Sudden, useful action is available, and it dies in over-planning. Start while the opening is open. This is a pair that thinks with its hands.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "impulse that skips the beat between urge and act",
      long: "One of you has already moved; the other is still catching up, or still objecting. The friction is speed, not malice. Name the pause as part of the move, not as a kill-switch.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the spark versus the need to think first",
      long: "One of you is the match, the other is the reason, and they face off. You can stall each other or take turns. Decide which moments get the spark and which get the second look.",
    },
  },

  // ---- PASS 2: MARS / NEPTUNE --------------------------------------------------
  "mars-neptune": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "drive that cannot name what it is chasing",
      long: "Effort and fog occupy the same channel, so a lot of force gets spent on something that will not sit still long enough to be aimed. Name the actual want out loud. This pair loses steam when the target stays vague.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "action steered by a feeling, before it is spelled out",
      long: "You can move on a hunch together and have it be right often enough to trust. Let the imagination steer once. Then still say where you are going, so the effort has a floor.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "imagination and effort cooperating, when you let them",
      long: "Vision can actually point the work here, and it idles if you only grind. Let the picture lead for a stretch. Then ask what it requires this week, so it does not dissolve.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "the effort scatters because the aim stays vague",
      long: "One of you is pushing; the other cannot tell at what. Heat without a target turns into exhaustion and blame. Stop and name the thing. The drive is not the problem. The blur is.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the actual want versus the fog around it",
      long: "Direct force and diffuse longing sit opposite. You can waste a lot of motion arguing about a goal neither of you has said. Put the want in a sentence. Then decide whether to move.",
    },
  },

  // ---- PASS 2: MARS / PLUTO ----------------------------------------------------
  "mars-pluto": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "force that can go all the way in",
      long: "Will and raw power occupy the same ground, so a small disagreement can become total. That intensity moves real obstacles. It also makes the contest itself feel like the point. Keep the aim in the open.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "combined intensity aimed at something outside you",
      long: "Together you can push on a hard thing and actually move it. Give the force a target that is not each other. Unused, this pair looks for a fight because the engine is running.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "real power to move an obstacle, when you aim it",
      long: "Focused force is available, and it turns inward if you do not give it a job. Pick a real obstacle. Aim together. This is not a mood; it is a tool.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "a push that turns into a contest of who yields",
      long: "The moment one of you will not back down, the content of the fight is gone and only the win remains. Step back from the victory. Name what you actually wanted before this became about yielding.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the fight becoming the point, not the thing you wanted",
      long: "Two strong wills face off, and the original issue can vanish inside the standoff. Someone has to name the real want first. Power without an object just looks for someone to push.",
    },
  },

  // ---- PASS 2: JUPITER / URANUS ------------------------------------------------
  "jupiter-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the urge to change everything at once",
      long: "Expansion and disruption fuse, so a good idea can arrive as a total rewrite. The excitement is real. Not all of it needs deciding today. Agree what stays fixed before you leap.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you see the opening early and can move on it",
      long: "This pair clocks a new possibility while it is still live. That is rare timing. Move on it before the moment cools, and leave one thing un-revolutionized so there is a floor to come back to.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "a new possibility, live when you chase it",
      long: "The opening is available, and it closes if you only talk about how free you could be. Chase one real change. Leave the rest of the life standing.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "leaping before you agree what stays fixed",
      long: "One of you is already in the new version; the other has not consented to demolish the old one. The thrill is not a plan. Name the one thing that is not up for grabs, then leap.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the thrill of the new versus what must hold",
      long: "Faith in the next thing and loyalty to the present thing sit opposite. You can stall in argument or take turns being the floor. Decide which parts of the life are allowed to move.",
    },
  },

  // ---- PASS 2: JUPITER / NEPTUNE -----------------------------------------------
  "jupiter-neptune": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "belief running hardest where it is least specific",
      long: "Hope and fog occupy the same place, so you can believe a thing most fiercely right where nobody could tell you what it requires. Ask what it actually takes this week. The dream is a gift only if it touches ground.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "a shared vision that can touch ground",
      long: "You imagine well together, and the picture has a chance of becoming a step. Name one true next action. Inspiration without a floor is just a nicer kind of stall.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "the dream as a gift, when you name a next step",
      long: "A generous, lifted vision is available, and it dissolves if you never pick a Tuesday for it. Imagine the ideal version. Then say the one concrete thing you will do.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "rosy and vague at the same time",
      long: "The lift is real and the outline is not, so you can promise past what either of you can hold. Enjoy the faith. Then pin one claim to a fact before you build on it.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the ideal versus what this week actually requires",
      long: "One of you is living in the finished picture, the other is holding the unpaid bill of it. Neither is the spoiler. Let the vision and the week argue in the open, not in silence.",
    },
  },

  // ---- PASS 2: JUPITER / PLUTO -------------------------------------------------
  "jupiter-pluto": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "conviction that runs underground until it isn't",
      long: "Belief and raw will fuse, so a goal can gather force out of sight and then arrive already huge. Keep the aim in the open. Drive this deep goes badly when nobody named what it is for.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "shared belief aimed at something worth the depth",
      long: "When conviction runs this far down, it can build a thing that lasts. Aim it deliberately. Unused, it just accumulates pressure and looks for a cause.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "stakes you can raise together, when you say the aim",
      long: "The capacity to go all in on a worthy thing is available, and it stays buried if you never say the stakes. Name what you each want out of it. Then raise them on purpose.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "ambition and intensity climbing past what is named",
      long: "The project, the principle, the need to win it, all scale at once. One of you is already further in than the other consented to. Say the size before you are inside it.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the hunger to go big versus the hunger to go deep",
      long: "Expansion and total commitment sit opposite, so you can inflate a thing or bury it. Used well, one keeps the other from either skimming or swallowing the whole life. Name which hunger is running.",
    },
  },

  // ---- PASS 2: SATURN / URANUS -------------------------------------------------
  "saturn-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the line and the break in the same body",
      long: "Structure and revolt occupy one system, so you can need the rule and need to break it in the same afternoon. Put the fixed and the free in the same plan. Decide what each of those gets.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "discipline and invention holding each other",
      long: "You can steady a new idea without killing it, and you can keep a working structure without worshipping it. That balance is the whole gift. Keep what works. Change what does not.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "you can keep what works while changing what doesn't",
      long: "Reform is available here, not just revolt and not just freeze. Use both hands. A pair that can renovate instead of demolish or entrench is rarer than it sounds.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "one holds the rule, the other has to break it",
      long: "This is the classic grind of the line versus the exception. Both people are protecting something real. Name the protection, not just the fight. Then assign what stays and what moves.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "structure and freedom as opposing votes",
      long: "One of you is the floor, the other is the window, and you vote against each other by instinct. Treat both as the plan. A floor with no window is a cell; a window with no floor is a drop.",
    },
  },

  // ---- PASS 2: SATURN / NEPTUNE ------------------------------------------------
  "neptune-saturn": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the dream meeting a wall it cannot wish through",
      long: "Vision hits a hard limit in the same place it is born, so you can spend years grieving the ideal instead of making the small real version. Build the thing you can hold. The wall is information, not an insult.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "a vision given a shape it can actually hold",
      long: "Realism and imagination cooperate here, which is rarer than either alone. Turn the ideal into one thing you can keep. That is the whole art of this contact.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "the small real version, there when you stop grieving the big one",
      long: "A workable shape for the dream is available, and it stays out of reach while you are still in mourning for the unlimited one. Let the structure give the picture a body. Then live in it.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "mourning the ideal instead of building the possible",
      long: "One of you will not come down; the other will not look up. The stalemate is grief wearing a policy. Name the loss, then make the smaller true thing. That is not settling. That is starting.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "the hard limit versus the thing you still believe in",
      long: "Duty and the unmade picture sit opposite. You can crush the dream or refuse the world. Used well, the limit tells the belief where to stand, and the belief tells the limit what it is for.",
    },
  },

  // ---- PASS 2: SATURN / PLUTO --------------------------------------------------
  "pluto-saturn": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "a grip that does not know how to let go",
      long: "Control and endurance occupy the same joint, so you can hold a thing long after holding it has become the problem. Name the fear under the grip. Say what you are afraid to lose before it becomes a standoff.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "endurance aimed at something that deserves it",
      long: "You can commit deep and actually last. That is not small. Put that toward a thing worth the years, and thank the seriousness out loud; it rarely gets named.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "seriousness you can build with, when you name the fear",
      long: "Durable, unglamorous power is available, and it turns into a freeze if the fear stays unnamed. Say the stake. Then build. This pair makes things that hold.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "control tightening on both sides",
      long: "Each of you grips harder because the other gripped. The original need is already underneath, usually a fear of collapse. Loosen enough to say that. The standoff is not the character of either of you. It is the pattern.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "holding hard versus saying what you are afraid to lose",
      long: "One of you controls, the other endures, and both are trying not to lose the thing. The honest sentence is the release valve. Power without a named fear just keeps closing the fist.",
    },
  },

  // ---- PASS 2: URANUS / NEPTUNE ------------------------------------------------
  "neptune-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "the ideal that changes shape before you can hold it",
      long: "Vision and upheaval occupy the same mist, so the picture remakes itself while you are still trying to live in the last version. Anchor one thing that stays true. Then let the rest reinvent.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "unconventional imagination running in the same direction",
      long: "You see past the usual together, and the strangeness agrees. Use it to picture something genuinely new. This is not a mood. It is a shared instrument. Play it on purpose.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "a genuinely new picture, there when you use it",
      long: "The capacity to imagine outside the inherited script is available, and it idles in nostalgia or in chaos. Sit down and describe the new thing. Then pick one piece of it to make real.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "remaking the vision before the last one landed",
      long: "One of you has already discarded the picture the other just committed to. The restlessness is real. So is the whiplash. Agree on the one thing that does not get reinvented this round.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "what stays true versus what keeps reinventing itself",
      long: "A fixed ideal and a living experiment sit opposite. You can freeze or dissolve. Used well, one of you is the through-line and the other is the update, and you both know which job you have today.",
    },
  },

  // ---- PASS 2: URANUS / PLUTO --------------------------------------------------
  "pluto-uranus": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "upheaval and depth arriving as the same event",
      long: "Disruption and total change occupy one strike, so a small rupture can take the floor out. Decide what is actually being changed. This pair can mistake a demolition for a transformation. Aim it.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "you can break a pattern and go all the way through it",
      long: "The appetite for real change is shared, and it can actually finish the job. Point it at the thing that needs to move. Unused, it looks for a life to overturn because the engine is bored.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "real change, there when you aim the disruption",
      long: "Pattern-breaking force is available, and it scatters if you only enjoy the smash. Choose the pattern. Break that one. Leave the rest of the house standing.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "destruction wearing the costume of depth",
      long: "One of you calls it necessary transformation; the other is standing in the wreckage. Both can be true. Name the specific thing that has to end. A vague revolution will take everything, including what you needed.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "blowing it up versus going into it",
      long: "Exit and descent sit opposite. One of you wants out, the other wants through, and those are not the same medicine. Pick. A bond cannot do both at full volume in the same hour.",
    },
  },

  // ---- PASS 2: NEPTUNE / PLUTO -------------------------------------------------
  "neptune-pluto": {
    // FOUNDER-REVIEW
    conjunction: {
      short: "a current so deep it is hard to see from inside",
      long: "The slowest forces in the chart occupy one undertow, so the important thing can dissolve before anyone has said it. Go slow. Stay specific. Do not let the unnamed thing run the bond from underneath.",
    },
    // FOUNDER-REVIEW
    trine: {
      short: "the quiet underground bond that still runs",
      long: "Something between you works below conversation, and it is real. Trust it, and still name what is actually happening. A current this deep goes rotten only when it is never brought to air.",
    },
    // FOUNDER-REVIEW
    sextile: {
      short: "the important thing, there when you stay specific",
      long: "The underground register is available, and it turns to fog or to control if you refuse to put a fact in it. Say the concrete thing. Then let the depth have it.",
    },
    // FOUNDER-REVIEW
    square: {
      short: "depth going murky before it gets said",
      long: "You both know it matters and neither of you can quite land the sentence. The delay is where distortion grows. Slow is fine. Vague is not. Put one true detail in the middle of the feeling.",
    },
    // FOUNDER-REVIEW
    opposition: {
      short: "dissolving versus going all the way down",
      long: "One of you fades out of the hard thing, the other tunnels into it, and you lose each other in the method. Used well, one keeps the depth from becoming a disappearance, and the other keeps the softness from becoming a dodge.",
    },
  },
};

/**
 * Resolve a SYNASTRY reading for an aspect between two people's bodies.
 * Checks the authored SYNASTRY_PAIR table first, then falls back to the neutral
 * per-aspect-type phrase in ASPECT_NATURE. It NEVER falls back to the natal
 * ASPECT_PAIR table, so natal ("They...") voice can never leak into a compare row.
 * Use this from FlowsAndCatchesSection. Keep interpretAspect for natal person pages.
 */
export function interpretSynastryAspect(a: BodyKey, b: BodyKey, aspect: AspectKey): Reading {
  const named = SYNASTRY_PAIR[PAIR(a, b)]?.[aspect];
  if (named) return named;
  const nature = ASPECT_NATURE[aspect];
  return { short: nature.short, long: nature.long };
}
