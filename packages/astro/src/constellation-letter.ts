/**
 * Weekly constellation letter: pick 1–4 people from a real week-ahead
 * relational-transit scan. Never fabricates a person or a transit. A quiet
 * week returns null so the send job can skip rather than write filler.
 */

import { ASPECT_CLASS, type AspectClass } from "./transit-nudge/types";
import { whenUTCForOwnerLocalDate } from "./transit-nudge/dates";
import {
  relationalTransitDedupKey,
  scanRelationalTransits,
  type AffectedProfileHit,
  type RelationalTransitBody,
  type RelationalTransitEvent,
  type RelationalTransitPersonInput,
} from "./relational-transits";
import type { AspectType, BodyName, Sign } from "./index";

const MS_PER_DAY = 86_400_000;
const WEEK_DAYS = 7;
const MAX_PORTRAITS = 4;

const PLANET_LABEL: Record<RelationalTransitBody, string> = {
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const NATAL_BODY_LABEL: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  north_node: "North Node",
};

const ASPECT_VERB: Record<AspectType, string> = {
  conjunction: "meeting",
  sextile: "gently supporting",
  square: "squaring",
  trine: "flowing with",
  opposition: "pulling against",
};

/**
 * Traces to the same relational body x class library as the in-app This Week
 * cards. Never a generic "be kind" line.
 */
const INTENTION: Record<RelationalTransitBody, Record<AspectClass, string>> = {
  saturn: {
    fusion: "name the weight out loud with them rather than trying to solve it",
    friction: "remember the shortness is the sky working on each of you separately",
    flow: "lean on their follow-through this week instead of going it alone",
  },
  jupiter: {
    fusion: "compare notes before either of you says yes to too much",
    friction: "ask what the stretch is actually for before it gets bigger",
    flow: "celebrate the opening together, not just separately",
  },
  uranus: {
    fusion: "give them room for the disruption without taking it personally",
    friction: "give more room than usual; the timing is external",
    flow: "try one small thing neither of you has done before",
  },
  neptune: {
    fusion: "be more explicit than usual; neither of you is reading signals as clearly",
    friction: "say the plain version of what you mean",
    flow: "sit together without an agenda, even briefly",
  },
  pluto: {
    fusion: "let some of the high-stakes feeling be about the sky, not automatically about each other",
    friction: "give the tension room to be about the transit",
    flow: "go a little deeper with them than usual, if they have the room",
  },
};

export function addCivilDays(dateYYYYMMDD: string, days: number): string {
  const [y, m, d] = dateYYYYMMDD.slice(0, 10).split("-").map(Number);
  const utc = Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  return new Date(utc + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Scans one constellation across the coming civil week (Sunday through
 * Saturday) at owner-local noon each day. Unions by the engine's own
 * dedup key. Never invents an event the single-instant scanner would not
 * find at that noon.
 */
export function scanRelationalTransitsForWeek(
  people: RelationalTransitPersonInput[],
  weekStartDate: string,
  timezone: string
): RelationalTransitEvent[] {
  if (people.length < 2) return [];
  const byKey = new Map<string, RelationalTransitEvent>();
  for (let i = 0; i < WEEK_DAYS; i++) {
    const day = addCivilDays(weekStartDate, i);
    const when = whenUTCForOwnerLocalDate(day, new Date(0), timezone);
    for (const event of scanRelationalTransits(people, when)) {
      const key = relationalTransitDedupKey(event);
      const existing = byKey.get(key);
      const incomingOrb = event.affected[0]?.orbDeg ?? Number.POSITIVE_INFINITY;
      const existingOrb = existing?.affected[0]?.orbDeg ?? Number.POSITIVE_INFINITY;
      if (!existing || incomingOrb < existingOrb) byKey.set(key, event);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.affected.length !== a.affected.length) return b.affected.length - a.affected.length;
    return (a.affected[0]?.orbDeg ?? 0) - (b.affected[0]?.orbDeg ?? 0);
  });
}

export interface LetterPerson {
  personId: string;
  personName: string;
  isMinor: boolean;
  isSelf: boolean;
}

export interface LetterPortrait {
  personId: string;
  personName: string;
  isSelf: boolean;
  /** One sentence. Names this person, their natal body, the transiting body, and the aspect. */
  dynamicSentence: string;
  /** One sentence. Suggested intention keyed to the same real transit. */
  intentionSentence: string;
  transitBody: RelationalTransitBody;
  aspectType: AspectType;
  natalBody: BodyName;
  natalSign: Sign;
  orbDeg: number;
  exactAtUTC: string;
  eventDedupKey: string;
}

export interface ConstellationLetterDraft {
  portraits: LetterPortrait[];
  opening: string;
  onlyOnePerson: boolean;
  /** Dedup keys of the events the portraits trace to. */
  eventDedupKeys: string[];
}

function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function natalLabel(body: string): string {
  return NATAL_BODY_LABEL[body] ?? body;
}

function otherAdultNames(
  event: RelationalTransitEvent,
  currentId: string,
  peopleById: Map<string, LetterPerson>
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const hit of event.affected) {
    if (hit.personId === currentId) continue;
    if (seen.has(hit.personId)) continue;
    const person = peopleById.get(hit.personId);
    if (!person || person.isMinor) continue;
    seen.add(hit.personId);
    names.push(person.isSelf ? "you" : hit.personName);
  }
  return names;
}

