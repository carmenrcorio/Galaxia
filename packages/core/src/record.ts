/**
 * Shared Relationship Record primitives.
 * Fetch/write helpers that talk to Supabase and build web hrefs stay in apps/web.
 */

export type RecordKind =
  | "note"
  | "tending"
  | "vela_pin"
  | "compare_reading"
  | "cohort_reading"
  | "remembrance"
  | "chart_correction"
  | "moment";

/** Order a pair id tuple deterministically (matches the edge function). */
export function orderPair(a: string, b: string): { pairLow: string; pairHigh: string } {
  return a < b ? { pairLow: a, pairHigh: b } : { pairLow: b, pairHigh: a };
}

/**
 * Curated Record tags. Short list that matches how people actually use a
 * relational journal. Free-text tags are a later decision, not this branch.
 */
export const RECORD_TAG_IDS = [
  "hard_conversation",
  "breakthrough",
  "conflict",
  "celebration",
  "pattern_noticed",
  "something_they_said",
  "silence_needed_filling"
] as const;

export type RecordTagId = (typeof RECORD_TAG_IDS)[number];

export function isRecordTag(value: unknown): value is RecordTagId {
  return typeof value === "string" && (RECORD_TAG_IDS as readonly string[]).includes(value);
}

/** Drop unknown values, de-dupe, keep curated order. */
export function sanitizeRecordTags(values: unknown): RecordTagId[] {
  if (!Array.isArray(values)) return [];
  const present = new Set<RecordTagId>();
  for (const value of values) {
    if (isRecordTag(value)) present.add(value);
  }
  return RECORD_TAG_IDS.filter((id) => present.has(id));
}

export function toggleRecordTag(tags: readonly RecordTagId[], id: RecordTagId): RecordTagId[] {
  const next = tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id];
  return sanitizeRecordTags(next);
}

/**
 * Moment types offered in The Moment loop. These are Record tags, not a
 * parallel taxonomy. `pattern_noticed` stays a journal tag only: it is not
 * a sixty-second event.
 */
export const MOMENT_TYPE_IDS = [
  "hard_conversation",
  "breakthrough",
  "conflict",
  "celebration",
  "silence_needed_filling",
  "something_they_said"
] as const;

export type MomentTypeId = (typeof MOMENT_TYPE_IDS)[number];

export function isMomentType(value: unknown): value is MomentTypeId {
  return typeof value === "string" && (MOMENT_TYPE_IDS as readonly string[]).includes(value);
}

export function sanitizeMomentType(value: unknown): MomentTypeId | null {
  return isMomentType(value) ? value : null;
}

// FOUNDER-REVIEW: authored. Moment type chips and Record fallback body.
export const MOMENT_TYPE_LABELS: Record<MomentTypeId, string> = {
  hard_conversation: "Hard conversation",
  breakthrough: "Breakthrough",
  conflict: "Conflict",
  celebration: "Celebration",
  silence_needed_filling: "Silence that needed filling",
  something_they_said: "Something they said"
};

/** Optional two sentences. Long enough for that, not a journal essay. */
export const MOMENT_NOTE_MAX = 280;

export function momentRecordBody(type: MomentTypeId, userText: string): string {
  const trimmed = userText.trim();
  return trimmed ? trimmed.slice(0, MOMENT_NOTE_MAX) : MOMENT_TYPE_LABELS[type];
}

export interface RecordViewFilters {
  q?: string;
  from?: string;
  to?: string;
  tag?: RecordTagId;
}

export interface RecordViewEntry {
  body: string;
  createdAt: string;
  tags?: readonly string[] | null;
}

const UTC_DATE = { timeZone: "UTC" as const };

export function formatRecordEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...UTC_DATE
  });
}

export function recordMonthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatRecordMonthHeading(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    ...UTC_DATE
  });
}

