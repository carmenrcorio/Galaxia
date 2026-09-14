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
  | "chart_correction";

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
  "something_they_said"
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
