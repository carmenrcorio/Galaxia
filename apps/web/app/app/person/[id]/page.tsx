"use client";

/**
 * /app/person/[id]
 *
 * Interpretation: lib/interpretations.ts + lib/house-interpretations.ts
 * Wheel: design/reference/galaxia.jsx Wheel()
 * Glyph maps: design/reference/galaxia.jsx
 */

import { computeSynastry, type NatalChart, type Placement } from "@galaxia/astro";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { geocodeCity } from "../../../../lib/geocode";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string; display_name: string; relation: string;
  birth_precision: "exact" | "date" | "year"; is_minor: boolean;
  birth_date?: string | null; birth_time?: string | null;
  birth_place?: string | null; birth_lat?: number | null; birth_lng?: number | null;
  tz_offset_min?: number | null;
}
interface NoteRow { id: string; body: string; created_at: string; }

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
const S=300, CX=S/2, CY=S/2;
const R_OUT=140, R_SIGN_IN=112, R_SIGN_GL=126, R_HOUSE_GL=99, R_INNER=62, R_PLANET=84;
const LINE_COLOR="rgba(230,174,108,.13)";
function pt(r:number,deg:number):[number,number]{const a=deg*Math.PI/180;return[CX+r*Math.cos(a),CY-r*Math.sin(a)];}
function svgAngle(lon:number,ascLon:number|null):number{const n=(v:number)=>((v%360)+360)%360;return ascLon!==null?n(180-lon+ascLon):n(270-lon);}

