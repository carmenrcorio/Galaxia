"use client";

/**
 * /app/person/[id]
 *
 * Big Three chips ported from design/reference/galaxia-landing-v2.html .chip + .chips
 * Placement list from landing .pl (glyph, name, descriptor)
 * Glyph maps from design/reference/galaxia.jsx SIGN / PLANET / ASPGLY
 * Aspects sorted by orb, tight (<2°) gold border from spec
 * Degree displayed as 16°48′ (not decimal)
 */

import { computeSynastry, type NatalChart, type Placement } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditPersonPanel } from "../../../../components/edit-person-panel";
import { InitialAvatar } from "../../../../components/initial-avatar";
import { Spinner } from "../../../../components/spinner";
import { ASPECT_GLYPH, ASPECT_LINE, BODY_GLYPH, SIGN_GLYPH, SIGN_VIBE, signElement } from "../../../../lib/design";
import { geocodeCity } from "../../../../lib/geocode";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string; display_name: string; relation: string;
  birth_precision: "exact" | "date" | "year"; is_minor: boolean;
  birth_date?: string | null; birth_time?: string | null;
  birth_place?: string | null; birth_lat?: number | null; birth_lng?: number | null;
}
interface NoteRow { id: string; body: string; created_at: string; }

/* ─── ChartWheel ──────────────────────────────────────────────────────────────
 * Ported from design/reference/galaxia.jsx function Wheel({ chart })
 *
 * Changes from prototype:
 * - Real ecliptic longitudes (placements[].lon) instead of house-midpoint guesses
 * - structural ring strokes use rgba(230,174,108,.13) gold hairline (token --line)
 * - Planet glyphs coloured by element (fire/earth/air/water)
 * - Sign glyphs in cream (as specified)
 * - Aspect lines drawn across the inner disc (from real aspect data)
 * - No-cusp fallback: renders zodiac + planets without house ring, with a note
 * - Responsive via SVG viewBox + maxWidth
 * ─────────────────────────────────────────────────────────────────────────── */

const SIGNS_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const EL_SOLID: Record<string, string> = { fire:"#E0825C", earth:"#cdbd7a", air:"#B79AD8", water:"#6FB1B8" };

/* Wheel dimensions — same as prototype */
const S = 300, CX = S/2, CY = S/2;
const R_OUT    = 140;  // outer ring
const R_SIGN_IN = 112; // inner edge of sign ring
const R_SIGN_GL = 126; // sign glyph radius (mid of sign band)
const R_HOUSE_GL = 99; // house number radius
const R_INNER  = 62;   // inner disc edge (aspect lines end here)
const R_PLANET = 84;   // planet circle radius
const LINE_COLOR = "rgba(230,174,108,.13)"; // token --line

/** Polar → SVG cartesian. Same as prototype pt(r,deg). */
function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

/**
 * Convert ecliptic longitude to SVG angle.
 * With ASC: ASC ecliptic lon anchors to SVG 180° (9-o'clock, standard chart left).
 * Without ASC (no cusps): Aries 0° at SVG 270° (top), a common simplified orientation.
 */
function svgAngle(lon: number, ascLon: number | null): number {
  const norm = (v: number) => ((v % 360) + 360) % 360;
  if (ascLon !== null) {
    return norm(180 - lon + ascLon);
  }
  // no ASC: Aries at top (270°), ascending counterclockwise
  return norm(270 - lon);
}

