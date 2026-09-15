"use client";

/**
 * "This Week" — Generations Feature 3: Generational Transit Alerts.
 *
 * Reads the `relational_transits` rows the daily cron job
 * (apps/web/app/api/cron/relational-transit-scan) already computed and
 * upserted with @galaxia/astro `scanRelationalTransits` — this component is
 * pure read + render, no transit math here except the empty-state next
 * date, which only runs when the live feed is empty and never fabricates
 * a card. Headline/body copy comes from @galaxia/astro
 * `interpretRelationalTransit` (static templates, no AI call) fed the
 * row's own stored `affected_profiles`, never re-derived.
 *
 * Respects `profiles.relational_transit_alerts` ('all' | 'major_only' |
 * 'off') — the compute job always runs regardless, so flipping the
 * preference back to 'all' immediately has history to show.
 */

import {
  findNextRelationalTransitDate,
  interpretRelationalTransit,
  interpretRelationalTransitDynamicLead,
  interpretRelationalTransitPlanetNote,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  namedPeoplePhrase,
  type AffectedProfileHit,
  type AspectType,
  type NatalChart,
  type Precision,
  type RelationalTransitBody,
  type RelationalTransitPersonInput,
} from "@galaxia/astro";
import { getMemorialConstellation, sunSignFromChart, usesMemorialGlyph, DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "./initial-avatar";
import { MemorialConstellationGlyph } from "./memorial-constellation-glyph";
import { BODY_GLYPH } from "../lib/design";
import { EMPTY_STATE_SETTINGS_HREF, THIS_WEEK_HREF, TODAY_SKY_HREF } from "../lib/nav-links";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

/** Weather-forecast palette per the spec — informative, never alarming. */
const BODY_COLOR: Record<RelationalTransitBody, string> = {
  saturn: "#b9c0c9",
  jupiter: "#e6ae6c",
  uranus: "#bfe9f2",
  neptune: "#8fd6c1",
  pluto: "#7a2b3a",
};

export const THIS_WEEK_HOME_LIMIT = 3;

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
  birth_date?: string | null;
  birth_precision?: Precision | "none" | null;
  sunSign?: string | null;
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

export function formatRelationalTransitQuietDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// FOUNDER-REVIEW: loading line while the feed is fetching.
export const RELATIONAL_TRANSIT_FEED_LOADING = "Checking this week's shared transits.";
// FOUNDER-REVIEW: the feed fetch failed or timed out.
export const RELATIONAL_TRANSIT_FEED_ERROR =
  "This week's shared transits could not load. Try again.";
// FOUNDER-REVIEW: retry after a feed load failure.
export const RELATIONAL_TRANSIT_FEED_RETRY = "Try again";
// FOUNDER-REVIEW: empty because the owner turned alerts off.
export const RELATIONAL_TRANSIT_FEED_OFF =
  "This week alerts are off. Turn them on in Settings to see shared transits.";
// FOUNDER-REVIEW: empty because no active overlapping transits, and no next date is computable.
export const RELATIONAL_TRANSIT_FEED_EMPTY =
  "Nothing is currently pulling on two people in your circle at once. The sky is quiet this week.";
// FOUNDER-REVIEW: next action when the week is quiet.
export const RELATIONAL_TRANSIT_FEED_EMPTY_TODAY = "See today's sky for each person";
// FOUNDER-REVIEW: link from the compact home card to the full feed.
export const RELATIONAL_TRANSIT_FEED_SEE_ALL = "See the full feed";

/** Honest empty copy. Never fabricates an event; interpolates a real next date only. */
export function relationalTransitFeedEmptyMessage(nextDateISO: string | null): string {
  if (!nextDateISO) return RELATIONAL_TRANSIT_FEED_EMPTY;
  const label = formatRelationalTransitQuietDate(nextDateISO);
  if (!label) return RELATIONAL_TRANSIT_FEED_EMPTY;
  // FOUNDER-REVIEW: empty with a real next window from stored rows or scanned geometry.
  return `Nothing is currently pulling on two people in your circle at once. The next shared pull begins around ${label}.`;
}

function QuietFeedStatus({
  message,
  off,
  todayLink,
  error,
  onRetry,
}: {
  message: string;
  off?: boolean;
  todayLink?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <section className="glass-card fade-in fade-in-delay-1 async-frame" data-this-week-card={error ? "error" : "empty"} style={{ padding: "14px 16px" }}>
      <p className="eyebrow">This week</p>
      <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.55, margin: 0 }}>
        {off ? (
          <>
            This week alerts are off. Turn them on in{" "}
            <Link href={EMPTY_STATE_SETTINGS_HREF as never} style={{ color: "var(--gold-soft)" }}>
              Settings
            </Link>{" "}
            to see shared transits.
          </>
        ) : (
          message
        )}
      </p>
      {todayLink && !off ? (
        <p style={{ margin: "8px 0 0" }}>
          <Link href={TODAY_SKY_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".76rem", textDecoration: "none" }}>
            {RELATIONAL_TRANSIT_FEED_EMPTY_TODAY}
          </Link>
        </p>
      ) : null}
      {error && onRetry ? (
        <p style={{ margin: "8px 0 0" }}>
          <button type="button" className="btn-primary" onClick={onRetry}>
            {/* FOUNDER-REVIEW: RELATIONAL_TRANSIT_FEED_RETRY */}
            {RELATIONAL_TRANSIT_FEED_RETRY}
          </button>
        </p>
      ) : null}
    </section>
  );
}

