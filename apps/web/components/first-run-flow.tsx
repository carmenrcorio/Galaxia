"use client";

import { singleChartNeed, type BirthFormInput, type NatalChart, type SingleChartNeed } from "@galaxia/astro";
import {
  FIRST_RUN_RELATION_OPTIONS,
  FIRST_RUN_STEPS,
  firstRunRelationById,
  isFirstRunSettled,
  type FirstRunRelationOption,
  type FirstRunStep,
} from "@galaxia/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddPersonForm, AskAfterAdd, type AddPersonSavedInfo } from "./add-person-form";
import { BASE_BIRTH_INPUT, BirthFields } from "./birth-fields";
import { Spinner } from "./spinner";
import {
  readFirstRunProfile,
  recordFirstRunStep,
  reopenFirstRun,
  resolveFirstRunEntry,
  settleFirstRun,
} from "../lib/first-run";
import { persistPerson } from "../lib/persist-person";
import { decodeBirthQuery } from "../lib/quick-chart";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

/* ─── First-run orientation copy ───────────────────────────────────────────
 * The flow leads with the other person: the reader reads one true sentence
 * about someone they actually know before they are asked for anything about
 * themselves.
 *
 * All user-facing voice lives here so the founder can refine it in one place.
 * Steps 1 and 2 are layer one (`design/galaxia-voice-layers.md`): lead with the
 * outcome, astrology is not the first word. Step 3 is where layer two starts,
 * because the statement names the placement it came from.
 *
 * Field-level copy (the minor checkbox, the precision tiers) lives on
 * AddPersonForm and BirthFields so the standalone /app/add-person page cannot
 * drift from this one. Never duplicate it here.
 * ────────────────────────────────────────────────────────────────────────── */

// FOUNDER-REVIEW: authored first-run copy — refine voice.
export const FIRST_RUN_COPY = {
  pageEyebrow: "First run",
  pageTitle: "Start with someone you already know",
  // Five labels share a 375px row, so each one has about 65px. Anything longer
  // than four or five characters ellipsises into nonsense ("WHAT T...").
  stepLabels: ["Who", "Them", "Need", "You", "Next"] as const,
  skip: "Skip for now",

  // Step 1 — who
  whoEyebrow: "Step 1 of 5",
  whoTitle: "Who do you want to understand first?",
  whoLede:
    "Pick one person. You are not committing to anything, and you can add everyone else afterwards.",

  // Step 2 — their birth details
  birthEyebrow: "Step 2 of 5",
  birthTitle: "What do you know about their birth?",
  birthLede:
    "Whatever you have is enough to begin. Every level below produces a real chart, computed from real ephemeris data. More detail just unlocks more of it.",
  birthSubmit: "Read what this says",
  birthSaving: "Reading the sky…",
  birthNoDeferral:
    "This one step needs a birth year at minimum, because the next screen shows you something true about them and there is nothing true to show without it.",

  // Step 3 — the statement
  readingEyebrow: "Step 3 of 5",
  readingTitle: (name: string) => `One true thing about ${name}`,
  readingProvenance: "Computed from their birth data. Not generated, not guessed.",
  readingGenerational:
    "A birth year settles only the slowest planets, so this describes the era that shaped them rather than them alone. Add their date and this gets personal.",
  readingEmpty: (name: string) =>
    `The year you gave does not settle a single placement for ${name}, so there is nothing true to say yet. Add their birth date from their profile and this fills in straight away.`,
  readingRefused: (name: string) =>
    `${name} is a minor, so this is saved as an unspecified relationship. Galaxia never holds a romantic or partner framing against a child.`,
  readingContinue: "See what this means between you",
  readingContinueHasSelf: "Back to the next step",

  // Step 4 — you
  youEyebrow: "Step 4 of 5",
  youTitle: (name: string) => (name ? `Now you, so we can read you and ${name} together` : "Now you"),
  youLede: (name: string) =>
    `One chart tells you how ${name} is built. Two charts tell you what happens in the room when you are both in it. Your details stay private, and they are never shown to anyone.`,
  youNamePlaceholder: "Your name",
  youSubmit: "This is me. Continue",
  youSaving: "Placing you…",

  // Step 5 — next
  nextEyebrow: "Step 5 of 5",
  nextTitle: "Your sky has started. Where next?",
  nextAddTitle: "Add another person",
  nextAddBody:
    "The picture gets richer with every person in it. Same few questions, same few seconds.",
  nextCompareTitle: "See the two of you compared",
  nextCompareBody:
    "The synastry between your two charts: the aspects, where it flows easily, and where it catches.",
  nextRememberTitle: "Remember someone you have lost",
  // Existing remembrance language, carried over from the marketing section and
  // the person editor rather than written again.
  nextRememberBody:
    "The loved ones you've lost are still part of your sky. Their chart stays. Their light softens into ancient light on your galaxy: still with you, still comparable.",
  nextHome: "Open Galaxia Mea",
};