function ChartWheel({ chart }: { chart: NatalChart }) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number | null = hasHouses ? (chart.cusps![0] ?? null) : null;

  // sign ring — 12 x 30° sectors; sectors are fixed zodiac bands
  const signSectors = SIGNS_ORDER.map((sign, i) => {
    const lon0 = i * 30;           // ecliptic start of sign
    const lon1 = lon0 + 30;        // ecliptic end
    const a0   = svgAngle(lon0, ascLon);
    const a1   = svgAngle(lon1, ascLon);
    const [ox0, oy0] = pt(R_OUT,     a0);
    const [ox1, oy1] = pt(R_OUT,     a1);
    const [ix1, iy1] = pt(R_SIGN_IN, a1);
    const [ix0, iy0] = pt(R_SIGN_IN, a0);
    const [gx,  gy ] = pt(R_SIGN_GL, (a0 + a1) / 2);
    const el = signElement(sign);
    const elCol = EL_SOLID[el] ?? "#b9aede";
    // large-arc-flag: 1 if sweep > 180°, else 0. Each sign = 30° so flag = 0.
    const laf = 0;
    // sweep goes from a0 to a1; since degrees increase counterclockwise in our system,
    // we need to figure out the correct sweep direction.
    // In pt(), decreasing angle in degrees = clockwise. Signs span 30° in SVG angle space.
    // We draw the arc from a0 to a1 where a1 = a0 - 30 (since svgAngle decreases as lon increases).
    return { sign, el, elCol, ox0, oy0, ox1, oy1, ix0, iy0, ix1, iy1, gx, gy, a0, lon0 };
  });

  // house cusps (if available)
  const houseCusps = hasHouses
    ? Array.from({ length: 12 }, (_, i) => {
        const lon  = chart.cusps![i]!;
        const a    = svgAngle(lon, ascLon);
        const [x0, y0] = pt(R_SIGN_IN, a);
        const [x1, y1] = pt(R_INNER,   a);
        const [hx, hy] = pt(R_HOUSE_GL, svgAngle(lon + 15, ascLon));
        return { i, a, x0, y0, x1, y1, hx, hy };
      })
    : [];

  // planets grouped by ecliptic position (spread within a ±8° window if crowded)
  const sortedPlanets = [...chart.placements].sort((a, b) => a.lon - b.lon);
  // Simple crowding: offset overlapping planets radially
  const planetPositions = sortedPlanets.map((p, idx) => {
    const a   = svgAngle(p.lon, ascLon);
    // alternate radial offset for planets within 12° of each other
    const near = sortedPlanets.filter(q => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr  = near.length > 0 && idx % 2 === 1 ? R_PLANET - 15 : R_PLANET;
    const [px, py] = pt(rr, a);
    const el  = signElement(p.sign);
    const col = EL_SOLID[el] ?? "#b9aede";
    const gly = BODY_GLYPH[p.body] ?? p.body[0].toUpperCase();
    return { p, px, py, col, gly, a };
  });

  // aspect lines — drawn inside the inner disc between planet positions (on R_INNER ring)
  const aspectLines = chart.precision === "exact" || chart.precision === "date"
    ? computeSynastry(chart, chart).aspects
        .filter(a => a.from !== a.to)
        .filter((a, idx, arr) => arr.findIndex(b => [b.from, b.to].sort().join() === [a.from, a.to].sort().join() && b.type === a.type) === idx)
        .filter(a => a.orb < 5)
        .slice(0, 12)
        .map(a => {
          const pa = chart.placements.find(p => p.body === a.from);
          const pb = chart.placements.find(p => p.body === a.to);
          if (!pa || !pb) return null;
          const [x0, y0] = pt(R_INNER, svgAngle(pa.lon, ascLon));
          const [x1, y1] = pt(R_INNER, svgAngle(pb.lon, ascLon));
          const col = a.harmony >= 1.2 ? "rgba(111,177,184," : a.harmony < 0 ? "rgba(218,140,140," : "rgba(183,154,216,";
          const alpha = Math.max(0.08, 0.22 - a.orb * 0.03);
          return { x0, y0, x1, y1, col: col + alpha + ")" };
        }).filter(Boolean)
    : [];

  return (
    <div style={{ width: "100%", maxWidth: 290, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block" }}>
        {/* Structural rings */}
        <circle cx={CX} cy={CY} r={R_OUT}     fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={LINE_COLOR} strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_INNER}   fill="rgba(10,7,23,.6)"  stroke={LINE_COLOR} strokeWidth="1" />

        {/* Aspect lines inside inner disc */}
        {aspectLines.map((al, i) =>
          al ? <line key={i} x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1} stroke={al.col} strokeWidth="1" /> : null
        )}

        {/* Sign sectors — 12 arcs with element fill + glyph */}
        {signSectors.map(({ sign, elCol, ox0, oy0, ox1, oy1, ix0, iy0, ix1, iy1, gx, gy, a0, lon0 }) => {
          // Build arc path: outer arc from a0→a1, inner arc back
          // sign is 30° wide, SVG angle decreases by ~30° as lon increases 30°
          const a1 = svgAngle(lon0 + 30, ascLon);
          // determine arc sweep direction. Signs progress CCW on real ecliptic.
          // In SVG, CCW = decreasing angle in pt() convention.
          // We always draw 0 large-arc, sweep-flag depends on direction.
          // Since each sign = exactly 30° of SVG space, large-arc=0 always.
          const [qx0,qy0] = pt(R_OUT,     a0);
          const [qx1,qy1] = pt(R_OUT,     a1);
          const [qi1,qi1y]= pt(R_SIGN_IN, a1);
          const [qi0,qi0y]= pt(R_SIGN_IN, a0);
          return (
            <g key={sign}>
              <path
                d={`M${qx0},${qy0} A${R_OUT},${R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${R_SIGN_IN},${R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`}
                fill={elCol} opacity="0.18"
              />
              <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1" />
              <text x={gx} y={gy} fill="#F4ECDB" fontSize="13" textAnchor="middle" dominantBaseline="central">
                {SIGN_GLYPH[sign]}
              </text>
            </g>
          );
        })}

        {/* ASC / MC labels */}
        {hasHouses ? (
          <>
            <text x={pt(R_OUT+10, 180)[0]} y={pt(R_OUT+10, 180)[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">ASC</text>
            {chart.mc ? (
              <text x={pt(R_OUT+10, svgAngle(chart.cusps![9]!, ascLon))[0]} y={pt(R_OUT+10, svgAngle(chart.cusps![9]!, ascLon))[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">MC</text>
            ) : null}
          </>
        ) : null}

        {/* House cusps — thin spoke lines + house numbers */}
        {houseCusps.map(({ i, x0, y0, x1, y1, hx, hy }) => (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LINE_COLOR} strokeWidth="0.8" />
            <text x={hx} y={hy} fill="#8076a6" fontSize="8" textAnchor="middle" dominantBaseline="central"
              style={{ fontFamily: "var(--serif)" }}>{i + 1}</text>
          </g>
        ))}

        {/* Planets — circles with glyph, coloured by element */}
        {planetPositions.map(({ p, px, py, col, gly }) => (
          <g key={p.body}>
            <circle cx={px} cy={py} r="10" fill="rgba(10,7,23,.85)" stroke="rgba(230,174,108,.35)" strokeWidth="0.8" />
            <text x={px} y={py} fill={col} fontSize="11" textAnchor="middle" dominantBaseline="central">{gly}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* convert decimal degrees to °mm′ (same as spec) */
function toDMS(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

/* element gradient background for glyph square — from galaxia.jsx EL_GRAD */
const EL_GRAD: Record<string, string> = {
  fire:  "linear-gradient(135deg,#F0A368,#DC6E5F)",
  earth: "linear-gradient(135deg,#D8B873,#9DAE6E)",
  air:   "linear-gradient(135deg,#D2B0E6,#9FA8E6)",
  water: "linear-gradient(135deg,#79BEC8,#7193CE)",
};

export default function PersonProfilePage() {
  const params   = useParams<{ id: string }>();
  const personId = params.id;
  const router   = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId]         = useState<string | null>(null);
  const [person, setPerson]         = useState<PersonRow | null>(null);
  const [chart, setChart]           = useState<NatalChart | null>(null);
  const [notes, setNotes]           = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft]   = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [status, setStatus]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadProfile(user.id);
    });
  }, [personId, supabase]);

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, p) => { acc[signElement(p.sign)] += 1; return acc; },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  /* natal aspects — sorted by orb, deduped */
  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter(a => a.from !== a.to)
      .filter(a => {
        const key = [a.from, a.to].sort().join(":") + ":" + a.type;
        if (dedupe.has(key)) return false;
        dedupe.add(key); return true;
      })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
  }, [chart]);

  async function loadProfile(uid: string) {
    setLoading(true);
    const actualId = personId === "self"
      ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()).data?.id
      : personId;
    if (!actualId) { setStatus("No self profile yet. Add yourself in onboarding first."); setLoading(false); return; }

    const [{ data: pData, error: pErr }, { data: cData, error: cErr }, { data: nData }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min").eq("id", actualId).single(),
      supabase.from("charts").select("data").eq("person_id", actualId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualId).order("created_at", { ascending: false }).limit(20)
    ]);
    if (pErr || !pData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    if (cErr || !cData) { setStatus(cErr?.message  ?? "No chart yet — save their birth data again."); setLoading(false); return; }

    const personRow = pData as PersonRow & { tz_offset_min?: number | null };

    // ── Backfill: geocode existing people that have a city but no coords ──
    let chartData = cData.data as NatalChart;
    const needsBackfill =
      personRow.birth_precision !== "year" &&
      personRow.birth_place?.trim() &&
      !personRow.birth_lat &&
      !personRow.birth_lng;

    if (needsBackfill) {
      const birthDate = personRow.birth_date ? new Date(`${personRow.birth_date}T12:00:00Z`) : new Date();
      const geo = await geocodeCity(personRow.birth_place!, birthDate);
      if (geo) {
        // Persist coords so we don't geocode every visit
        await supabase.from("people").update({
          birth_lat: geo.lat, birth_lng: geo.lng, tz_offset_min: geo.tzOffset
        }).eq("id", actualId);

        // Recompute the chart with coords + correct UTC time
        const { computeNatalChart } = await import("@galaxia/astro");
        const tzOffset = geo.tzOffset;
        let dateUTC: string;
        if (personRow.birth_time && personRow.birth_date) {
          const time = personRow.birth_time.slice(0, 5); // HH:MM
          const [yr, mo, dy] = personRow.birth_date.slice(0, 10).split("-").map(Number);
          const [hr, mn] = time.split(":").map(Number);
          const localMs = Date.UTC(yr, mo - 1, dy, hr, mn, 0);
          dateUTC = new Date(localMs - tzOffset * 60_000).toISOString();
        } else {
          dateUTC = personRow.birth_date
            ? `${personRow.birth_date.slice(0, 10)}T12:00:00.000Z`
            : new Date().toISOString();
        }
        const recomputed = computeNatalChart({
          dateUTC,
          precision: personRow.birth_precision,
          lat: geo.lat,
          lng: geo.lng,
          tzOffsetMin: geo.tzOffset,
          houseSystem: "placidus" as const
        });
        await supabase.from("charts").upsert({
          person_id: actualId, house_system: "placidus", data: recomputed, engine_version: 1
        });
        chartData = recomputed;
      }
    }

    setPerson(personRow as PersonRow);
    setChart(chartData);
    setNotes((nData ?? []) as NoteRow[]);
    setLoading(false);
  }

  async function saveNote() {
    if (!userId || !person?.id || !noteDraft.trim()) return;
    setNoteSaving(true);
    const { error } = await supabase.from("notes").insert({ owner_id: userId, about_person: person.id, body: noteDraft.trim() });
    setNoteSaving(false);
    if (error) { setStatus(error.message); return; }
    setNoteDraft(""); loadProfile(userId);
  }

  /* ── Loading skeleton ── */
  if (loading) return (
    <main className="app-content">
      <div className="skeleton skeleton-title" />
      <div className="glass-card"><div className="skeleton skeleton-text" style={{ width: "40%" }} /><div className="skeleton skeleton-text" style={{ width: "65%" }} /><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
      <div className="glass-card">{[80,100,70,90,65,75].map((w,i) => <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />)}</div>
    </main>
  );

  if (!person || !chart) return (
    <main className="app-content">
      <p className="muted">{status ?? "Profile not found."}</p>
      <Link href="/welcome" className="btn-primary">Add birth data in onboarding</Link>
    </main>
  );

  const sun    = chart.placements.find(p => p.body === "sun");
  const moon   = chart.placements.find(p => p.body === "moon");

  return (
    <main className="app-content">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }} className="fade-in">
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation} · {person.birth_precision} precision</p>
          <h1 className="page-title">{person.display_name}</h1>
          {sun && moon ? (
            <p className="muted" style={{ fontSize: ".88rem", margin: 0 }}>
              {SIGN_GLYPH[sun.sign]} {sun.sign} Sun
              {moon.sign ? ` · ${SIGN_GLYPH[moon.sign]} ${moon.sign} Moon` : ""}
              {chart.asc ? ` · ${SIGN_GLYPH[chart.asc]} ${chart.asc} Rising` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/app/compare" className="pill-link" style={{ fontSize: ".82rem" }}>Compare</Link>
        <Link href="/app/vela"    className="pill-link" style={{ fontSize: ".82rem" }}>Ask Vela</Link>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => router.push("/app")} />
      </div>

      {/* ── Chart Wheel — SVG, above Big Three chips ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          {chart.precision === "exact" && chart.asc ? "Natal wheel" : "Zodiac wheel"}
        </p>
        <ChartWheel chart={chart} />
        {chart.precision !== "exact" || !chart.asc ? (
          <p className="muted" style={{ fontSize: ".72rem", marginTop: 10, textAlign: "center", maxWidth: "48ch", margin: "10px auto 0" }}>
            Houses and rising sign need an exact birth time and location. Planets are placed at their true ecliptic degrees. Add a birth city to this profile to unlock the full wheel.
          </p>
        ) : null}
      </section>

      {/* ── Big Three — 3-up chip row (from landing .chips + .chip) ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 12 }}>The big three</p>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Sun",    sign: sun?.sign,   key: "sun"    },
            { label: "Moon",   sign: moon?.sign,  key: "moon"   },
            { label: "Rising", sign: chart.asc,   key: "rising" }
          ].map(({ label, sign, key }) => {
            const el = sign ? signElement(sign) : null;
            return (
              <div key={key} className="sign-chip">
                {/* glyph */}
                <span className="sign-chip__glyph" style={{ color: el ? `var(--${el})` : "var(--mist2)" }}>
                  {sign ? (SIGN_GLYPH[sign] ?? "?") : "—"}
                </span>
                {/* label-caps */}
                <span className="sign-chip__label">{label}</span>
                {/* value */}
                <span className="sign-chip__value">{sign ?? (label === "Rising" ? "Exact time needed" : "—")}</span>
                {/* one-line vibe */}
                {sign ? <span className="sign-chip__vibe">{SIGN_VIBE[sign]}</span> : null}
              </div>
            );
          })}
        </div>
        {!chart.asc && person.birth_precision === "exact" ? (
          <p className="muted" style={{ fontSize: ".75rem", marginTop: 10 }}>Rising sign needs a birth city — edit this profile to add one.</p>
        ) : null}
      </section>

      {/* ── Placement list (from landing .pl — glyph / name / descriptor) ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Placements</p>
        {chart.placements.map(p => {
          const el   = signElement(p.sign);
          const gly  = BODY_GLYPH[p.body] ?? p.body[0].toUpperCase();
          const desc = `${p.body.charAt(0).toUpperCase() + p.body.slice(1)} in ${p.sign}`;
          const vibe = SIGN_VIBE[p.sign] ?? "";
          return (
            <div key={p.body} className="pl-row">
              {/* glyph square with element gradient background — galaxia.jsx .kd-pgly */}
              <div className="glyph-sq" style={{ background: EL_GRAD[el] ?? "var(--ink2)", color: "#1a1206" }}>
                {gly}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pl-body">
                  {desc}
                  {p.house ? <span style={{ fontSize: ".72rem", color: "var(--gold-soft)", background: "rgba(230,174,108,.12)", borderRadius: 6, padding: "2px 7px", marginLeft: 6 }}>H{p.house}</span> : null}
                </div>
                <div className="pl-desc">{toDMS(p.degree)} · {vibe}</div>
              </div>
            </div>
          );
        })}
        {/* element balance */}
        {elementBalance ? (
          <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)", flexWrap: "wrap" }}>
            {(["fire","earth","air","water"] as const).map(el => (
              <span key={el} style={{ fontSize: ".75rem", color: `var(--${el})` }}>
                {el[0].toUpperCase() + el.slice(1)} {elementBalance[el]}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Aspects — sorted by orb, tight gold accent ── */}
      {natalAspects.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow" style={{ marginBottom: 4 }}>Key aspects</p>
          <p className="muted" style={{ fontSize: ".72rem", marginBottom: 12 }}>Gold border = tight (&lt; 2°) · sorted tightest first</p>
          {natalAspects.map((a, idx) => {
            const tight = a.orb < 2;
            const mid   = a.orb < 4;
            const cls   = tight ? "aspect-tight" : mid ? "aspect-mid" : "aspect-loose";
            const aspGlyph = ASPECT_GLYPH[a.type] ?? a.type[0];
            return (
              <div key={`${a.from}-${a.to}-${idx}`} className={cls} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                {/* glyphs — from galaxia.jsx .kd-aspg */}
                <span style={{ fontSize: ".9rem", color: "var(--mist2)", width: 52, textAlign: "center", letterSpacing: 2, flexShrink: 0 }}>
                  {BODY_GLYPH[a.from] ?? a.from[0]} {aspGlyph} {BODY_GLYPH[a.to] ?? a.to[0]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--cream)", fontWeight: 600 }}>{a.from} {a.type} {a.to}</div>
                  <div style={{ fontSize: ".74rem", color: "var(--mist)", marginTop: 1 }}>{ASPECT_LINE[a.type] ?? a.type}</div>
                </div>
                <span style={{ fontSize: ".72rem", color: "var(--mist2)" }}>{toDMS(a.orb)}</span>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* ── Generational layer ── */}
      <section className="glass-card fade-in fade-in-delay-2">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Generational layer</p>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 12 }}>{chart.generational.cohortLabel}</p>
        {(["Uranus","Neptune","Pluto"] as const).map(planet => {
          const data  = chart.generational[planet.toLowerCase() as "uranus"|"neptune"|"pluto"];
          const glyph = BODY_GLYPH[planet.toLowerCase()];
          const el    = signElement(data.sign);
          return (
            <div key={planet} className="pl-row">
              <div className="glyph-sq" style={{ background: EL_GRAD[el] ?? "var(--ink2)", color: "#1a1206", fontSize: ".9rem" }}>{glyph}</div>
              <div style={{ flex: 1 }}>
                <div className="pl-body">{planet} in {data.sign} {SIGN_GLYPH[data.sign]}</div>
                <div className="pl-desc">{describeGenerationalArchetype(planet, data.sign)}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Private notes ── */}
      <section className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Private notes</p>
        <p className="muted" style={{ fontSize: ".75rem", marginBottom: 10 }}>Owner-only · never shared · never in Vela shared mode</p>
        <textarea className="field field--rect" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Log a private moment, pattern, or thing to remember…" rows={3} style={{ marginBottom: 10 }} />
        <button className="btn-primary" onClick={saveNote} disabled={noteSaving || !noteDraft.trim()} style={{ gap: 8 }}>
          {noteSaving && <Spinner size={13} color="#1a1206" />}
          {noteSaving ? "Saving…" : "Save note"}
        </button>
        {notes.length > 0 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {notes.map(note => (
              <div key={note.id} style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: "2px solid rgba(230,174,108,.3)" }}>
                <p style={{ margin: "0 0 4px", color: "var(--cream)", lineHeight: 1.55, fontSize: ".88rem" }}>{note.body}</p>
                <small className="muted" style={{ fontSize: ".7rem" }}>{new Date(note.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>No notes yet.</p>
        )}
      </section>

      {status ? <p className="error">{status}</p> : null}
    </main>
  );
}
