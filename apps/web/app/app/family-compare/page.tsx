"use client";

/**
 * /app/family-compare — Generations Feature 2: Family Chart Comparisons.
 *
 * 3-8 people from the constellation, side by side: Sun/Moon/Rising/Mercury/
 * Venus/Mars, with shared-sign highlighting and static (non-AI) pattern
 * copy. Distinct from /app/compare (2-person synastry) — this reads plain
 * placements, no cross-chart aspects, so it scales past a pair. All grid +
 * pattern logic lives in @galaxia/astro (detectFamilyPatterns) — this page
 * is I/O (load people/charts) and layout only.
 */

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
import { getMemorialConstellation, hasPassed, usesMemorialGlyph } from "@galaxia/core";
import type { NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { MemorialConstellationGlyph } from "../../../components/memorial-constellation-glyph";
import { ShareImageButton } from "../../../components/share-image-button";
import { ShareWatermark } from "../../../components/share-watermark";
import { SIGN_GLYPH } from "../../../lib/design";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { useRef } from "react";

const MIN_PEOPLE = 3;
const MAX_PEOPLE = 8;

interface PersonLite {
  id: string;
  display_name: string;
  relation: string;
  is_self: boolean;
  passed_at?: string | null;
  memorial_constellation?: string | null;
  birth_precision: "none" | "exact" | "date" | "year";
}

function MemorialMark({ person }: { person: PersonLite }) {
  if (!hasPassed(person)) return null;
  if (usesMemorialGlyph(person)) {
    const pattern = getMemorialConstellation(person.memorial_constellation);
    if (pattern) return <MemorialConstellationGlyph pattern={pattern} size={18} strokeWidth={1} starRadius={1.1} title={`${person.display_name} — remembered`} />;
  }
  return <span aria-label={`${person.display_name} — remembered`} style={{ color: "var(--gold-soft)", fontSize: ".8rem" }}>✦</span>;
}

export default function FamilyComparePage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [chartById, setChartById] = useState<Map<string, NatalChart>>(new Map());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setStatus("Please sign in."); setLoading(false); return; }
      const { data: peopleRows, error: pErr } = await supabase
        .from("people")
        .select("id, display_name, relation, is_self, passed_at, memorial_constellation, birth_precision")
        .eq("owner_id", userData.user.id)
        .order("created_at", { ascending: true });
      if (pErr) { setStatus(pErr.message); setLoading(false); return; }
      const rows = (peopleRows ?? []) as PersonLite[];
      setPeople(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
        setChartById(new Map((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart])));
      }
      setLoading(false);
    })();
  }, [supabase]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PEOPLE) return prev;
      return [...prev, id];
    });
  }

  // Stable column order = roster order, not selection order, so toggling
  // someone off and back on doesn't reshuffle the grid.
  const selectedPeople = useMemo(
    () => people.filter((p) => selectedIds.includes(p.id)),
    [people, selectedIds]
  );

  const inputs: FamilyComparePersonInput[] = useMemo(
    () =>
      selectedPeople.reduce<FamilyComparePersonInput[]>((acc, p) => {
        const chart = chartById.get(p.id);
        if (chart) acc.push({ id: p.id, name: p.display_name, chart, passed: hasPassed(p) });
        return acc;
      }, []),
    [selectedPeople, chartById]
  );

  const missingChartCount = selectedPeople.length - inputs.length;

  const result: FamilyPatternResult | null = useMemo(
    () => (inputs.length >= MIN_PEOPLE ? detectFamilyPatterns(inputs) : null),
    [inputs]
  );

  const isSharedCell = (planet: FamilyPlanet, personId: string): boolean =>
    Boolean(result?.sharedPlacements.some((s) => s.planet === planet && s.personIds.includes(personId)));

  return (
    <main className="app-content">
      <div className="fade-in">
        <p className="eyebrow">Family</p>
        <h1 className="page-title">Chart Comparison</h1>
        <p className="muted lede">
          Choose 3 to 8 people from your constellation to see how your charts overlap — shared placements, family-wide
          patterns, and the energy no one in the group carries. Comparing just two people? The{" "}
          <Link href="/app/compare" style={{ color: "var(--teal)" }}>full synastry view</Link> goes deeper on a pair.
        </p>
      </div>

      {status ? <p className="error fade-in">{status}</p> : null}

      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Select people {selectedIds.length > 0 ? `(${selectedIds.length}/${MAX_PEOPLE})` : ""}
        </p>
        {loading ? (
          <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
        ) : people.length < MIN_PEOPLE ? (
          <p className="muted" style={{ fontSize: ".86rem" }}>
            You need at least {MIN_PEOPLE} people in your constellation to build a comparison.{" "}
            <Link href="/app/add-person" style={{ color: "var(--teal)" }}>Add another person</Link>.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {people.map((p) => {
              const selected = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={!selected && selectedIds.length >= MAX_PEOPLE}
                  className="pill-link"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: ".82rem",
                    padding: "7px 14px",
                    border: selected ? "1px solid var(--gold)" : undefined,
                    background: selected ? "rgba(230,174,108,.14)" : undefined,
                    color: selected ? "var(--gold-bright)" : undefined,
                    opacity: !selected && selectedIds.length >= MAX_PEOPLE ? 0.4 : 1,
                  }}
                >
                  <InitialAvatar name={p.display_name} size="sm" />
                  {p.display_name}
                  <MemorialMark person={p} />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedIds.length > 0 && selectedIds.length < MIN_PEOPLE ? (
        <p className="muted fade-in" style={{ fontSize: ".84rem" }}>
          Select at least {MIN_PEOPLE - selectedIds.length} more {selectedIds.length === MIN_PEOPLE - 1 ? "person" : "people"} to see the comparison.
        </p>
      ) : null}

      {missingChartCount > 0 ? (
        <p className="muted fade-in" style={{ fontSize: ".8rem" }}>
          {missingChartCount === 1 ? "One selected person doesn't" : `${missingChartCount} selected people don't`} have a computed chart yet, so they&apos;re left out of the grid below.
        </p>
      ) : null}

      {result ? (
        <>
          <section className="glass-card fade-in" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 6px", gap: 10, flexWrap: "wrap" }}>
              <p className="eyebrow" style={{ margin: 0 }}>The grid</p>
              <ShareImageButton targetRef={shareRef} filename="family-chart-comparison.png" label="Share comparison" />
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
                                <span className="muted" style={{ fontSize: ".78rem" }}>—</span>
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

          <section className="glass-card fade-in">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Patterns</p>
            <PatternsSection result={result} totalPeople={result.people.length} />
          </section>
        </>
      ) : null}
    </main>
  );
}

function PatternsSection({ result, totalPeople }: { result: FamilyPatternResult; totalPeople: number }) {
  const hasAny = result.sharedPlacements.length > 0 || result.dominantElement || result.missingElements.length > 0 || result.missingModalities.length > 0;
  if (!hasAny) {
    return (
      <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
        No two of you share a sign in the same placement, and no single element runs the group — this is a chart-wise
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
