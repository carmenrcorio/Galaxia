/**
 * User-visible Compare history copy.
 * No U+2014. Do not "fix" an em dash with a hyphen.
 */


export const COMPARE_HISTORY_HEADING = "Recent comparisons";


export const COMPARE_HISTORY_EMPTY =
  "Pick two people to start. After you run a comparison, it will wait here so this page is not an empty form the next time you come back.";


export function compareHistoryLastViewed(date: string): string {
  return `Last viewed ${date}`;
}


export const COMPARE_HISTORY_OPEN = "Open this comparison";


export const COMPARE_SINCE_HEADING = "Since you last looked";


export function compareNatalAspectsConstant(nameA: string, nameB: string): string {
  return `The natal aspects between ${nameA} and ${nameB} have not changed. Those are fixed by the two birth charts.`;
}


export const COMPARE_NEWLY_ACTIVE = "Newly active between these two";


export const COMPARE_MOVED_ON = "Moved on since you last looked";


export function compareNoTransitShift(date: string): string {
  return `No transits have entered or left orb between these two since ${date}.`;
}


export const COMPARE_TRANSITS_UNAVAILABLE =
  "Transits for this pair cannot be shown honestly with the birth data on file.";


export function describePairTransitLine(
  name: string,
  hit: { transitBody: string; type: string; natalBody: string }
): string {
  return `${name}: transiting ${hit.transitBody} ${hit.type} natal ${hit.natalBody}`;
}

export function formatCompareLastViewed(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export interface ComparisonHistoryPerson {
  id: string;
  display_name: string;
  relation?: string;
  sun?: string;
  passed_at?: string | null;
}

export interface ComparisonHistoryRow {
  person_low: string;
  person_high: string;
  last_viewed_at: string;
}

export interface ComparisonHistoryItem {
  personAId: string;
  personBId: string;
  nameA: string;
  nameB: string;
  sunA?: string;
  sunB?: string;
  memorialA: boolean;
  memorialB: boolean;
  lastViewedAt: string;
}

export function hydrateComparisonHistory(
  rows: readonly ComparisonHistoryRow[],
  people: readonly ComparisonHistoryPerson[]
): ComparisonHistoryItem[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const items: ComparisonHistoryItem[] = [];
  for (const row of rows) {
    const low = byId.get(row.person_low);
    const high = byId.get(row.person_high);
    if (!low || !high) continue;
    const selfIsHigh = high.relation === "self" && low.relation !== "self";
    const a = selfIsHigh ? high : low;
    const b = selfIsHigh ? low : high;
    items.push({
      personAId: a.id,
      personBId: b.id,
      nameA: a.display_name,
      nameB: b.display_name,
      sunA: a.sun,
      sunB: b.sun,
      memorialA: Boolean(a.passed_at),
      memorialB: Boolean(b.passed_at),
      lastViewedAt: row.last_viewed_at
    });
  }
  return items;
}

/**
 * Last `limit` distinct people who appeared in comparison history, newest
 * pair first. History must already be newest-first. People missing from
 * `people` are skipped. Used by the Compare person picker Recent section.
 */
export function recentComparedPeople<T extends { id: string }>(
  history: readonly Pick<ComparisonHistoryItem, "personAId" | "personBId">[],
  people: readonly T[],
  limit = 5
): T[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of history) {
    for (const id of [item.personAId, item.personBId]) {
      if (seen.has(id)) continue;
      const person = byId.get(id);
      if (!person) continue;
      seen.add(id);
      out.push(person);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

