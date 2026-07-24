"use client";

import { type BirthFormInput } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddPersonForm } from "../../components/add-person-form";
import { BASE_BIRTH_INPUT, BirthFields } from "../../components/birth-fields";
import { CosmicBackground } from "../../components/cosmic-background";
import { InitialAvatar } from "../../components/initial-avatar";
import { Spinner } from "../../components/spinner";
import { persistPerson } from "../../lib/persist-person";
import { decodeBirthQuery } from "../../lib/quick-chart";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

const baseInput: BirthFormInput = BASE_BIRTH_INPUT;

/* ─── Guided onboarding copy ───────────────────────────────────────────────
 * All user-facing onboarding voice lives here so the founder can refine it in
 * one place. Tone target: warm, plain-language, zero jargon, written for
 * someone whose only astrology exposure is a daily horoscope. The precision
 * story is framed positively at every turn — more data = more resolution,
 * never "you're missing something." A faint star is not less loved, only less
 * known. Nothing here ever implies missing data breaks the product.
 *
 * Field-level add-person copy (minor checkbox, etc.) lives on AddPersonForm so
 * the standalone /app/add-person page stays in sync — do not duplicate it here.
 * ────────────────────────────────────────────────────────────────────────── */

// FOUNDER-REVIEW: authored onboarding copy — refine voice.
const COPY = {
  steps: ["You", "Your first person", "What you got"] as const,

  // Step 1 — You
  selfEyebrow: "Step 1 · Start with you",
  selfTitle: "Let's place you in the sky first",
  selfLede:
    "Everything in Galaxia is drawn in relation to you — so you're the first star we plot. This stays completely private; it's your map, for you.",
  selfWhyTime:
    "Your birth time unlocks your Rising sign and your houses — the specific, personal way your chart is yours, not just your Sun sign. Don't know it? That's completely fine. You'll still get your Sun, your Moon, and real, accurate readings — we just leave out the parts a time would decide, rather than guessing them.",
  selfSaved: "You're in your sky",

  // Step 2 — Your first person (chrome only — fields are AddPersonForm)
  personEyebrow: "Step 2 · Add someone you love",
  personTitle: "Now add someone who matters to you",
  personLede:
    "A partner, a parent, a best friend, a child, someone you've lost. Galaxia comes alive when it's not just you — this is where you start seeing how two skies meet.",
  precisionTitle: "Add whatever you actually know — every level gives you something real",
  precisionExact:
    "Exact birth time: the full picture — their Rising, their houses, and how your two charts line up in fine detail.",
  precisionDate:
    "Just the date: still their Sun, Moon, and every planet — real, accurate readings and a real comparison with you. Only the time-specific parts (Rising, houses) wait until you know more.",
  precisionYear:
    "Only the year: that's the generational layer — the slow outer planets that shaped their whole era. Even just a birth year places your grandmother in your sky.",
  precisionNone:
    "Don't know their birthday yet? Add their name now and fill in the rest whenever you have it — or ask them. Nothing is lost by starting light.",

  // Step 3 — What you got
  doneEyebrow: "Step 3 · Your constellation is live",
  doneTitle: "That's your sky — here's what you can do with it",
  doneLede:
    "You've plotted your first stars. From here it only gets richer — every person you add deepens the picture. Here's where to go next:",
  pointerChart: "Open a chart to read someone's Sun, Moon, Rising, and placements in plain language.",
  pointerCompare: "Run a Compare to see how two people's charts actually meet — where it flows and where it catches.",
  pointerVela: "Ask Vela, your private guide, anything about the people in your sky. She reads real chart facts, never invents them."
};

