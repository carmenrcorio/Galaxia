"use client";

/**
 * Structured birth data entry, extracted from apps/web/app/welcome/page.tsx so
 * it can be reused by the public Quick Chart forms without re-implementing the
 * never-fabricate rules (BUG A/B/C — see lib/birth.ts).
 *
 * Never uses free-text fields for date or time. Month/Day/Year selects
 * eliminate format ambiguity; Hour/Minute selects eliminate 12h/24h confusion;
 * city search returns a disambiguation list the user MUST choose from.
 */

import type { Precision } from "@galaxia/astro";
import { useMemo, useState } from "react";
import { formatDateForConfirmation, type BirthFormInput } from "../lib/birth";
import { searchPlaces, type GeoCandidate } from "../lib/geocode";
import { Spinner } from "./spinner";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const PRECISION_TIERS: { key: Precision; label: string; unlocks: string }[] = [
  { key: "exact", label: "Exact time", unlocks: "Full chart: Ascendant, houses, precise Moon, and all 10 planets." },
  { key: "date", label: "Date only", unlocks: "Sun, Moon, all planetary signs, and the generational layer. No Ascendant." },
  { key: "year", label: "Year only", unlocks: "Generational layer only — good for ancestors and anyone whose date you don't know." }
];

export const BASE_BIRTH_INPUT: BirthFormInput = {
  precision: "date",
  month: undefined, day: undefined, year: undefined,
  hour: undefined, minute: undefined,
  yearOnly: undefined,
  birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined, tzId: undefined
};

