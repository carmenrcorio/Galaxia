/**
 * WS-C. Salience, top-N, and cross-day novelty.
 * Orb tightness dominates. Faster bodies score higher so a weekly feed
 * changes with the week. A seen event stays down until its exactness moves.
 */

import { isSlowWeeklyBody, NOVELTY_EXACTNESS_SHIFT_MS, SALIENCE_WEIGHTS, SHOWN_SHARED_TRANSIT_CAP, SPEED_SCORE_SATURATION_DEG_PER_DAY } from "./constants";
import type { SharedTransitEvent, ShownSharedTransit } from "./types";

export function scoreSharedTransitSalience(
  event: Pick<SharedTransitEvent, "members" | "synastryLink">
): number {
  if (event.members.length === 0) return 0;
  const orb = Math.min(...event.members.map((member) => member.orb));
  const orbScore = 1 / (1 + Math.max(0, orb));
  const applyingScore = event.members.some((member) => member.applying) ? 1 : 0;
  const speed = Math.max(...event.members.map((member) => Math.abs(member.transitingSpeed)));
  const speedScore = Math.min(1, speed / SPEED_SCORE_SATURATION_DEG_PER_DAY);
  const linkScore = event.synastryLink ? 1 / (1 + Math.max(0, event.synastryLink.orb)) : 0;
  const w = SALIENCE_WEIGHTS;
  const total = w.orb + w.applying + w.speed + w.synastry;
  return (w.orb * orbScore + w.applying * applyingScore + w.speed * speedScore + w.synastry * linkScore) / total;
}

export function eventExactnessStamp(event: Pick<SharedTransitEvent, "members">): string {
  const times = event.members.map((member) => Date.parse(member.exactAt)).filter((time) => !Number.isNaN(time));
  if (times.length === 0) return "";
  return new Date(Math.min(...times)).toISOString();
}

/** True when this event was already shown on an earlier day and its exactness has not moved. */
export function isUnchangedSharedTransitRepeat(
  event: SharedTransitEvent,
  record: ShownSharedTransit,
  todayYYYYMMDD: string
): boolean {
  if (record.id !== event.id) return false;
  if (record.shownOn >= todayYYYYMMDD) return false;
  const next = Date.parse(eventExactnessStamp(event));
  const prev = Date.parse(record.exactAt);
  if (Number.isNaN(next) || Number.isNaN(prev)) return true;
  return Math.abs(next - prev) < NOVELTY_EXACTNESS_SHIFT_MS;
}

export function applySharedTransitNovelty(
  events: readonly SharedTransitEvent[],
  previouslyShown: readonly ShownSharedTransit[],
  todayYYYYMMDD: string
): SharedTransitEvent[] {
  if (previouslyShown.length === 0) return [...events];
  return events.filter(
    (event) => !previouslyShown.some((record) => isUnchangedSharedTransitRepeat(event, record, todayYYYYMMDD))
  );
}

export function mergeShownSharedTransits(
  previous: readonly ShownSharedTransit[],
  events: readonly SharedTransitEvent[],
  todayYYYYMMDD: string
): ShownSharedTransit[] {
  const next = new Map(previous.map((record) => [record.id, record]));
  for (const event of events) {
    next.set(event.id, {
      id: event.id,
      exactAt: eventExactnessStamp(event),
      shownOn: todayYYYYMMDD,
    });
  }
  return [...next.values()]
    .sort((a, b) => (a.shownOn < b.shownOn ? 1 : a.shownOn > b.shownOn ? -1 : a.id.localeCompare(b.id)))
    .slice(0, SHOWN_SHARED_TRANSIT_CAP);
}

export function rankSharedTransitEvents(events: readonly SharedTransitEvent[]): SharedTransitEvent[] {
  return [...events].sort((a, b) => b.salience - a.salience || a.id.localeCompare(b.id));
}

export function splitWeeklyAndLongArcs(
  rankedNovel: readonly SharedTransitEvent[],
  limit: number
): { weekly: SharedTransitEvent[]; longArcs: SharedTransitEvent[] } {
  const weekly = rankedNovel.slice(0, limit);
  const weeklyIds = new Set(weekly.map((event) => event.id));
  const longArcs = rankedNovel.filter((event) => !weeklyIds.has(event.id) && isSlowWeeklyBody(event.transiting));
  return { weekly, longArcs };
}
