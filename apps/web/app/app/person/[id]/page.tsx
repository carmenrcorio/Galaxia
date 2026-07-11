"use client";

/**
 * /app/person/[id]
 *
 * Interpretation: lib/interpretations.ts + lib/house-interpretations.ts
 * Wheel: design/reference/galaxia.jsx Wheel()
 * Glyph maps: design/reference/galaxia.jsx
 */

import { computeSynastry, computeTransits, type NatalChart, type Placement } from "@galaxia/astro";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskBirthData } from "../../../../components/ask-birth-data";
import { ChartWheel } from "../../../../components/chart-wheel";
import { EditPersonPanel } from "../../../../components/edit-person-panel";
import { InitialAvatar } from "../../../../components/initial-avatar";
import { Spinner } from "../../../../components/spinner";
import { ASPECT_GLYPH, BODY_GLYPH, SIGN_GLYPH, signElement } from "../../../../lib/design";
import {
  BODY_DOMAIN, ELEMENT_ABSENT, ELEMENT_DOMINANT, GENERATIONAL,
  interpretAspect, interpretPlacement, interpretRising,
  type AspectKey, type BodyKey, type SignKey
} from "../../../../lib/interpretations";
import {
  houseMeaning, interpretHouse, STELLIUM_NOTE,
  type HouseKey
} from "../../../../lib/house-interpretations";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem, houseSystemLabelForChart } from "../../../../lib/house-system";
import { fetchArchivedThreads, fetchRecord, fetchVelaPins, setThreadStatus, type RecordEntry } from "../../../../lib/record";
import { ThreadMenu } from "../../../../components/thread-menu";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string; display_name: string; relation: string;
  birth_precision: "none" | "exact" | "date" | "year"; is_minor: boolean;
  birth_date?: string | null; birth_time?: string | null;
  birth_place?: string | null; birth_lat?: number | null; birth_lng?: number | null;
  tz_offset_min?: number | null;
}
/* ─── Normalise engine output to library key conventions ─────────────────── */
function normaliseBody(b: string): BodyKey { return b.toLowerCase() as BodyKey; }
function normaliseSign(s: string): SignKey  { return (s.charAt(0).toUpperCase() + s.slice(1)) as SignKey; }
function normaliseAspect(t: string): AspectKey { return t.toLowerCase() as AspectKey; }

function toDMS(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}

const EL_GRAD: Record<string, string> = {
  fire:  "linear-gradient(135deg,#F0A368,#DC6E5F)",
  earth: "linear-gradient(135deg,#D8B873,#9DAE6E)",
  air:   "linear-gradient(135deg,#D2B0E6,#9FA8E6)",
  water: "linear-gradient(135deg,#79BEC8,#7193CE)",
};

const SIGNS_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const EL_SOLID: Record<string, string> = { fire:"#E0825C", earth:"#cdbd7a", air:"#B79AD8", water:"#6FB1B8" };
// ChartWheel extracted to components/chart-wheel.tsx (also used by the public Quick Chart).

/* ─── HouseBadge — interactive tooltip on H4, H8 etc ────────────────────── */
function HouseBadge({ house }: { house: number }) {
  const [tip, setTip] = useState(false);
  const hk = house as HouseKey;
  const hm = houseMeaning(hk);
  if (!hm) return <span style={{ fontSize: ".68rem", color: "var(--gold-soft)", background: "rgba(230,174,108,.12)", borderRadius: 5, padding: "1px 6px", marginLeft: 7, fontWeight: 400 }}>H{house}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setTip(t => !t)}
        style={{
          fontSize: ".68rem", color: "var(--gold-soft)", background: tip ? "rgba(230,174,108,.22)" : "rgba(230,174,108,.12)",
          border: "1px solid rgba(230,174,108,.25)", borderRadius: 6, padding: "2px 7px",
          marginLeft: 7, fontWeight: 500, cursor: "pointer"
        }}
        aria-label={`${hm.name}: ${hm.short}`}
      >
        H{house}
      </button>
      {tip ? (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 40, minWidth: 200, maxWidth: 240,
          background: "linear-gradient(165deg,rgba(29,22,64,.97),rgba(10,7,23,.99))",
          border: "1px solid rgba(230,174,108,.22)", borderRadius: 12, padding: "10px 12px",
          boxShadow: "0 16px 40px -16px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.05)"
        }}>
          <p style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", margin: "0 0 3px" }}>{hm.name}</p>
          <p style={{ fontSize: ".78rem", color: "var(--mist2)", margin: "0 0 5px" }}>{hm.domain}</p>
          <p style={{ fontSize: ".78rem", color: "var(--cream)", margin: 0, lineHeight: 1.5 }}>{hm.short}</p>
        </div>
      ) : null}
    </span>
  );
}