/* ─── Progress header ─────────────────────────────────────────────────────── */
function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }} aria-label={`Step ${current} of 3`}>
      {COPY.steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                height: 3,
                borderRadius: 999,
                background:
                  state === "todo" ? "rgba(183,154,216,.18)" : "linear-gradient(90deg, var(--gold-bright), var(--gold))",
                opacity: state === "current" ? 1 : state === "done" ? 0.85 : 1
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
                whiteSpace: "nowrap"
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

/* ─── WelcomePage ─────────────────────────────────────────────────────────── */
export default function WelcomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [prefillName, setPrefillName] = useState("");
  const [prefillBirth, setPrefillBirth] = useState<BirthFormInput | undefined>(undefined);
  const [people, setPeople] = useState<
    Array<{ id: string; display_name: string; relation: string; birth_precision: string; is_self: boolean }>
  >([]);
  const [savingSelf, setSavingSelf] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  // No people cap. Value compounds with every person added; nothing is gated.
  const canSaveSelf = selfName.trim().length > 1;

  // BUG A: never show the create-self form to someone who already has a self.
  const selfPerson = people.find((p) => p.is_self) ?? null;
  const otherPeople = people.filter((p) => !p.is_self);

  // Resume at the right step: no self → step 1; self but no one else → step 2;
  // an established constellation → the "what you got" recap. The /start
  // resolver normally sends established users straight to /app, but if they do
  // reach here we still land them on the recap rather than the empty step 1.
  // Returning users who want to add someone use /app/add-person — not this flow.
  const resolveStep = (rows: typeof people): 1 | 2 | 3 => {
    const hasSelf = rows.some((p) => p.is_self);
    const hasOther = rows.some((p) => !p.is_self);
    if (!hasSelf) return 1;
    if (!hasOther) return 2;
    return 3;
  };

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data: peopleRows } = await supabase
        .from("people")
        .select("id, display_name, relation, birth_precision, is_self")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const rows = peopleRows ?? [];
      setPeople(rows);
      setStep(resolveStep(rows));
      setLoading(false);
    };
    void load();
  }, [supabase]);

  // Quick Chart hand-off: /chart's "Save to your galaxy" (signed-out path)
  // sends the visitor through /signup?next=/welcome?prefill=...&name=...
  // Prefill only — never auto-submitted, always reviewed and confirmed here.
  // It prefills the "add a person" form, so if it fires, jump to that step.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = decodeBirthQuery(params);
    if (!prefill) return;
    const name = params.get("name");
    if (name) setPrefillName(name);
    setPrefillBirth(prefill);
  }, []);

  const fetchPeople = async (): Promise<typeof people> => {
    if (!userId) return people;
    const { data } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_precision, is_self")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setPeople(rows);
    return rows;
  };

  const saveSelf = async () => {
    if (!userId) {
      setStatus({ text: "Please sign in first.", ok: false });
      return;
    }
    setSavingSelf(true);
    setStatus(null);
    try {
      // Re-check the database immediately before inserting — not the `people`
      // state loaded on mount, which can be stale (a second tab, a slow
      // reload, another device). This closes the race the old mount-only
      // check left open; the unique index below is the real backstop.
      const { data: existingSelf } = await supabase
        .from("people")
        .select("id, display_name")
        .eq("owner_id", userId)
        .eq("is_self", true)
        .maybeSingle();
      if (existingSelf) {
        const rows = await fetchPeople();
        setStep(resolveStep(rows));
        setStatus({ text: "You're already in your sky. Let's add the people around you.", ok: true });
        return;
      }
      const { natal } = await persistPerson(supabase, {
        displayName: selfName,
        relation: "self",
        isSelf: true,
        isMinor: false,
        input: selfInput,
        userId
      });
      await fetchPeople();
      const risingNote = natal?.asc
        ? ` Your Rising is ${natal.asc}.`
        : selfInput.precision === "exact"
          ? " (Resolve a birth city to unlock your Rising and houses.)"
          : "";
      setStatus({ text: `You're placed.${risingNote} Now for the people around you.`, ok: true });
      setStep(2);
    } catch (error) {
      // A unique-violation from people_one_self_per_owner means a self was
      // created concurrently (another tab/device) between our check and our
      // insert. The database is the real backstop for that race — never a
      // fabricated "success" here, and never a raw Postgres error surfaced.
      const message = error instanceof Error ? error.message : "Unable to save.";
      if (message.includes("people_one_self_per_owner")) {
        const rows = await fetchPeople();
        setStep(resolveStep(rows));
        setStatus({ text: "You're already in your sky (added just now, perhaps in another tab). Let's keep going.", ok: true });
      } else {
        setStatus({ text: message, ok: false });
      }
    } finally {
      setSavingSelf(false);
    }
  };

  // "View a chart" target for the recap: your own chart if present, else the
  // first person you added. Never a fabricated id.
  const chartTarget = selfPerson ?? otherPeople[0] ?? null;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="app-content">
        <div className="fade-in">
          <p className="eyebrow">Onboarding</p>
          <h1 className="page-title">Build your constellation</h1>
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
            {/* ── STEP 1 — You ─────────────────────────────────────────────── */}
            {step === 1 ? (
              <section className="glass-card fade-in">
                <p className="eyebrow">{COPY.selfEyebrow}</p>
                <h2 className="card-title" style={{ marginBottom: 8 }}>
                  {COPY.selfTitle}
                </h2>
                {/* FOUNDER-REVIEW: authored onboarding copy — refine voice. */}
                <p className="muted" style={{ marginBottom: 14 }}>
                  {COPY.selfLede}
                </p>

                <input
                  className="field"
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  placeholder="Your name"
                  style={{ marginBottom: 12, borderRadius: 14 }}
                />

                {/* FOUNDER-REVIEW: authored onboarding copy — refine voice. */}
                <div className="teal-callout" style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: ".84rem", color: "var(--mist)", lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "var(--cream)" }}>Why we ask for a birth time.</strong> {COPY.selfWhyTime}
                  </p>
                </div>

                <BirthFields input={selfInput} onChange={setSelfInput} />

                <button
                  className="btn-primary"
                  style={{ marginTop: 16, gap: 8 }}
                  disabled={!canSaveSelf || savingSelf}
                  onClick={saveSelf}
                >
                  {savingSelf && <Spinner size={13} color="#1a1206" />}
                  {savingSelf ? "Placing you…" : "This is me — continue"}
                </button>
              </section>
            ) : null}

            {/* ── STEP 2 — Your first person ───────────────────────────────── */}
            {step === 2 ? (
              <>
                <section className="glass-card fade-in">
                  <p className="eyebrow">{COPY.personEyebrow}</p>
                  <h2 className="card-title" style={{ marginBottom: 8 }}>
                    {COPY.personTitle}
                  </h2>
                  {/* FOUNDER-REVIEW: authored onboarding copy — refine voice. */}
                  <p className="muted" style={{ marginBottom: 14 }}>
                    {COPY.personLede}
                  </p>

                  {/* FOUNDER-REVIEW: authored precision-spectrum copy — refine voice. */}
                  <div className="teal-callout" style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: ".82rem", color: "var(--cream)", fontWeight: 600, margin: "0 0 8px" }}>
                      {COPY.precisionTitle}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                      <li style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55 }}>{COPY.precisionExact}</li>
                      <li style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55 }}>{COPY.precisionDate}</li>
                      <li style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55 }}>{COPY.precisionYear}</li>
                      <li style={{ fontSize: ".8rem", color: "var(--mist)", lineHeight: 1.55 }}>{COPY.precisionNone}</li>
                    </ul>
                  </div>

                  {userId ? (
                    <AddPersonForm
                      userId={userId}
                      initialName={prefillName}
                      initialBirth={prefillBirth}
                      showStatus={false}
                      onSaved={async ({ displayName, deferred }) => {
                        await fetchPeople();
                        setStatus({
                          text: deferred
                            ? `${displayName} is in your sky — open their profile to add a date, or ask them, whenever you're ready.`
                            : `${displayName} is in your constellation. Add another, or continue.`,
                          ok: true
                        });
                      }}
                      onError={(message) => setStatus({ text: message, ok: false })}
                    />
                  ) : (
                    <p className="error">Please sign in first.</p>
                  )}
                </section>

                {status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}

                {otherPeople.length > 0 ? (
                  <section className="glass-card fade-in fade-in-delay-1">
                    <p className="eyebrow">In your sky so far ({people.length})</p>
                    <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                      {people.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(183,154,216,.1)"
                          }}
                        >
                          <InitialAvatar name={p.display_name} size="sm" />
                          <div>
                            <div style={{ color: "var(--cream)", fontWeight: 600 }}>{p.display_name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {p.is_self ? "you" : p.relation} · {p.birth_precision}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={() => {
                        setStatus(null);
                        setStep(3);
                      }}
                    >
                      Continue to your constellation
                    </button>
                  </section>
                ) : (
                  <div className="fade-in">
                    {/* Never a dead end: momentum matters more than completeness.
                        You can always add people later from home. */}
                    <button
                      type="button"
                      className="pill-link"
                      onClick={() => {
                        setStatus(null);
                        setStep(3);
                      }}
                    >
                      I'll add someone later
                    </button>
                  </div>
                )}
              </>
            ) : null}

            {/* ── STEP 3 — What you got ────────────────────────────────────── */}
            {step === 3 ? (
              <>
                <section className="glass-card fade-in">
                  <p className="eyebrow">{COPY.doneEyebrow}</p>
                  <h2 className="card-title" style={{ marginBottom: 8 }}>
                    {COPY.doneTitle}
                  </h2>
                  {/* FOUNDER-REVIEW: authored onboarding copy — refine voice. */}
                  <p className="muted" style={{ marginBottom: 16 }}>
                    {COPY.doneLede}
                  </p>

                  {people.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                      <div className="avatar-cluster">
                        {people.slice(0, 5).map((p) => (
                          <InitialAvatar key={p.id} name={p.display_name} size="sm" />
                        ))}
                      </div>
                      <span className="muted" style={{ fontSize: ".84rem" }}>
                        {people.length} {people.length === 1 ? "star" : "stars"} in your sky
                      </span>
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gap: 10 }}>
                    {/* FOUNDER-REVIEW: authored next-step pointers — refine voice. */}
                    {chartTarget ? (
                      <Link
                        href={`/app/person/${chartTarget.id}`}
                        className="glass-card"
                        style={{ padding: "12px 16px", textDecoration: "none" }}
                      >
                        <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>View a chart →</strong>
                        <span className="muted" style={{ fontSize: ".82rem" }}>{COPY.pointerChart}</span>
                      </Link>
                    ) : null}
                    <Link href="/app/compare" className="glass-card" style={{ padding: "12px 16px", textDecoration: "none" }}>
                      <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>Run a Compare →</strong>
                      <span className="muted" style={{ fontSize: ".82rem" }}>{COPY.pointerCompare}</span>
                    </Link>
                    <Link href="/app/vela" className="glass-card" style={{ padding: "12px 16px", textDecoration: "none" }}>
                      <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>Ask Vela →</strong>
                      <span className="muted" style={{ fontSize: ".82rem" }}>{COPY.pointerVela}</span>
                    </Link>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                    <Link className="btn-primary" href="/app">
                      Open Galaxia Mea
                    </Link>
                    <Link href="/app/add-person" className="pill-link">
                      Add more people
                    </Link>
                  </div>
                </section>
              </>
            ) : null}

            {/* Step 1 surfaces its own inline status below the form */}
            {step === 1 && status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}
          </>
        )}
      </main>
    </div>
  );
}
