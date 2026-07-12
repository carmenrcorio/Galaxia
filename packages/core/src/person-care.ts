/**
 * Care gates for living vs remembrance surfaces on person/home.
 *
 * Thesis: a passed person shows their ENDURING chart — never live
 * current-day / transit / "Active today" content. Hide cleanly; do not
 * invent a replacement "sky" widget under pressure.
 */

import { hasPassed } from "./galaxy-orbit";

/** Live transit / "Active today" / "Today in your sky" — living people only. */
export function shouldShowLiveTransits(
  person: { passed_at?: string | null } | null | undefined
): boolean {
  if (!person) return false;
  return !hasPassed(person);
}

/**
 * Home "Today in your sky" rows — exclude anyone with passed_at set.
 * Same care hole as the person-page Active today banner.
 */
export function peopleForTodaySky<T extends { passed_at?: string | null }>(people: T[]): T[] {
  return people.filter((p) => shouldShowLiveTransits(p));
}

export type PersonNavSection = { id: string; label: string };

/**
 * In-page quick-nav entries. Only sections that will actually render —
 * no dead anchors. Callers pass flags derived from the same conditions
 * that gate each section in the person page JSX.
 */
export function buildPersonPageNavSections(input: {
  hasRemembrance: boolean;
  hasActiveToday: boolean;
  hasVelaOnThem: boolean;
  hasWheel: boolean;
  hasBigThree: boolean;
  hasPlacements: boolean;
  hasAspects: boolean;
  hasHouses: boolean;
  hasGenerational: boolean;
  hasRecord: boolean;
  hasPastConversations: boolean;
  hasHonorBox: boolean;
}): PersonNavSection[] {
  const sections: PersonNavSection[] = [];
  if (input.hasRemembrance) sections.push({ id: "remembrance", label: "Remembrance" });
  if (input.hasActiveToday) sections.push({ id: "active-today", label: "Active today" });
  if (input.hasVelaOnThem) sections.push({ id: "vela-on-them", label: "Vela" });
  if (input.hasWheel) sections.push({ id: "chart-wheel", label: "Wheel" });
  if (input.hasBigThree) sections.push({ id: "big-three", label: "Big three" });
  if (input.hasPlacements) sections.push({ id: "placements", label: "Placements" });
  if (input.hasAspects) sections.push({ id: "aspects", label: "Aspects" });
  if (input.hasHouses) sections.push({ id: "houses", label: "Houses" });
  if (input.hasGenerational) sections.push({ id: "generational", label: "Generational" });
  if (input.hasRecord) sections.push({ id: "notes", label: "Record" });
  if (input.hasPastConversations) sections.push({ id: "past-conversations", label: "Past chats" });
  if (input.hasHonorBox) sections.push({ id: "honor-light", label: "Their light" });
  return sections;
}
