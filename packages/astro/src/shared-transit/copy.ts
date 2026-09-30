/**
 * WS-D. Static card copy. A pure function of the event.
 * Variation is authored templates plus a stable hash of the event id.
 * Nothing here is written by a model at request time.
 *
 * FOUNDER-REVIEW: every lead, body, timing line, and chrome string below.
 */

import { bodyDisplayName } from "../bodies";
import type { AspectType, BodyName, Sign } from "../index";
import { majorAspectClass } from "../transit-nudge/types";
import { sharedTransitCanonicalId, sortSharedMembers } from "./canonicalize";
import type { SharedTransitEvent, SharedTransitHit, SharedTransitRole } from "./types";

// FOUNDER-REVIEW
export const SHARED_WEEK_PAGE_INTRO =
  "Shared contacts that activate a real link between two people. Faster planets lead the week.";

// FOUNDER-REVIEW
export const SHARED_WEEK_COMPACT_INTRO = "What is actually moving between two people this week.";

// FOUNDER-REVIEW
export const SHARED_WEEK_FULL_INTRO =
  "A transit shows up here only when it touches a real aspect between two people's charts.";

// FOUNDER-REVIEW
export const SHARED_WEEK_SETTINGS_BLURB =
  "Alerts when a transit activates a real link between two people in your constellation. Faster planets lead the week.";

// FOUNDER-REVIEW
export const SHARED_WEEK_PREF_ALL = "The Sun out to Pluto. Faster planets lead the week.";

// FOUNDER-REVIEW
export const SHARED_WEEK_EMPTY =
  "Nothing is activating a real link between two people this week. The sky is quiet between you.";

// FOUNDER-REVIEW
export const SHARED_WEEK_QUIET_REPEAT =
  "No new shared link this week. The ones already in motion are unchanged.";

/** Honest empty copy. Interpolates a real date label only. Never names a planet that was not computed. */
export function sharedWeekEmptyMessage(dateLabel: string | null): string {
  if (!dateLabel) return SHARED_WEEK_EMPTY;
  // FOUNDER-REVIEW
  return `Nothing is activating a real link between two people this week. The next shared link begins around ${dateLabel}.`;
}

// FOUNDER-REVIEW
const TIMING_EXACT = "It is exact today.";
// FOUNDER-REVIEW
const TIMING_APPLYING = "It is still tightening.";
// FOUNDER-REVIEW
const TIMING_SEPARATING = "It is already separating.";

const ASPECT_VERB: Record<AspectType, string> = {
  // FOUNDER-REVIEW
  conjunction: "meeting",
  // FOUNDER-REVIEW
  sextile: "gently supporting",
  // FOUNDER-REVIEW
  square: "squaring",
  // FOUNDER-REVIEW
  trine: "flowing with",
  // FOUNDER-REVIEW
  opposition: "pulling against",
  // FOUNDER-REVIEW
  quincunx: "adjusting with",
};

const ASPECT_NOUN: Record<AspectType, string> = {
  conjunction: "conjunction",
  sextile: "sextile",
  square: "square",
  trine: "trine",
  opposition: "opposition",
  quincunx: "quincunx",
};

type NatalClass = "luminary" | "personal" | "social" | "generational";

function natalClass(body: string): NatalClass {
  if (body === "sun" || body === "moon") return "luminary";
  if (body === "mercury" || body === "venus" || body === "mars") return "personal";
  if (body === "jupiter" || body === "saturn") return "social";
  return "generational";
}

function natalPairKey(a: string, b: string): string {
  return [natalClass(a), natalClass(b)].sort().join("+");
}

/** FNV-1a. Stable across renders, different across event ids. */
export function stableCopyHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function pointPhrase(hit: SharedTransitHit): string {
  const body = bodyDisplayName(hit.natalPoint);
  return hit.natalSign ? `${body} in ${hit.natalSign}` : body;
}

/** When both natal phrases match, "Mercury and Mercury" becomes "both Mercuries". */
const POINT_PLURAL: Record<string, string> = {
  Sun: "Suns",
  Moon: "Moons",
  Mercury: "Mercuries",
  Venus: "Venuses",
  Mars: "Mars placements",
  Jupiter: "Jupiters",
  Saturn: "Saturns",
  Uranus: "Uranuses",
  Neptune: "Neptunes",
  Pluto: "Plutos",
};

