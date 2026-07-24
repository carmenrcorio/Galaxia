"use client";

import {
  computeNatalChart,
  buildBirthInput,
  formatDateForConfirmation,
  searchPlaces,
  type BirthFormInput,
  type GeoCandidate,
  CHART_ENGINE_VERSION,
} from "@galaxia/astro";
import {
  OWNED_DELETE_COPY,
  formatPersonDeleteConfirmation,
  groupsCollapsedByMemberRemoval,
  isMinorForSafety
} from "@galaxia/core";
import { useState } from "react";
import { getPreferredHouseSystem } from "../lib/house-system";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { AskBirthData } from "./ask-birth-data";
import { CustomCheck } from "./custom-check";
import { Spinner } from "./spinner";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

interface PersonRow {
  id: string; display_name: string; relation: string; is_minor: boolean;
  birth_precision: "none"|"exact"|"date"|"year";
  birth_date?: string|null; birth_time?: string|null;
  birth_place?: string|null; birth_lat?: number|null; birth_lng?: number|null;
  tz_offset_min?: number|null;
  /** Remembrance: when marked as passed. NULL = present. Reversible; chart untouched. */
  passed_at?: string|null;
  is_self?: boolean;
}
interface Props { person: PersonRow; userId: string; onSaved: () => void; onDeleted: () => void; }

/** Parse stored "YYYY-MM-DD" → {month,day,year} */
function parseDateStr(s: string | null | undefined): { month?: number; day?: number; year?: number } {
  if (!s) return {};
  const [yr, mo, dy] = s.slice(0, 10).split("-").map(Number);
  return { year: yr, month: mo, day: dy };
}

/** Parse stored "HH:MM:SS" → {hour, minute} */
function parseTimeStr(s: string | null | undefined): { hour?: number; minute?: number } {
  if (!s) return {};
  const [hr, mn] = s.slice(0, 5).split(":").map(Number);
  return { hour: hr, minute: mn };
}