/* ─── ExpandRow — the single expandable row used throughout ─────────────── */
function ExpandRow({
  open, onToggle, label, domain, degree, house, el, glyph, short, long,
  houseReading, planetAspects, hasHouses
}: {
  open: boolean; onToggle: () => void;
  label: string; domain?: string; degree?: string; house?: number;
  el: string; glyph: string; short: string; long: string;
  /** House reading block — rendered in expanded state when present */
  houseReading?: { houseName: string; houseDomain: string; long: string } | null;
  /** Per-planet aspects — rendered in expanded state */
  planetAspects?: Array<{ from: string; to: string; type: string; orb: number; short: string; tight: boolean }>;
  hasHouses?: boolean;
}) {
  return (
    <div style={{ borderBottom: "1px solid rgba(183,154,216,.08)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none",
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 0", cursor: "pointer", textAlign: "left"
        }}
        aria-expanded={open}
      >
        <div className="glyph-sq" style={{ background: EL_GRAD[el] ?? "var(--ink2)", color: "#1a1206", flexShrink: 0 }}>
          {glyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {domain ? (
            <div style={{ fontSize: ".58rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist2)", marginBottom: 1 }}>
              {domain}
            </div>
          ) : null}
          <div style={{ fontSize: ".86rem", color: "var(--cream)", fontWeight: 600, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            {label}
            {house && hasHouses !== false ? <HouseBadge house={house} /> : null}
          </div>
          {degree ? <div style={{ fontSize: ".72rem", color: "var(--mist2)" }}>{degree}</div> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <span style={{ fontSize: ".78rem", color: "var(--mist)", fontStyle: "italic" }}>{short}</span>
        </div>
        <span style={{ color: "var(--mist2)", fontSize: ".72rem", flexShrink: 0, marginLeft: 6, transform: open ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform .2s" }}>▶</span>
      </button>
      {open ? (
        <div style={{ paddingBottom: 14, paddingLeft: 48, paddingRight: 6, display: "grid", gap: 12 }}>
          {/* Block 1: IN [SIGN] */}
          {long ? (
            <div>
              <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 4px" }}>
                In {label.includes(" in ") ? label.split(" in ").slice(1).join(" in ") : "this sign"}
              </p>
              <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>{long}</p>
            </div>
          ) : null}
          {/* Block 2: IN THE [N]TH HOUSE */}
          {houseReading ? (
            <div>
              <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gold-soft)", margin: "0 0 2px" }}>
                In the {houseReading.houseName.toLowerCase()}
              </p>
              <p style={{ fontSize: ".72rem", color: "var(--mist2)", margin: "0 0 4px" }}>{houseReading.houseDomain}</p>
              <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>{houseReading.long}</p>
            </div>
          ) : null}
          {/* Block 3: ASPECTS */}
          {planetAspects && planetAspects.length > 0 ? (
            <div>
              <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 6px" }}>Aspects</p>
              <div style={{ display: "grid", gap: 4 }}>
                {planetAspects.map((a, i) => {
                  const glyph = ASPECT_GLYPH[a.type] ?? a.type[0];
                  const other = a.from.toLowerCase() === label.split(" ")[0].toLowerCase() ? a.to : a.from;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 8,
                      background: a.tight ? "rgba(230,174,108,.06)" : "rgba(255,255,255,.02)",
                      border: a.tight ? "1px solid rgba(230,174,108,.2)" : "1px solid rgba(183,154,216,.08)"
                    }}>
                      <span style={{ fontSize: ".8rem", color: "var(--mist2)", width: 36, textAlign: "center", letterSpacing: 1, flexShrink: 0 }}>
                        {BODY_GLYPH[other.toLowerCase()] ?? other[0]} {glyph}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: ".78rem", color: "var(--cream)", fontWeight: 600 }}>{a.type} {other}</span>
                        <span style={{ fontSize: ".72rem", color: "var(--mist)", marginLeft: 6, fontStyle: "italic" }}>{a.short}</span>
                      </div>
                      <span style={{ fontSize: ".68rem", color: "var(--mist2)" }}>{toDMS(a.orb)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─── RecordItem — one entry in the person's Record timeline ─────────────── */
const RECORD_META: Record<string, { label: string; color: string }> = {
  note:            { label: "You noted",       color: "rgba(230,174,108,.4)" },
  tending:         { label: "Tending note",    color: "rgba(111,177,184,.5)" },
  vela_pin:        { label: "Pinned from Vela", color: "rgba(183,154,216,.5)" },
  compare_reading: { label: "Saved comparison", color: "rgba(230,174,108,.5)" },
  cohort_reading:  { label: "Saved cohort reading", color: "rgba(111,177,184,.4)" },
  conversation:    { label: "Vela conversation", color: "rgba(183,154,216,.4)" },
};

function RecordItem({ entry, onArchive }: { entry: RecordEntry; personName: string; onArchive?: (entryId: string) => void }) {
  const meta = RECORD_META[entry.kind] ?? RECORD_META.note;
  const when = new Date(entry.createdAt);
  const withdrawn = Boolean(entry.withdrawnReason);
  return (
    <div style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: `2px solid ${withdrawn ? "rgba(183,154,216,.2)" : meta.color}`, opacity: withdrawn ? .7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist2)" }}>{meta.label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <small className="muted" style={{ fontSize: ".68rem" }}>{when.toLocaleDateString()}</small>
          {entry.kind === "conversation" && onArchive ? (
            <ThreadMenu threadId={entry.id.replace(/^thread-/, "")} onArchive={() => onArchive(entry.id)} />
          ) : null}
        </span>
      </div>
      {withdrawn ? (
        <p className="muted" style={{ margin: 0, lineHeight: 1.55, fontSize: ".82rem", fontStyle: "italic" }}>{entry.body}</p>
      ) : (
        <p style={{ margin: 0, color: "var(--cream)", lineHeight: 1.55, fontSize: ".86rem" }}>{entry.body}</p>
      )}
      {entry.kind === "conversation" && entry.href ? (
        <Link href={entry.href as never} style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
      ) : null}
      {entry.kind === "vela_pin" && entry.sourceThreadId ? (
        <Link href={`/app/vela?threadId=${entry.sourceThreadId}`} style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
      ) : null}
      {entry.kind === "compare_reading" ? (
        <Link href="/app/compare" style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Open Compare →</Link>
      ) : null}
      {entry.kind === "cohort_reading" ? (
        <Link href="/app/groups" style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Open Groups →</Link>
      ) : null}
    </div>
  );
}

/* ─── Modality balance ───────────────────────────────────────────────────── */
const SIGN_MODALITY: Record<string, "cardinal"|"fixed"|"mutable"> = {
  Aries:"cardinal",Cancer:"cardinal",Libra:"cardinal",Capricorn:"cardinal",
  Taurus:"fixed",Leo:"fixed",Scorpio:"fixed",Aquarius:"fixed",
  Gemini:"mutable",Virgo:"mutable",Sagittarius:"mutable",Pisces:"mutable"
};
const MODALITY_DOMINANT: Record<string, string> = {
  cardinal: "Heavy on cardinal signs — they initiate well. Starting is the gift; finishing is the practice.",
  fixed:    "Heavy on fixed signs — they hold their ground. Persistence is the gift; letting go is the practice.",
  mutable:  "Heavy on mutable signs — they adapt well. Flexibility is the gift; commitment is the practice.",
};
const MODALITY_ABSENT: Record<string, string> = {
  cardinal: "Little cardinal energy. Beginning things may feel like the hard part.",
  fixed:    "Little fixed energy. Holding a course past comfort may require deliberate effort.",
  mutable:  "Little mutable energy. Adapting to change may take more out of them than it would others.",
};

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function PersonProfilePage() {
  const params   = useParams<{ id: string }>();
  const personId = params.id;
  const router   = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId]         = useState<string | null>(null);
  const [person, setPerson]         = useState<PersonRow | null>(null);
  const [chart, setChart]           = useState<NatalChart | null>(null);
  const [engineVersion, setEngineVersion] = useState<number>(CHART_ENGINE_VERSION);
  const [record, setRecord]         = useState<RecordEntry[]>([]);
  const [velaPins, setVelaPins]     = useState<RecordEntry[]>([]);
  const [archivedThreads, setArchivedThreads] = useState<RecordEntry[]>([]);
  const [noteDraft, setNoteDraft]   = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [status, setStatus]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  const [openRows, setOpenRows]     = useState<Set<string>>(new Set(["sun","moon","rising"]));
  const [placementsAllOpen, setPlacementsAllOpen] = useState(false);
  const [aspectsAllOpen, setAspectsAllOpen]       = useState(false);
  const [housesAllOpen, setHousesAllOpen]         = useState(false);

  const toggleRow = useCallback((key: string) => {
    setOpenRows(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }, []);

  const toggleAllPlacements = useCallback((open: boolean) => {
    setPlacementsAllOpen(open);
    setOpenRows(prev => { const next = new Set(prev); chart?.placements.forEach(p => open ? next.add(`pl-${p.body}`) : next.delete(`pl-${p.body}`)); return next; });
  }, [chart]);

  const toggleAllHouses = useCallback((open: boolean) => {
    setHousesAllOpen(open);
    setOpenRows(prev => { const next = new Set(prev); for(let h=1;h<=12;h++) open?next.add(`h-${h}`):next.delete(`h-${h}`); return next; });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadProfile(user.id);
    });
  }, [personId, supabase]);

  const hasHouses = useMemo(() => Boolean(chart?.cusps?.length === 12), [chart]);

  // Today's transits against this natal chart. Deterministic (real ephemeris
  // vs stored natal positions). Skipped for year-only charts, whose sampled
  // positions would make transit orbs fabricated.
  const todayTransits = useMemo(() => {
    if (!chart || chart.precision === "year") return [];
    return computeTransits(chart, new Date().toISOString()).filter(h => h.orb <= 1.5).slice(0, 3);
  }, [chart]);

  // Balance tallies count only placements whose sign is actually known —
  // an uncertain (year-only) sign must not be tallied as if it were fact.
  const elementBalance = useMemo(() => {
    if (!chart || chart.precision === "year") return null;
    return chart.placements.filter(p => p.confident !== false).reduce(
      (acc, p) => { acc[signElement(p.sign) as keyof typeof acc] += 1; return acc; },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  const modalityBalance = useMemo(() => {
    if (!chart || chart.precision === "year") return null;
    return chart.placements.filter(p => p.confident !== false).reduce(
      (acc, p) => { const m = SIGN_MODALITY[p.sign]; if (m) acc[m] += 1; return acc; },
      { cardinal: 0, fixed: 0, mutable: 0 }
    );
  }, [chart]);

  const natalAspects = useMemo(() => {
    // Aspects need real positions. Year-only charts have sampled longitudes
    // (mid-year), so aspect orbs computed from them would be fabricated.
    if (!chart || chart.precision === "year") return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter(a => a.from !== a.to)
      .filter(a => { const key = [a.from,a.to].sort().join(":")+":"+a.type; if(dedupe.has(key))return false; dedupe.add(key);return true; })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
  }, [chart]);

  // Defined here (not with the other toggles above) because it must close over
  // the CURRENT natalAspects. When it was a useCallback with an empty dep array
  // declared before natalAspects, it captured the first render's value — which
  // is [] while the chart is still loading — so "Expand all" flipped its label
  // but never added any asp-* keys to openRows (the rows never opened).
  const toggleAllAspects = useCallback((open: boolean) => {
    setAspectsAllOpen(open);
    setOpenRows(prev => {
      const next = new Set(prev);
      natalAspects.forEach((a, idx) => {
        const k = `asp-${a.from}-${a.to}-${idx}`;
        if (open) next.add(k); else next.delete(k);
      });
      return next;
    });
  }, [natalAspects]);

  // Per-planet aspect map (for expanded placement rows)
  const aspectsByBody = useMemo(() => {
    const map = new Map<string, typeof natalAspects>();
    for (const a of natalAspects) {
      for (const body of [a.from, a.to]) {
        if (!map.has(body)) map.set(body, []);
        map.get(body)!.push(a);
      }
    }
    return map;
  }, [natalAspects]);

  /** Detect stellia: 3+ bodies in same house OR same sign (known signs only) */
  const stellia = useMemo(() => {
    if (!chart) return [];
    const byHouse = new Map<number, string[]>();
    const bySign  = new Map<string, string[]>();
    for (const p of chart.placements.filter(pl => pl.confident !== false)) {
      if (p.house) { if (!byHouse.has(p.house)) byHouse.set(p.house, []); byHouse.get(p.house)!.push(p.body); }
      if (!bySign.has(p.sign)) bySign.set(p.sign, []); bySign.get(p.sign)!.push(p.body);
    }
    const result: Array<{ type: "house"|"sign"; label: string; bodies: string[] }> = [];
    byHouse.forEach((bodies, house) => { if (bodies.length >= 3) result.push({ type: "house", label: houseMeaning(house as HouseKey)?.name ?? `House ${house}`, bodies }); });
    bySign.forEach((bodies, sign) => { if (bodies.length >= 3 && !result.some(s => s.type === "house" && s.bodies.every(b => bodies.includes(b)))) result.push({ type: "sign", label: sign, bodies }); });
    return result;
  }, [chart]);

  /** House occupants map for the Twelve Houses section */
  const houseOccupants = useMemo(() => {
    if (!chart || !hasHouses) return new Map<number, Placement[]>();
    const map = new Map<number, Placement[]>();
    for (let h = 1; h <= 12; h++) map.set(h, []);
    for (const p of chart.placements) { if (p.house) map.get(p.house)?.push(p); }
    return map;
  }, [chart, hasHouses]);

  /**
   * Rebuild the UTC birth instant from the stored, user-confirmed birth fields.
   * Returns null when the stored data is insufficient — we never substitute
   * "now", noon, or UTC to force a recompute through.
   */
  function rebuildDateUTC(p: PersonRow): string | null {
    if (!p.birth_date) return null;
    const [yr, mo, dy] = p.birth_date.slice(0, 10).split("-").map(Number);
    if (p.birth_precision === "exact") {
      if (!p.birth_time || p.tz_offset_min == null) return null;
      const [hr, mn] = p.birth_time.slice(0, 5).split(":").map(Number);
      return new Date(Date.UTC(yr!, mo! - 1, dy!, hr!, mn!, 0) - p.tz_offset_min * 60_000).toISOString();
    }
    if (p.birth_precision === "date") return `${p.birth_date.slice(0, 10)}T12:00:00.000Z`;
    return `${yr}-01-01T00:00:00.000Z`;
  }

  async function loadProfile(uid: string) {
    setLoading(true);
    // A unique index on people(owner_id) WHERE is_self makes more than one
    // self structurally impossible, so this is never a "pick among duplicates"
    // query — no ordering/limit tie-breaker needed or used.
    const actualId = personId === "self"
      ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).maybeSingle()).data?.id
      : personId;
    if (!actualId) { setStatus("No self profile yet."); setLoading(false); return; }
    const [{ data: pData, error: pErr }, { data: cData, error: cErr }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min").eq("id", actualId).single(),
      supabase.from("charts").select("data, house_system, engine_version").eq("person_id", actualId).single()
    ]);
    if (pErr || !pData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    const personRow = pData as PersonRow & { tz_offset_min?: number | null };
    // Progressive capture: a person with no chart yet (birth_precision 'none')
    // is not an error — render the "add birth data" state instead of failing.
    if (cErr || !cData) {
      setPerson(personRow); setChart(null);
      await loadRecord(uid, actualId);
      setLoading(false);
      return;
    }
    let chartData = cData.data as NatalChart;
    let version = (cData.engine_version as number | null) ?? 1;

    const preferred = await getPreferredHouseSystem(supabase, uid);
    const stale = version < CHART_ENGINE_VERSION || (chartData.houseSystemRequested ?? "placidus") !== preferred;
    if (stale) {
      const dateUTC = rebuildDateUTC(personRow);
      const canRecompute = dateUTC !== null && personRow.birth_precision !== "none" &&
        (personRow.birth_precision !== "exact" || (personRow.birth_lat != null && personRow.birth_lng != null));
      if (canRecompute) {
        const { computeNatalChart } = await import("@galaxia/astro");
        const recomputed = computeNatalChart({
          dateUTC: dateUTC!,
          precision: personRow.birth_precision as "exact" | "date" | "year",
          lat: personRow.birth_lat ?? undefined,
          lng: personRow.birth_lng ?? undefined,
          tzOffsetMin: personRow.tz_offset_min ?? undefined,
          houseSystem: preferred
        });
        await supabase.from("charts").upsert({ person_id: actualId, house_system: recomputed.houseSystem ?? null, data: recomputed, engine_version: CHART_ENGINE_VERSION });
        chartData = recomputed;
        version = CHART_ENGINE_VERSION;
      } else if (version < CHART_ENGINE_VERSION && cData.house_system !== "equal" && chartData.cusps) {
        // Legacy chart (engine v1) that cannot be recomputed from its stored
        // fields. Its cusps were computed as Equal House but stored under the
        // label "placidus" — correct the label to what the data actually is.
        chartData = { ...chartData, houseSystem: "equal", houseSystemRequested: preferred };
        await supabase.from("charts").upsert({ person_id: actualId, house_system: "equal", data: chartData, engine_version: version });
      }
    }
    setPerson(personRow); setChart(chartData); setEngineVersion(version);
    await loadRecord(uid, actualId);
    setLoading(false);
  }

  /** Load the person's Record (all note kinds + active conversations), Vela pins, and archived threads. */
  async function loadRecord(uid: string, actualId: string) {
    const [rec, pins, archived] = await Promise.all([
      fetchRecord(supabase, uid, { personId: actualId }, 40).catch(() => [] as RecordEntry[]),
      fetchVelaPins(supabase, uid, actualId, 2).catch(() => [] as RecordEntry[]),
      fetchArchivedThreads(supabase, uid, actualId, 40).catch(() => [] as RecordEntry[])
    ]);
    setRecord(rec); setVelaPins(pins); setArchivedThreads(archived);
  }

  const threadIdFromEntry = (entryId: string) => entryId.replace(/^thread-/, "");

  async function archiveThread(entryId: string) {
    const tid = threadIdFromEntry(entryId);
    setRecord(prev => prev.filter(e => e.id !== entryId)); // hide from Record immediately
    await setThreadStatus(supabase, tid, "archived");
    if (userId) await loadRecord(userId, person?.id ?? personId);
  }

  async function unarchiveThread(entryId: string) {
    const tid = threadIdFromEntry(entryId);
    setArchivedThreads(prev => prev.filter(e => e.id !== entryId));
    await setThreadStatus(supabase, tid, "active");
    if (userId) await loadRecord(userId, person?.id ?? personId);
  }

  async function saveNote() {
    if (!userId || !person?.id || !noteDraft.trim()) return;
    setNoteSaving(true);
    const { error } = await supabase.from("notes").insert({ owner_id: userId, about_person: person.id, body: noteDraft.trim() });
    setNoteSaving(false);
    if (error) { setStatus(error.message); return; }
    setNoteDraft(""); loadProfile(userId);
  }

  if (loading) return (
    <main className="app-content">
      <div className="skeleton skeleton-title" />
      <div className="glass-card">{[40,65,50,80,100,70].map((w,i) => <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />)}</div>
      <div className="glass-card">{[80,100,70,90,65,75].map((w,i) => <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />)}</div>
    </main>
  );

  if (!person) return (
    <main className="app-content">
      <p className="muted">{status ?? "Profile not found."}</p>
      <Link href="/welcome" className="btn-primary">Add birth data in onboarding</Link>
    </main>
  );

  // Progressive capture: person exists but has no chart yet.
  if (!chart) return (
    <main className="app-content">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }} className="fade-in">
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation}</p>
          <h1 className="page-title">{person.display_name}</h1>
          <p className="muted" style={{ fontSize: ".88rem", margin: 0 }}>No birth data yet — their chart is waiting.</p>
        </div>
      </div>

      <section className="glass-card fade-in fade-in-delay-1" style={{ display: "grid", gap: 14 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Add {person.display_name}'s birth data</p>
          <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6 }}>
            A birth year adds their generational sky. A full date adds every planetary sign. An exact time and city
            unlock houses, the Ascendant, and the precise Moon. Add whatever you have — you can always refine it later.
          </p>
        </div>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => router.push("/app")} />
        <div style={{ borderTop: "1px solid rgba(183,154,216,.1)", paddingTop: 14 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Don't know their details?</p>
          {userId ? <AskBirthData personId={person.id} personName={person.display_name} userId={userId} /> : null}
        </div>
      </section>

      {status ? <p className="error">{status}</p> : null}
    </main>
  );

  const sun  = chart.placements.find(p => p.body === "sun");
  const moon = chart.placements.find(p => p.body === "moon");

  return (
    <main className="app-content">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }} className="fade-in">
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation} · {person.birth_precision} precision</p>
          <h1 className="page-title">{person.display_name}</h1>
          {sun ? (
            <p className="muted" style={{ fontSize: ".88rem", margin: 0 }}>
              {sun.confident !== false ? `${SIGN_GLYPH[sun.sign]} ${sun.sign} Sun` : "Sun sign uncertain (year-only birth data)"}
              {moon && moon.confident !== false ? ` · ${SIGN_GLYPH[moon.sign]} ${moon.sign} Moon` : ""}
              {chart.asc ? ` · ${SIGN_GLYPH[chart.asc]} ${chart.asc} Rising` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/app/compare?a=${person.id}`} className="pill-link" style={{ fontSize: ".82rem" }}>Compare</Link>
        <Link href={`/app/vela?scope=person&subject=${person.id}`} className="pill-link" style={{ fontSize: ".82rem" }}>Ask Vela</Link>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => router.push("/app")} />
      </div>

      {/* ── Active today (transit) — deterministic; links back to Vela ── */}
      {todayTransits.length > 0 ? (
        <section className="glass-card fade-in" style={{ borderColor: "rgba(230,174,108,.28)", background: "rgba(230,174,108,.05)" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Active today for {person.display_name}</p>
          <div style={{ display: "grid", gap: 6 }}>
            {todayTransits.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: ".84rem" }}>
                <span style={{ color: "var(--gold-soft)", flexShrink: 0 }}>
                  {BODY_GLYPH[t.transitBody] ?? t.transitBody} {ASPECT_GLYPH[t.type] ?? ""} {BODY_GLYPH[t.natalBody] ?? t.natalBody}
                </span>
                <span style={{ color: "var(--cream)" }}>
                  transiting {t.transitBody} {t.type} their natal {t.natalBody}
                </span>
                <span style={{ color: "var(--mist2)", fontSize: ".72rem" }}>{t.orb.toFixed(1)}° orb</span>
              </div>
            ))}
          </div>
          <Link
            href={`/app/vela?scope=person&subject=${person.id}&q=${encodeURIComponent(`How does today's ${todayTransits[0].transitBody} ${todayTransits[0].type} their natal ${todayTransits[0].natalBody} affect us right now?`)}`}
            className="pill-link"
            style={{ fontSize: ".8rem", marginTop: 10 }}
          >
            Ask Vela how this is showing up
          </Link>
        </section>
      ) : null}

      {/* ── Vela has said this about them (B2) ── */}
      <section className="glass-card fade-in fade-in-delay-1" style={{ borderColor: "rgba(183,154,216,.2)" }}>
        <p className="eyebrow" style={{ marginBottom: 8, color: "var(--air)" }}>Vela on {person.display_name}</p>
        {velaPins.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {velaPins.map(pin => (
              <div key={pin.id} style={{ borderLeft: `2px solid ${pin.withdrawnReason ? "rgba(183,154,216,.15)" : "rgba(183,154,216,.35)"}`, paddingLeft: 12, opacity: pin.withdrawnReason ? .7 : 1 }}>
                <p style={{ margin: "0 0 4px", color: pin.withdrawnReason ? "var(--mist2)" : "var(--mist)", fontStyle: pin.withdrawnReason ? "italic" : "normal", fontSize: ".86rem", lineHeight: 1.55 }}>{pin.body}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <small className="muted" style={{ fontSize: ".68rem" }}>{new Date(pin.createdAt).toLocaleDateString()}</small>
                  {pin.sourceThreadId ? (
                    <Link href={`/app/vela?threadId=${pin.sourceThreadId}`} style={{ fontSize: ".7rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
                  ) : null}
                </div>
              </div>
            ))}
            <Link href={`/app/vela?scope=person&subject=${person.id}`} className="pill-link" style={{ fontSize: ".78rem", width: "fit-content", marginTop: 2 }}>Ask Vela more</Link>
          </div>
        ) : (
          <div>
            <p className="muted" style={{ fontSize: ".82rem", marginBottom: 10 }}>
              Nothing pinned yet. Ask Vela about {person.display_name}, then pin any insight worth keeping — it will live here.
            </p>
            <Link href={`/app/vela?scope=person&subject=${person.id}`} className="pill-link" style={{ fontSize: ".8rem" }}>Ask Vela about {person.display_name}</Link>
          </div>
        )}
      </section>

      {/* ── Chart Wheel ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          {chart.precision === "exact" && chart.asc ? `Natal wheel · ${houseSystemLabelForChart(chart, engineVersion)}` : "Zodiac wheel"}
        </p>
        <ChartWheel chart={chart} />
        {chart.houseSystemFallbackReason ? (
          <p className="muted" style={{ fontSize: ".72rem", marginTop: 10, textAlign: "center", maxWidth: "52ch", margin: "10px auto 0" }}>
            {chart.houseSystemFallbackReason}
          </p>
        ) : null}
        {(chart.precision !== "exact" || !chart.asc) ? (
          <p className="muted" style={{ fontSize: ".72rem", marginTop: 10, textAlign: "center", maxWidth: "48ch", margin: "10px auto 0" }}>
            Houses and rising sign need an exact birth time and location. Add a birth city to unlock the full wheel.
          </p>
        ) : null}
      </section>

      {/* ── Big Three ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 12 }}>The big three</p>
        <div style={{ display: "grid", gap: 8 }}>
          {([
            { key: "sun",    label: "Sun",    sign: sun?.sign,  body: "sun",  house: sun?.house,  uncertain: sun?.confident === false,  possibleSigns: sun?.possibleSigns  },
            { key: "moon",   label: "Moon",   sign: moon?.sign, body: "moon", house: moon?.house, uncertain: moon?.confident === false, possibleSigns: moon?.possibleSigns },
            { key: "rising", label: "Rising", sign: chart.asc,  body: null,   house: undefined,   uncertain: false, possibleSigns: undefined },
          ] as { key: string; label: string; sign: string|undefined; body: string|null; house: number|undefined; uncertain: boolean; possibleSigns: string[]|undefined }[]).map(({ key, label, sign, body, house, uncertain, possibleSigns }) => {
            if (!sign) return (
              <div key={key} className="sign-chip" style={{ opacity: .45 }}>
                <span className="sign-chip__glyph" style={{ color: "var(--mist2)" }}>—</span>
                <span className="sign-chip__label">{label}</span>
                <span className="sign-chip__value">{label === "Rising" ? "Exact time + city needed" : "—"}</span>
              </div>
            );
            if (uncertain) return (
              // A sign we cannot pin down is never presented as fact.
              <div key={key} className="sign-chip" style={{ opacity: .6 }}>
                <span className="sign-chip__glyph" style={{ color: "var(--mist2)" }}>?</span>
                <span className="sign-chip__label">{label}</span>
                <span className="sign-chip__value">
                  {possibleSigns?.length ? `Could be ${possibleSigns.join(" or ")}` : "Uncertain"} — a birth date would settle it
                </span>
              </div>
            );
            const el = signElement(sign);
            const signReading = body ? interpretPlacement(normaliseBody(body), normaliseSign(sign)) : interpretRising(normaliseSign(sign));
            const houseR = (body && house && hasHouses)
              ? (() => { const hr = interpretHouse(normaliseBody(body), house as HouseKey); const hm = houseMeaning(house as HouseKey); return hm && hr.long ? { houseName: hm.name, houseDomain: hm.domain, long: hr.long } : null; })()
              : null;
            const bodyAspects = body ? (aspectsByBody.get(body)?.map(a => ({
              from: a.from, to: a.to, type: a.type, orb: a.orb, tight: a.orb < 2,
              short: interpretAspect(normaliseBody(a.from), normaliseBody(a.to), normaliseAspect(a.type)).short
            })) ?? []) : [];
            const isOpen = openRows.has(key);
            return (
              <div key={key} style={{ borderRadius: 12, border: `1px solid ${isOpen ? "rgba(230,174,108,.22)" : "rgba(255,255,255,.06)"}`, background: "rgba(255,255,255,.025)", overflow: "hidden" }}>
                <button onClick={() => toggleRow(key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }} aria-expanded={isOpen}>
                  <span style={{ fontSize: "1.3rem", color: `var(--${el})`, flexShrink: 0 }}>{SIGN_GLYPH[sign]}</span>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist2)", display: "flex", alignItems: "center", gap: 4 }}>
                      {label}{house && hasHouses ? <HouseBadge house={house} /> : null}
                    </div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: ".95rem", color: "var(--cream)" }}>{sign}</div>
                  </div>
                  <span style={{ fontSize: ".76rem", color: "var(--mist)", fontStyle: "italic", flex: 1, textAlign: "right" }}>{signReading.short}</span>
                  <span style={{ color: "var(--mist2)", fontSize: ".7rem", flexShrink: 0, marginLeft: 6, transform: isOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform .2s" }}>▶</span>
                </button>
                {isOpen ? (
                  <div style={{ padding: "0 14px 14px 14px", display: "grid", gap: 12 }}>
                    {signReading.long ? (
                      <div>
                        <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 4px" }}>In {sign}</p>
                        <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>{signReading.long}</p>
                      </div>
                    ) : null}
                    {houseR ? (
                      <div>
                        <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gold-soft)", margin: "0 0 2px" }}>In the {houseR.houseName.toLowerCase()}</p>
                        <p style={{ fontSize: ".72rem", color: "var(--mist2)", margin: "0 0 4px" }}>{houseR.houseDomain}</p>
                        <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>{houseR.long}</p>
                      </div>
                    ) : null}
                    {bodyAspects.length > 0 ? (
                      <div>
                        <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 6px" }}>Aspects</p>
                        <div style={{ display: "grid", gap: 4 }}>
                          {bodyAspects.map((a, i) => {
                            const glyph = ASPECT_GLYPH[a.type] ?? a.type[0];
                            const other = a.from.toLowerCase() === (body ?? "").toLowerCase() ? a.to : a.from;
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 8, background: a.tight ? "rgba(230,174,108,.06)" : "rgba(255,255,255,.02)", border: a.tight ? "1px solid rgba(230,174,108,.2)" : "1px solid rgba(183,154,216,.08)" }}>
                                <span style={{ fontSize: ".8rem", color: "var(--mist2)", width: 36, textAlign: "center", letterSpacing: 1, flexShrink: 0 }}>{BODY_GLYPH[other.toLowerCase()] ?? other[0]} {glyph}</span>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: ".78rem", color: "var(--cream)", fontWeight: 600 }}>{a.type} {other}</span>
                                  <span style={{ fontSize: ".72rem", color: "var(--mist)", marginLeft: 6, fontStyle: "italic" }}>{a.short}</span>
                                </div>
                                <span style={{ fontSize: ".68rem", color: "var(--mist2)" }}>{toDMS(a.orb)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {!chart.asc && person.birth_precision === "exact" ? (
          <p className="muted" style={{ fontSize: ".74rem", marginTop: 10 }}>Rising sign needs a birth city — edit this profile to add one.</p>
        ) : null}
      </section>

      {/* ── Placements ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Placements</p>
          <button className="pill-link" style={{ fontSize: ".7rem", padding: "3px 10px" }} onClick={() => toggleAllPlacements(!placementsAllOpen)}>
            {placementsAllOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {/* Stellium alert — highest structural priority */}
        {stellia.map((s, i) => (
          <div key={i} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(230,174,108,.07)", border: "1px solid rgba(230,174,108,.25)" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", margin: "0 0 3px" }}>
              Stellium in {s.type === "house" ? `the ${s.label.toLowerCase()}` : s.label}
            </p>
            <p style={{ fontSize: ".78rem", color: "var(--cream)", margin: "0 0 3px" }}>
              {s.bodies.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(" · ")}
            </p>
            <p style={{ fontSize: ".76rem", color: "var(--mist)", lineHeight: 1.55, margin: 0 }}>{STELLIUM_NOTE}</p>
          </div>
        ))}

        {chart.placements.map(p => {
          const bk  = normaliseBody(p.body);
          const sk  = normaliseSign(p.sign);
          const el  = signElement(p.sign);
          const gly = BODY_GLYPH[p.body] ?? p.body[0].toUpperCase();
          const domain = BODY_DOMAIN[bk];
          if (p.confident === false) {
            // Year-only data: the sign is not known. Say so — never interpret a guess.
            return (
              <div key={p.body} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(183,154,216,.08)", opacity: .65 }}>
                <div className="glyph-sq" style={{ background: "var(--ink2)", color: "var(--mist2)", flexShrink: 0 }}>{gly}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".58rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist2)", marginBottom: 1 }}>{domain}</div>
                  <div style={{ fontSize: ".86rem", color: "var(--cream)", fontWeight: 600 }}>{p.body.charAt(0).toUpperCase() + p.body.slice(1)} — sign uncertain</div>
                </div>
                <span style={{ fontSize: ".76rem", color: "var(--mist2)", fontStyle: "italic", textAlign: "right" }}>
                  {p.possibleSigns?.length ? `Could be ${p.possibleSigns.join(" or ")}` : "Needs a birth date"}
                </span>
              </div>
            );
          }
          const signR = interpretPlacement(bk, sk);
          if (process.env.NODE_ENV !== "production" && !signR.short) console.warn(`[interpretations] missing: ${bk} in ${sk}`);
          const houseR = (p.house && hasHouses)
            ? (() => { const hr = interpretHouse(bk, p.house as HouseKey); const hm = houseMeaning(p.house as HouseKey); return hm && hr.long ? { houseName: hm.name, houseDomain: hm.domain, long: hr.long } : null; })()
            : null;
          const bodyAspects = (aspectsByBody.get(p.body) ?? []).map(a => ({
            from: a.from, to: a.to, type: a.type, orb: a.orb, tight: a.orb < 2,
            short: interpretAspect(normaliseBody(a.from), normaliseBody(a.to), normaliseAspect(a.type)).short
          }));
          const rowKey = `pl-${p.body}`;
          const isGen  = GENERATIONAL.includes(bk);
          return (
            <ExpandRow
              key={p.body}
              open={openRows.has(rowKey)}
              onToggle={() => toggleRow(rowKey)}
              label={`${p.body.charAt(0).toUpperCase() + p.body.slice(1)} in ${p.sign}${isGen ? " ✦" : ""}`}
              domain={domain}
              degree={toDMS(p.degree)}
              house={p.house}
              el={el}
              glyph={gly}
              short={signR.short}
              long={signR.long}
              houseReading={houseR}
              planetAspects={bodyAspects}
              hasHouses={hasHouses}
            />
          );
        })}

        {/* Element + modality balance */}
        {elementBalance ? (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.05)" }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Element & modality balance</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
              {(["fire","earth","air","water"] as const).map(el => (
                <span key={el} style={{ fontSize: ".75rem", color: `var(--${el})` }}>{el.charAt(0).toUpperCase() + el.slice(1)} {elementBalance[el]}</span>
              ))}
            </div>
            {modalityBalance ? (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                {(["cardinal","fixed","mutable"] as const).map(m => (
                  <span key={m} style={{ fontSize: ".75rem", color: "var(--mist2)" }}>{m.charAt(0).toUpperCase() + m.slice(1)} {modalityBalance[m]}</span>
                ))}
              </div>
            ) : null}
            {(() => {
              const counts = elementBalance;
              const max = Math.max(...Object.values(counts));
              const dom = (Object.entries(counts) as [string,number][]).find(([,v]) => v === max)?.[0] as "fire"|"earth"|"air"|"water"|undefined;
              const absent = (Object.entries(counts) as [string,number][]).filter(([,v]) => v === 0).map(([k]) => k as "fire"|"earth"|"air"|"water");
              const mcounts = modalityBalance ?? { cardinal:0, fixed:0, mutable:0 };
              const mmax = Math.max(...Object.values(mcounts));
              const mdom = (Object.entries(mcounts) as [string,number][]).find(([,v]) => v === mmax)?.[0] as keyof typeof MODALITY_DOMINANT|undefined;
              const mabsent = (Object.entries(mcounts) as [string,number][]).filter(([,v]) => v === 0).map(([k]) => k);
              return (
                <div style={{ display: "grid", gap: 6 }}>
                  {dom && max >= 3 ? <p style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55, margin: 0, borderLeft: `2px solid var(--${dom})`, paddingLeft: 10 }}>{ELEMENT_DOMINANT[dom]}</p> : null}
                  {absent.map(el => <p key={el} style={{ fontSize: ".8rem", color: "var(--mist2)", lineHeight: 1.55, margin: 0, borderLeft: "2px solid rgba(183,154,216,.25)", paddingLeft: 10 }}>{ELEMENT_ABSENT[el]}</p>)}
                  {mdom && mmax >= 4 ? <p style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55, margin: 0, borderLeft: "2px solid rgba(183,154,216,.4)", paddingLeft: 10 }}>{MODALITY_DOMINANT[mdom]}</p> : null}
                  {mabsent.map(m => <p key={m} style={{ fontSize: ".8rem", color: "var(--mist2)", lineHeight: 1.55, margin: 0, borderLeft: "2px solid rgba(183,154,216,.15)", paddingLeft: 10 }}>{MODALITY_ABSENT[m]}</p>)}
                </div>
              );
            })()}
          </div>
        ) : null}
      </section>

      {/* ── Key aspects ── */}
      {natalAspects.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <p className="eyebrow" style={{ margin: 0 }}>Key aspects</p>
            <button className="pill-link" style={{ fontSize: ".7rem", padding: "3px 10px" }} onClick={() => toggleAllAspects(!aspectsAllOpen)}>{aspectsAllOpen ? "Collapse all" : "Expand all"}</button>
          </div>
          <p className="muted" style={{ fontSize: ".72rem", marginBottom: 10 }}>Gold border = tight (&lt; 2°) · tightest first</p>
          {natalAspects.map((a, idx) => {
            const tight = a.orb < 2, mid = a.orb < 4;
            const cls = tight ? "aspect-tight" : mid ? "aspect-mid" : "aspect-loose";
            const aspGlyph = ASPECT_GLYPH[a.type] ?? a.type[0];
            const bkA = normaliseBody(a.from), bkB = normaliseBody(a.to), ak = normaliseAspect(a.type);
            const reading = interpretAspect(bkA, bkB, ak);
            const rowKey = `asp-${a.from}-${a.to}-${idx}`;
            const isOpen = openRows.has(rowKey);
            return (
              <div key={rowKey} className={cls} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <button onClick={() => toggleRow(rowKey)} style={{ width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"9px 0" }} aria-expanded={isOpen}>
                  <span style={{ fontSize:".88rem",color:"var(--mist2)",width:56,textAlign:"center",letterSpacing:2,flexShrink:0 }}>{BODY_GLYPH[a.from]??a.from[0]} {aspGlyph} {BODY_GLYPH[a.to]??a.to[0]}</span>
                  <div style={{ flex:1,textAlign:"left" }}>
                    <div style={{ fontSize:".82rem",color:"var(--cream)",fontWeight:600 }}>{a.from} {a.type} {a.to}</div>
                    <div style={{ fontSize:".74rem",color:"var(--mist)",marginTop:1,fontStyle:"italic" }}>{reading.short}</div>
                  </div>
                  <span style={{ fontSize:".7rem",color:"var(--mist2)",flexShrink:0 }}>{toDMS(a.orb)}</span>
                  <span style={{ color:"var(--mist2)",fontSize:".7rem",flexShrink:0,marginLeft:4,transform:isOpen?"rotate(90deg)":"none",display:"inline-block",transition:"transform .2s" }}>▶</span>
                </button>
                {isOpen && reading.long ? <div style={{ paddingBottom:10,paddingLeft:64 }}><p style={{ fontSize:".82rem",color:"var(--mist)",lineHeight:1.62,margin:0 }}>{reading.long}</p></div> : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* ── Twelve Houses — only when cusps present ── */}
      {hasHouses ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="eyebrow" style={{ margin: 0 }}>The twelve houses</p>
            <button className="pill-link" style={{ fontSize: ".7rem", padding: "3px 10px" }} onClick={() => toggleAllHouses(!housesAllOpen)}>{housesAllOpen ? "Collapse all" : "Expand all"}</button>
          </div>
          <p className="muted" style={{ fontSize: ".72rem", marginBottom: 12 }}>{houseSystemLabelForChart(chart, engineVersion)} · click a house to read it</p>
          {chart.houseSystemFallbackReason ? (
            <p className="muted" style={{ fontSize: ".72rem", marginBottom: 12 }}>{chart.houseSystemFallbackReason}</p>
          ) : null}
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
            const hk = h as HouseKey;
            const hm = houseMeaning(hk)!;
            const cuspLon = chart.cusps![h - 1]!;
            const cuspSign = SIGNS_ORDER[Math.floor(((cuspLon % 360) + 360) % 360 / 30)]!;
            const cuspDeg  = ((cuspLon % 360) + 360) % 360 % 30;
            const occupants = houseOccupants.get(h) ?? [];
            const isOpen = openRows.has(`h-${h}`);
            return (
              <div key={h} style={{ borderBottom: "1px solid rgba(183,154,216,.08)" }}>
                <button onClick={() => toggleRow(`h-${h}`)} style={{ width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,padding:"9px 0",textAlign:"left" }} aria-expanded={isOpen}>
                  <div style={{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.04)",border:"1px solid rgba(183,154,216,.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:".76rem",fontFamily:"var(--serif)",color:"var(--gold-soft)",fontWeight:600 }}>{h}</span>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                      <span style={{ fontSize:".82rem",color:"var(--cream)",fontWeight:600 }}>{hm.name}</span>
                      <span style={{ fontSize:".68rem",color:"var(--mist2)" }}>{SIGN_GLYPH[cuspSign]} {toDMS(cuspDeg)} {cuspSign}</span>
                    </div>
                    <div style={{ fontSize:".7rem",color:"var(--mist2)",marginTop:1 }}>{hm.domain}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    {occupants.length > 0 ? (
                      <div style={{ display:"flex",gap:4,justifyContent:"flex-end",flexWrap:"wrap" }}>
                        {occupants.map(p => <span key={p.body} style={{ fontSize:".9rem",color:EL_SOLID[signElement(p.sign)]??"#b9aede" }}>{BODY_GLYPH[p.body]??p.body[0]}</span>)}
                      </div>
                    ) : <span style={{ fontSize:".7rem",color:"var(--mist2)" }}>empty</span>}
                  </div>
                  <span style={{ color:"var(--mist2)",fontSize:".7rem",flexShrink:0,marginLeft:4,transform:isOpen?"rotate(90deg)":"none",display:"inline-block",transition:"transform .2s" }}>▶</span>
                </button>
                {isOpen ? (
                  <div style={{ paddingBottom:12,paddingLeft:42,paddingRight:6 }}>
                    <p style={{ fontSize:".82rem",color:"var(--mist)",lineHeight:1.62,margin:"0 0 8px" }}>{hm.long}</p>
                    {occupants.length === 0 ? (
                      <p style={{ fontSize:".76rem",color:"var(--mist2)",margin:0,fontStyle:"italic" }}>No planets here. An empty house is normal — the themes it describes are present in the life, just not strongly emphasised by birth placement.</p>
                    ) : (
                      <div style={{ display:"grid",gap:4 }}>
                        {occupants.map(p => {
                          const bk2 = normaliseBody(p.body);
                          const hr2 = interpretHouse(bk2, hk);
                          return hr2.short ? (
                            <div key={p.body} style={{ display:"flex",alignItems:"baseline",gap:6 }}>
                              <span style={{ fontSize:".9rem",color:EL_SOLID[signElement(p.sign)]??"#b9aede",flexShrink:0 }}>{BODY_GLYPH[p.body]??p.body[0]}</span>
                              <span style={{ fontSize:".78rem",color:"var(--cream)",fontWeight:600 }}>{p.body.charAt(0).toUpperCase()+p.body.slice(1)}</span>
                              <span style={{ fontSize:".76rem",color:"var(--mist)",fontStyle:"italic" }}>{hr2.short}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : (
        // When no houses: show a note explaining what's needed
        person.birth_precision !== "year" ? (
          <section className="glass-card fade-in fade-in-delay-2" style={{ borderStyle: "dashed", opacity: .7 }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>The twelve houses</p>
            <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
              The house layer requires an exact birth time and location. Right now only the sign layer is visible — which tells you HOW each planet behaves, but not WHERE it lives in this person's life.
            </p>
            <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
              Edit this profile to add a birth time and city, then the houses, Ascendant, and Midheaven will compute.
            </p>
          </section>
        ) : null
      )}

      {/* ── Generational layer ── */}
      <section className="glass-card fade-in fade-in-delay-2">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Generational layer</p>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 12 }}>{chart.generational.cohortLabel}</p>
        {(["uranus","neptune","pluto"] as const).map(planet => {
          const data = chart.generational[planet as "uranus"|"neptune"|"pluto"];
          const bk = planet as BodyKey;
          if (data.confident === false) {
            // The planet changed sign during the birth year — we don't know which side.
            return (
              <div key={planet} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(183,154,216,.08)", opacity: .65 }}>
                <div className="glyph-sq" style={{ background: "var(--ink2)", color: "var(--mist2)", flexShrink: 0 }}>{BODY_GLYPH[planet] ?? planet[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".58rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mist2)", marginBottom: 1 }}>{BODY_DOMAIN[bk]}</div>
                  <div style={{ fontSize: ".86rem", color: "var(--cream)", fontWeight: 600 }}>{planet.charAt(0).toUpperCase() + planet.slice(1)} — sign uncertain</div>
                </div>
                <span style={{ fontSize: ".76rem", color: "var(--mist2)", fontStyle: "italic", textAlign: "right" }}>
                  {data.possibleSigns?.length ? `Could be ${data.possibleSigns.join(" or ")}` : "Changed sign that year"}
                </span>
              </div>
            );
          }
          const sk = normaliseSign(data.sign);
          const reading = interpretPlacement(bk, sk);
          const rowKey = `gen-${planet}`;
          return (
            <ExpandRow key={planet} open={openRows.has(rowKey)} onToggle={() => toggleRow(rowKey)}
              label={`${planet.charAt(0).toUpperCase() + planet.slice(1)} in ${data.sign}`}
              domain={BODY_DOMAIN[bk]} el={signElement(data.sign)}
              glyph={BODY_GLYPH[planet] ?? planet[0].toUpperCase()}
              short={reading.short} long={reading.long}
              hasHouses={false}
            />
          );
        })}
      </section>

      {/* ── The record (B1): notes, tending, Vela pins, saved readings, conversations ── */}
      <section id="notes" className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow" style={{ marginBottom: 4 }}>The record</p>
        <p className="muted" style={{ fontSize: ".75rem", marginBottom: 10 }}>
          Owner-only · never shared. The chart never changes — this is the layer that does: everything you note, pin, and discuss about {person.display_name}, in date order.
        </p>
        <textarea className="field field--rect" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Log a private moment, pattern, or thing to remember…" rows={3} style={{ marginBottom: 10 }} />
        <button className="btn-primary" onClick={saveNote} disabled={noteSaving || !noteDraft.trim()} style={{ gap: 8 }}>
          {noteSaving && <Spinner size={13} color="#1a1206" />}
          {noteSaving ? "Saving…" : "Add to the record"}
        </button>
        {record.length > 0 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {record.map(entry => <RecordItem key={entry.id} entry={entry} personName={person.display_name} onArchive={archiveThread} /> )}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 12 }}>
            Nothing recorded yet — notes, saved readings, and Vela conversations about {person.display_name} will gather here.
          </p>
        )}
      </section>

      {/* ── Past conversations (archived threads) ── */}
      {archivedThreads.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-3">
          <p className="eyebrow" style={{ marginBottom: 4 }}>Past conversations</p>
          <p className="muted" style={{ fontSize: ".75rem", marginBottom: 10 }}>Archived Vela threads about {person.display_name}. Nothing is ever deleted.</p>
          {/* grid-template-columns: minmax(0,1fr) — without it the single implicit
              grid track is `auto`, which sizes to the max-content of its rows.
              Each row's body <p> is white-space:nowrap (single-line ellipsis),
              and overflow:hidden/ellipsis do NOT shrink an element's max-content
              contribution — so the track (and thus the whole page's layout
              viewport) grew to the untruncated text width, forcing horizontal
              overflow / pinch-zoom-out on mobile. minmax(0,1fr) caps the track
              at the container width so the ellipsis truncation actually engages. */}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr)" }}>
            {archivedThreads.map(entry => (
              <div key={entry.id} style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: "2px solid rgba(183,154,216,.25)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: entry.withdrawnReason ? "var(--mist2)" : "var(--mist)", fontStyle: entry.withdrawnReason ? "italic" : "normal", fontSize: ".84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.body}</p>
                  <small className="muted" style={{ fontSize: ".68rem" }}>{new Date(entry.createdAt).toLocaleDateString()}</small>
                </div>
                <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {entry.href ? <Link href={entry.href as never} className="pill-link" style={{ fontSize: ".74rem" }}>Resume</Link> : null}
                  <button className="pill-link" style={{ fontSize: ".74rem" }} onClick={() => unarchiveThread(entry.id)}>Unarchive</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {status ? <p className="error">{status}</p> : null}
    </main>
  );
}