function doubledPointPhrase(point: string): string {
  const splitAt = point.indexOf(" in ");
  const planet = splitAt === -1 ? point : point.slice(0, splitAt);
  const rest = splitAt === -1 ? "" : point.slice(splitAt);
  const plural = POINT_PLURAL[planet] ?? `${planet}s`;
  return `both ${plural}${rest}`;
}

function repairDoubledPoint(text: string, pointA: string, pointB: string): string {
  if (pointA !== pointB || pointA === "") return text;
  return text.replaceAll(`${pointA} and ${pointB}`, doubledPointPhrase(pointA));
}

function houseClause(a: SharedTransitHit, b: SharedTransitHit): string {
  const aHouse = a.natalHouse;
  const bHouse = b.natalHouse;
  if (aHouse && bHouse) {
    return `${possessive(a.personName)} ${pointPhrase(a)} is in the ${ordinal(aHouse)} house, and ${possessive(b.personName)} ${pointPhrase(b)} is in the ${ordinal(bHouse)} house.`;
  }
  if (aHouse) return `${possessive(a.personName)} ${pointPhrase(a)} is in the ${ordinal(aHouse)} house.`;
  if (bHouse) return `${possessive(b.personName)} ${pointPhrase(b)} is in the ${ordinal(bHouse)} house.`;
  return "";
}

function utcDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toISOString().slice(0, 10);
}

function timingPhrase(event: SharedTransitEvent, whenUTC: string | undefined): string {
  const whenDay = whenUTC ? utcDay(whenUTC) : "";
  const exactToday = whenDay !== "" && event.members.some((member) => utcDay(member.exactAt) === whenDay);
  if (exactToday) return TIMING_EXACT;
  if (event.members.some((member) => member.applying)) return TIMING_APPLYING;
  return TIMING_SEPARATING;
}

// FOUNDER-REVIEW: three lead shapes. Facts are substituted, never invented.
function leadShape(index: number, transiting: string, aspectVerb: string, aspectNoun: string, nameA: string, pointA: string, nameB: string, pointB: string): string {
  const shapes = [
    `${transiting} is ${aspectVerb} ${possessive(nameA)} ${pointA} and ${possessive(nameB)} ${pointB}.`,
    `Between ${nameA} and ${nameB}, ${transiting} is ${aspectVerb} ${pointA} and ${pointB}.`,
    `${possessive(nameA)} ${pointA} and ${possessive(nameB)} ${pointB} are under a ${transiting} ${aspectNoun}.`,
  ];
  return shapes[index % shapes.length] ?? shapes[0]!;
}

/**
 * Body templates keyed by aspect class, optional natal-class pair, and role.
 * Lookup falls through from the specific key to class+role, then class+circle.
 * Several phrasings per key. The event id picks one and stays there.
 */
