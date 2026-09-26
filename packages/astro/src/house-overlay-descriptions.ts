export type HouseOverlayLens = "friend" | "partner" | "family" | "coworker";

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface HouseOverlayDescription {
  short: string;
  detail: string;
}

type HouseDescriptionSet = Record<HouseNumber, HouseOverlayDescription>;

/**
 * Curated relationship-aware copy for a real planet-in-house overlay.
 *
 * `{name}` is the person whose planet lands in the house and `{planet}` is
 * the computed body. The detail is written from the house owner's perspective;
 * callers must name that perspective when the owner is not necessarily the
 * reader.
 *
 * FOUNDER-REVIEW: all house-overlay short and detail interpretation copy.
 */
export const HOUSE_OVERLAY_DESCRIPTIONS = {
  friend: {
    1: {
      short: "They mirror how you see yourself.",
      detail: "When {name}'s {planet} lands in your 1st house, they directly shape how you carry yourself. You may find yourself acting differently: more confident, more cautious, more alive, just by being around them. This is a friendship that changes your self-image.",
    },
    2: {
      short: "They affect your sense of security.",
      detail: "With {name}'s {planet} in your 2nd house, this friendship touches your relationship with money, possessions, and self-worth. They may influence your spending habits, boost your confidence in your own value, or challenge what you think you deserve.",
    },
    3: {
      short: "They change how you think and communicate.",
      detail: "{name}'s {planet} in your 3rd house electrifies your mental world. Conversations with them are never empty. They push your thinking, introduce new ideas, and may shift the way you express yourself to everyone else.",
    },
    4: {
      short: "They feel like home.",
      detail: "With {name}'s {planet} in your 4th house, this friendship has a deep, private quality. They see the version of you that exists behind closed doors. You may feel unusually safe with them, or they may stir up family patterns you thought you'd outgrown.",
    },
    5: {
      short: "They bring out your playful side.",
      detail: "{name}'s {planet} in your 5th house makes everything more fun. This is the friend who gets you to take creative risks, be spontaneous, and enjoy yourself without overthinking. They activate your joy and possibly your dramatic flair.",
    },
    6: {
      short: "They influence your daily routines.",
      detail: "With {name}'s {planet} in your 6th house, this friendship plays out in the everyday: gym sessions, work habits, health choices, and the small rituals that structure your life. They're the friend who helps you get your act together (or derails it entirely).",
    },
    7: {
      short: "They reflect what you seek in close relationships.",
      detail: "{name}'s {planet} in your 7th house means this friendship carries a one-on-one intensity usually reserved for partners. They show you what you look for in committed bonds: balance, equality, someone who sees you fully and meets you there.",
    },
    8: {
      short: "They reach your hidden depths.",
      detail: "With {name}'s {planet} in your 8th house, this friendship doesn't stay on the surface. Shared secrets, emotional vulnerability, maybe shared finances or resources: there's a transformative quality here. They see what you don't show most people.",
    },
    9: {
      short: "They expand your worldview.",
      detail: "{name}'s {planet} in your 9th house makes this the friend who broadens your horizons. Through them you encounter new philosophies, cultures, or beliefs. They're your travel buddy, your debate partner, the one who makes you question your assumptions.",
    },
    10: {
      short: "They influence your public image and ambitions.",
      detail: "With {name}'s {planet} in your 10th house, this friendship connects to your career and reputation. They may open professional doors, push you toward your goals, or simply be someone you're proud to be associated with publicly.",
    },
    11: {
      short: "They ground the friendship in shared community and growth.",
      detail: "{name}'s {planet} in your 11th house is the classic friendship placement. You connect through shared groups, causes, or visions for the future. This is the friend who fits naturally into your wider circle and supports your long-term dreams.",
    },
    12: {
      short: "They touch something unspoken in you.",
      detail: "With {name}'s {planet} in your 12th house, there's a karmic or spiritual undercurrent to this friendship. Much goes unsaid but deeply felt. They may bring out your compassion or your blind spots. This connection works on a level you can't fully articulate.",
    },
  },
  partner: {
    1: {
      short: "They reshape your identity.",
      detail: "When {name}'s {planet} lands in your 1st house, their presence fundamentally alters how you see yourself. You become a different version of you in this relationship, ideally a bolder, more authentic one. Their energy imprints directly on your sense of self.",
    },
    2: {
      short: "They stir your desire for stability.",
      detail: "With {name}'s {planet} in your 2nd house, this relationship is tangled up with security: financial, emotional, and material. They either make you feel profoundly safe or expose every insecurity you have about what you're worth.",
    },
    3: {
      short: "They keep the conversation alive.",
      detail: "{name}'s {planet} in your 3rd house means mental connection is the lifeblood of this relationship. You text constantly, finish each other's sentences, or argue passionately about ideas. Without strong communication, this placement feels hollow.",
    },
    4: {
      short: "They activate your deepest emotional roots.",
      detail: "With {name}'s {planet} in your 4th house, this relationship stirs your need for emotional safety and family. They feel like home, the person you build a private life with. Old family dynamics may resurface here to be healed or repeated.",
    },
    5: {
      short: "They ignite romance and passion.",
      detail: "{name}'s {planet} in your 5th house is pure romantic chemistry. This is the placement of butterflies, grand gestures, and creative inspiration. The risk is staying in the honeymoon phase and avoiding the deeper work of commitment.",
    },
    6: {
      short: "They become part of your everyday life.",
      detail: "With {name}'s {planet} in your 6th house, love plays out in the daily grind: cooking together, splitting chores, and supporting each other's health. It's not glamorous, but it's the glue that holds long-term relationships together.",
    },
    7: {
      short: "They are your mirror and your match.",
      detail: "{name}'s {planet} in your 7th house is the definitive partnership placement. This person triggers your deepest need for balance, commitment, and being truly seen. They reflect back everything: your strengths and the parts you avoid.",
    },
    8: {
      short: "They transform you at the core.",
      detail: "With {name}'s {planet} in your 8th house, this relationship has an all-or-nothing intensity. Shared finances, deep vulnerability, sexual chemistry, and power dynamics are all magnified. This placement either bonds you permanently or breaks you open.",
    },
    9: {
      short: "They expand what you believe is possible.",
      detail: "{name}'s {planet} in your 9th house makes this relationship an adventure, literal or philosophical. You grow through each other. The challenge is staying grounded when the relationship feels more like a quest than a commitment.",
    },
    10: {
      short: "They shape your ambitions and legacy.",
      detail: "With {name}'s {planet} in your 10th house, this relationship is visible to the world. They affect your career, your public reputation, and your long-term direction. You want to build something together that lasts beyond the two of you.",
    },
    11: {
      short: "They are your partner and your best friend.",
      detail: "{name}'s {planet} in your 11th house means friendship is the foundation. You share future goals, social circles, and ideals. The relationship feels progressive and egalitarian, but make sure romantic intimacy doesn't get lost in camaraderie.",
    },
    12: {
      short: "They access your most private self.",
      detail: "With {name}'s {planet} in your 12th house, this relationship operates below the surface. Dreams, fantasies, spiritual connection, and the things you'd never say out loud all live here. It is profoundly intimate, but can veer into confusion or idealization.",
    },
  },
  family: {
    1: {
      short: "They shaped who you became.",
      detail: "When {name}'s {planet} lands in your 1st house, their influence is stamped on your personality. You may have modeled yourself after them, rebelled against them, or simply absorbed their energy without realizing it. They helped form the 'you' the world sees.",
    },
    2: {
      short: "They influenced your relationship with money and worth.",
      detail: "With {name}'s {planet} in your 2nd house, this family bond connects to resources, values, and self-worth. Their attitudes about money, possessions, and what matters probably shaped yours, whether you adopted or rejected them.",
    },
    3: {
      short: "They shaped how you think and speak.",
      detail: "{name}'s {planet} in your 3rd house means this family member influenced your communication style, your curiosity, and the way you process the world. Sibling energy is strong here. Even if they're a parent, the dynamic feels peer-to-peer.",
    },
    4: {
      short: "They are the emotional foundation.",
      detail: "With {name}'s {planet} in your 4th house, this is the deepest family placement. They represent home itself: the emotional climate you grew up in, the patterns you carry, and the sense of belonging (or absence of it) that shapes everything else.",
    },
    5: {
      short: "They brought joy or drama.",
      detail: "{name}'s {planet} in your 5th house means this family member connects to your creative self-expression, your sense of fun, and possibly your need for attention. The child-parent dynamic lives here, whether you're the child or the parent.",
    },
    6: {
      short: "They influenced your habits and sense of duty.",
      detail: "With {name}'s {planet} in your 6th house, this family relationship plays out through routines, responsibilities, and service. You may feel obligated to take care of them (or vice versa). Their influence runs through your health habits, daily rituals, and everyday life.",
    },
    7: {
      short: "They set the template for your partnerships.",
      detail: "{name}'s {planet} in your 7th house means this family member's influence shows up in every close relationship you form. The dynamics you learned from them, including negotiation, compromise, and conflict, become the blueprint you bring to partners and close friends.",
    },
    8: {
      short: "They triggered deep transformation.",
      detail: "With {name}'s {planet} in your 8th house, this family bond carries emotional weight: inheritance (literal or emotional), shared trauma, and power dynamics. There are things between you that go unspoken but profoundly shape who you've become.",
    },
    9: {
      short: "They shaped your beliefs.",
      detail: "{name}'s {planet} in your 9th house means this family member influenced your worldview: religion, education, ethics, and the big questions. You either inherited their belief system or defined yourself by departing from it.",
    },
    10: {
      short: "They influenced your ambition and public self.",
      detail: "With {name}'s {planet} in your 10th house, this family member shaped your relationship with authority, achievement, and public identity. Their expectations, spoken or unspoken, drove your career choices, your goals, and your need for recognition.",
    },
    11: {
      short: "They connected you to community.",
      detail: "{name}'s {planet} in your 11th house means this family member influenced your social world: your friend groups, your causes, and your vision for the future. They taught you (or failed to teach you) how to belong to something larger than the family unit.",
    },
    12: {
      short: "They carry a hidden influence.",
      detail: "With {name}'s {planet} in your 12th house, this family bond operates in the unconscious. They may represent a family secret, a sacrificial pattern, or a spiritual connection that defies logic. Their influence is powerful precisely because it's so hard to name.",
    },
  },
  coworker: {
    1: {
      short: "They affect your professional persona.",
      detail: "When {name}'s {planet} lands in your 1st house, they influence how you present yourself at work. Around them, you may step up your game, feel more visible, or become hyperaware of how you come across. They bring out a version of you that's hard to ignore.",
    },
    2: {
      short: "They connect to your earning potential.",
      detail: "With {name}'s {planet} in your 2nd house, this work relationship ties to compensation, resources, and professional worth. They may directly affect what you earn, or they may challenge (or validate) your sense of what your skills are worth.",
    },
    3: {
      short: "They sharpen your professional communication.",
      detail: "{name}'s {planet} in your 3rd house makes this the coworker whose Slack messages matter. Your working style, how you present ideas, and even your email tone are all areas where they push you to think and communicate more clearly.",
    },
    4: {
      short: "They blur the work-life boundary.",
      detail: "With {name}'s {planet} in your 4th house, this work relationship carries an emotional undercurrent that can feel more personal than professional. Boundaries may get fuzzy in a way that's either comforting or uncomfortable.",
    },
    5: {
      short: "They make work more creative.",
      detail: "{name}'s {planet} in your 5th house means this coworker sparks your creative and competitive side. Brainstorming sessions with them are productive, presentations become performances, and work starts to feel less like a grind.",
    },
    6: {
      short: "They are in the daily workflow with you.",
      detail: "With {name}'s {planet} in your 6th house, this is the most direct work-relationship placement. You're in the trenches together. Shared processes, shared deadlines, and daily collaboration either build trust or reveal friction.",
    },
    7: {
      short: "They are your professional counterpart.",
      detail: "{name}'s {planet} in your 7th house makes this a true professional partnership: the coworker you negotiate with, co-present with, or balance responsibilities alongside. You need each other to do your best work.",
    },
    8: {
      short: "They hold leverage in the relationship.",
      detail: "With {name}'s {planet} in your 8th house, there are power dynamics at play in this work relationship: shared access to sensitive information, budget authority, and political capital. Trust is everything here.",
    },
    9: {
      short: "They expand your professional horizons.",
      detail: "{name}'s {planet} in your 9th house means this coworker brings a different perspective, background, expertise, or industry experience. They push you to think bigger about what's possible in your career.",
    },
    10: {
      short: "They directly affect your career trajectory.",
      detail: "With {name}'s {planet} in your 10th house, this work relationship is consequential. They influence your reputation, your promotions, and your trajectory. Whether they're a mentor, a boss, or a strategic ally, what happens between you has professional stakes.",
    },
    11: {
      short: "They bring you into the professional community.",
      detail: "{name}'s {planet} in your 11th house means this coworker connects you to the wider network: cross-functional teams, industry groups, and shared professional goals. They help you see your work as part of something larger.",
    },
    12: {
      short: "They see what you don't show at work.",
      detail: "With {name}'s {planet} in your 12th house, this work relationship has a behind-the-scenes quality. They may know about your frustrations, your doubts, and the things you wouldn't say in a meeting. This can be useful with a confidant and risky if the trust isn't mutual.",
    },
  },
} as const satisfies Record<HouseOverlayLens, HouseDescriptionSet>;
