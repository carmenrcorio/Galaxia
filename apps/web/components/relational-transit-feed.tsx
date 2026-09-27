"use client";

/**
 * "This Week" — shared transits that activate a real link between two people.
 *
 * Computes the feed from living charts via `buildSharedWeekFeed` (pairwise,
 * synastry-gated, salience-ranked, static copy). Stored `relational_transits`
 * rows are not the card source: older rows grouped incidental co-transits.
 * The upcoming-date lookup still runs those rows through `thisWeekRowsFromStored`
 * so a memorial person cannot supply the empty-state date.
 *
 * Respects `profiles.relational_transit_alerts` ('all' | 'major_only' | 'off').
 */

import {
  buildSharedWeekFeed,
  findNextSharedWeekDate,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  SHARED_WEEK_COMPACT_INTRO,
  SHARED_WEEK_EMPTY,
  SHARED_WEEK_FULL_INTRO,
  SHARED_WEEK_QUIET_REPEAT,
  sharedWeekEmptyMessage,
  toSharedWeekCardModel,
  type NatalChart,
  type Precision,
  type RelationalTransitBody,
  type SharedTransitPersonInput,
  type SharedWeekCardModel,
} from "@galaxia/astro";
import { getMemorialConstellation, peopleForThisWeek, passedPersonIds, sunSignFromChart, thisWeekRowsFromStored, usesMemorialGlyph, DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { InitialAvatar } from "./initial-avatar";
import { MemorialConstellationGlyph } from "./memorial-constellation-glyph";
import { BODY_GLYPH } from "../lib/design";
import { EMPTY_STATE_SETTINGS_HREF, THIS_WEEK_HREF, TODAY_SKY_HREF } from "../lib/nav-links";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { readShownSharedTransits, rememberShownSharedTransits } from "../lib/this-week-seen";

/** Weather-forecast palette. Informative, never alarming. Fast bodies included. */
const BODY_COLOR: Record<string, string> = {
  sun: "#e6c27a",
  mercury: "#c5d4e8",
  venus: "#e7b6c9",
  mars: "#d4786a",
  saturn: "#b9c0c9",
  jupiter: "#e6ae6c",
  uranus: "#bfe9f2",
  neptune: "#8fd6c1",
  pluto: "#7a2b3a",
};

export const THIS_WEEK_HOME_LIMIT = 3;

interface UpcomingTransitRow {
  active_from: string;
  transit_body: RelationalTransitBody;
  affected_profiles: Array<{ profile_id: string }>;
}

interface PersonMemorialInfo {
  display_name: string;
  relation?: string | null;
  passed_at: string | null;
  memorial_constellation: string | null;
  is_self: boolean;
  birth_date?: string | null;
  birth_precision?: Precision | "none" | null;
  sunSign?: string | null;
}

export function formatRelationalTransitQuietDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const RELATIONAL_TRANSIT_FEED_LOADING = "Checking this week's shared transits.";
export const RELATIONAL_TRANSIT_FEED_ERROR =
  "This week's shared transits could not load. Try again.";
export const RELATIONAL_TRANSIT_FEED_RETRY = "Try again";
export const RELATIONAL_TRANSIT_FEED_OFF =
  "This week alerts are off. Turn them on in Settings to see shared transits.";
export const RELATIONAL_TRANSIT_FEED_EMPTY = SHARED_WEEK_EMPTY;
export const RELATIONAL_TRANSIT_FEED_EMPTY_TODAY = "See today's sky for each person";
export const RELATIONAL_TRANSIT_FEED_SEE_ALL = "See the full feed";

/** Honest empty copy. Never fabricates an event; interpolates a real next date only. */
export function relationalTransitFeedEmptyMessage(nextDateISO: string | null): string {
  if (!nextDateISO) return sharedWeekEmptyMessage(null);
  const label = formatRelationalTransitQuietDate(nextDateISO);
  if (!label) return sharedWeekEmptyMessage(null);
  return sharedWeekEmptyMessage(label);
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
  const [cards, setCards] = useState<SharedWeekCardModel[]>([]);
  const [peopleById, setPeopleById] = useState<Map<string, PersonMemorialInfo>>(new Map());
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nextDateISO, setNextDateISO] = useState<string | null>(null);
  const [quietRepeat, setQuietRepeat] = useState(false);
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
      const [{ data: profileRow }, { data: peopleRows }, { data: upcomingRows }] = await Promise.all([
        supabase.from("profiles").select("relational_transit_alerts").eq("id", ownerId).maybeSingle(),
        supabase.from("people").select("id, display_name, relation, passed_at, memorial_constellation, is_self, birth_date, birth_precision").eq("owner_id", ownerId),
        supabase
          .from("relational_transits")
          .select("active_from, transit_body, affected_profiles")
          .eq("owner_id", ownerId)
          .gt("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(8),
      ]);
      const pref = (profileRow?.relational_transit_alerts as "all" | "major_only" | "off" | undefined) ?? "all";
      setPreference(pref);
      const peopleList = (peopleRows ?? []) as Array<{ id: string } & PersonMemorialInfo>;
      const memorialIds = passedPersonIds(peopleList);
      const livingPeople = peopleForThisWeek(peopleList);
      const peopleIds = livingPeople.map((p) => p.id);
      const sunById = new Map<string, string>();
      const chartById = new Map<string, NatalChart>();
      if (peopleIds.length) {
        const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", peopleIds);
        for (const row of chartRows ?? []) {
          const chart = row.data as NatalChart;
          chartById.set(row.person_id as string, chart);
          const sign = sunSignFromChart(chart);
          if (sign) sunById.set(row.person_id as string, sign);
        }
      }
      setPeopleById(new Map(peopleList.map((p) => [p.id, { ...p, sunSign: sunById.get(p.id) ?? null }])));

      const bodies = pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES : undefined;
      const inputs: SharedTransitPersonInput[] = [];
      for (const raw of livingPeople) {
        const chart = chartById.get(raw.id);
        if (!chart) continue;
        inputs.push({
          id: raw.id,
          name: raw.display_name ?? (raw.is_self ? "You" : "Someone"),
          chart,
          birthDate: raw.birth_date,
          birthPrecision: raw.birth_precision,
          relation: raw.relation,
          isSelf: raw.is_self,
        });
      }
      const feed = pref === "off" || inputs.length < 2
        ? null
        : buildSharedWeekFeed(inputs, nowISO, {
            bodies,
            previouslyShown: readShownSharedTransits(ownerId),
            limit: THIS_WEEK_HOME_LIMIT,
          });
      const weekly = feed?.weekly ?? [];
      const repeating = weekly.length === 0 && (feed?.relational.length ?? 0) > 0;
      if (pref !== "off") rememberShownSharedTransits(ownerId, weekly, nowISO.slice(0, 10));
      setCards(weekly.map((event) => toSharedWeekCardModel(event, nowISO)));
      setQuietRepeat(repeating);

      const upcoming = thisWeekRowsFromStored(
        (upcomingRows ?? []) as UpcomingTransitRow[],
        memorialIds
      ).filter((row) => pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true);
      let nextISO: string | null = weekly.length > 0 || repeating ? null : upcoming[0]?.active_from ?? null;
      if (!nextISO && weekly.length === 0 && !repeating && pref !== "off" && inputs.length >= 2) {
        nextISO = findNextSharedWeekDate(inputs, nowISO, {
          horizonDays: 28,
          stepDays: 7,
          bodies,
        });
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

  const compact = variant === "compact";
  const shownRows = cards;

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
  if (shownRows.length === 0) {
    return <QuietFeedStatus message={quietRepeat ? SHARED_WEEK_QUIET_REPEAT : relationalTransitFeedEmptyMessage(nextDateISO)} todayLink />;
  }

  return (
    <section
      className="glass-card fade-in fade-in-delay-1"
      data-this-week-card={compact ? "compact" : "full"}
      style={{ padding: compact ? "14px 16px" : undefined }}
    >
      <p className="eyebrow">This week</p>
            <p className="muted" style={{ fontSize: compact ? ".74rem" : ".78rem", marginBottom: compact ? 8 : 10, lineHeight: 1.45 }}>
        {compact ? SHARED_WEEK_COMPACT_INTRO : SHARED_WEEK_FULL_INTRO}
      </p>
      <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
        {shownRows.map((row) => {
          const names = row.people.map((person) => person.name).join(row.people.length === 2 ? " and " : ", ");
          const color = BODY_COLOR[row.transitBody] ?? "#e6ae6c";
          const isOpen = expanded.has(row.id);
          const velaHref = buildVelaHref(row);
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
                    {BODY_GLYPH[row.transitBody]}
                  </span>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: compact ? ".88rem" : ".92rem", lineHeight: 1.3 }}>
                    {names}
                  </p>
                  <p style={{ margin: "2px 0 0", color: "var(--mist)", fontSize: compact ? ".78rem" : ".84rem", lineHeight: 1.4 }}>
                    {row.lead}
                  </p>
                  {!compact ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                      {row.people.map((p) => {
                        const info = peopleById.get(p.id);
                        return (
                          <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <InitialAvatar name={p.name} size="sm" personId={p.id} sunSign={info?.sunSign} />
                            <span style={{ fontSize: ".76rem", color: "var(--mist)" }}>{p.name}</span>
                            <MemorialMark person={info} />
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                  {!compact && isOpen ? (
                    <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                      {row.body}
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
      {compact && shownRows.length > 0 ? (
        <p style={{ margin: "10px 0 0" }}>
          <Link href={THIS_WEEK_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".76rem", textDecoration: "none" }}>
            {RELATIONAL_TRANSIT_FEED_SEE_ALL}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** Deep-links into Vela pre-loaded with the two people and a prefilled question. Never auto-sent. */
function buildVelaHref(row: SharedWeekCardModel): string | null {
  const uniqueIds = row.people.map((person) => person.id);
  if (uniqueIds.length === 0) return null;
  const names = row.people.map((person) => person.name);
  const bodyLabel = row.transitBody[0]!.toUpperCase() + row.transitBody.slice(1);
  const q = `How might this week's ${bodyLabel} ${row.aspect} between ${names.join(" and ")} play out for us?`;
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