export function BirthFields({ input, onChange, allowNone = false }: { input: BirthFormInput; onChange: (next: BirthFormInput) => void; allowNone?: boolean }) {
  // Geocoder state
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeoCandidate[]>([]);
  const [cityQuery, setCityQuery] = useState(input.birthPlace ?? "");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Days in the selected month/year
  const daysInMonth = useMemo(() => {
    if (!input.month || !input.year) return 31;
    return new Date(input.year, input.month, 0).getDate();
  }, [input.month, input.year]);

  // Clamp day if month/year changed
  const clampedDay = input.day && input.day > daysInMonth ? daysInMonth : input.day;
  if (clampedDay !== input.day && clampedDay !== undefined) {
    onChange({ ...input, day: clampedDay });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);

  // Parsed date string for geocoding reference
  const dateForGeo = (input.year && input.month && input.day)
    ? new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0))
    : undefined;

  // Confirmation label: unambiguous date string shown before save
  const displayDate = (input.precision !== "year" && input.month && input.day && input.year)
    ? formatDateForConfirmation(input.month, input.day, input.year)
    : input.precision === "year" && input.yearOnly
    ? String(input.yearOnly)
    : null;

  // Resolved place confirmation
  const resolvedPlace = input.birthPlace && input.lat && input.lng;
  const tzLabel = resolvedPlace && input.tzId
    ? input.tzOffsetMin != null
      ? `${input.tzId} (UTC${input.tzOffsetMin >= 0 ? "+" : ""}${(input.tzOffsetMin / 60).toFixed(0)}h at birth date)`
      : `${input.tzId} (timezone offset could not be resolved — exact-time charts need it)`
    : null;

  const hasExactTimeAndPlace = input.precision === "exact" && resolvedPlace;
  const noPlaceWarning = input.precision === "exact" && !resolvedPlace;

  async function handleSearch() {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    setCandidates([]);
    setSearchError(null);
    try {
      const results = await searchPlaces(q, dateForGeo);
      if (!results.length) {
        setSearchError(`No places found for "${q}". Try adding a region or country (e.g. "Jacksonville, Arkansas").`);
      } else {
        setCandidates(results);
      }
    } catch (err) {
      // An outage is not "no results" — say what actually happened.
      setSearchError(err instanceof Error ? err.message : "The place search service couldn't be reached.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(c: GeoCandidate) {
    onChange({
      ...input,
      birthPlace: c.label,
      lat: String(c.lat),
      lng: String(c.lng),
      tzOffsetMin: c.tzOffset ?? undefined,
      tzId: c.tzId,
    });
    setCandidates([]);
    setCityQuery(c.label);
  }

  function clearPlace() {
    onChange({ ...input, birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined, tzId: undefined });
    setCityQuery("");
    setCandidates([]);
    setSearchError(null);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>

      {/* Precision selector */}
      <p style={{ fontSize: ".76rem", color: "var(--mist2)", lineHeight: 1.5, margin: 0 }}>
        Birth time and city are optional. Pick whatever you actually know — every tier below produces a real chart; more detail just unlocks more of it.
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {(allowNone
          ? [...PRECISION_TIERS, { key: "none" as const, label: "Add birth data later", unlocks: "Just save their name and relationship now — you can add a year, date, or exact time whenever you have it (or ask them to)." }]
          : PRECISION_TIERS
        ).map((tier) => (
          <button
            key={tier.key} type="button" className="glass-card"
            onClick={() => onChange({ ...BASE_BIRTH_INPUT, precision: tier.key })}
            style={{ textAlign: "left", cursor: "pointer", borderColor: input.precision === tier.key ? "var(--gold)" : "var(--line)", padding: "10px 14px" }}>
            <strong style={{ color: input.precision === tier.key ? "var(--gold)" : "var(--cream)", display: "block", marginBottom: 2 }}>
              {tier.label}
            </strong>
            <span className="muted" style={{ fontSize: ".8rem" }}>{tier.unlocks}</span>
          </button>
        ))}
      </div>

      {/* No birth data yet — nothing more to collect */}
      {input.precision === "none" ? null : input.precision === "year" ? (
        <div>
          <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth year</p>
          <input
            type="number" className="field" min={1800} max={currentYear}
            value={input.yearOnly ?? ""}
            onChange={e => onChange({ ...input, yearOnly: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g. 1952"
          />
        </div>
      ) : (
        <>
          {/* ── Structured date: Month / Day / Year ── */}
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth date</p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 6 }}>
              {/* Month */}
              <select className="field" value={input.month ?? ""} onChange={e => onChange({ ...input, month: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              {/* Day */}
              <select className="field" value={input.day ?? ""} onChange={e => onChange({ ...input, day: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {/* Year */}
              <select className="field" value={input.year ?? ""} onChange={e => onChange({ ...input, year: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Show parsed date back for confirmation */}
            {displayDate ? (
              <p style={{ fontSize: ".74rem", color: "var(--teal)", marginTop: 5 }}>
                ✓ {displayDate}
              </p>
            ) : null}
          </div>

          {/* ── Exact time: Hour / Minute ── */}
          {input.precision === "exact" ? (
            <div>
              <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth time (local time at birth place)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select className="field" value={input.hour ?? ""} onChange={e => onChange({ ...input, hour: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined })}>
                  <option value="">Hour</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00 ({h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`})</option>
                  ))}
                </select>
                <select className="field" value={input.minute ?? ""} onChange={e => onChange({ ...input, minute: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined })}>
                  <option value="">Minute</option>
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                  {/* allow any minute from birth certificate */}
                  {Array.from({length:60},(_,i)=>i).filter(m=>![0,5,10,15,20,25,30,35,40,45,50,55].includes(m)).map(m=>(
                    <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {/* ── City search with disambiguation ── */}
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>
              {input.precision === "exact" ? "Birth city — required for Ascendant and houses" : "Birth city (optional — improves precision)"}
            </p>

            {/* If a place is already resolved, show confirmation + clear button */}
            {resolvedPlace ? (
              <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                <p style={{ color: "var(--teal)", fontSize: ".82rem", fontWeight: 600, margin: "0 0 2px" }}>
                  ✓ {input.birthPlace}
                </p>
                <p style={{ color: "var(--mist2)", fontSize: ".72rem", margin: "0 0 6px" }}>
                  {input.lat && input.lng ? `${parseFloat(input.lat).toFixed(4)}°, ${parseFloat(input.lng).toFixed(4)}°` : ""}
                  {tzLabel ? ` · ${tzLabel}` : ""}
                </p>
                <button type="button" className="pill-link" style={{ fontSize: ".72rem", padding: "3px 10px" }} onClick={clearPlace}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="field"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setCandidates([]); setSearchError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSearch(); } }}
                    placeholder='e.g. "Jacksonville, Arkansas" or "London"'
                    style={{ borderRadius: 14 }}
                  />
                  <button
                    type="button" className="pill-link" onClick={handleSearch}
                    disabled={searching || !cityQuery.trim()}
                    style={{ flexShrink: 0, gap: 6 }}>
                    {searching && <Spinner size={12} />}
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>

                {searchError ? (
                  <p className="error" style={{ fontSize: ".74rem", marginTop: 5 }}>{searchError}</p>
                ) : null}

                {/* Disambiguation list — user MUST choose */}
                {candidates.length > 0 ? (
                  <div style={{ marginTop: 6, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(183,154,216,.2)" }}>
                    <p style={{ fontSize: ".7rem", color: "var(--mist2)", padding: "6px 12px", background: "rgba(10,7,23,.4)", margin: 0 }}>
                      {candidates.length} result{candidates.length > 1 ? "s" : ""}. Choose the correct one.
                    </p>
                    {candidates.map((c, i) => (
                      <button
                        key={i} type="button"
                        onClick={() => selectCandidate(c)}
                        style={{ width: "100%", textAlign: "left", background: "rgba(23,17,48,.8)", border: "none", borderTop: i > 0 ? "1px solid rgba(183,154,216,.1)" : "none", padding: "10px 12px", cursor: "pointer", transition: "background .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(29,22,64,.9)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(23,17,48,.8)")}
                      >
                        <span style={{ color: "var(--cream)", fontSize: ".84rem", fontWeight: 600 }}>{c.label}</span>
                        <span style={{ color: "var(--mist2)", fontSize: ".72rem", marginLeft: 8 }}>
                          {c.lat.toFixed(4)}°, {c.lng.toFixed(4)}°
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}

            {noPlaceWarning && !candidates.length && !resolvedPlace ? (
              <p className="error" style={{ fontSize: ".74rem", marginTop: 5 }}>
                A birth city is required for exact precision. Search above to resolve it.
              </p>
            ) : null}
          </div>

          {/* Manual coordinate override */}
          <details style={{ color: "var(--mist2)", fontSize: ".78rem" }}>
            <summary style={{ cursor: "pointer" }}>Enter coordinates manually (advanced)</summary>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <input className="field" value={input.lat ?? ""}
                onChange={e => onChange({ ...input, lat: e.target.value })}
                placeholder="Latitude (e.g. 34.8659)" />
              <input className="field" value={input.lng ?? ""}
                onChange={e => onChange({ ...input, lng: e.target.value })}
                placeholder="Longitude (e.g. -92.1099)" />
              <p style={{ margin: 0, fontSize: ".72rem", color: "var(--mist2)" }}>
                If entering coordinates manually, also set tzOffsetMin via the search above to ensure correct UTC conversion.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
