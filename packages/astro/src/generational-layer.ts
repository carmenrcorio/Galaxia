// NOTE: the package has no `./types` module — `SignKey` is defined and
// exported from `./interpretations`. Import path adjusted accordingly;
// no authored copy below was altered.
import type { SignKey } from "./interpretations";

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
  knownFor: string;
  plutoBridge: string;
}

export interface EraEvent {
  label: string;
  detail: string;
}

export interface PlutoSignExtended {
  corruptionSignature: string;
  historicalFigures: HistoricalFigure[]; // FOUNDER-REVIEW: natal Pluto verified by birth year
  eraEvents: EraEvent[];
}

export const PLUTO_SIGN_EXTENDED: Partial<Record<SignKey, PlutoSignExtended>> = {

  Cancer: {
    corruptionSignature:
      "Power weaponized the language of home and family itself. Fascism across Europe and Asia promised to restore the hearth, protect the bloodline, and secure the homeland, then burned the world doing it. At home, the Depression stripped households bare through forces no individual could see or stop. This generation learned early that the things you were told to protect could become instruments of destruction, and that 'family values' could be the cover story for catastrophe.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1926–1935, Pluto in Cancer confirmed by year
      { name: "Martin Luther King Jr.", knownFor: "Civil rights leader", plutoBridge: "Pluto in Cancer as the will to protect the beloved community, and the willingness to die for it." },
      { name: "Audrey Hepburn", knownFor: "Actress and humanitarian", plutoBridge: "A childhood surviving Nazi occupation became the fuel for a life spent feeding the world's most vulnerable children." },
      { name: "Anne Frank", knownFor: "Diarist, Holocaust victim", plutoBridge: "Wrote about the human need for home and hope from inside the hiding place that couldn't hold." },
      { name: "Grace Kelly", knownFor: "Actress, Princess of Monaco", plutoBridge: "Transformed the domestic ideal into a public institution: literal royalty reframed as homemaker." },
      { name: "James Dean", knownFor: "Actor, cultural icon", plutoBridge: "The rebel without a cause, Cancer's wound made visible: belonging nowhere, hungry for a home that never quite existed." },
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
    corruptionSignature:
      "The hero's ego, unchecked. This generation was handed a postwar world and told it was theirs: the most prosperous, the most powerful, the most special. The shadow is the narcissism that calcified: the leader who needs to be worshipped, the parent who can't let a child become their own person, the generation that consumed what prior generations built and called it vision. The corruption of Leo's gold is the king who forgets the kingdom exists for the people, not the other way around.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1938–1957, Pluto in Leo confirmed by year
      { name: "Tina Turner", knownFor: "Singer, survivor, icon", plutoBridge: "Power reclaimed entirely on her own terms after years of being held by force: Pluto in Leo's full redemption arc." },
      { name: "Muhammad Ali", knownFor: "Boxer and activist", plutoBridge: "'I am the greatest' as political act, not vanity: the Boomer who used the spotlight to demand justice." },
      { name: "Jimi Hendrix", knownFor: "Guitarist, musical revolutionary", plutoBridge: "Sound as pure power. The electric guitar as a way to set the world on fire and mean it." },
      { name: "David Bowie", knownFor: "Musician, shape-shifter", plutoBridge: "Reinvented himself across five decades and invited a generation to do the same: Leo Pluto as the refusal to be fixed." },
      { name: "Steve Jobs", knownFor: "Apple co-founder", plutoBridge: "Made the machine personal and beautiful: Leo's insistence that what the world uses should also be worthy of admiration." },
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
    corruptionSignature:
      "Perfection weaponized into control. This generation rebuilt the systems the Boomers handed them (healthcare, labor, technology, the environment) through meticulous, largely uncelebrated work. The shadow is the self-criticism that became other-criticism: the impossible standard, the body that was never right, the workaholic who burned out serving a corporation that didn't notice. The corruption of Virgo's precision is the healer who turns the scalpel on themselves.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1956–1971, Pluto in Virgo confirmed by year
      { name: "Princess Diana", knownFor: "Princess of Wales, humanitarian", plutoBridge: "Brought the camera into AIDS wards and minefields: Virgo Pluto as service that refuses to look away from what's uncomfortable." },
      { name: "Barack Obama", knownFor: "44th U.S. President", plutoBridge: "The meticulous case for change: Virgo Pluto as the insistence that policy is the detail where justice actually lives or dies." },
      { name: "Michael Jackson", knownFor: "Musician, global icon", plutoBridge: "The perfectionist who remade popular culture one precise gesture at a time, and was consumed by the standard he set." },
      { name: "Kurt Cobain", knownFor: "Musician, Nirvana frontman", plutoBridge: "Named the exhaustion of performing competence for a world that wanted polish without pain: Virgo's wound at full volume." },
      { name: "Madonna", knownFor: "Musician, cultural provocateur", plutoBridge: "Controlled every detail of her own image and used that control to rewrite what women in public were allowed to be." },
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
    corruptionSignature:
      "Justice as performance without delivery. This generation fought to make the systems fairer (for women, for queer people, for people of color) and the systems smiled and stalled and made incremental gestures while the underlying imbalance held. The shadow of Libra's scales is the endless negotiation that becomes an excuse not to act: the committee, the both-sides framing, the compromise that leaves the most vulnerable exactly where they were. Beauty used to distract. Fairness invoked to delay.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1971–1983, Pluto in Libra confirmed by year
      { name: "Beyoncé", knownFor: "Musician, cultural force", plutoBridge: "Turned the pop spectacle into a sustained argument about beauty, power, and who gets to write history: Libra Pluto at its most deliberate." },
      { name: "Eminem", knownFor: "Rapper, songwriter", plutoBridge: "Made white America look at itself through hip-hop's mirror: the Libra instinct for uncomfortable confrontation dressed as entertainment." },
      { name: "Aaliyah", knownFor: "Singer, actress", plutoBridge: "Quiet authority: the artist who moved with complete ease inside a music industry that routinely consumed women." },
      { name: "Biggie Smalls", knownFor: "Rapper, storyteller", plutoBridge: "Narrated the weight of systemic imbalance with an ease that made the injustice impossible to ignore." },
      { name: "Britney Spears", knownFor: "Singer, survivor", plutoBridge: "Her public unraveling and subsequent legal fight became a generational conversation about who controls women's lives and how." },
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
    corruptionSignature:
      "Power structures exposed, and then monetized. This generation arrived with the tools to see through everything: the institutions, the myths, the curated identities. The shadow is the collapse into cynicism, the conspiracy that fills the void when no institution holds, the intimacy economy that turns vulnerability itself into content. Scorpio's gift is truth-telling; its corruption is the exposure that serves no one except the one holding the camera.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1983–1995, Pluto in Scorpio confirmed by year
      { name: "Taylor Swift", knownFor: "Musician, cultural figure", plutoBridge: "Documented her own emotional underworld in real time and turned the power struggle over her own catalog into a public education." },
      { name: "Kendrick Lamar", knownFor: "Rapper, Pulitzer Prize winner", plutoBridge: "Took the Scorpio instinct to excavate (self, community, history) and made it the most precise moral argument in American music." },
      { name: "Ariana Grande", knownFor: "Singer", plutoBridge: "Performed publicly through collective trauma and personal grief, transforming loss into the most-streamed thing of the year." },
      { name: "Malala Yousafzai", knownFor: "Activist, Nobel Peace Prize laureate", plutoBridge: "Survived an assassination attempt for the right to learn: Scorpio Pluto as the force that refuses to be extinguished." },
      { name: "Harry Styles", knownFor: "Musician", plutoBridge: "Dismantled the rules around gender in popular culture simply by refusing to acknowledge them as rules." },
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
    corruptionSignature:
      "Freedom as escape rather than expansion. This generation grew up in the age of infinite information and used it to go everywhere mentally without necessarily landing anywhere. The shadow of Sagittarius's great question is the belief that the answer is always somewhere else: the influencer who travels everywhere and is at home nowhere, the algorithm-shaped conviction that one's personal truth is everyone's universal truth. The archer who fires without looking at where the arrow lands.",
    historicalFigures: [
      // FOUNDER-REVIEW: all born 1995–2008, Pluto in Sagittarius confirmed by year
      { name: "Billie Eilish", knownFor: "Musician", plutoBridge: "Built a global audience from her childhood bedroom and used the reach to refuse the image the industry wanted: the Sagittarian who named the cage." },
      { name: "Greta Thunberg", knownFor: "Climate activist", plutoBridge: "Turned a school strike into a planetary movement: Sagittarius Pluto as the individual voice that insists the biggest possible problem is everyone's business." },
      { name: "Olivia Rodrigo", knownFor: "Musician", plutoBridge: "Documented the specific emotional vocabulary of her generation with enough precision that it became universal." },
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
    corruptionSignature:
      "Systems optimized past the point of humanity. This generation arrived into institutions already mid-collapse: financial systems exposed, governments destabilized, the planet in measurable crisis. The corruption signature is efficiency weaponized: the AI that makes the decision, the algorithm that determines the outcome, the restructuring that makes the quarterly number and destroys the community. Power consolidated at the top through the exact mechanisms that promised democratization.",
    historicalFigures: [],
    // FOUNDER-REVIEW: Pluto in Capricorn cohort (born 2008–2023) has not yet
    // produced widely recognized named figures. Leave empty. Do not fabricate.
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
