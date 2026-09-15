"use client";

/**
 * The Moment: a sixty-second reflection loop.
 * Three taps: person, type, save. The sky is attached from real transits.
 * Vela's paragraph is deterministic copy from the stored snapshot, not an LLM.
 */

import {
  captureMomentSnapshot,
  reflectMoment,
  type NatalChart
} from "@galaxia/astro";
import {
  MOMENT_NOTE_MAX,
  MOMENT_TYPE_IDS,
  type MomentTypeId,
  type PinThemeId,
  DEFAULT_FETCH_TIMEOUT_MS,
  withTimeout
} from "@galaxia/core";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InitialAvatar } from "../../../components/initial-avatar";
import { PinThemePicker } from "../../../components/pin-theme-picker";
import { Spinner } from "../../../components/spinner";
import {
  MOMENT_DEK,
  MOMENT_EYEBROW,
  MOMENT_NO_PEOPLE,
  MOMENT_NO_PEOPLE_ACTION,
  MOMENT_LOADING,
  MOMENT_LOAD_ERROR,
  MOMENT_RETRY,
  MOMENT_PIN_FAILED,
  MOMENT_SAVE_FAILED,
  MOMENT_NOTE_LABEL,
  MOMENT_NOTE_PLACEHOLDER,
  MOMENT_OPEN_RECORD,
  MOMENT_OPEN_RECORD_SELF,
  MOMENT_PAGE_TITLE,
  MOMENT_PERSON_LABEL,
  MOMENT_PIN,
  MOMENT_PINNED,
  MOMENT_PINNED_SELF,
  MOMENT_REFLECTION_HEADING,
  MOMENT_SAVE,
  MOMENT_SAVING,
  MOMENT_SKIP,
  MOMENT_SKY_ATTACHED,
  MOMENT_TYPE_CHIP_LABELS,
  MOMENT_TYPE_LABEL
} from "../../../lib/moment-copy";
import { APP_NAV_BRAND_HREF, EMPTY_STATE_WELCOME_HREF, personProfileHref } from "../../../lib/nav-links";
import { pinMomentReflection, saveMoment, updateNoteTheme } from "../../../lib/record";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

interface PersonLite {
  id: string;
  display_name: string;
  is_self: boolean;
  passed_at: string | null;
  birth_precision: "none" | "exact" | "date" | "year";
}

const CHIP = {
  fontSize: ".82rem",
  letterSpacing: ".02em",
  borderRadius: 999,
  padding: "8px 14px",
  cursor: "pointer",
  border: "1px solid rgba(230,174,108,.28)",
  background: "transparent",
  color: "var(--mist2)"
} as const;

const CHIP_ON = {
  ...CHIP,
  background: "rgba(230,174,108,.18)",
  color: "var(--gold)",
  border: "1px solid rgba(230,174,108,.5)"
} as const;

export default function MomentPage() {
  return (
    <Suspense fallback={<main className="app-content"><div className="skeleton skeleton-title" /></main>}>
      <MomentPageInner />
    </Suspense>
  );
}