function ChartWheel({ chart }: { chart: NatalChart }) {
  const hasHouses = chart.cusps != null && chart.cusps.length >= 12;
  const ascLon: number|null = hasHouses ? (chart.cusps![0] ?? null) : null;
  const sortedPlanets = [...chart.placements].sort((a,b) => a.lon - b.lon);
  const planetPositions = sortedPlanets.map((p, idx) => {
    const a = svgAngle(p.lon, ascLon);
    const near = sortedPlanets.filter(q => q.body !== p.body && Math.abs(q.lon - p.lon) < 14);
    const rr = near.length > 0 && idx % 2 === 1 ? R_PLANET - 15 : R_PLANET;
    const [px, py] = pt(rr, a);
    return { p, px, py, col: EL_SOLID[signElement(p.sign)] ?? "#b9aede", gly: BODY_GLYPH[p.body] ?? p.body[0].toUpperCase() };
  });
  const aspectLines = (chart.precision === "exact" || chart.precision === "date")
    ? computeSynastry(chart,chart).aspects
        .filter(a=>a.from!==a.to)
        .filter((a,idx,arr)=>arr.findIndex(b=>[b.from,b.to].sort().join()===[a.from,a.to].sort().join()&&b.type===a.type)===idx)
        .filter(a=>a.orb<5).slice(0,12)
        .map(a=>{
          const pa=chart.placements.find(p=>p.body===a.from),pb=chart.placements.find(p=>p.body===a.to);
          if(!pa||!pb) return null;
          const [x0,y0]=pt(R_INNER,svgAngle(pa.lon,ascLon));
          const [x1,y1]=pt(R_INNER,svgAngle(pb.lon,ascLon));
          const col=a.harmony>=1.2?"rgba(111,177,184,":a.harmony<0?"rgba(218,140,140,":"rgba(183,154,216,";
          return{x0,y0,x1,y1,col:col+Math.max(0.08,0.22-a.orb*0.03)+")"};
        }).filter(Boolean)
    : [];
  const houseCusps=hasHouses?Array.from({length:12},(_,i)=>{const lon=chart.cusps![i]!,a=svgAngle(lon,ascLon);const[x0,y0]=pt(R_SIGN_IN,a),[x1,y1]=pt(R_INNER,a),[hx,hy]=pt(R_HOUSE_GL,svgAngle(lon+15,ascLon));return{i,x0,y0,x1,y1,hx,hy};}):[]; 
  return(
    <div style={{width:"100%",maxWidth:290,margin:"0 auto"}}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{display:"block"}}>
        <circle cx={CX} cy={CY} r={R_OUT}     fill="none" stroke={LINE_COLOR} strokeWidth="1"/>
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke={LINE_COLOR} strokeWidth="1"/>
        <circle cx={CX} cy={CY} r={R_INNER}   fill="rgba(10,7,23,.6)" stroke={LINE_COLOR} strokeWidth="1"/>
        {aspectLines.map((al,i)=>al?<line key={i} x1={al.x0} y1={al.y0} x2={al.x1} y2={al.y1} stroke={al.col} strokeWidth="1"/>:null)}
        {SIGNS_ORDER.map((sign,i)=>{
          const a0=svgAngle(i*30,ascLon),a1=svgAngle(i*30+30,ascLon);
          const[qx0,qy0]=pt(R_OUT,a0),[qx1,qy1]=pt(R_OUT,a1);
          const[qi1,qi1y]=pt(R_SIGN_IN,a1),[qi0,qi0y]=pt(R_SIGN_IN,a0);
          const[gx,gy]=pt(R_SIGN_GL,(a0+a1)/2);
          return(<g key={sign}>
            <path d={`M${qx0},${qy0} A${R_OUT},${R_OUT} 0 0 0 ${qx1},${qy1} L${qi1},${qi1y} A${R_SIGN_IN},${R_SIGN_IN} 0 0 1 ${qi0},${qi0y} Z`} fill={EL_SOLID[signElement(sign)]??"#b9aede"} opacity="0.18"/>
            <line x1={qx0} y1={qy0} x2={qi0} y2={qi0y} stroke={LINE_COLOR} strokeWidth="1"/>
            <text x={gx} y={gy} fill="#F4ECDB" fontSize="13" textAnchor="middle" dominantBaseline="central">{SIGN_GLYPH[sign]}</text>
          </g>);
        })}
        {hasHouses?(<>
          <text x={pt(R_OUT+10,180)[0]} y={pt(R_OUT+10,180)[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">ASC</text>
          {chart.mc?<text x={pt(R_OUT+10,svgAngle(chart.cusps![9]!,ascLon))[0]} y={pt(R_OUT+10,svgAngle(chart.cusps![9]!,ascLon))[1]} fill="#E6AE6C" fontSize="8" textAnchor="middle" dominantBaseline="central" fontWeight="700">MC</text>:null}
        </>):null}
        {houseCusps.map(({i,x0,y0,x1,y1,hx,hy})=>(
          <g key={i}><line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LINE_COLOR} strokeWidth="0.8"/><text x={hx} y={hy} fill="#8076a6" fontSize="8" textAnchor="middle" dominantBaseline="central">{i+1}</text></g>
        ))}
        {planetPositions.map(({p,px,py,col,gly})=>(
          <g key={p.body}><circle cx={px} cy={py} r="10" fill="rgba(10,7,23,.85)" stroke="rgba(230,174,108,.35)" strokeWidth="0.8"/><text x={px} y={py} fill={col} fontSize="11" textAnchor="middle" dominantBaseline="central">{gly}</text></g>
        ))}
      </svg>
    </div>
  );
}

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
  const [notes, setNotes]           = useState<NoteRow[]>([]);
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

  const toggleAllAspects = useCallback((open: boolean) => {
    setAspectsAllOpen(open);
    setOpenRows(prev => { const next = new Set(prev); natalAspects.forEach((a,idx) => { const k=`asp-${a.from}-${a.to}-${idx}`; open?next.add(k):next.delete(k); }); return next; });
  }, []);

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

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, p) => { acc[signElement(p.sign) as keyof typeof acc] += 1; return acc; },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  const modalityBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, p) => { const m = SIGN_MODALITY[p.sign]; if (m) acc[m] += 1; return acc; },
      { cardinal: 0, fixed: 0, mutable: 0 }
    );
  }, [chart]);

  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter(a => a.from !== a.to)
      .filter(a => { const key = [a.from,a.to].sort().join(":")+":"+a.type; if(dedupe.has(key))return false; dedupe.add(key);return true; })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
  }, [chart]);

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

  /** Detect stellia: 3+ bodies in same house OR same sign */
  const stellia = useMemo(() => {
    if (!chart) return [];
    const byHouse = new Map<number, string[]>();
    const bySign  = new Map<string, string[]>();
    for (const p of chart.placements) {
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

  async function loadProfile(uid: string) {
    setLoading(true);
    const actualId = personId === "self"
      ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()).data?.id
      : personId;
    if (!actualId) { setStatus("No self profile yet."); setLoading(false); return; }
    const [{ data: pData, error: pErr }, { data: cData, error: cErr }, { data: nData }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min").eq("id", actualId).single(),
      supabase.from("charts").select("data").eq("person_id", actualId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualId).order("created_at", { ascending: false }).limit(20)
    ]);
    if (pErr || !pData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    if (cErr || !cData) { setStatus(cErr?.message  ?? "No chart yet."); setLoading(false); return; }
    const personRow = pData as PersonRow & { tz_offset_min?: number | null };
    let chartData = cData.data as NatalChart;
    const needsBackfill = personRow.birth_precision !== "year" && personRow.birth_place?.trim() && !personRow.birth_lat && !personRow.birth_lng;
    if (needsBackfill) {
      const birthDate = personRow.birth_date ? new Date(`${personRow.birth_date}T12:00:00Z`) : new Date();
      const geo = await geocodeCity(personRow.birth_place!, birthDate);
      if (geo) {
        await supabase.from("people").update({ birth_lat: geo.lat, birth_lng: geo.lng, tz_offset_min: geo.tzOffset }).eq("id", actualId);
        const { computeNatalChart } = await import("@galaxia/astro");
        const tzOffset = geo.tzOffset;
        let dateUTC: string;
        if (personRow.birth_time && personRow.birth_date) {
          const time = personRow.birth_time.slice(0, 5);
          const [yr, mo, dy] = personRow.birth_date.slice(0, 10).split("-").map(Number);
          const [hr, mn] = time.split(":").map(Number);
          dateUTC = new Date(Date.UTC(yr, mo - 1, dy, hr, mn, 0) - tzOffset * 60_000).toISOString();
        } else {
          dateUTC = personRow.birth_date ? `${personRow.birth_date.slice(0, 10)}T12:00:00.000Z` : new Date().toISOString();
        }
        const recomputed = computeNatalChart({ dateUTC, precision: personRow.birth_precision, lat: geo.lat, lng: geo.lng, tzOffsetMin: geo.tzOffset, houseSystem: "placidus" as const });
        await supabase.from("charts").upsert({ person_id: actualId, house_system: "placidus", data: recomputed, engine_version: 1 });
        chartData = recomputed;
      }
    }
    setPerson(personRow); setChart(chartData); setNotes((nData ?? []) as NoteRow[]); setLoading(false);
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

  if (!person || !chart) return (
    <main className="app-content">
      <p className="muted">{status ?? "Profile not found."}</p>
      <Link href="/welcome" className="btn-primary">Add birth data in onboarding</Link>
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

      {/* ── Chart Wheel ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          {chart.precision === "exact" && chart.asc ? "Natal wheel · Placidus" : "Zodiac wheel"}
        </p>
        <ChartWheel chart={chart} />
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
            { key: "sun",    label: "Sun",    sign: sun?.sign,  body: "sun",  house: sun?.house  },
            { key: "moon",   label: "Moon",   sign: moon?.sign, body: "moon", house: moon?.house },
            { key: "rising", label: "Rising", sign: chart.asc,  body: null,   house: undefined    },
          ] as { key: string; label: string; sign: string|undefined; body: string|null; house: number|undefined }[]).map(({ key, label, sign, body, house }) => {
            if (!sign) return (
              <div key={key} className="sign-chip" style={{ opacity: .45 }}>
                <span className="sign-chip__glyph" style={{ color: "var(--mist2)" }}>—</span>
                <span className="sign-chip__label">{label}</span>
                <span className="sign-chip__value">{label === "Rising" ? "Exact time + city needed" : "—"}</span>
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
          <p className="muted" style={{ fontSize: ".72rem", marginBottom: 12 }}>Placidus · click a house to read it</p>
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

      {/* ── Private notes ── */}
      <section className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Private notes</p>
        <p className="muted" style={{ fontSize: ".75rem", marginBottom: 10 }}>Owner-only · never shared · never in Vela shared mode</p>
        <textarea id="notes" className="field field--rect" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Log a private moment, pattern, or thing to remember…" rows={3} style={{ marginBottom: 10 }} />
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