function MemorialMark({ person }: { person: PersonMemorialInfo | undefined }) {
  if (!person?.passed_at) return null;
  if (usesMemorialGlyph(person)) {
    const pattern = getMemorialConstellation(person.memorial_constellation);
    // FOUNDER-REVIEW: rewritten (no U+2014).
    if (pattern) return <MemorialConstellationGlyph pattern={pattern} size={14} strokeWidth={1} starRadius={1} title={`${person.display_name}, remembered`} />;
  }
  return <span aria-label={`${person.display_name}, remembered`} style={{ color: "var(--gold-soft)", fontSize: ".7rem" }}>✦</span>;
}

export function RelationalTransitFeed({
  ownerId,
  variant = "compact",
}: {
  ownerId: string;
  variant?: "compact" | "full";
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RelationalTransitRow[]>([]);
  const [peopleById, setPeopleById] = useState<Map<string, PersonMemorialInfo>>(new Map());
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nextDateISO, setNextDateISO] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        await withTimeout((async () => {
      const nowISO = new Date().toISOString();
      const [{ data: profileRow }, { data: transitRows }, { data: peopleRows }, { data: upcomingRows }] = await Promise.all([
        supabase.from("profiles").select("relational_transit_alerts").eq("id", ownerId).maybeSingle(),
        supabase
          .from("relational_transits")
          .select("id, transit_body, transit_sign, aspect_type, affected_profiles, active_from, active_to")
          .eq("owner_id", ownerId)
          .gte("active_to", nowISO)
          .lte("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(20),
        supabase.from("people").select("id, display_name, passed_at, memorial_constellation, is_self, birth_date, birth_precision").eq("owner_id", ownerId),
        supabase
          .from("relational_transits")
          .select("active_from, transit_body")
          .eq("owner_id", ownerId)
          .gt("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(8),
      ]);
      const pref = (profileRow?.relational_transit_alerts as "all" | "major_only" | "off" | undefined) ?? "all";
      setPreference(pref);
      setRows((transitRows ?? []) as RelationalTransitRow[]);
      const peopleIds = (peopleRows ?? []).map((p) => p.id as string);
      const sunById = new Map<string, string>();
      if (peopleIds.length) {
        const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", peopleIds);
        for (const row of chartRows ?? []) {
          const sign = sunSignFromChart(row.data as { placements?: Array<{ body: string; sign: string; confident?: boolean }> });
          if (sign) sunById.set(row.person_id as string, sign);
        }
      }
      setPeopleById(new Map((peopleRows ?? []).map((p) => [p.id as string, { ...(p as PersonMemorialInfo), sunSign: sunById.get(p.id as string) ?? null }])));

      const upcoming = ((upcomingRows ?? []) as Array<{ active_from: string; transit_body: RelationalTransitBody }>)
        .filter((row) => pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true);
      let nextISO: string | null = upcoming[0]?.active_from ?? null;

      const activeCount = ((transitRows ?? []) as RelationalTransitRow[]).filter((row) =>
        pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true
      ).length;

      if (!nextISO && activeCount === 0 && pref !== "off") {
        const ids = ((peopleRows ?? []) as Array<{ id: string }>).map((p) => p.id);
        if (ids.length >= 2) {
          const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
          const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));
          const inputs: RelationalTransitPersonInput[] = [];
          for (const raw of (peopleRows ?? []) as Array<{
            id: string;
            display_name: string;
            is_self: boolean;
            birth_date: string | null;
            birth_precision: Precision | "none" | null;
          }>) {
            const chart = chartById.get(raw.id);
            if (!chart) continue;
            inputs.push({
              id: raw.id,
              name: raw.display_name ?? (raw.is_self ? "You" : "Someone"),
              chart,
              birthDate: raw.birth_date,
              birthPrecision: raw.birth_precision,
            });
          }
          if (inputs.length >= 2) {
            nextISO = findNextRelationalTransitDate(inputs, nowISO, {
              horizonDays: 56,
              stepDays: 7,
              bodies: pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES : undefined,
            });
          }
        }
      }

      setNextDateISO(nextISO);
        })(), DEFAULT_FETCH_TIMEOUT_MS);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, ownerId, reload]);

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

  const compact = variant === "compact";
  const shownRows = compact ? visibleRows.slice(0, THIS_WEEK_HOME_LIMIT) : visibleRows;
  const overflowCount = compact ? Math.max(0, visibleRows.length - shownRows.length) : 0;

  if (loading) return <QuietFeedStatus message={RELATIONAL_TRANSIT_FEED_LOADING} />;
  if (error) {
    return (
      <QuietFeedStatus
        message={RELATIONAL_TRANSIT_FEED_ERROR}
        error
        onRetry={() => setReload((n) => n + 1)}
      />
    );
  }
  if (preference === "off") return <QuietFeedStatus message={RELATIONAL_TRANSIT_FEED_OFF} off />;
  if (visibleRows.length === 0) {
    return <QuietFeedStatus message={relationalTransitFeedEmptyMessage(nextDateISO)} todayLink />;
  }

  return (
    <section
      className="glass-card fade-in fade-in-delay-1"
      data-this-week-card={compact ? "compact" : "full"}
      style={{ padding: compact ? "14px 16px" : undefined }}
    >
      <p className="eyebrow">This week</p>
      {/* FOUNDER-REVIEW: compact intro. Full intro is the existing feed dek. */}
      <p className="muted" style={{ fontSize: compact ? ".74rem" : ".78rem", marginBottom: compact ? 8 : 10, lineHeight: 1.45 }}>
        {compact
          ? "What is pulling on two people in your circle at once."
          : "Transits moving across more than one person in your constellation at once: the sky's dynamic between you, not just what one of you is feeling alone."}
      </p>
      <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
        {shownRows.map((row) => {
          const affected = toAffectedHits(row);
          const { body } = interpretRelationalTransit({ transitBody: row.transit_body, aspectType: row.aspect_type, affected });
          const names = namedPeoplePhrase(affected);
          const dynamicLead = interpretRelationalTransitDynamicLead({ aspectType: row.aspect_type });
          const planetNote = interpretRelationalTransitPlanetNote({ transitBody: row.transit_body, aspectType: row.aspect_type, affected });
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
                borderRadius: compact ? 12 : 14,
                padding: compact ? "8px 10px" : "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                {!compact ? (
                  <span aria-hidden="true" style={{ fontSize: "1.15rem", color, lineHeight: 1, marginTop: 1 }}>
                    {BODY_GLYPH[row.transit_body]}
                  </span>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: compact ? ".88rem" : ".92rem", lineHeight: 1.3 }}>
                    {names}
                  </p>
                  <p style={{ margin: "2px 0 0", color: "var(--mist)", fontSize: compact ? ".78rem" : ".84rem", lineHeight: 1.4 }}>
                    {dynamicLead}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: ".7rem", color: "var(--gold-soft)", letterSpacing: ".01em" }}>
                    {planetNote}
                  </p>
                  {!compact ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                      {uniquePeople.map((p) => {
                        const info = peopleById.get(p.personId);
                        return (
                          <span key={p.personId} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <InitialAvatar name={p.personName} size="sm" personId={p.personId} sunSign={info?.sunSign} />
                            <span style={{ fontSize: ".76rem", color: "var(--mist)" }}>{p.personName}</span>
                            <MemorialMark person={info} />
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                  {!compact && isOpen ? (
                    <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                      {body}
                    </p>
                  ) : null}
                  {!compact ? (
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
                        // Dynamic, caller-built href (not a literal route) so
                        // Next's typedRoutes can't narrow it to `Route`. Same
                        // `as never` escape used in require-admin.ts / app-nav.tsx.
                        <Link href={velaHref as never} style={{ color: "var(--gold-soft)", fontSize: ".76rem", textDecoration: "none" }}>
                          Tell me more →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {compact && (overflowCount > 0 || visibleRows.length > 0) ? (
        <p style={{ margin: "10px 0 0" }}>
          <Link href={THIS_WEEK_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".76rem", textDecoration: "none" }}>
            {overflowCount > 0 ? `${RELATIONAL_TRANSIT_FEED_SEE_ALL} (${visibleRows.length})` : RELATIONAL_TRANSIT_FEED_SEE_ALL}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** Deep-links into Vela pre-loaded with the two (or first two) affected people and a prefilled question: never auto-sent. */
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