const BODY_TEMPLATES: Record<string, readonly string[]> = {
  // FOUNDER-REVIEW
  "flow:partners": [
    "The ease sits on {possA} {natalA} and {possB} {natalB}, so use it for the two of you while {transiting} is this close.",
    "What is moving between {nameA} and {nameB} is this sky: {natalA} and {natalB} under {transiting}, not a blank mood.",
    "Let {possA} {natalA} and {possB} {natalB} be the specific place you lean on each other this week.",
  ],
  // FOUNDER-REVIEW
  "flow:parent-child": [
    "Between a parent and a child, {transiting} is opening {possA} {natalA} and {possB} {natalB} on different clocks. Meet in the overlap.",
    "{possA} {natalA} and {possB} {natalB} are getting the same {transiting} support. The help will not look the same from both sides.",
    "This is a workable week for {nameA} and {nameB} around {natalA} and {natalB}. Ask for the practical version of the ease.",
  ],
  // FOUNDER-REVIEW
  "flow:siblings": [
    "For {nameA} and {nameB} as siblings, {transiting} is easing {natalA} and {natalB}. The old pattern can sit this one out.",
    "{possA} {natalA} and {possB} {natalB} are in a supportive {transiting} contact. Use it for one concrete thing, not a reunion speech.",
    "The flow between {nameA} and {nameB} is specific to {natalA} and {natalB}. That is the part of the relationship this sky is touching.",
  ],
  // FOUNDER-REVIEW
  "flow:friends": [
    "{nameA} and {nameB} have an easier contact on {natalA} and {natalB} while {transiting} is here. Make the plan that only needed a nudge.",
    "Friendship gets a real assist from {transiting} on {possA} {natalA} and {possB} {natalB}. Keep it specific.",
    "What is lighter between {nameA} and {nameB} traces to {natalA} and {natalB}, not to the whole friendship at once.",
  ],
  // FOUNDER-REVIEW
  "flow:circle": [
    "{transiting} is supporting a real link between {possA} {natalA} and {possB} {natalB}. That is the contact, not a group mood.",
    "The ease between {nameA} and {nameB} belongs to {natalA} and {natalB} under {transiting}. Stay with those two points.",
    "{nameA} and {nameB} share this {transiting} flow because {natalA} and {natalB} already aspect each other. The rest of the circle is not in this card.",
  ],
  // FOUNDER-REVIEW
  "friction:partners": [
    "The pressure between {nameA} and {nameB} is {transiting} on {natalA} and {natalB}. Name that before you decide it is about the relationship.",
    "{possA} {natalA} and {possB} {natalB} are taking the same {transiting} {aspectNoun} in different ways. Leave room for both.",
    "If {nameA} and {nameB} are short with each other, check {natalA} and {natalB} before you make it a verdict.",
  ],
  // FOUNDER-REVIEW
  "friction:parent-child": [
    "Parent and child are both under {transiting} here: {possA} {natalA}, {possB} {natalB}. The friction is real and it is not the whole relationship.",
    "{nameA} and {nameB} are feeling {transiting} on {natalA} and {natalB} from opposite sides of the bond. Patience is the useful move.",
    "This pressure sits on {natalA} and {natalB}. {nameA} and {nameB} do not have to solve it this week to stay accurate about it.",
  ],
  // FOUNDER-REVIEW
  "friction:siblings": [
    "{nameA} and {nameB} are catching the same {transiting} pressure on {natalA} and {natalB}. Sibling shorthand will miss it. Say the plain thing.",
    "The rub between {nameA} and {nameB} traces to {natalA} and {natalB}. It is older than this week, and this week is when it is loud.",
    "{transiting} is stressing {possA} {natalA} and {possB} {natalB} together. Give the argument a smaller subject.",
  ],
  // FOUNDER-REVIEW
  "friction:friends": [
    "{nameA} and {nameB} are in a {transiting} {aspectNoun} through {natalA} and {natalB}. Friendship can hold the friction if you name the topic.",
    "The tension between {nameA} and {nameB} is located: {natalA} and {natalB}. It does not have to become a verdict on the friendship.",
    "If plans snag for {nameA} and {nameB}, {transiting} on {natalA} and {natalB} is part of the snag. Adjust the plan, not the bond.",
  ],
  // FOUNDER-REVIEW
  "friction:circle": [
    "The same {transiting} {aspectNoun} is on {possA} {natalA} and {possB} {natalB}. It is a real contact between those points, not a group mood.",
    "{nameA} and {nameB} are under one pressure, in two different ways: {natalA} and {natalB}. That is the whole claim.",
    "{transiting} is stressing a link that already exists between {possA} {natalA} and {possB} {natalB}. Nobody else is folded into this card.",
  ],
  // FOUNDER-REVIEW
  "fusion:partners": [
    "{transiting} is landing on {possA} {natalA} and {possB} {natalB} together. The intensity is shared, and it is specific to these points.",
    "{nameA} and {nameB} are in the same {transiting} meeting through {natalA} and {natalB}. Say what is actually happening, plainly.",
    "This is a concentrated week for {possA} {natalA} and {possB} {natalB}. Coordinate before either of you treats it as only private.",
  ],
  // FOUNDER-REVIEW
  "fusion:parent-child": [
    "{nameA} and {nameB} are meeting the same {transiting} intensity on {natalA} and {natalB}. A parent and a child will feel the volume differently.",
    "The charge between {nameA} and {nameB} is {transiting} on {natalA} and {natalB}. Keep the conversation on that, not on everything at once.",
    "{natalA} and {natalB} are both in the beam of {transiting}. {nameA} and {nameB} can name it without turning it into a verdict.",
  ],
  // FOUNDER-REVIEW
  "fusion:siblings": [
    "{nameA} and {nameB} are in a shared {transiting} meeting on {natalA} and {natalB}. Sibling history will want to narrate it. Let the points speak first.",
    "The intensity for {nameA} and {nameB} is located in {natalA} and {natalB}. One conversation about that is enough.",
    "{transiting} is concentrating {possA} {natalA} and {possB} {natalB} at once. Stay with the subject that is actually lit up.",
  ],
  // FOUNDER-REVIEW
  "fusion:friends": [
    "{nameA} and {nameB} share a {transiting} conjunction of experience on {natalA} and {natalB}. Friendship can be direct about it.",
    "What feels loud between {nameA} and {nameB} is {natalA} and {natalB} under {transiting}. That is narrower than the whole friendship.",
    "{transiting} is meeting {possA} {natalA} and {possB} {natalB} together. A short, specific check-in matches the sky better than a big talk.",
  ],
  // FOUNDER-REVIEW
  "fusion:circle": [
    "{transiting} is meeting {possA} {natalA} and {possB} {natalB} at the same time, because those points already connect. This card stops at the two of them.",
    "The shared intensity is {possA} {natalA} and {possB} {natalB} under {transiting}. It is not a weather report for the whole circle.",
    "{nameA} and {nameB} are in one {transiting} meeting through {natalA} and {natalB}. The claim is that pair, and only that pair.",
  ],
  // FOUNDER-REVIEW: natal-class keys, so a Moon contact does not reuse a Jupiter-to-Jupiter paragraph.
  "friction:luminary+social:parent-child": [
    "A light and a social planet are under the same {transiting} {aspectNoun}: {possA} {natalA} and {possB} {natalB}. The need and the duty are not the same job.",
    "{nameA} and {nameB} are feeling {transiting} where a light meets a social planet, {natalA} and {natalB}. Explain the limit in ordinary words.",
    "This parent-child friction is {natalA} against {natalB}. {transiting} is activating that link, not inventing a new one.",
  ],
  // FOUNDER-REVIEW
  "friction:social+social:partners": [
    "{possA} {natalA} and {possB} {natalB} are both social planets, and {transiting} is stressing the link between them. Compare the plan before you enlarge it.",
    "Partners under a {transiting} {aspectNoun} of {natalA} and {natalB}: the argument is about direction and timing, and it has a chart.",
    "{transiting} is pressing {possA} {natalA} and {possB} {natalB}. Two growth styles are in the same squeeze. Name which one is asking for more.",
  ],
  // FOUNDER-REVIEW
  "flow:personal+personal:friends": [
    "{possA} {natalA} and {possB} {natalB} are personal planets in a {transiting} flow. Friendship can use the ease for a real conversation or a real plan.",
    "The supportive contact between {nameA} and {nameB} is personal: {natalA} and {natalB}. {transiting} is the reason this week feels lighter there.",
    "Friends, and specifically {natalA} with {natalB}. {transiting} is helping that link. Keep the plan at the size of the aspect.",
  ],
  // FOUNDER-REVIEW
  "flow:luminary+personal:partners": [
    "{possA} {natalA} and {possB} {natalB} put a light and a personal planet in the same {transiting} flow. Partners can be specific about what feels easier.",
    "The ease for {nameA} and {nameB} is {natalA} with {natalB}. {transiting} is supporting that one link. Let the rest of the week stay ordinary.",
    "Between partners, {transiting} is flowing with {natalA} and {natalB}. Use the opening for the subject those planets actually describe.",
  ],
};

