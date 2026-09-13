/**
 * Bespoke Shared Placement copy for the group Chart Grid (family / friends /
 * coworkers). One authored body per planet × sign (6 × 12 = 72).
 *
 * `interpretSharedPlacement()` prefixes each body with `countPhrase()`
 * (`Two of you` / `Three of you` / `All of you` / `N of you`) plus
 * `carry {sign} {label}:`, so these strings must stay count-neutral: no
 * "these two", "all of you", or other share-size claims.
 *
 * Register (matches 1:1 compare-guidance): name what's true, then one
 * sentence of what it looks like or what to do. Static library only
 * (ENGINEERING.md §8 / §12). No em dashes (U+2014).
 */

import type { FamilyPlanet } from "./family-compare";
import type { Sign } from "./index";

export type SharedPlacementGuidance = Record<FamilyPlanet, Record<Sign, string>>;

export const SHARED_PLACEMENT_GUIDANCE: SharedPlacementGuidance = {
  // ─────────────────────────── SUN (batch 1 of 6) ───────────────────────────
  sun: {
    // FOUNDER-REVIEW
    Aries: "bold, fast, all-in. This group organizes around going first and correcting course later. Let them start; waiting for consensus is how they go dim.",
    // FOUNDER-REVIEW
    Taurus: "steady, sensory, hard to rush. Their shared identity is built on what lasts: a plan, a craft, a Saturday that stays the same. Rushing them reads as an attack on the thing they're making.",
    // FOUNDER-REVIEW
    Gemini: "alive in the exchange, curious, never done talking. They become themselves by talking it through, so silence from the rest of the room lands harder than a disagreement. Keep the dialogue open.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, shines by caring. Their sense of who they are is bound up in who they look after. Let them tend the group, and don't call the care fussing.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, generous. They need the group's light named out loud or they dim while insisting they're fine. Withholding praise doesn't humble them; it hides them.",
    // FOUNDER-REVIEW
    Virgo: "precise, useful, quietly devoted. They know who they are when they're fixing something for the rest of you. The critique is the affection: ask them to say the affection out loud too.",
    // FOUNDER-REVIEW
    Libra: "fair, charming, real only in relation. They find a group self through other people, which makes them gracious and slow to name their own preference. Ask what they want, then wait longer than feels comfortable.",
    // FOUNDER-REVIEW
    Scorpio: "intense, private, nothing shallow. There is no casual version of this group's identity. They will not give a little of themselves; it's the whole thing or the door.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, horizon-facing. They stay honest when the life of the group stays open. A plan that closes in makes them restless before it makes them angry; give them room and they come back.",
    // FOUNDER-REVIEW
    Capricorn: "disciplined, ambitious, quietly loyal. They trust what the group has earned and are suspicious of ease. Praise the effort in the room; praise for talent slides right off.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, allergic to the script. This group's identity forms around refusing to perform normal for anyone else's comfort. Don't ask them to blend in: the refusal is the point.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, compassionate, porous. They take on the feeling in the room without deciding to. When they go strange and distant, ask what they've absorbed rather than what they're hiding.",
  },

  // ─────────────────────────── MOON (batch 2 of 6) ───────────────────────────
  moon: {
    // FOUNDER-REVIEW
    Aries: "feels fast, forgives fast, baffled by a grudge. The flare is real and it's over in minutes. Say the hard thing directly, then let it go as fast as they do.",
    // FOUNDER-REVIEW
    Taurus: "steady, sensual, soothed by the physical. Safety here is sensory: the same meal, the same chair, a hand on a back. In a crisis, don't process first: feed them and sit close.",
    // FOUNDER-REVIEW
    Gemini: "talks its way to calm, curious, never one version. They need to narrate a feeling before they can feel it, and it will change while they do. Don't hold them to the first telling.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, remembers everything. Moods have weather here, and memory keeps receipts for tenderness. A small ritual of care will steady them faster than any conversation.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, needs the warmth spoken aloud. They need to be told, not only shown, and they'll wilt while insisting they're fine. One specific sentence of appreciation lasts them a week.",
    // FOUNDER-REVIEW
    Virgo: "precise, caring through usefulness, worries as devotion. Anxiety is how they metabolise care; the list is a form of love. Don't tell them to relax: help them do one thing on the list.",
    // FOUNDER-REVIEW
    Libra: "fair, peace-seeking, unsettled by a fight. Conflict genuinely destabilises them, so they'll agree to things they resent. Ask twice, and make it safe for the second answer to be different.",
    // FOUNDER-REVIEW
    Scorpio: "intense, private, all or nothing. They feel at a depth they won't narrate, and being watched too closely makes them close. Loyalty opens them; interrogation seals them shut.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, needs air to feel safe. They soothe by moving, by leaving the room, by planning something far away. Following them out is a kindness; cornering them is not.",
    // FOUNDER-REVIEW
    Capricorn: "disciplined, self-contained, soothes by handling it. They meet feeling with competence and would rather manage than be comforted. Don't offer to fix it: sit with them while they do.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, principled. When this group needs comfort, it reaches for space and honesty before it reaches for a hug. Don't mistake the distance for not caring, it's how they process.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, compassionate, absorbent. They cry at things that aren't theirs and feel the room before anyone speaks. Ask what they're carrying: half of it belongs to someone else.",
  },

  // ─────────────────────────── RISING (batch 3 of 6) ───────────────────────────
  rising: {
    // FOUNDER-REVIEW
    Aries: "bold, fast, already in the room. The first impression is heat and a yes: they enter by starting. Don't ask them to hang back and read the weather; they show up by moving.",
    // FOUNDER-REVIEW
    Taurus: "steady, unhurried, settled at the door. They arrive like a fact: calm face, unmoved pace. Don't hurry the greeting; they trust a group that doesn't rush the threshold.",
    // FOUNDER-REVIEW
    Gemini: "quick, curious, talking as they enter. The face they show is a conversation already in progress. Meet them with a question, not a speech: they warm up by exchanging, not by being briefed.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, checking who is safe. They enter by sensing the room. A warm, unhurried welcome lands; a loud, sudden one makes them put the armour on before they sit down.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, generous at first sight. They meet the world with warmth and expect to be met with it. A genuine greeting in front of others opens them; being overlooked at the door is the injury.",
    // FOUNDER-REVIEW
    Virgo: "precise, useful, already noticing what's off. They arrive scanning for what needs doing. Don't call it cold: offering them a real task is how they feel welcome, faster than small talk does.",
    // FOUNDER-REVIEW
    Libra: "fair, charming, smoothing the entrance. They show the world a gracious face and will keep the peace before they've even sat down. Ask what they actually think once the charm has done its job.",
    // FOUNDER-REVIEW
    Scorpio: "intense, composed, nothing casual on contact. The face they show is held, and the real read comes later. Don't demand warmth on arrival; earned trust is how this rising actually opens.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, already halfway to the next room. They enter big and plainspoken. Don't take the blunt first impression as carelessness; they meant it, and they'd rather be clear than polished.",
    // FOUNDER-REVIEW
    Capricorn: "disciplined, composed, capable before close. They present as competent before they present as warm. Don't mistake the reserve for dislike; respect at the threshold is how they decide the room is safe.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, slightly sideways to the occasion. They enter as themselves, not as the room asked. Don't coach the first impression; the off-angle is the honesty.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, compassionate, a little unguarded at the door. They arrive already absorbing the room. A gentle greeting helps; a hard one soaks in before they've chosen it.",
  },

  // ─────────────────────────── MERCURY (batch 4 of 6) ───────────────────────────
  mercury: {
    // FOUNDER-REVIEW
    Aries: "bold, fast, says it before they've felt it. They think out loud at speed and mean less of the first sentence than you assume. Wait for the third; that's the draft they actually mean.",
    // FOUNDER-REVIEW
    Taurus: "slow, plain, immovable once decided. They will not be hurried into agreeing, and pressure hardens the view. Say it once, then leave it alone and let it sit.",
    // FOUNDER-REVIEW
    Gemini: "quick, curious, talkative, six ideas deep. They argue for the pleasure of it and can take your side mid-sentence. Don't mistake the play for a position, and don't pin them to the opening take.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, speaks in feeling not fact. Their reasoning runs on tone and memory, so a fair point delivered coldly still lands as an attack. Warmth first, content second.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, declarative. They speak with conviction and hear criticism of an idea as criticism of them. Separate the two out loud and they can hear anything.",
    // FOUNDER-REVIEW
    Virgo: "precise, useful, edits as they listen. They notice the flawed detail before the good argument and will say so. It's how they pay attention; thank the care, then keep the thread.",
    // FOUNDER-REVIEW
    Libra: "fair, diplomatic, almost vanishing behind the question. They'll frame their real view as a query to spare you. Ask what they actually think, then don't flinch when it arrives.",
    // FOUNDER-REVIEW
    Scorpio: "intense, private, says little and means all of it. They withhold until certain, then say the exact true thing. Silence isn't absence, it's assessment: wait, then take it at full weight.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, blunt and surprised you're hurt. They value honesty above tact and don't always notice the difference. They meant it plainly, not cruelly, and will repair the moment they see.",
    // FOUNDER-REVIEW
    Capricorn: "dry, structured, allergic to fluff. They speak in conclusions and skip the feeling that got them there. Ask for the middle of the thought, not a softer landing.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, abstract and oddly literal. They'll debate the principle while you're describing your day. Name that you want to be heard, not solved.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, circling, arrives at the point sideways. They communicate in image and impression, and a direct question can make it vanish. Let them wander; the thing they're avoiding is usually the point.",
  },

  // ─────────────────────────── VENUS (batch 5 of 6) ───────────────────────────
  // Care / affection / values: family-and-group safe (ENGINEERING.md §9).
  venus: {
    // FOUNDER-REVIEW
    Aries: "bold, fast, all-in with affection. They show they care by going first: a plan, a compliment, a yes. Meet them with matching directness; slow, coy warmth reads as not choosing them.",
    // FOUNDER-REVIEW
    Taurus: "steady, sensual, immovable once devoted. They show they care by staying: presence, food, the same Tuesday for years. Don't confuse the lack of fireworks with a lack of feeling; the staying is the letter.",
    // FOUNDER-REVIEW
    Gemini: "quick, curious, talkative. They show love through conversation, not gestures. A real talk lands harder with them than a gift does.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, loves by feeding and keeping. They fold people into ordinary care and remember what you like. Withdrawal scares them more than any argument; keep the small rituals.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, generous, needs it named. They give lavishly and need to be appreciated back out loud. Take the warmth for granted and you lose it slowly, then all at once.",
    // FOUNDER-REVIEW
    Virgo: "precise, caring through usefulness. They show it in the errand you didn't ask for and the thing they fixed quietly. Say thank you for the small ones or they stop offering.",
    // FOUNDER-REVIEW
    Libra: "fair, charming, happiest inside a working we. They will keep the peace past the point of honesty. Make disagreement safe or you'll never know what they actually want.",
    // FOUNDER-REVIEW
    Scorpio: "intense, private, all-or-nothing with trust. There's no shallow end to how they care. They'll test before they trust, and once they do, it's absolute and they expect the same.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, stays when they're free to leave. Tightness is the fastest way to get less of them. Hold loosely if you want them close.",
    // FOUNDER-REVIEW
    Capricorn: "disciplined, ambitious, loves by building with you. They're not effusive; they're reliable. The ride at 4am, the plan kept, the long game: that's the affection.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, principled, friend first. They need companionship of the mind more than intensity, and closeness that costs their independence makes them claustrophobic. Space here is not rejection.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, compassionate, loves without edges. They merge, sometimes past where they end. Help them keep a self, or they'll dissolve into the group and resent it later.",
  },

  // ─────────────────────────── MARS (batch 6 of 6) ───────────────────────────
  mars: {
    // FOUNDER-REVIEW
    Aries: "bold, fast, fights clean. It's hot, it's direct, it's over. They'd rather have the friction now than the tension for a week; don't save the argument for later.",
    // FOUNDER-REVIEW
    Taurus: "steady, slow to anger, will not be moved. Once they're there, more force is the one thing guaranteed to fail. Change the terms; don't add pressure.",
    // FOUNDER-REVIEW
    Gemini: "quick, curious, fights with words. They'll out-argue you and move the target twice. Slow the argument down to one question at a time.",
    // FOUNDER-REVIEW
    Cancer: "tender, protective, goes sideways not at you. Anger comes out as hurt, withdrawal, or a cold quiet. Ask what wound it landed on, not what the point was.",
    // FOUNDER-REVIEW
    Leo: "warm, proud, roars then wants to repair. Big display, short duration, and a real need to make up. Wounded pride is usually the actual injury; name the respect first.",
    // FOUNDER-REVIEW
    Virgo: "precise, useful, fights by listing what's wrong. The criticism is anxiety wearing a suit. Ask what they're afraid of underneath the audit.",
    // FOUNDER-REVIEW
    Libra: "fair, charming, avoids then resents. They will not fight, and it will come out weeks later as a strange chill. Invite the conflict early and make it survivable.",
    // FOUNDER-REVIEW
    Scorpio: "intense, private, waits and cuts once. They don't spar; they assess and act. Once they've decided the room isn't safe, the door is already closed: repair before that line, not after.",
    // FOUNDER-REVIEW
    Sagittarius: "restless, honest, blunt then gone. They say the true thing carelessly and then leave to cool off. The leaving isn't abandonment; it's how they stay kind.",
    // FOUNDER-REVIEW
    Capricorn: "disciplined, contained, loses interest not control. Their fury looks like an efficiently shortened list of who still has access. Don't wait for a scene; the quiet cut is the tell.",
    // FOUNDER-REVIEW
    Aquarius: "independent, inventive, detaches and argues principle. They'll go abstract while someone is still hurting. Bring it back to what happened between you, not what's true in general.",
    // FOUNDER-REVIEW
    Pisces: "dreamy, compassionate, dissolves rather than fights. They go vague, tearful, elsewhere. Direct confrontation floods them; a slow, gentle question gets further.",
  },
};
