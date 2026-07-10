"use client";

import { useMemo, useState } from "react";
import { formatDateForConfirmation, type BirthFormInput, type FormPrecision } from "../lib/birth";
import { searchPlaces, type GeoCandidate } from "../lib/geocode";
import { Spinner } from "./spinner";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Public, unauthenticated form for the person whose birth data is being
 * collected. Runs the same structured entry as the app (named-month selects,
 * Open-Meteo disambiguation, resolved timezone) so the write-back is never a
 * fabrication. Submits to /api/invite/birth-data.
 */
export function InviteBirthDataForm({ token, personName, inviterName }: { token: string; personName: string; inviterName: string }) {
  const [precision, setPrecision] = useState<Exclude<FormPrecision, "none">>("date");
  const [month, setMonth] = useState<number | undefined>();
  const [day, setDay] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [hour, setHour] = useState<number | undefined>();
  const [minute, setMinute] = useState<number | undefined>();
  const [yearOnly, setYearOnly] = useState<number | undefined>();

  const [cityQuery, setCityQuery] = useState("");
  const [candidates, setCandidates] = useState<GeoCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolved, setResolved] = useState<{ label: string; lat: number; lng: number; tzOffset: number | null; tzId: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const currentYear = new Date().getFullYear();
  const daysInMonth = useMemo(() => (month && year ? new Date(year, month, 0).getDate() : 31), [month, year]);
  const displayDate = precision !== "year" && month && day && year ? formatDateForConfirmation(month, day, year) : null;

  async function handleSearch() {
    if (!cityQuery.trim()) return;
    setSearching(true); setCandidates([]); setError(null);
    try {
      const dateForGeo = month && day && year ? new Date(Date.UTC(year, month - 1, day, 12, 0, 0)) : undefined;
      const results = await searchPlaces(cityQuery, dateForGeo);
      if (!results.length) setError(`No places found for "${cityQuery}". Try adding a region or country.`);
      else setCandidates(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Place search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    setSubmitting(true); setError(null);
    const input: BirthFormInput = {
      precision,
      month, day, year, hour, minute, yearOnly,
      birthPlace: resolved?.label ?? "",
      lat: resolved ? String(resolved.lat) : "",
      lng: resolved ? String(resolved.lng) : "",
      tzOffsetMin: resolved?.tzOffset ?? undefined,
      tzId: resolved?.tzId
    };
    try {
      const res = await fetch("/api/invite/birth-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, input })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? "Could not save. Please try again."); return; }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="glass-card" style={{ marginTop: 20 }}>
        <p style={{ color: "var(--gold)", fontSize: "1.1rem", marginBottom: 6 }}>✦ Thank you.</p>
        <p style={{ color: "var(--mist)" }}>Your birth details are with {inviterName}. Nothing else about you is shared, and you won't be contacted again through this link.</p>
      </div>
    );
  }

  const canSubmit =
    (precision === "year" && yearOnly) ||
    (precision === "date" && month && day && year) ||
    (precision === "exact" && month && day && year && hour !== undefined && minute !== undefined && resolved?.tzOffset != null);

  return (
    <div className="glass-card" style={{ marginTop: 20, display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 6 }}>
        {([
          { key: "exact", label: "I know my exact birth time" },
          { key: "date", label: "I know the date, not the time" },
          { key: "year", label: "I only know the year" }
        ] as { key: Exclude<FormPrecision, "none">; label: string }[]).map(t => (
          <button key={t.key} type="button" className="glass-card"
            onClick={() => setPrecision(t.key)}
            style={{ textAlign: "left", cursor: "pointer", padding: "10px 14px", borderColor: precision === t.key ? "var(--gold)" : "var(--line)" }}>
            <strong style={{ color: precision === t.key ? "var(--gold)" : "var(--cream)" }}>{t.label}</strong>
          </button>
        ))}
      </div>

      {precision === "year" ? (
        <input type="number" className="field" min={1800} max={currentYear} value={yearOnly ?? ""}
          onChange={e => setYearOnly(e.target.value ? parseInt(e.target.value, 10) : undefined)} placeholder="Birth year (e.g. 1990)" />
      ) : (
        <>
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth date</p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 6 }}>
              <select className="field" value={month ?? ""} onChange={e => setMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="field" value={day ?? ""} onChange={e => setDay(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="field" value={year ?? ""} onChange={e => setYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Year</option>
                {Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {displayDate ? <p style={{ fontSize: ".74rem", color: "var(--teal)", marginTop: 5 }}>✓ {displayDate}</p> : null}
          </div>

          {precision === "exact" ? (
            <div>
              <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth time (local time where you were born)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select className="field" value={hour ?? ""} onChange={e => setHour(e.target.value !== "" ? parseInt(e.target.value, 10) : undefined)}>
                  <option value="">Hour</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 ({h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`})</option>)}
                </select>
                <select className="field" value={minute ?? ""} onChange={e => setMinute(e.target.value !== "" ? parseInt(e.target.value, 10) : undefined)}>
                  <option value="">Minute</option>
                  {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                </select>
              </div>
            </div>
          ) : null}

          {/* City — required for exact (timezone), optional otherwise */}
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>
              Birth city {precision === "exact" ? "(required for an exact-time chart)" : "(optional)"}
            </p>
            {resolved ? (
              <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                <p style={{ color: "var(--teal)", fontSize: ".8rem", fontWeight: 600, margin: "0 0 4px" }}>✓ {resolved.label}</p>
                <button type="button" className="pill-link" style={{ fontSize: ".7rem", padding: "2px 8px" }} onClick={() => { setResolved(null); setCityQuery(""); }}>Change</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="field" value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setCandidates([]); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSearch(); } }}
                    placeholder="City, State / Country" />
                  <button type="button" className="pill-link" onClick={handleSearch} disabled={searching || !cityQuery.trim()} style={{ flexShrink: 0, gap: 5 }}>
                    {searching && <Spinner size={11} />}{searching ? "…" : "Search"}
                  </button>
                </div>
                {candidates.map((c, i) => (
                  <button key={i} type="button" onClick={() => { setResolved({ label: c.label, lat: c.lat, lng: c.lng, tzOffset: c.tzOffset, tzId: c.tzId }); setCandidates([]); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(23,17,48,.8)", border: "1px solid rgba(183,154,216,.15)", borderRadius: 8, padding: "7px 10px", marginTop: 4, cursor: "pointer" }}>
                    <span style={{ color: "var(--cream)", fontSize: ".8rem" }}>{c.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {error ? <p className="error" style={{ fontSize: ".82rem" }}>{error}</p> : null}
      <button className="btn-primary" onClick={submit} disabled={submitting || !canSubmit} style={{ gap: 8 }}>
        {submitting && <Spinner size={13} color="#1a1206" />}
        {submitting ? "Saving…" : `Share my birth details with ${inviterName}`}
      </button>
      <p style={{ fontSize: ".72rem", color: "var(--mist2)", margin: 0 }}>
        Only your birth details are shared, so {inviterName} can understand your connection. You won't see anyone's private notes, and nothing else about you is collected.
      </p>
    </div>
  );
}