function lookupBodies(event: SharedTransitEvent): readonly string[] {
  const aspectClass = majorAspectClass(event.aspect);
  const role: SharedTransitRole = event.relationshipRole ?? "circle";
  const [a, b] = event.members;
  const pair = a && b ? natalPairKey(a.natalPoint, b.natalPoint) : "personal+personal";
  return (
    BODY_TEMPLATES[`${aspectClass}:${pair}:${role}`] ??
    BODY_TEMPLATES[`${aspectClass}:${role}`] ??
    BODY_TEMPLATES[`${aspectClass}:circle`] ??
    BODY_TEMPLATES["flow:circle"]!
  );
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "").replace(/[ \t]{2,}/g, " ").trim();
}

export interface SharedTransitCopy {
  /** In-app card line: planets, signs, timing, houses. */
  lead: string;
  /** In-app relational paragraph. */
  body: string;
  /** Lock-screen text. Names only. Never planets, signs, or aspect types. */
  pushHeadline: string;
  /**
   * Full in-app text. The This Week card renders `lead` and `body`
   * separately; together they are this string.
   */
  cardDetail: string;
}

// FOUNDER-REVIEW
function pushHeadlineFor(nameA: string, nameB: string): string {
  return `Something is shifting between ${nameA} and ${nameB} this week.`;
}

