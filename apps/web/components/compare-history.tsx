import {
  COMPARE_HISTORY_HEADING,
  COMPARE_HISTORY_OPEN,
  COMPARE_MOVED_ON,
  COMPARE_NEWLY_ACTIVE,
  COMPARE_SINCE_HEADING,
  COMPARE_TRANSITS_UNAVAILABLE,
  compareHistoryLastViewed,
  compareNatalAspectsConstant,
  compareNoTransitShift,
  describePairTransitLine,
  formatCompareLastViewed,
  hydrateComparisonHistory,
  type ComparisonHistoryItem,
  type ComparisonHistoryPerson,
  type ComparisonHistoryRow,
  type PairTransitHit
} from "@galaxia/astro";
import { InitialAvatar } from "./initial-avatar";

export type { ComparisonHistoryItem, ComparisonHistoryPerson, ComparisonHistoryRow };
export { hydrateComparisonHistory };

export function CompareHistoryList({
  items,
  onOpen
}: {
  items: readonly ComparisonHistoryItem[];
  onOpen: (personAId: string, personBId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="glass-card fade-in">
      {/* FOUNDER-REVIEW: COMPARE_HISTORY_HEADING */}
      <p className="eyebrow" style={{ marginBottom: 12 }}>{COMPARE_HISTORY_HEADING}</p>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => (
          <button
            key={`${item.personAId}:${item.personBId}`}
            type="button"
            className="group-member-chip"
            aria-label={`${COMPARE_HISTORY_OPEN}: ${item.nameA} and ${item.nameB}`}
            onClick={() => onOpen(item.personAId, item.personBId)}
            style={{ justifyContent: "space-between", width: "100%", textAlign: "left" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
              <InitialAvatar name={item.nameA} size="sm" personId={item.personAId} sunSign={item.sunA} memorial={item.memorialA} />
              <span style={{ color: "var(--mist2)" }}>×</span>
              <InitialAvatar name={item.nameB} size="sm" personId={item.personBId} sunSign={item.sunB} memorial={item.memorialB} />
              <span style={{ overflowWrap: "anywhere" }}>{item.nameA} &amp; {item.nameB}</span>
            </span>
            <span style={{ fontSize: ".72rem", color: "var(--mist2)", whiteSpace: "nowrap" }}>
              {/* FOUNDER-REVIEW: compareHistoryLastViewed */}
              {compareHistoryLastViewed(formatCompareLastViewed(item.lastViewedAt))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function CompareSinceLastViewed({
  nameA,
  nameB,
  lastViewedAt,
  honest,
  newlyActive,
  movedOn,
  nameById
}: {
  nameA: string;
  nameB: string;
  lastViewedAt: string;
  honest: boolean;
  newlyActive: readonly PairTransitHit[];
  movedOn: readonly PairTransitHit[];
  nameById: (personId: string) => string;
}) {
  const viewed = formatCompareLastViewed(lastViewedAt);
  const noShift = honest && newlyActive.length === 0 && movedOn.length === 0;
  return (
    <section className="glass-card fade-in">
      {/* FOUNDER-REVIEW: COMPARE_SINCE_HEADING */}
      <p className="eyebrow" style={{ marginBottom: 8 }}>{COMPARE_SINCE_HEADING}</p>
      <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, marginBottom: 10 }}>
        {/* FOUNDER-REVIEW: compareNatalAspectsConstant */}
        {compareNatalAspectsConstant(nameA, nameB)}
      </p>
      {!honest ? (
        <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: 0 }}>
          {/* FOUNDER-REVIEW: COMPARE_TRANSITS_UNAVAILABLE */}
          {COMPARE_TRANSITS_UNAVAILABLE}
        </p>
      ) : noShift ? (
        <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: 0 }}>
          {/* FOUNDER-REVIEW: compareNoTransitShift */}
          {compareNoTransitShift(viewed)}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {newlyActive.length > 0 ? (
            <div>
              {/* FOUNDER-REVIEW: COMPARE_NEWLY_ACTIVE */}
              <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 6 }}>{COMPARE_NEWLY_ACTIVE}</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                {newlyActive.map((hit) => (
                  <li key={`new-${pairLineKey(hit)}`} className="muted" style={{ fontSize: ".82rem", lineHeight: 1.5 }}>
                    {/* FOUNDER-REVIEW: describePairTransitLine */}
                    {describePairTransitLine(nameById(hit.personId), hit)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {movedOn.length > 0 ? (
            <div>
              {/* FOUNDER-REVIEW: COMPARE_MOVED_ON */}
              <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 6 }}>{COMPARE_MOVED_ON}</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                {movedOn.map((hit) => (
                  <li key={`gone-${pairLineKey(hit)}`} className="muted" style={{ fontSize: ".82rem", lineHeight: 1.5 }}>
                    {/* FOUNDER-REVIEW: describePairTransitLine */}
                    {describePairTransitLine(nameById(hit.personId), hit)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function pairLineKey(hit: PairTransitHit): string {
  return `${hit.personId}|${hit.transitBody}|${hit.type}|${hit.natalBody}`;
}
