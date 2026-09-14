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

export type PersonNavSectionId =
  | "remembrance"
  | "memorial-timeline"
  | "active-today"
  | "vela-on-them"
  | "chart-wheel"
  | "big-three"
  | "placements"
  | "aspects"
  | "houses"
  | "generational"
  | "notes"
  | "past-conversations"
  | "honor-light";

export type PersonNavSection = { id: PersonNavSectionId; label: string };

/**
 * FOUNDER-REVIEW: person-profile tab labels. Anchor ids stay on the old
 * vocabulary so deep links and the sitemap of in-page hashes do not move.
 */
export const PERSON_TAB_LABEL: Record<PersonNavSectionId, string> = {
  remembrance: "Remembrance",
  "memorial-timeline": "Timeline",
  "active-today": "Right now",
  "vela-on-them": "Ask about them",
  "chart-wheel": "Chart wheel",
  "big-three": "What they need",
  placements: "How they are wired",
  aspects: "Where they pull",
  houses: "Where it shows up",
  generational: "Their generation",
  notes: "Your record",
  "past-conversations": "Earlier answers",
  "honor-light": "Their light",
};

/**
 * FOUNDER-REVIEW: astrology (or prior) term rendered as the quiet in-section
 * subhead when the tab label is no longer that term.
 */
export const PERSON_TAB_VOCAB: Partial<Record<PersonNavSectionId, string>> = {
  "active-today": "Active today",
  "vela-on-them": "Vela",
  "chart-wheel": "Wheel",
  "big-three": "Big three",
  placements: "Placements",
  aspects: "Aspects",
  houses: "Houses",
  generational: "Generational",
  notes: "Record",
  "past-conversations": "Past chats",
};

/**
 * In-page quick-nav entries. Only sections that will actually render —
 * no dead anchors. Callers pass flags derived from the same conditions
 * that gate each section in the person page JSX.
 */
export function buildPersonPageNavSections(input: {
  hasRemembrance: boolean;
  hasTimeline: boolean;
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
  if (input.hasRemembrance) sections.push({ id: "remembrance", label: PERSON_TAB_LABEL.remembrance });
  if (input.hasTimeline) sections.push({ id: "memorial-timeline", label: PERSON_TAB_LABEL["memorial-timeline"] });
  if (input.hasActiveToday) sections.push({ id: "active-today", label: PERSON_TAB_LABEL["active-today"] });
  if (input.hasVelaOnThem) sections.push({ id: "vela-on-them", label: PERSON_TAB_LABEL["vela-on-them"] });
  if (input.hasWheel) sections.push({ id: "chart-wheel", label: PERSON_TAB_LABEL["chart-wheel"] });
  if (input.hasBigThree) sections.push({ id: "big-three", label: PERSON_TAB_LABEL["big-three"] });
  if (input.hasPlacements) sections.push({ id: "placements", label: PERSON_TAB_LABEL.placements });
  if (input.hasAspects) sections.push({ id: "aspects", label: PERSON_TAB_LABEL.aspects });
  if (input.hasHouses) sections.push({ id: "houses", label: PERSON_TAB_LABEL.houses });
  if (input.hasGenerational) sections.push({ id: "generational", label: PERSON_TAB_LABEL.generational });
  if (input.hasRecord) sections.push({ id: "notes", label: PERSON_TAB_LABEL.notes });
  if (input.hasPastConversations) sections.push({ id: "past-conversations", label: PERSON_TAB_LABEL["past-conversations"] });
  if (input.hasHonorBox) sections.push({ id: "honor-light", label: PERSON_TAB_LABEL["honor-light"] });
  return sections;
}