export interface SharedWeekCardModel {
  id: string;
  lead: string;
  body: string;
  transitBody: BodyName;
  aspect: AspectType;
  people: Array<{ id: string; name: string }>;
}

export function toSharedWeekCardModel(event: SharedTransitEvent, whenUTC?: string): SharedWeekCardModel {
  const copy = renderSharedTransitCopy(event, whenUTC);
  const people: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();
  for (const member of event.members) {
    if (seen.has(member.personId)) continue;
    seen.add(member.personId);
    people.push({ id: member.personId, name: member.personName });
  }
  return {
    id: event.id,
    lead: copy.lead,
    body: copy.body,
    transitBody: event.transiting,
    aspect: event.aspect,
    people,
  };
}

export function renderSharedTransitCopy(event: SharedTransitEvent, whenUTC?: string): SharedTransitCopy {
  const [a, b] = event.members;
  if (!a || !b) return { lead: "", body: "", pushHeadline: "", cardDetail: "" };
  const transiting = bodyDisplayName(event.transiting);
  const vars: Record<string, string> = {
    transiting,
    aspectVerb: ASPECT_VERB[event.aspect],
    aspectNoun: ASPECT_NOUN[event.aspect],
    nameA: a.personName,
    nameB: b.personName,
    possA: possessive(a.personName),
    possB: possessive(b.personName),
    natalA: pointPhrase(a),
    natalB: pointPhrase(b),
  };
  const bodies = lookupBodies(event);
  const pointA = pointPhrase(a);
  const pointB = pointPhrase(b);
  const body = repairDoubledPoint(
    fill(bodies[stableCopyHash(`${event.id}:body`) % bodies.length] ?? bodies[0]!, vars),
    pointA,
    pointB
  );
  const leadCore = repairDoubledPoint(
    leadShape(
      stableCopyHash(`${event.id}:lead`),
      transiting,
      vars.aspectVerb!,
      vars.aspectNoun!,
      a.personName,
      pointA,
      b.personName,
      pointB
    ),
    pointA,
    pointB
  );
  const timing = timingPhrase(event, whenUTC);
  const house = houseClause(a, b);
  const lead = [leadCore, timing, house].filter(Boolean).join(" ");
  const pushHeadline = pushHeadlineFor(a.personName, b.personName);
  const cardDetail = [lead, body].filter(Boolean).join(" ");
  return { lead, body, pushHeadline, cardDetail };
}

/**
 * Pair event from a stored row. Sign comes from the row. Longitude is unknown
 * here, so this helper does not claim a synastry link or a relationship role.
 * `natalLon` is 0 as a placeholder and must not be fed to the synastry gate:
 * 0 and 0 would look like a conjunction. Push callers pass real chart
 * longitudes to `storedPairPassesScannerGate` and skip the row when it fails.
 * Speed is 0 because copy does not display it and the row did not store it.
 */
export function sharedTransitEventFromStoredPair(input: {
  transiting: BodyName;
  aspect: AspectType;
  members: Array<{
    personId: string;
    personName: string;
    natalPoint: BodyName;
    natalSign: Sign;
    orb: number;
    exactAt: string;
  }>;
  whenUTC: string;
}): SharedTransitEvent | null {
  const ranked = [...input.members].sort((a, b) => a.orb - b.orb || a.personId.localeCompare(b.personId)).slice(0, 2);
  if (ranked.length < 2) return null;
  const whenMs = Date.parse(input.whenUTC);
  const members: SharedTransitHit[] = ranked.map((member) => ({
    transiting: input.transiting,
    aspect: input.aspect,
    personId: member.personId,
    personName: member.personName,
    natalPoint: member.natalPoint,
    natalSign: member.natalSign,
    natalLon: 0,
    orb: member.orb,
    applying: !Number.isNaN(whenMs) && Date.parse(member.exactAt) >= whenMs,
    exactAt: member.exactAt,
    transitingSpeed: 0,
  }));
  const ordered = sortSharedMembers(members);
  return {
    id: sharedTransitCanonicalId(input.transiting, input.aspect, ordered),
    kind: "relational",
    transiting: input.transiting,
    aspect: input.aspect,
    members: ordered,
    salience: 0,
    relationshipRole: "circle",
  };
}
