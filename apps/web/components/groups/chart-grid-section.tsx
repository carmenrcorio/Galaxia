"use client";

/**
 * Chart grid — the personal-planet (Sun/Moon/Rising/Mercury/Venus/Mars)
 * side-by-side comparison + pattern read that used to live on its own
 * "/app/family-compare" tab. Merged into the Groups dashboard so any group
 * kind (family, friends, coworkers, ...) gets it for its own members,
 * instead of a second, always-family-flavored tab living next to Groups.
 *
 * Table/pattern logic is unchanged and lives in @galaxia/astro
 * (detectFamilyPatterns) — distinct from the Generational Map above it on
 * this page, which reads only the three outer/slow planets. This section
 * reads the six personal planets instead, so it renders even for members
 * whose generational signature isn't available.
 */

import { useRef } from "react";
import {
  detectFamilyPatterns,
  FAMILY_COMPARE_PLANETS,
  FAMILY_PLANET_LABEL,
  interpretDominantElement,
  interpretMissingElement,
  interpretMissingModality,
  interpretSharedPlacement,
  type FamilyComparePersonInput,
  type FamilyPatternResult,
  type FamilyPlanet,
} from "@galaxia/astro";
import { InitialAvatar } from "../initial-avatar";
import { ShareImageButton } from "../share-image-button";
import { ShareWatermark } from "../share-watermark";
import { SIGN_GLYPH } from "../../lib/design";

const MIN_GRID_PEOPLE = 3;
const MAX_GRID_PEOPLE = 8;

interface ChartGridSectionProps {
  /** Current group's members with a resolved chart — already filtered upstream to those with one. */
  members: FamilyComparePersonInput[];
}

export function ChartGridSection({ members }: ChartGridSectionProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  if (members.length < MIN_GRID_PEOPLE) return null;

  const inputs = members.slice(0, MAX_GRID_PEOPLE);
  const truncated = members.length > MAX_GRID_PEOPLE;
  const result: FamilyPatternResult = detectFamilyPatterns(inputs);

  const isSharedCell = (planet: FamilyPlanet, personId: string): boolean =>
    Boolean(result.sharedPlacements.some((s) => s.planet === planet && s.personIds.includes(personId)));

  return (
    <>
      <section className="glass-card fade-in" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 6px", gap: 10, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Chart grid</p>
            <p className="muted" style={{ fontSize: ".78rem", margin: "4px 0 0" }}>
              Sun, Moon, Rising, Mercury, Venus, and Mars, side by side.
            </p>
          </div>
          <ShareImageButton targetRef={shareRef} filename="group-chart-comparison.png" label="Share comparison" />
        </div>

        <div ref={shareRef} style={{ position: "relative", padding: "10px 20px 26px", background: "#0a0717" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 120 + result.people.length * 130 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      position: "sticky", left: 0, zIndex: 2, background: "#0a0717",
                      textAlign: "left", padding: "8px 10px", minWidth: 110,
                    }}
                  />
                  {result.people.map((p) => (
                    <th key={p.id} style={{ padding: "8px 10px", textAlign: "center", minWidth: 130 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <InitialAvatar name={p.name} size="sm" />
                        <span style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".84rem", display: "flex", alignItems: "center", gap: 4 }}>
                          {p.name}
                          {p.passed ? <span aria-label="remembered" style={{ color: "var(--gold-soft)", fontSize: ".72rem" }}>✦</span> : null}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FAMILY_COMPARE_PLANETS.map((planet) => (
                  <tr key={planet}>
                    <td
                      style={{
                        position: "sticky", left: 0, zIndex: 2, background: "#0a0717",
                        padding: "10px 10px", fontFamily: "var(--serif)", color: "var(--mist)", fontSize: ".82rem",
                        borderTop: "1px solid rgba(255,255,255,.06)",
                      }}
                    >
                      {FAMILY_PLANET_LABEL[planet]}
                    </td>
                    {result.people.map((p) => {
                      const cell = p.placements[planet];
                      const shared = isSharedCell(planet, p.id);
                      return (
                        <td
                          key={p.id}
                          style={{
                            textAlign: "center",
                            padding: "8px 6px",
                            borderTop: "1px solid rgba(255,255,255,.06)",
                            borderRadius: shared ? 10 : 0,
                            background: shared ? "rgba(230,174,108,.16)" : "transparent",
                            boxShadow: shared ? "inset 0 0 0 1px rgba(230,174,108,.45)" : undefined,
                          }}
                        >
                          {cell.sign && cell.confident ? (
                            <span style={{ fontSize: ".84rem", color: shared ? "var(--gold-bright)" : "var(--cream)" }}>
                              <span aria-hidden="true" style={{ marginRight: 4 }}>{SIGN_GLYPH[cell.sign]}</span>
                              {cell.sign}
                              {cell.house ? <span className="muted" style={{ fontSize: ".68rem", display: "block" }}>House {cell.house}</span> : null}
                            </span>
                          ) : (
                            <span className="muted" style={{ fontSize: ".78rem" }}>
                              {/* FOUNDER-REVIEW: rewritten (no U+2014). */}
                              ·
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ShareWatermark />
        </div>
      </section>

      {truncated ? (
        <p className="muted fade-in" style={{ fontSize: ".78rem" }}>
          Showing the first {MAX_GRID_PEOPLE} members: the grid caps there for readability.
        </p>
      ) : null}

      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Patterns</p>
        <PatternsSection result={result} totalPeople={result.people.length} />
      </section>
    </>
  );
}

function PatternsSection({ result, totalPeople }: { result: FamilyPatternResult; totalPeople: number }) {
  const hasAny = result.sharedPlacements.length > 0 || result.dominantElement || result.missingElements.length > 0 || result.missingModalities.length > 0;
  if (!hasAny) {
    return (
      <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
        No two of you share a sign in the same placement, and no single element runs the group: this is a chart-wise
        eclectic bunch. Sometimes that&apos;s the pattern.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {result.sharedPlacements.length > 0 ? (
        <div>
          <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 8 }}>Shared placements</p>
          <div style={{ display: "grid", gap: 10 }}>
            {result.sharedPlacements.map((s) => (
              <p key={`${s.planet}-${s.sign}`} className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
                {interpretSharedPlacement(s, totalPeople)}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {result.dominantElement ? (
        <div>
          <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 8 }}>Element clustering</p>
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
            {interpretDominantElement(result.dominantElement.element, result.dominantElement.count, result.dominantElement.total)}
          </p>
        </div>
      ) : null}

      {result.missingElements.length > 0 || result.missingModalities.length > 0 ? (
        <div>
          <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 8 }}>Missing energy</p>
          <div style={{ display: "grid", gap: 8 }}>
            {result.missingElements.map((el) => (
              <p key={el} className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>{interpretMissingElement(el)}</p>
            ))}
            {result.missingModalities.map((mod) => (
              <p key={mod} className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>{interpretMissingModality(mod)}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