function subjectPhrase(person: LetterPerson, natalBody: string): string {
  const natal = natalLabel(natalBody);
  if (person.isSelf) return `Your ${natal}`;
  return `${possessive(person.personName)} ${natal}`;
}

function dynamicSentence(
  person: LetterPerson,
  hit: AffectedProfileHit,
  event: RelationalTransitEvent,
  others: string[]
): string {
  const planet = PLANET_LABEL[event.transitBody];
  const verb = ASPECT_VERB[event.aspectType];
  const subject = subjectPhrase(person, hit.natalBody);
  if (others.length === 0) {
    return `${subject} is ${verb} ${planet} this week.`;
  }
  return `${subject} is ${verb} ${planet} this week, in the same window as ${joinNames(others)}.`;
}

function intentionSentence(person: LetterPerson, event: RelationalTransitEvent): string {
  const aspectClass = ASPECT_CLASS[event.aspectType];
  const tryThis = INTENTION[event.transitBody][aspectClass];
  if (person.isSelf) return `One thing to try: ${tryThis}.`;
  return `One thing to try with ${person.personName}: ${tryThis}.`;
}

function openingLine(portraits: LetterPortrait[]): string {
  const names = portraits.map((p) => (p.isSelf ? "you" : p.personName));
  if (portraits.length === 1) {
    const name = portraits[0]!.isSelf ? "you" : portraits[0]!.personName;
    return `This week's letter is about ${name}. The rest of the circle is quiet.`;
  }
  return `This week something real is moving for ${joinNames(names)}.`;
}

interface RankedHit {
  person: LetterPerson;
  hit: AffectedProfileHit;
  event: RelationalTransitEvent;
}

/**
 * Turn scanned week-ahead events into a letter draft. Returns null when
 * nobody has a real, non-minor hit: the send job must not send.
 *
 * Never every person when more than four are active: pick the four
 * tightest-orb hits. Never pads with people who have no hit.
 */
export function composeConstellationLetter(
  events: RelationalTransitEvent[],
  people: LetterPerson[]
): ConstellationLetterDraft | null {
  const peopleById = new Map(people.map((p) => [p.personId, p]));
  const bestByPerson = new Map<string, RankedHit>();

  for (const event of events) {
    for (const hit of event.affected) {
      const person = peopleById.get(hit.personId);
      if (!person || person.isMinor) continue;
      const current = bestByPerson.get(person.personId);
      if (!current || hit.orbDeg < current.hit.orbDeg) {
        bestByPerson.set(person.personId, { person, hit, event });
      }
    }
  }

  const ranked = [...bestByPerson.values()].sort((a, b) => {
    if (a.hit.orbDeg !== b.hit.orbDeg) return a.hit.orbDeg - b.hit.orbDeg;
    return b.event.affected.length - a.event.affected.length;
  });

  if (ranked.length === 0) return null;

  const selected = ranked.length > MAX_PORTRAITS ? ranked.slice(0, MAX_PORTRAITS) : ranked;
  const portraits: LetterPortrait[] = selected.map(({ person, hit, event }) => {
    const others = otherAdultNames(event, person.personId, peopleById);
    return {
      personId: person.personId,
      personName: person.personName,
      isSelf: person.isSelf,
      dynamicSentence: dynamicSentence(person, hit, event, others),
      intentionSentence: intentionSentence(person, event),
      transitBody: event.transitBody,
      aspectType: event.aspectType,
      natalBody: hit.natalBody,
      natalSign: hit.natalSign,
      orbDeg: hit.orbDeg,
      exactAtUTC: hit.exactAtUTC,
      eventDedupKey: relationalTransitDedupKey(event),
    };
  });

  return {
    portraits,
    opening: openingLine(portraits),
    onlyOnePerson: portraits.length === 1,
    eventDedupKeys: [...new Set(portraits.map((p) => p.eventDedupKey))],
  };
}