function MomentPageInner() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const presetId = searchParams.get("personId");

  const [userId, setUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [charts, setCharts] = useState<Map<string, NatalChart>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [personId, setPersonId] = useState<string | null>(presetId);
  const [momentType, setMomentType] = useState<MomentTypeId | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [pinTheme, setPinTheme] = useState<PinThemeId | null>(null);

  const self = people.find((p) => p.is_self) ?? null;
  const person = people.find((p) => p.id === personId) ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        await withTimeout((async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { throw new Error("signed-out"); }
      setUserId(user.id);
      const { data: rows, error: peopleErr } = await supabase
        .from("people")
        .select("id, display_name, is_self, passed_at, birth_precision")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (peopleErr) throw peopleErr;
      const list = (rows ?? []) as PersonLite[];
      setPeople(list);
      const ids = list.map((p) => p.id);
      if (ids.length > 0) {
        const { data: chartRows, error: chartErr } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
        if (chartErr) throw chartErr;
        const next = new Map<string, NatalChart>();
        for (const row of chartRows ?? []) {
          if (row.person_id && row.data) next.set(row.person_id as string, row.data as NatalChart);
        }
        setCharts(next);
      }
        })(), DEFAULT_FETCH_TIMEOUT_MS);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, reload]);

  async function save() {
    if (!userId || !person || !momentType) return;
    setSaving(true);
    setStatus(null);
    const whenUTC = new Date().toISOString();
    const snapshot = captureMomentSnapshot({
      self: self
        ? { personId: self.id, chart: charts.get(self.id) ?? null, passedAt: self.passed_at, isSelf: true }
        : null,
      them: {
        personId: person.id,
        chart: charts.get(person.id) ?? null,
        passedAt: person.passed_at,
        isSelf: person.is_self
      },
      whenUTC
    });
    const text = reflectMoment({
      snapshot,
      personName: person.display_name,
      isSelf: Boolean(person.is_self)
    });
    const { id, error } = await saveMoment(supabase, {
      ownerId: userId,
      personId: person.id,
      selfId: self?.id ?? null,
      momentType,
      userText: note,
      snapshot,
      reflection: text
    });
    setSaving(false);
    if (error || !id) { setStatus(MOMENT_SAVE_FAILED); return; }
    setSavedId(id);
    setReflection(text);
  }

  async function pin() {
    if (!userId || !person || !savedId || !reflection || pinnedId) return;
    const { id, theme, error } = await pinMomentReflection(supabase, {
      ownerId: userId,
      personId: person.id,
      selfId: self?.id ?? null,
      sourceMomentId: savedId,
      reflection
    });
    if (error || !id) { setStatus(MOMENT_PIN_FAILED); return; }
    setPinnedId(id);
    setPinTheme(theme);
  }

  async function changeTheme(theme: PinThemeId | null) {
    if (!userId || !pinnedId) return;
    setPinTheme(theme);
    const { error } = await updateNoteTheme(supabase, userId, pinnedId, theme);
    if (error) setStatus(MOMENT_PIN_FAILED);
  }

  const others = people.filter((p) => !p.is_self);
  const picker = self ? [self, ...others] : people;

  return (
    <main className="app-content">
      <div className="fade-in">
        <p className="eyebrow">{MOMENT_EYEBROW}</p>
        <h1 className="page-title">{MOMENT_PAGE_TITLE}</h1>
        <p className="muted">{MOMENT_DEK}</p>
      </div>

      {loading ? (
        <section className="glass-card async-frame--form" aria-busy="true" aria-live="polite">
          <p className="muted" style={{ margin: 0 }}>{MOMENT_LOADING}</p>
        </section>
      ) : null}

      {!loading && loadError ? (
        <section className="glass-card async-frame--form" aria-live="polite">
          <p className="muted" style={{ margin: 0 }}>{MOMENT_LOAD_ERROR}</p>
          <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={() => setReload((n) => n + 1)}>
            {MOMENT_RETRY}
          </button>
        </section>
      ) : null}

      {!loading && !loadError && people.length === 0 ? (
        <section className="glass-card async-frame--form">
          <p className="muted" style={{ margin: 0 }}>{MOMENT_NO_PEOPLE}</p>
          <Link href={EMPTY_STATE_WELCOME_HREF as never} className="btn-primary" style={{ marginTop: 14 }}>
            {MOMENT_NO_PEOPLE_ACTION}
          </Link>
        </section>
      ) : null}

      {!loading && !loadError && people.length > 0 && !savedId ? (
        <section className="glass-card fade-in" style={{ display: "grid", gap: 18 }}>
          <div>
            <p className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 8px" }}>
              {MOMENT_PERSON_LABEL}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {picker.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={personId === p.id}
                  onClick={() => { setPersonId(p.id); setMomentType(null); }}
                  style={personId === p.id ? CHIP_ON : CHIP}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <InitialAvatar name={p.display_name} size="sm" personId={p.id} />
                    {p.is_self ? "You" : p.display_name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {person ? (
            <div>
              <p className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 8px" }}>
                {MOMENT_TYPE_LABEL}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {MOMENT_TYPE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={momentType === id}
                    onClick={() => setMomentType(id)}
                    style={momentType === id ? CHIP_ON : CHIP}
                  >
                    {MOMENT_TYPE_CHIP_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {person && momentType ? (
            <div>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase" }}>
                  {MOMENT_NOTE_LABEL}
                </span>
                <textarea
                  className="field field--rect"
                  value={note}
                  maxLength={MOMENT_NOTE_MAX}
                  placeholder={MOMENT_NOTE_PLACEHOLDER}
                  rows={3}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <p className="muted" style={{ fontSize: ".74rem", margin: "8px 0 12px" }}>{MOMENT_SKY_ATTACHED}</p>
              <button className="btn-primary" type="button" onClick={() => void save()} disabled={saving} style={{ gap: 8 }}>
                {saving ? <Spinner size={13} color="#1a1206" /> : null}
                {saving ? MOMENT_SAVING : MOMENT_SAVE}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {savedId && reflection && person ? (
        <section className="glass-card fade-in" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ margin: 0 }}>{MOMENT_REFLECTION_HEADING}</p>
          <p style={{ margin: 0, color: "var(--cream)", lineHeight: 1.6, fontSize: ".95rem" }}>{reflection}</p>
          {!pinnedId ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="btn-primary" type="button" onClick={() => void pin()}>{MOMENT_PIN}</button>
              <Link href={personProfileHref(person.id) as never} className="pill-link">{MOMENT_SKIP}</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <p className="muted" style={{ margin: 0 }}>{person.is_self ? MOMENT_PINNED_SELF : MOMENT_PINNED}</p>
              <PinThemePicker value={pinTheme} onChange={(theme) => void changeTheme(theme)} showHint />
              <Link href={personProfileHref(person.id) as never} className="pill-link">
                {person.is_self ? MOMENT_OPEN_RECORD_SELF : MOMENT_OPEN_RECORD}
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {status ? <p className="muted">{status}</p> : null}

      <p>
        <Link href={APP_NAV_BRAND_HREF as never} style={{ color: "var(--gold-soft)", fontSize: ".82rem", textDecoration: "none" }}>
          Back to home
        </Link>
      </p>
    </main>
  );
}