/* ─── Progress header ─────────────────────────────────────────────────────── */
function StepProgress({ current }: { current: FirstRunStep }) {
  const index = FIRST_RUN_STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }} aria-label={`Step ${index + 1} of ${FIRST_RUN_STEPS.length}`}>
      {FIRST_RUN_COPY.stepLabels.map((label, i) => {
        const state = i < index ? "done" : i === index ? "current" : "todo";
        return (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                height: 3,
                borderRadius: 999,
                background:
                  state === "todo" ? "rgba(183,154,216,.18)" : "linear-gradient(90deg, var(--gold-bright), var(--gold))",
                opacity: state === "current" ? 1 : state === "done" ? 0.85 : 1,
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: ".64rem",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: state === "todo" ? "var(--mist2)" : "var(--gold)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The person the reader is currently being shown, held across steps 2 to 5. */
type Subject = {
  personId: string;
  displayName: string;
  natal: NatalChart | null;
  isMinor: boolean;
  refusedRelation: string | null;
};

/* ─── WelcomePage ─────────────────────────────────────────────────────────── */
export function FirstRunFlow() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<FirstRunStep>("person");
  const [leaving, setLeaving] = useState(false);

  const [choice, setChoice] = useState<FirstRunRelationOption | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [hasSelf, setHasSelf] = useState(false);
  const [askAfterSave, setAskAfterSave] = useState(false);

  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(BASE_BIRTH_INPUT);
  const [savingSelf, setSavingSelf] = useState(false);

  const [prefillName, setPrefillName] = useState("");
  const [prefillBirth, setPrefillBirth] = useState<BirthFormInput | undefined>(undefined);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  // Recording progress must never block the reader, so the write is fired and
  // the UI moves on. See lib/first-run.ts for why that trade is the right way
  // round.
  const goTo = useCallback(
    (next: FirstRunStep, id: string | null) => {
      setStatus(null);
      setStep(next);
      if (id) void recordFirstRunStep(supabase, id, next);
    },
    [supabase]
  );

  const leave = useCallback(
    async (outcome: "done" | "skipped", href: string) => {
      setLeaving(true);
      if (userId) await settleFirstRun(supabase, userId, outcome);
      router.push(href as never);
    },
    [router, supabase, userId]
  );

  // Quick Chart hand-off: /chart's "Save to your galaxy" sends a signed-out
  // visitor through /signup?next=/welcome?prefill=...&name=... Prefill only,
  // never auto-submitted, always reviewed here.
  const restartRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    restartRef.current = params.get("restart") === "1";
    const prefill = decodeBirthQuery(params);
    if (!prefill) return;
    const name = params.get("name");
    if (name) setPrefillName(name);
    setPrefillBirth(prefill);
  }, []);

  // Load exactly once per mount. The flow reads the record and then writes to
  // it as the reader moves, so a second pass could re-read a half-written state
  // and bounce them to a different step than the one they are looking at.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      let profile = await readFirstRunProfile(supabase, user.id);
      // An explicit restart is the door back in for someone who skipped. It
      // clears the settled state rather than rendering the flow over a row
      // that still says "finished", which would resettle on the next write.
      if (restartRef.current && isFirstRunSettled(profile)) {
        await reopenFirstRun(supabase, user.id);
        profile = { onboarding_step: null, onboarding_completed_at: null };
      }

      const { data: peopleRows } = await supabase
        .from("people")
        .select("id, display_name, is_self, is_minor, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const rows = peopleRows ?? [];

      // Settled and not explicitly restarted: the flow is over, and the
      // constellation is where they belong.
      if (isFirstRunSettled(profile) && !restartRef.current) {
        router.replace("/app");
        return;
      }

      const entry = resolveFirstRunEntry(profile, rows);
      setHasSelf(entry.record.hasSelf);

      // Resuming into the reading needs the person and the chart back. Both
      // come from the record, so a resumed reading is the same true sentence
      // the reader would have seen, never a re-derived approximation.
      if (entry.step === "reading" || entry.step === "you") {
        const latest = rows.find((p) => p.is_self !== true);
        if (latest) {
          const { data: chart } = await supabase
            .from("charts")
            .select("data")
            .eq("person_id", latest.id)
            .maybeSingle();
          setSubject({
            personId: latest.id,
            displayName: latest.display_name,
            natal: (chart?.data as NatalChart | undefined) ?? null,
            isMinor: latest.is_minor === true,
            refusedRelation: null,
          });
        }
      }

      setStep(entry.step);
      setLoading(false);
    };
    void load();
  }, [router, supabase]);

  const onPersonSaved = (info: AddPersonSavedInfo) => {
    setSubject({
      personId: info.personId,
      displayName: info.displayName,
      natal: info.natal,
      isMinor: info.isMinor,
      refusedRelation: info.refusedRelation,
    });
    setAskAfterSave(info.askForBirthData);
    goTo("reading", userId);
  };

  const saveSelf = async () => {
    if (!userId) {
      setStatus({ text: "Please sign in first.", ok: false });
      return;
    }
    setSavingSelf(true);
    setStatus(null);
    try {
      // Re-check immediately before inserting rather than trusting state
      // loaded on mount, which a second tab can have made stale. The partial
      // unique index people_one_self_per_owner is the real backstop.
      const { data: existingSelf } = await supabase
        .from("people")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_self", true)
        .maybeSingle();
      if (existingSelf) {
        setHasSelf(true);
        goTo("next", userId);
        return;
      }
      await persistPerson(supabase, {
        userId,
        displayName: selfName,
        relation: "self",
        isSelf: true,
        isMinor: false,
        input: selfInput,
      });
      setHasSelf(true);
      goTo("next", userId);
    } catch (error) {
      // FOUNDER-REVIEW: first-run self persist failed.
      const message = error instanceof Error ? error.message : "Your profile could not be saved. Try again.";
      if (message.includes("people_one_self_per_owner")) {
        setHasSelf(true);
        goTo("next", userId);
      } else {
        setStatus({ text: message, ok: false });
      }
    } finally {
      setSavingSelf(false);
    }
  };

  /**
   * The one true statement. Derived from the chart the engine actually
   * computed for this person, and null when that chart settles nothing. There
   * is deliberately no fallback line.
   */
  const need: SingleChartNeed | null = useMemo(() => {
    if (!subject) return null;
    return singleChartNeed(subject.natal, {
      name: subject.displayName,
      minorSafe: subject.isMinor,
    });
  }, [subject]);

  const startAnother = (option: FirstRunRelationOption | null) => {
    setChoice(option);
    setSubject(null);
    goTo(option ? "birth" : "person", userId);
  };

  const canSaveSelf = selfName.trim().length > 1;

  return (
    <main className="app-content">
        <div className="fade-in">
          <p className="eyebrow">{FIRST_RUN_COPY.pageEyebrow}</p>
          <h1 className="page-title">{FIRST_RUN_COPY.pageTitle}</h1>
          <StepProgress current={step} />
        </div>

        {loading ? (
          <div className="glass-card">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" style={{ width: "90%" }} />
            <div className="skeleton skeleton-text" style={{ width: "75%" }} />
          </div>
        ) : (
          <>
            {/* ── STEP 1 — who ──────────────────────────────────────────── */}
            {step === "person" ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{FIRST_RUN_COPY.whoEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  {FIRST_RUN_COPY.whoTitle}
                </h2>
                <p className="muted" style={{ marginBottom: 16 }}>
                  {FIRST_RUN_COPY.whoLede}
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  {FIRST_RUN_RELATION_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="pill-link"
                      data-first-run-option={option.id}
                      style={{ textAlign: "left", padding: "12px 16px", fontSize: ".95rem" }}
                      onClick={() => {
                        setChoice(option);
                        goTo("birth", userId);
                      }}
                    >
                      {/* FOUNDER-REVIEW: first-run relationship quick option. */}
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── STEP 2 — their birth details ──────────────────────────── */}
            {step === "birth" && choice ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{FIRST_RUN_COPY.birthEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  {FIRST_RUN_COPY.birthTitle}
                </h2>
                <p className="muted" style={{ marginBottom: 14 }}>
                  {FIRST_RUN_COPY.birthLede}
                </p>
                <div className="teal-callout" style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.55, margin: 0 }}>
                    {FIRST_RUN_COPY.birthNoDeferral}
                  </p>
                </div>

                {userId ? (
                  <AddPersonForm
                    userId={userId}
                    initialName={prefillName}
                    initialBirth={prefillBirth}
                    initialRelation={choice.relation}
                    relationLocked
                    /* The next screen shows a true statement, which needs a
                       chart. Offering a tier that computes none would set the
                       reader up for an empty screen. */
                    allowDeferred={false}
                    passedAt={choice.memorial ? new Date().toISOString() : null}
                    resetOnSave={false}
                    showStatus={false}
                    submitLabel={FIRST_RUN_COPY.birthSubmit}
                    savingLabel={FIRST_RUN_COPY.birthSaving}
                    onSaved={onPersonSaved}
                    onError={(message) => setStatus({ text: message, ok: false })}
                  />
                ) : (
                  <p className="error">Please sign in first.</p>
                )}
              </section>
            ) : null}

            {/* ── STEP 3 — one true statement ───────────────────────────── */}
            {step === "reading" && subject ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{FIRST_RUN_COPY.readingEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 14 }}>
                  {FIRST_RUN_COPY.readingTitle(subject.displayName)}
                </h2>

                {subject.refusedRelation ? (
                  <p className="muted" style={{ marginBottom: 14, fontSize: ".82rem" }}>
                    {FIRST_RUN_COPY.readingRefused(subject.displayName)}
                  </p>
                ) : null}

                {need ? (
                  <>
                    <div className="teal-callout" data-first-run-statement>
                      <p
                        className="eyebrow"
                        style={{ marginBottom: 8 }}
                      >
                        {need.domain} · {need.lead}
                      </p>
                      <p style={{ color: "var(--cream)", fontSize: "1.02rem", lineHeight: 1.65, margin: 0 }}>
                        {need.statement}
                      </p>
                    </div>
                    <p className="muted" style={{ fontSize: ".76rem", marginTop: 10 }}>
                      {FIRST_RUN_COPY.readingProvenance}
                    </p>
                    {need.generational ? (
                      <p className="muted" style={{ fontSize: ".76rem", marginTop: 6 }}>
                        {FIRST_RUN_COPY.readingGenerational}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="muted" data-first-run-statement-empty>
                    {FIRST_RUN_COPY.readingEmpty(subject.displayName)}
                  </p>
                )}

                {userId && !subject.isMinor ? (
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(183,154,216,.1)" }}>
                    <AskAfterAdd
                      userId={userId}
                      info={{
                        personId: subject.personId,
                        displayName: subject.displayName,
                        isMinor: subject.isMinor,
                        askForBirthData: askAfterSave
                      }}
                    />
                  </div>
                ) : null}

                <button
                  className="btn-primary"
                  style={{ marginTop: 18 }}
                  onClick={() => goTo(hasSelf ? "next" : "you", userId)}
                >
                  {hasSelf ? FIRST_RUN_COPY.readingContinueHasSelf : FIRST_RUN_COPY.readingContinue}
                </button>
              </section>
            ) : null}

            {/* ── STEP 4 — you ──────────────────────────────────────────── */}
            {step === "you" ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{FIRST_RUN_COPY.youEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  {FIRST_RUN_COPY.youTitle(subject?.displayName ?? "")}
                </h2>
                <p className="muted" style={{ marginBottom: 14 }}>
                  {FIRST_RUN_COPY.youLede(subject?.displayName ?? "them")}
                </p>

                <input
                  className="field"
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  placeholder={FIRST_RUN_COPY.youNamePlaceholder}
                  style={{ marginBottom: 12, borderRadius: 14 }}
                />
                <BirthFields input={selfInput} onChange={setSelfInput} idPrefix="self" />

                <button
                  className="btn-primary"
                  style={{ marginTop: 16, gap: 8 }}
                  disabled={!canSaveSelf || savingSelf}
                  onClick={() => void saveSelf()}
                >
                  {savingSelf && <Spinner size={13} color="#1a1206" />}
                  {savingSelf ? FIRST_RUN_COPY.youSaving : FIRST_RUN_COPY.youSubmit}
                </button>
              </section>
            ) : null}

            {/* ── STEP 5 — next ─────────────────────────────────────────── */}
            {step === "next" ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{FIRST_RUN_COPY.nextEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 16 }}>
                  {FIRST_RUN_COPY.nextTitle}
                </h2>

                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    className="glass-card"
                    style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
                    onClick={() => startAnother(null)}
                  >
                    <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>
                      {FIRST_RUN_COPY.nextAddTitle}
                    </strong>
                    <span className="muted" style={{ fontSize: ".82rem" }}>{FIRST_RUN_COPY.nextAddBody}</span>
                  </button>

                  {/* The memorial option, named on this screen rather than left
                      to be discovered on a person's profile later. */}
                  <button
                    type="button"
                    className="glass-card"
                    data-first-run-remember
                    style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
                    onClick={() => startAnother(firstRunRelationById("lost"))}
                  >
                    <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>
                      {FIRST_RUN_COPY.nextRememberTitle}
                    </strong>
                    <span className="muted" style={{ fontSize: ".82rem" }}>{FIRST_RUN_COPY.nextRememberBody}</span>
                  </button>

                  <button
                    type="button"
                    className="glass-card"
                    style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
                    disabled={leaving}
                    onClick={() => void leave("done", "/app/compare")}
                  >
                    <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>
                      {FIRST_RUN_COPY.nextCompareTitle}
                    </strong>
                    <span className="muted" style={{ fontSize: ".82rem" }}>{FIRST_RUN_COPY.nextCompareBody}</span>
                  </button>
                </div>

                <button
                  className="btn-primary"
                  style={{ marginTop: 18 }}
                  disabled={leaving}
                  onClick={() => void leave("done", "/app")}
                >
                  {FIRST_RUN_COPY.nextHome}
                </button>
              </section>
            ) : null}

            {status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}

            {/* Skippable at any point. Never a dead end, and never a step the
                reader is trapped in. */}
            {step !== "next" ? (
              <div className="fade-in" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="pill-link"
                  data-first-run-skip
                  disabled={leaving}
                  onClick={() => void leave("skipped", "/app")}
                >
                  {FIRST_RUN_COPY.skip}
                </button>
              </div>
            ) : null}
          </>
        )}
    </main>
  );
}
