/**
 * Privacy-safe payload for the 1080 group/family pattern card.
 *
 * Built from `detectFamilyPatterns` (confident signs only). First names via
 * `splitFullName`. The render input sent to the image route never includes a
 * chart, house, birth date, birth time, or birth place.
 */

import {
  detectFamilyPatterns,
  formatSharedPlacementHeadline,
  interpretSharedPlacementCardLine,
  type FamilyComparePersonInput,
} from "@galaxia/astro";
import { splitFullName } from "@galaxia/core";

export const FAMILY_PATTERN_CARD_SIZE = { width: 1080, height: 1080 } as const;
export const FAMILY_PATTERN_CARD_FILENAME = "group-pattern.png";

// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_SHARE_LABEL = "Share pattern";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_EYEBROW = "A shared pattern";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_PRIVACY_TITLE = "Before you share this card";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_PRIVACY_BODY =
  "This card will show first names and the shared signs below. No birth date, birth time, or birth place will appear.";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_WHO_HEADING = "Who is on this card";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_WHAT_HEADING = "What will appear";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_HEADLINE_LABEL = "Headline";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_LINE_LABEL = "Pattern line";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_CONFIRM = "Create and share this card";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_CANCEL = "Cancel";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_REMOVE = "Remove";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_REMEMBERED = "remembered";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_ACK =
  "I have checked the names and the pattern on this card.";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_NO_PATTERN =
  "No shared sign remains with the people still on this card. Add someone back, or cancel.";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_UNNAMED = "Someone";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_WATERMARK = "galaxiamea.com";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_DISABLED =
  "A pattern card needs two or more people who share a sign in the same placement.";
// FOUNDER-REVIEW
export const FAMILY_PATTERN_CARD_FAIL = "Could not create the image. Try again.";

export type FamilyPatternCardPerson = {
  id: string;
  firstName: string;
  memorial: boolean;
};

export type FamilyPatternCardPayload = {
  people: FamilyPatternCardPerson[];
  headline: string;
  interpretation: string;
};

/** What the image route actually renders. No person ids. */
export type FamilyPatternCardRenderInput = {
  people: Array<{ firstName: string; memorial: boolean }>;
  headline: string;
  interpretation: string;
};

const MAX_PEOPLE = 8;
const MAX_FIRST_NAME = 40;
const MAX_HEADLINE = 280;
const MAX_INTERPRETATION = 320;

export function firstNameFromDisplayName(name: string): string {
  const first = splitFullName(name).firstName.trim();
  return first || FAMILY_PATTERN_CARD_UNNAMED;
}

export function buildFamilyPatternCard(
  members: FamilyComparePersonInput[],
  includedIds: readonly string[],
): FamilyPatternCardPayload | null {
  const included = members.filter((m) => includedIds.includes(m.id)).slice(0, MAX_PEOPLE);
  if (included.length < 2) return null;
  const result = detectFamilyPatterns(included);
  const lead = result.sharedPlacements[0];
  if (!lead) return null;
  return {
    people: included.map((m) => ({
      id: m.id,
      firstName: firstNameFromDisplayName(m.name),
      memorial: Boolean(m.passed),
    })),
    headline: formatSharedPlacementHeadline(result.sharedPlacements),
    interpretation: interpretSharedPlacementCardLine(lead, included.length),
  };
}

export function toFamilyPatternCardRenderInput(
  payload: FamilyPatternCardPayload,
): FamilyPatternCardRenderInput {
  return {
    people: payload.people.map(({ firstName, memorial }) => ({ firstName, memorial })),
    headline: payload.headline,
    interpretation: payload.interpretation,
  };
}

export function familyPatternCardHasForbiddenContent(value: unknown): boolean {
  const text = JSON.stringify(value);
  if (/\bHouse\b/i.test(text)) return true;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return true;
  if (/\b\d{1,2}:\d{2}(:\d{2})?\b/.test(text)) return true;
  if (/\bbirth\s*(date|time|place)\b/i.test(text)) return true;
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePerson(value: unknown): { firstName: string; memorial: boolean } | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.firstName !== "string") return null;
  const firstName = value.firstName.trim().slice(0, MAX_FIRST_NAME);
  if (!firstName) return null;
  if (typeof value.memorial !== "boolean") return null;
  return { firstName, memorial: value.memorial };
}

/**
 * Accepts only firstName + memorial + headline + interpretation.
 * Unknown keys (including any birth field) are dropped, not forwarded.
 */
export function parseFamilyPatternCardRequest(body: unknown): FamilyPatternCardRenderInput | { error: string } {
  if (!isPlainObject(body)) return { error: "Invalid request." };
  if (!Array.isArray(body.people)) return { error: "Invalid request." };
  const people: Array<{ firstName: string; memorial: boolean }> = [];
  for (const raw of body.people.slice(0, MAX_PEOPLE)) {
    const person = parsePerson(raw);
    if (!person) return { error: "Invalid request." };
    people.push(person);
  }
  if (people.length < 2) return { error: "Invalid request." };
  if (typeof body.headline !== "string" || typeof body.interpretation !== "string") {
    return { error: "Invalid request." };
  }
  const headline = body.headline.trim().slice(0, MAX_HEADLINE);
  const interpretation = body.interpretation.trim().slice(0, MAX_INTERPRETATION);
  if (!headline || !interpretation) return { error: "Invalid request." };
  const card: FamilyPatternCardRenderInput = { people, headline, interpretation };
  if (familyPatternCardHasForbiddenContent(card)) return { error: "Invalid request." };
  return card;
}
