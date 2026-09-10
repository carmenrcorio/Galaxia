"use client";

/**
 * Pair dynamics — clickable cards, one per pair highlight. Leads with a
 * plain-English sentence and a scannable FAULT LINE / SAME GENERATION
 * badge; the raw planet/sign facts stay as a smaller secondary line.
 * Cards navigate to /app/compare pre-loaded with that exact pairing when
 * both people can be resolved to an id (never guessed).
 */

import { Fragment } from "react";
import { describePairHighlight, parsePairNames, parsePairSummary } from "../../lib/groups-copy";
import { GlossaryPlanet, GlossarySign } from "../glossary-term";

export interface PairDynamicsItem {
  /** Persisted pair key, "Name A × Name B". */
  pair: string;
  /** Persisted summary string — unchanged data shape from CohortPairHighlight. */
  summary: string;
}

interface PairDynamicsSectionProps {
  items: PairDynamicsItem[];
  /** Resolves display names back to person ids for navigation; returns null when unknown. */
  resolveId: (name: string) => string | null;
  onOpenPair: (idA: string, idB: string) => void;
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PairDetailLine({ summary, fallback }: { summary: string; fallback: string }) {
  const parsed = parsePairSummary(summary);
  if (!parsed) {
    return <p className="muted" style={{ margin: "6px 0 0", fontSize: ".72rem" }}>{fallback}</p>;
  }
  return (
    <p className="muted" style={{ margin: "6px 0 0", fontSize: ".72rem" }}>
      {parsed.planets.map((planet, index) => (
        <Fragment key={`${planet.planet}-${planet.sign ?? planet.signA}-${index}`}>
          {index > 0 ? " · " : null}
          <GlossaryPlanet planet={planet.planet} />
          {" "}
          {planet.sign ? (
            <GlossarySign sign={planet.sign} />
          ) : (
            <>
              {planet.signA ? <GlossarySign sign={planet.signA} /> : null}
              {planet.signA && planet.signB ? "/" : null}
              {planet.signB ? <GlossarySign sign={planet.signB} /> : null}
            </>
          )}
        </Fragment>
      ))}
    </p>
  );
}

export function PairDynamicsSection({ items, resolveId, onOpenPair }: PairDynamicsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="glass-card fade-in">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Pair dynamics</p>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const names = parsePairNames(item.pair);
          if (!names) return null;
          const [nameA, nameB] = names;
          const presentation = describePairHighlight(nameA, nameB, item.summary);
          const idA = resolveId(nameA);
          const idB = resolveId(nameB);
          const clickable = Boolean(idA && idB);

          const content = (
            <>
              <span
                className={`pair-card__badge${presentation.badge === "FAULT LINE" ? " pair-card__badge--fault" : " pair-card__badge--aligned"}`}
              >
                {presentation.badge}
              </span>
              <div className="pair-card__body">
                <p style={{ margin: 0, color: "var(--cream)", fontSize: ".88rem", lineHeight: 1.55 }}>{presentation.sentence}</p>
                <PairDetailLine summary={item.summary} fallback={presentation.detail} />
              </div>
              {clickable ? (
                <span className="pair-card__chevron" aria-hidden="true"><ChevronIcon /></span>
              ) : null}
            </>
          );

          if (!clickable) {
            return (
              <div key={item.pair} className="pair-card" style={{ cursor: "default" }}>
                {content}
              </div>
            );
          }

          return (
            <div
              key={item.pair}
              className="pair-card"
              onClick={() => onOpenPair(idA!, idB!)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenPair(idA!, idB!);
                }
              }}
            >
              {content}
              <button
                type="button"
                className="pair-card__open"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenPair(idA!, idB!);
                }}
                aria-label={`Open the full comparison for ${nameA} and ${nameB}`}
              >
                Open comparison
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
