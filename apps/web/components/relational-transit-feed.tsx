"use client";

/**
 * "This Week" — Generations Feature 3: Generational Transit Alerts.
 *
 * Reads the `relational_transits` rows the daily cron job
 * (apps/web/app/api/cron/relational-transit-scan) already computed and
 * upserted with @galaxia/astro `scanRelationalTransits` — this component is
 * pure read + render, no transit math here. Headline/body copy comes from
 * @galaxia/astro `interpretRelationalTransit` (static templates, no AI
 * call) fed the row's own stored `affected_profiles`, never re-derived.
 *
 * Respects `profiles.relational_transit_alerts` ('all' | 'major_only' |
 * 'off') — the compute job always runs regardless, so flipping the
 * preference back to 'all' immediately has history to show.
 */

import {
  interpretRelationalTransit,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  type AffectedProfileHit,
  type AspectType,
  type RelationalTransitBody,
} from "@galaxia/astro";
import { getMemorialConstellation, usesMemorialGlyph } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "./initial-avatar";
import { MemorialConstellationGlyph } from "./memorial-constellation-glyph";
import { BODY_GLYPH } from "../lib/design";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

/** Weather-forecast palette per the spec — informative, never alarming. */
const BODY_COLOR: Record<RelationalTransitBody, string> = {
  saturn: "#b9c0c9",
  jupiter: "#e6ae6c",
  uranus: "#bfe9f2",
  neptune: "#8fd6c1",
  pluto: "#7a2b3a",
};

interface RelationalTransitRow {
  id: string;
  transit_body: RelationalTransitBody;
  transit_sign: string;
  aspect_type: AspectType;
  affected_profiles: Array<{
    profile_id: string;
    profile_name: string;
    natal_body: string;
    natal_sign: string;
    orb_deg: number;
    exact_at: string;
  }>;
  active_from: string;
  active_to: string;
}

interface PersonMemorialInfo {
  display_name: string;
  passed_at: string | null;
  memorial_constellation: string | null;
  is_self: boolean;
}

function toAffectedHits(row: RelationalTransitRow): AffectedProfileHit[] {
  return row.affected_profiles.map((a) => ({
    personId: a.profile_id,
    personName: a.profile_name,
    // Stored lowercase by the cron route; the interpretation copy only
    // keys off known body/sign strings, never re-validates against a chart.
    natalBody: a.natal_body as AffectedProfileHit["natalBody"],
    natalSign: a.natal_sign as AffectedProfileHit["natalSign"],
    aspectType: row.aspect_type,
    orbDeg: a.orb_deg,
    exactAtUTC: a.exact_at,
  }));
}

function MemorialMark({ person }: { person: PersonMemorialInfo | undefined }) {
  if (!person?.passed_at) return null;
  if (usesMemorialGlyph(person)) {
    const pattern = getMemorialConstellation(person.memorial_constellation);
    if (pattern) return <MemorialConstellationGlyph pattern={pattern} size={14} strokeWidth={1} starRadius={1} title={`${person.display_name} — remembered`} />;
  }
  return <span aria-label={`${person.display_name} — remembered`} style={{ color: "var(--gold-soft)", fontSize: ".7rem" }}>✦</span>;
}