export function EditPersonPanel({ person, userId, onSaved, onDeleted }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [open, setOpen]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [confirmRemembrance, setConfirmRemembrance] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [remembranceBusy, setRemembranceBusy] = useState(false);
  const [status, setStatus]         = useState<string|null>(null);
  const [displayName, setDisplayName] = useState(person.display_name);
  const [relation, setRelation]     = useState(person.relation);
  const [isMinor, setIsMinor]       = useState(person.is_minor);
  const [passedAt, setPassedAt]     = useState<string|null>(person.passed_at ?? null);

  // Populate structured fields from stored data
  const storedDate = parseDateStr(person.birth_date);
  const storedTime = parseTimeStr(person.birth_time);
  const [input, setInput] = useState<BirthFormInput>({
    // A 'none' person is adding data now — default the form to a usable precision.
    precision: person.birth_precision === "none" ? "date" : person.birth_precision,
    ...storedDate,
    ...storedTime,
    yearOnly: person.birth_precision === "year" ? (storedDate.year ?? undefined) : undefined,
    birthPlace:  person.birth_place ?? "",
    lat:         person.birth_lat  != null ? String(person.birth_lat)  : "",
    lng:         person.birth_lng  != null ? String(person.birth_lng)  : "",
    tzOffsetMin: person.tz_offset_min != null ? person.tz_offset_min : undefined,
  });

  // City search state
  const [cityQuery,    setCityQuery]    = useState(person.birth_place ?? "");
  const [searching,    setSearching]    = useState(false);
  const [candidates,   setCandidates]   = useState<GeoCandidate[]>([]);
  const [searchError,  setSearchError]  = useState<string|null>(null);

  const resolvedPlace = Boolean(input.birthPlace && input.lat && input.lng);

  async function handleSearch() {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true); setCandidates([]); setSearchError(null);
    const dateForGeo = (input.year && input.month && input.day)
      ? new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0))
      : undefined;
    try {
      const results = await searchPlaces(q, dateForGeo);
      if (!results.length) setSearchError(`No places found for "${q}". Try adding a region or country.`);
      else setCandidates(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "The place search service couldn't be reached.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(c: GeoCandidate) {
    setInput(prev => ({ ...prev, birthPlace: c.label, lat: String(c.lat), lng: String(c.lng), tzOffsetMin: c.tzOffset ?? undefined, tzId: c.tzId }));
    setCityQuery(c.label); setCandidates([]);
  }

  async function save() {
    if (!displayName.trim()) { setStatus("Name is required."); return; }
    setSaving(true); setStatus(null);
    try {
      // A place with no coordinates means the user typed a city but never picked
      // one from the search results. Never geocode it silently — the first
      // result can be the wrong city (Jacksonville FL vs AR) and the whole
      // chart would be wrong. Require an explicit choice.
      const fi = { ...input };
      if (input.birthPlace?.trim() && !input.lat && !input.lng) {
        throw new Error("Search for the birth city and pick it from the results, so the right place (and timezone) is used.");
      }
      const built = buildBirthInput(fi);
      const houseSystem = await getPreferredHouseSystem(supabase, userId);
      const natal = computeNatalChart({ ...built.birth, houseSystem });
      // Age backstop runs at save time too (single source of truth, see
      // packages/core `isMinorForSafety`) — the manual checkbox can only add
      // protection, never remove it from a birth date that implies a minor.
      const effectiveIsMinor = isMinorForSafety({ isMinor, birthDate: built.birthDate, birthPrecision: fi.precision });
      const { error: pErr } = await supabase.from("people").update({
        display_name: displayName.trim(), relation, is_minor: effectiveIsMinor,
        birth_date: built.birthDate, birth_time: built.birthTime, birth_place: built.birthPlace,
        birth_precision: fi.precision,
        birth_lat: built.birth.lat ?? null, birth_lng: built.birth.lng ?? null,
        tz_offset_min: built.tzOffsetMin ?? null,
      }).eq("id", person.id).eq("owner_id", userId);
      if (pErr) throw new Error(pErr.message);
      const { error: cErr } = await supabase.from("charts").upsert({ person_id: person.id, house_system: natal.houseSystem ?? null, data: natal, engine_version: CHART_ENGINE_VERSION });
      if (cErr) throw new Error(cErr.message);
      setStatus("Saved."); setOpen(false); onSaved();
    } catch (err) { setStatus(err instanceof Error ? err.message : "Unable to save."); }
    finally { setSaving(false); }
  }

  async function beginDeletePerson() {
    setStatus(null);
    const { data: memberships, error: memErr } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("person_id", person.id);
    if (memErr) { setStatus(memErr.message); return; }

    const groupIds = [...new Set((memberships ?? []).map((r) => r.group_id as string))];
    const memberCounts: Array<{ groupId: string; name: string; memberCount: number }> = [];
    for (const gid of groupIds) {
      const [{ data: gRow }, { count }] = await Promise.all([
        supabase.from("groups").select("id, name").eq("id", gid).eq("owner_id", userId).maybeSingle(),
        supabase.from("group_members").select("person_id", { count: "exact", head: true }).eq("group_id", gid)
      ]);
      if (gRow) {
        memberCounts.push({
          groupId: gid,
          name: gRow.name as string,
          memberCount: count ?? 0
        });
      }
    }
    const collapsing = groupsCollapsedByMemberRemoval(memberCounts);

    const collapsingIds = collapsing.map((g) => g.groupId);
    let conversationCount = 0;
    const { count: personThreadCount } = await supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .or(`subject_person.eq.${person.id},pair_low.eq.${person.id},pair_high.eq.${person.id}`);
    conversationCount += personThreadCount ?? 0;
    if (collapsingIds.length > 0) {
      const { count: groupThreadCount } = await supabase
        .from("threads")
        .select("id", { count: "exact", head: true })
        .in("group_id", collapsingIds);
      conversationCount += groupThreadCount ?? 0;
    }

    // FOUNDER-REVIEW: formatPersonDeleteConfirmation
    setDeleteWarning(
      formatPersonDeleteConfirmation({
        personName: person.display_name,
        collapsingGroupNames: collapsing.map((g) => g.name),
        conversationCount
      })
    );
    setConfirmDelete(true);
  }

  async function deletePerson() {
    setDeleting(true);
    setStatus(null);
    const { error } = await supabase.rpc("delete_own_person", { p_person_id: person.id });
    setDeleting(false);
    if (error) {
      setStatus(error.message || OWNED_DELETE_COPY.personErrorGeneric);
      return;
    }
    onDeleted();
  }

  /**
   * Remembrance only — updates `passed_at` and leaves birth fields + chart
   * rows completely untouched. Reversible by clearing the timestamp.
   */
  async function setRemembrance(nextPassed: boolean) {
    setRemembranceBusy(true); setStatus(null);
    const value = nextPassed ? new Date().toISOString() : null;
    const { error } = await supabase.from("people")
      .update({ passed_at: value })
      .eq("id", person.id)
      .eq("owner_id", userId);
    setRemembranceBusy(false);
    if (error) { setStatus(error.message); return; }
    setPassedAt(value);
    setConfirmRemembrance(false);
    setStatus(nextPassed
      ? "Their light stays in your galaxy — remembered."
      : "Restored — they're held as present again.");
    onSaved();
  }

  if (!open) return <button className="pill-link" onClick={() => setOpen(true)} style={{ fontSize: 13 }}>Edit / delete</button>;

  const currentYear = new Date().getFullYear();
  const daysInMonth = (input.month && input.year) ? new Date(input.year, input.month, 0).getDate() : 31;

  const displayDate = (input.precision !== "year" && input.month && input.day && input.year)
    ? formatDateForConfirmation(input.month, input.day, input.year)
    : null;

  return (
    <section className="glass-card" style={{ marginTop: 10 }}>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Edit profile</p>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="field" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" />
        <input className="field" value={relation}    onChange={e => setRelation(e.target.value)}    placeholder="Relation" />
        <CustomCheck checked={isMinor} onChange={setIsMinor} label="Minor" />
        <p className="muted" style={{ fontSize: ".72rem", marginTop: -4 }}>
          Anyone whose birth date shows they're under 18 is automatically protected regardless of this box.
        </p>

        {/* Precision */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["exact","date","year"] as const).map(p => (
            <button key={p} className="pill-link"
              style={{ fontSize: 12, borderColor: input.precision === p ? "rgba(230,174,108,.5)" : undefined, color: input.precision === p ? "var(--gold)" : undefined }}
              onClick={() => setInput(prev => ({ ...prev, precision: p }))}>
              {p}
            </button>
          ))}
        </div>

        {/* Year-only */}
        {input.precision === "year" ? (
          <input type="number" className="field" value={input.yearOnly ?? ""} min={1800} max={currentYear}
            onChange={e => setInput(p => ({ ...p, yearOnly: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
            placeholder="Birth year (e.g. 1952)" />
        ) : (
          <>
            {/* Structured date */}
            <div>
              <p style={{ fontSize: ".72rem", color: "var(--mist2)", marginBottom: 4 }}>Birth date</p>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 5 }}>
                <select className="field" value={input.month ?? ""} onChange={e => setInput(p => ({ ...p, month: e.target.value ? parseInt(e.target.value, 10) : undefined }))}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
                <select className="field" value={input.day ?? ""} onChange={e => setInput(p => ({ ...p, day: e.target.value ? parseInt(e.target.value, 10) : undefined }))}>
                  <option value="">Day</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="field" value={input.year ?? ""} onChange={e => setInput(p => ({ ...p, year: e.target.value ? parseInt(e.target.value, 10) : undefined }))}>
                  <option value="">Year</option>
                  {Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {displayDate ? <p style={{ fontSize: ".72rem", color: "var(--teal)", marginTop: 4 }}>✓ {displayDate}</p> : null}
            </div>

            {/* Exact time */}
            {input.precision === "exact" ? (
              <div>
                <p style={{ fontSize: ".72rem", color: "var(--mist2)", marginBottom: 4 }}>Birth time (local)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  <select className="field" value={input.hour ?? ""} onChange={e => setInput(p => ({ ...p, hour: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined }))}>
                    <option value="">Hour</option>
                    {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00 ({h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`})</option>)}
                  </select>
                  <select className="field" value={input.minute ?? ""} onChange={e => setInput(p => ({ ...p, minute: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined }))}>
                    <option value="">Minute</option>
                    {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
                  </select>
                </div>
              </div>
            ) : null}

            {/* City search */}
            <div>
              <p style={{ fontSize: ".72rem", color: "var(--mist2)", marginBottom: 4 }}>Birth city</p>
              {resolvedPlace ? (
                <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                  <p style={{ color: "var(--teal)", fontSize: ".8rem", fontWeight: 600, margin: "0 0 4px" }}>✓ {input.birthPlace}</p>
                  <button type="button" className="pill-link" style={{ fontSize: ".7rem", padding: "2px 8px" }}
                    onClick={() => { setInput(p => ({ ...p, birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined })); setCityQuery(""); }}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 5 }}>
                    <input className="field" value={cityQuery}
                      onChange={e => { setCityQuery(e.target.value); setCandidates([]); setSearchError(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSearch(); } }}
                      placeholder="City, State / Country" />
                    <button type="button" className="pill-link" onClick={handleSearch} disabled={searching || !cityQuery.trim()} style={{ flexShrink: 0, gap: 5 }}>
                      {searching && <Spinner size={11} />}
                      {searching ? "…" : "Search"}
                    </button>
                  </div>
                  {searchError ? <p className="error" style={{ fontSize: ".7rem", marginTop: 4 }}>{searchError}</p> : null}
                  {candidates.map((c, i) => (
                    <button key={i} type="button" onClick={() => selectCandidate(c)}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(23,17,48,.8)", border: "1px solid rgba(183,154,216,.15)", borderRadius: 8, padding: "7px 10px", marginTop: 4, cursor: "pointer" }}>
                      <span style={{ color: "var(--cream)", fontSize: ".8rem" }}>{c.label}</span>
                      <span style={{ color: "var(--mist2)", fontSize: ".68rem", marginLeft: 6 }}>{c.lat.toFixed(4)}°</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {input.precision !== "exact" && userId ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(183,154,216,.1)" }}>
          <p className="muted" style={{ fontSize: ".76rem", marginBottom: 8 }}>Don't have their exact details? Let them fill it in:</p>
          <AskBirthData personId={person.id} personName={person.display_name} userId={userId} />
        </div>
      ) : null}

      {/* Remembrance — emotional action, never a checkbox beside Minor.
          Chart data stays; only `passed_at` changes. Hidden for self. */}
      {!person.is_self ? (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(183,154,216,.12)" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Remembrance</p>
          {passedAt ? (
            <>
              <p style={{ margin: "0 0 8px", color: "var(--cream)", fontSize: ".9rem", lineHeight: 1.55, fontFamily: "var(--serif)" }}>
                Remembered — their light is still arriving.
              </p>
              <p className="muted" style={{ fontSize: ".78rem", lineHeight: 1.55, marginBottom: 12 }}>
                Their chart stays. They remain in your galaxy and in Compare. You can restore them as present anytime.
              </p>
              {!confirmRemembrance ? (
                <button
                  type="button"
                  className="pill-link"
                  style={{ fontSize: ".82rem" }}
                  onClick={() => setConfirmRemembrance(true)}
                >
                  Hold them as present again
                </button>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, margin: 0, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                    Restore {displayName.trim() || "them"} as present in your galaxy? Their remembrance mark will clear; nothing else changes.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={remembranceBusy}
                      onClick={() => void setRemembrance(false)}
                      style={{ gap: 8 }}
                    >
                      {remembranceBusy && <Spinner size={13} color="#1a1206" />}
                      {remembranceBusy ? "Restoring…" : "Yes, hold them as present"}
                    </button>
                    <button type="button" className="pill-link" onClick={() => setConfirmRemembrance(false)}>
                      Never mind
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : !confirmRemembrance ? (
            <>
              <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, marginBottom: 12 }}>
                If they&apos;ve passed, you can remember them here. Their chart stays. Their light softens into ancient light on your galaxy — still with you, still comparable.
              </p>
              <button
                type="button"
                className="pill-link"
                style={{ fontSize: ".82rem", borderColor: "rgba(230,174,108,.35)", color: "var(--gold-soft)" }}
                onClick={() => setConfirmRemembrance(true)}
              >
                Remember them as passed
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: "1.15rem", color: "var(--cream)", lineHeight: 1.35 }}>
                Remember {displayName.trim() || "them"}?
              </p>
              <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, margin: 0, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                Their chart and place in your galaxy stay. On the constellation they&apos;ll shine as ancient light — soft, still arriving. You can reverse this anytime. This is remembrance, not removal.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={remembranceBusy}
                  onClick={() => void setRemembrance(true)}
                  style={{ gap: 8 }}
                >
                  {remembranceBusy && <Spinner size={13} color="#1a1206" />}
                  {remembranceBusy ? "Holding…" : "Yes — remember them"}
                </button>
                <button type="button" className="pill-link" onClick={() => setConfirmRemembrance(false)}>
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={save} disabled={saving} style={{ gap: 8 }}>
          {saving && <Spinner size={13} color="#1a1206" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button className="pill-link" onClick={() => setOpen(false)}>Cancel</button>
        {!confirmDelete
          ? <button className="pill-link" style={{ borderColor: "rgba(218,140,140,.4)", color: "var(--rose)" }} onClick={() => void beginDeletePerson()}>Delete</button>
          : <>
              <button className="pill-link" style={{ background: "rgba(218,140,140,.15)", borderColor: "var(--rose)", color: "var(--rose)", gap: 8 }} onClick={() => void deletePerson()} disabled={deleting}>
                {deleting && <Spinner size={12} color="var(--rose)" />}
                {deleting ? OWNED_DELETE_COPY.personConfirmingButton : OWNED_DELETE_COPY.personConfirmButton}
              </button>
              <button className="pill-link" onClick={() => { setConfirmDelete(false); setDeleteWarning(null); }}>Cancel</button>
            </>
        }
      </div>
      {confirmDelete && deleteWarning ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 8, color: "var(--rose)" }}>{deleteWarning}</p>
      ) : null}
      {status ? <p className={status.includes("light") || status.includes("Restored") || status === "Saved." ? "success" : "error"} style={{ fontSize: 13, marginTop: 8 }}>{status}</p> : null}
    </section>
  );
}
