/**
 * Care gates for living vs remembrance surfaces on person/home.
 *
 * Thesis: a passed person shows their ENDURING chart — never live
 * current-day / transit / "Active today" / "This week" content. Hide
 * cleanly; do not invent a replacement "sky" widget under pressure.
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

/**
 * This Week / relational-transit alerts — living people only.
 * Same care hole as peopleForTodaySky. A passed person is never
 * "what's pulling on two people in your circle at once."
 */
export function peopleForThisWeek<T extends { passed_at?: string | null }>(people: T[]): T[] {
  return peopleForTodaySky(people);
}

/** Owner-scoped people whose `passed_at` is set. Used to strip stored This Week rows. */
export function passedPersonIds(
  people: Array<{ id: string; passed_at?: string | null }>
): Set<string> {
  return new Set(people.filter((p) => !shouldShowLiveTransits(p)).map((p) => p.id));
}

/**
 * Strip memorial people from a stored relational-transit affected list.
 * Returns null when fewer than 2 living people remain — the event is no
 * longer relational and must not appear in This Week.
 */
export function livingAffectedForThisWeek<T extends { profile_id: string }>(
  affected: T[],
  passedIds: Iterable<string>
): T[] | null {
  const passed = passedIds instanceof Set ? passedIds : new Set(passedIds);
  const living = affected.filter((a) => !passed.has(a.profile_id));
  return living.length >= 2 ? living : null;
}

/**
 * Stored `relational_transits` rows for This Week. Drops memorial people
 * from `affected_profiles` and drops the row when fewer than two living
 * people remain. Existing scan rows stay in the table; this is the
 * read-time care gate so a newly marked remembrance hides immediately.
 */
export function thisWeekRowsFromStored<T extends { affected_profiles: Array<{ profile_id: string }> }>(
  rows: T[],
  passedIds: Iterable<string>
): T[] {
  const out: T[] = [];
  for (const row of rows) {
    const living = livingAffectedForThisWeek(row.affected_profiles, passedIds);
    if (!living) continue;
    out.push({ ...row, affected_profiles: living });
  }
  return out;
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
export type PersonPageNavFlags = {
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
};

export type PersonGroupKey = "now" | "them" | "yours" | "remembrance";

export type PersonPageGroup = {
  key: PersonGroupKey;
  label: string;
  sections: PersonNavSection[];
};

/**
 * Today (was Now) is not a tab: its two cards sit above the remaining pair.
 * Who they are / You and them are the living tabs. Remembrance replaces
 * You and them on a memorial profile.
 */
export const PERSON_GROUP_LABEL: Record<PersonGroupKey, string> = {
  now: "Today",
  them: "Who they are",
  yours: "You and them",
  remembrance: "Remembrance",
};

/** Static home for each section. Memorial Record sections remap at group time. */
export const PERSON_SECTION_GROUP: Record<PersonNavSectionId, PersonGroupKey> = {
  "active-today": "now",
  "vela-on-them": "now",
  "big-three": "them",
  placements: "them",
  aspects: "them",
  houses: "them",
  generational: "them",
  "chart-wheel": "them",
  notes: "yours",
  "past-conversations": "yours",
  remembrance: "remembrance",
  "memorial-timeline": "remembrance",
  "honor-light": "remembrance",
};

const THEM_SECTION_ORDER: PersonNavSectionId[] = [
  "big-three",
  "chart-wheel",
  "placements",
  "aspects",
  "houses",
  "generational",
];

const REMEMBRANCE_SECTION_ORDER: PersonNavSectionId[] = [
  "remembrance",
  "memorial-timeline",
  "honor-light",
  "notes",
  "past-conversations",
];

const GROUP_STRIP_LIVING: PersonGroupKey[] = ["them", "yours"];
const GROUP_STRIP_MEMORIAL: PersonGroupKey[] = ["them", "remembrance"];

/** Today cards live above the tab strip; they are never a selected group. */
export function isTodaySection(id: PersonNavSectionId): boolean {
  return PERSON_SECTION_GROUP[id] === "now";
}

export function isPersonNavSectionId(id: string): id is PersonNavSectionId {
  return Object.prototype.hasOwnProperty.call(PERSON_SECTION_GROUP, id);
}

/**
 * Parent group for a section. On a memorial profile Yours is replaced, so
 * Record / Earlier answers resolve under Remembrance (hashes still work).
 */
export function groupForPersonSection(id: PersonNavSectionId, isMemorial: boolean): PersonGroupKey {
  if (isMemorial && (id === "notes" || id === "past-conversations")) return "remembrance";
  return PERSON_SECTION_GROUP[id];
}

function sortGroupSections(key: PersonGroupKey, sections: PersonNavSection[]): PersonNavSection[] {
  const order =
    key === "them" ? THEM_SECTION_ORDER : key === "remembrance" ? REMEMBRANCE_SECTION_ORDER : null;
  if (!order) return sections;
  return [...sections].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function buildPersonPageNavSections(input: PersonPageNavFlags): PersonNavSection[] {
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

export function buildPersonPageGroups(
  input: PersonPageNavFlags & { isMemorial: boolean }
): PersonPageGroup[] {
  const sections = buildPersonPageNavSections(input);
  const keys = input.isMemorial ? GROUP_STRIP_MEMORIAL : GROUP_STRIP_LIVING;
  const buckets = new Map<PersonGroupKey, PersonNavSection[]>(keys.map((key) => [key, []]));
  for (const section of sections) {
    const key = groupForPersonSection(section.id, input.isMemorial);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(section);
  }
  return keys
    .map((key) => ({
      key,
      label: PERSON_GROUP_LABEL[key],
      sections: sortGroupSections(key, buckets.get(key) ?? []),
    }))
    .filter((group) => group.sections.length > 0);
}

export type PersonPageEntry = {
  group: PersonGroupKey;
  sectionId: PersonNavSectionId | null;
};

/**
 * Deep-link + default-group resolver. Hash wins, then ?transit=1 scrolls to
 * the always-visible Today cards. Default group is Who they are (them).
 * Today is not a tab, so now-section hashes keep the them (or first) group.
 */
export function resolvePersonPageEntry(input: {
  hash: string | null | undefined;
  transit: string | null | undefined;
  hasActiveToday: boolean;
  isMemorial: boolean;
  groups: PersonPageGroup[];
}): PersonPageEntry {
  const available = new Set(input.groups.flatMap((group) => group.sections.map((section) => section.id)));
  const presentGroups = new Set(input.groups.map((group) => group.key));
  const fallbackGroup: PersonGroupKey = presentGroups.has("them")
    ? "them"
    : (input.groups[0]?.key ?? "them");
  const rawHash = (input.hash ?? "").replace(/^#/, "");

  if (rawHash && isPersonNavSectionId(rawHash)) {
    if (isTodaySection(rawHash)) {
      return { group: fallbackGroup, sectionId: rawHash };
    }
    const group = groupForPersonSection(rawHash, input.isMemorial);
    if (presentGroups.has(group)) {
      return { group, sectionId: available.has(rawHash) ? rawHash : null };
    }
  }

  if (input.transit === "1" && input.hasActiveToday) {
    return { group: fallbackGroup, sectionId: "active-today" };
  }

  if (presentGroups.has("them")) return { group: "them", sectionId: null };
  return { group: fallbackGroup, sectionId: null };
}