export function sanitizeFtsQuery(raw: string): string {
  return raw.replace(/[!'()|&:*<>\\]/g, " ").replace(/\s+/g, " ").trim();
}

function searchTerms(q: string | undefined): string[] {
  const cleaned = sanitizeFtsQuery(q ?? "").toLowerCase();
  if (!cleaned) return [];
  return cleaned.split(" ").filter(Boolean);
}

function utcDayStart(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00.000Z`);
}

function utcDayEnd(ymd: string): number {
  return Date.parse(`${ymd}T23:59:59.999Z`);
}

export function recordEntryMatches(entry: RecordViewEntry, filters: RecordViewFilters): boolean {
  const terms = searchTerms(filters.q);
  if (terms.length > 0) {
    const hay = entry.body.toLowerCase();
    if (!terms.every((term) => hay.includes(term))) return false;
  }

  const created = Date.parse(entry.createdAt);
  if (Number.isNaN(created)) return false;
  if (filters.from && created < utcDayStart(filters.from)) return false;
  if (filters.to && created > utcDayEnd(filters.to)) return false;

  if (filters.tag) {
    const tags = sanitizeRecordTags(entry.tags ?? []);
    if (!tags.includes(filters.tag)) return false;
  }

  return true;
}

export function filterRecordEntries<T extends RecordViewEntry>(
  entries: readonly T[],
  filters: RecordViewFilters
): T[] {
  const active =
    Boolean(filters.q?.trim()) || Boolean(filters.from) || Boolean(filters.to) || Boolean(filters.tag);
  if (!active) return [...entries];
  return entries.filter((entry) => recordEntryMatches(entry, filters));
}

export interface RecordMonthGroup<T extends RecordViewEntry> {
  monthKey: string;
  heading: string;
  entries: T[];
}

export function groupRecordEntriesByMonth<T extends RecordViewEntry>(
  entries: readonly T[]
): RecordMonthGroup<T>[] {
  const groups: RecordMonthGroup<T>[] = [];
  const indexByKey = new Map<string, number>();
  for (const entry of entries) {
    const monthKey = recordMonthKey(entry.createdAt);
    const existing = indexByKey.get(monthKey);
    if (existing === undefined) {
      indexByKey.set(monthKey, groups.length);
      groups.push({
        monthKey,
        heading: formatRecordMonthHeading(monthKey),
        entries: [entry]
      });
    } else {
      groups[existing]!.entries.push(entry);
    }
  }
  groups.sort((a, b) => (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0));
  return groups;
}

/**
 * Curated themes for pinned Vela insights. What the insight is about, not a
 * journal tag. Runtime code never invents an id outside this list.
 */
export const PIN_THEME_IDS = [
  "how_theyre_built",
  "how_you_two_work",
  "this_season",
  "talking",
  "tension",
  "care",
  "family",
  "work"
] as const;

export type PinThemeId = (typeof PIN_THEME_IDS)[number];

export type PinSort = "newest" | "oldest";

export const VELA_PIN_COLLAPSE_LIMIT = 5;

export function isPinTheme(value: unknown): value is PinThemeId {
  return typeof value === "string" && (PIN_THEME_IDS as readonly string[]).includes(value);
}

export function sanitizePinTheme(value: unknown): PinThemeId | null {
  return isPinTheme(value) ? value : null;
}

const PIN_THEME_KEYWORDS: Record<PinThemeId, readonly string[]> = {
  how_theyre_built: [
    "natal", "placement", "placements", "sun", "moon", "rising", "ascendant",
    "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
    "house", "wired", "chart", "big three"
  ],
  how_you_two_work: [
    "synastry", "the two of you", "between you", "both of you", "together you", "composite"
  ],
  this_season: [
    "transit", "transits", "this week", "this month", "this season", "right now", "saturn return"
  ],
  talking: [
    "conversation", "listen", "listening", "what to say", "tell them", "words", "speak", "speaking"
  ],
  tension: [
    "friction", "clash", "conflict", "fight", "square", "opposition", "hard aspect"
  ],
  care: [
    "what they need", "feel seen", "support them", "take care", "needs from you"
  ],
  family: [
    "parent", "child", "mother", "father", "family", "sibling", "daughter", "son", "parenting"
  ],
  work: [
    "career", "colleague", "boss", "at work", "workplace", "job"
  ]
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordHits(hay: string, keywords: readonly string[]): number {
  let n = 0;
  for (const kw of keywords) {
    if (kw.includes(" ")) {
      if (hay.includes(kw)) n += 1;
    } else {
      const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
      if (re.test(hay)) n += 1;
    }
  }
  return n;
}

/**
 * Suggest a theme from the curated list using keyword hits on the insight body.
 * Returns null when nothing in the list matches. Never invents an id.
 */
export function suggestPinTheme(body: string): PinThemeId | null {
  const hay = body.toLowerCase();
  let best: PinThemeId | null = null;
  let bestScore = 0;
  for (const id of PIN_THEME_IDS) {
    const score = keywordHits(hay, PIN_THEME_KEYWORDS[id]);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

export interface PinViewEntry extends RecordViewEntry {
  theme?: PinThemeId | null;
}

export function sortPinnedInsights<T extends { createdAt: string }>(
  entries: readonly T[],
  sort: PinSort
): T[] {
  const copy = [...entries];
  copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  if (sort === "oldest") copy.reverse();
  return copy;
}

export function collapsePinnedInsights<T>(
  entries: readonly T[],
  expanded: boolean,
  limit = VELA_PIN_COLLAPSE_LIMIT
): T[] {
  if (expanded) return [...entries];
  return entries.slice(0, limit);
}

export function visiblePinnedInsights<T extends PinViewEntry>(
  entries: readonly T[],
  options: { q?: string; sort: PinSort; expanded: boolean }
): T[] {
  const searched = filterRecordEntries(entries, { q: options.q });
  const sorted = sortPinnedInsights(searched, options.sort);
  const expand = options.expanded || Boolean(options.q?.trim());
  return collapsePinnedInsights(sorted, expand);
}

export interface PinThemeGroup<T extends PinViewEntry> {
  theme: PinThemeId | null;
  entries: T[];
}

/** Group in curated list order, unthemed last. Empty groups are omitted. */
export function groupPinnedInsightsByTheme<T extends PinViewEntry>(
  entries: readonly T[]
): PinThemeGroup<T>[] {
  const byTheme = new Map<PinThemeId | "none", T[]>();
  for (const id of PIN_THEME_IDS) byTheme.set(id, []);
  byTheme.set("none", []);
  for (const entry of entries) {
    const theme = sanitizePinTheme(entry.theme);
    const key = theme ?? "none";
    byTheme.get(key)!.push(entry);
  }
  const groups: PinThemeGroup<T>[] = [];
  for (const id of PIN_THEME_IDS) {
    const grouped = byTheme.get(id)!;
    if (grouped.length > 0) groups.push({ theme: id, entries: grouped });
  }
  const unthemed = byTheme.get("none")!;
  if (unthemed.length > 0) groups.push({ theme: null, entries: unthemed });
  return groups;
}