export function RelationalTransitFeed({ ownerId }: { ownerId: string }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RelationalTransitRow[]>([]);
  const [peopleById, setPeopleById] = useState<Map<string, PersonMemorialInfo>>(new Map());
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      const nowISO = new Date().toISOString();
      const [{ data: profileRow }, { data: transitRows }, { data: peopleRows }] = await Promise.all([
        supabase.from("profiles").select("relational_transit_alerts").eq("id", ownerId).maybeSingle(),
        supabase
          .from("relational_transits")
          .select("id, transit_body, transit_sign, aspect_type, affected_profiles, active_from, active_to")
          .eq("owner_id", ownerId)
          .gte("active_to", nowISO)
          .lte("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(20),
        supabase.from("people").select("id, display_name, passed_at, memorial_constellation, is_self").eq("owner_id", ownerId),
      ]);
      setPreference((profileRow?.relational_transit_alerts as "all" | "major_only" | "off" | undefined) ?? "all");
      setRows((transitRows ?? []) as RelationalTransitRow[]);
      setPeopleById(new Map((peopleRows ?? []).map((p) => [p.id as string, p as PersonMemorialInfo])));
      setLoading(false);
    })();
  }, [supabase, ownerId]);

  const visibleRows = useMemo(() => {
    if (preference === "off") return [];
    const filtered = preference === "major_only" ? rows.filter((r) => MAJOR_RELATIONAL_TRANSIT_BODIES.includes(r.transit_body)) : rows;
    // Most-affected, tightest-orb first — same "lead story" ordering the
    // scan engine itself uses, applied here since Supabase can't sort by
    // jsonb array length inline.
    return [...filtered].sort((a, b) => {
      if (b.affected_profiles.length !== a.affected_profiles.length) return b.affected_profiles.length - a.affected_profiles.length;
      const orbA = Math.min(...a.affected_profiles.map((p) => p.orb_deg));
      const orbB = Math.min(...b.affected_profiles.map((p) => p.orb_deg));
      return orbA - orbB;
    });
  }, [rows, preference]);

  if (loading || preference === "off" || visibleRows.length === 0) return null;

  return (
    <section className="glass-card fade-in fade-in-delay-1">
      <p className="eyebrow">This week</p>
      <p className="muted" style={{ fontSize: ".78rem", marginBottom: 10 }}>
        Transits moving across more than one person in your constellation at once — the sky's dynamic between you, not just what one of you is feeling alone.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {visibleRows.map((row) => {
          const affected = toAffectedHits(row);
          const { headline, body } = interpretRelationalTransit({ transitBody: row.transit_body, aspectType: row.aspect_type, affected });
          const color = BODY_COLOR[row.transit_body];
          const isOpen = expanded.has(row.id);
          const uniquePeople = Array.from(new Map(affected.map((a) => [a.personId, a])).values());
          const velaHref = buildVelaHref(row, affected);
          return (
            <div
              key={row.id}
              style={{
                border: `1px solid ${color}33`,
                background: `${color}0f`,
                borderRadius: 14,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span aria-hidden="true" style={{ fontSize: "1.15rem", color, lineHeight: 1, marginTop: 1 }}>
                  {BODY_GLYPH[row.transit_body]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".92rem", lineHeight: 1.4 }}>
                    {headline}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {uniquePeople.map((p) => {
                      const info = peopleById.get(p.personId);
                      return (
                        <span key={p.personId} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <InitialAvatar name={p.personName} size="sm" />
                          <span style={{ fontSize: ".76rem", color: "var(--mist)" }}>{p.personName}</span>
                          <MemorialMark person={info} />
                        </span>
                      );
                    })}
                  </div>
                  {isOpen ? (
                    <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                      {body}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                      style={{ background: "transparent", border: "none", color: "var(--teal)", fontSize: ".76rem", padding: 0, cursor: "pointer" }}
                    >
                      {isOpen ? "Show less" : "Read more"}
                    </button>
                    {velaHref ? (
                      // Dynamic, caller-built href — not a literal route — so
                      // Next's typedRoutes can't narrow it to `Route`. Same
                      // `as never` escape used in require-admin.ts / app-nav.tsx.
                      <Link href={velaHref as never} style={{ color: "var(--gold-soft)", fontSize: ".76rem", textDecoration: "none" }}>
                        Tell me more →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Deep-links into Vela pre-loaded with the two (or first two) affected people and a prefilled question — never auto-sent. */
function buildVelaHref(row: RelationalTransitRow, affected: AffectedProfileHit[]): string | null {
  const uniqueIds = Array.from(new Set(affected.map((a) => a.personId)));
  if (uniqueIds.length === 0) return null;
  const names = Array.from(new Set(affected.map((a) => a.personName)));
  const bodyLabel = row.transit_body[0]!.toUpperCase() + row.transit_body.slice(1);
  const q = `How might this week's ${bodyLabel} ${row.aspect_type} between ${names.join(" and ")} play out for us?`;
  const params = new URLSearchParams({ q });
  if (uniqueIds.length >= 2) {
    params.set("scope", "pair");
    params.set("subject", uniqueIds[0]!);
    params.set("pair", uniqueIds[1]!);
  } else {
    params.set("scope", "person");
    params.set("subject", uniqueIds[0]!);
  }
  return `/app/vela?${params.toString()}`;
}
