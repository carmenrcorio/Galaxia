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
// PASS 1 (this file): the 7 relationship-critical bodies, all 21 pairs, all 5 types = 105.
// These are the focus-sorted bodies that dominate the rendered top-6, so with this live
// almost no rendered row falls back to generic. PASS 2 adds the 120 outer-planet entries
// (uranus/neptune/pluto x everything) to close the matrix to zero fallback.

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
