"use client";

/**
 * Quick Compatibility (/chart/compare) — public, no login required.
 *
 * Both charts and the synastry are computed server-side via
 * POST /api/quick-compare. If the visitor is logged in, their own chart
 * pre-fills Person A (read from their existing people/charts rows — no
 * recomputation of a person that already exists). Nothing new is stored
 * unless "Save to your galaxy" is clicked.
 */

import {
  type NatalChart,
  type BirthFormInput,
  interpretAspect,
  type AspectKey,
  type BodyKey,
} from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BASE_BIRTH_INPUT, BirthFields } from "../../../components/birth-fields";
import { QuickChartShell } from "../../../components/quick-chart-shell";
import { SaveToGalaxyButton } from "../../../components/save-to-galaxy-button";
import { ShareLinkButton } from "../../../components/share-link-button";
import { Spinner } from "../../../components/spinner";
import { aspectActionLine, sortAspectsForFocus, whatTheyNeed, type RelationType } from "../../../lib/compare-guidance";
import { COMPAT_LABELS, SIGN_GLYPH, compatWord } from "../../../lib/design";
import { birthQueryToSearchParams, decodeBirthQuery } from "../../../lib/quick-chart";
import { useViewer } from "../../../lib/use-viewer";

// Local shape matching @galaxia/astro's SynastryResult (avoids importing computeSynastry just for its type).
type SynastryShape = { scores: Record<string, number>; aspects: Array<{ from: string; to: string; type: string; orb: number; harmony: number }> };

interface CompareResult {
  chartA: NatalChart;
  chartB: NatalChart;
  synastry: SynastryShape | null;
  generational: { theme: string; shared: { planet: string; sign: string }[]; diverged: { planet: string; signA: string; signB: string }[] };
}

/**
 * Quick Chart's compatibility flow asks Romantic/Platonic, not the full
 * 5-value relationship-type picker /app/compare uses (that picker is
 * untouched — see CHANGELOG.md for the Phase 0 diagnosis). computeSynastry()
 * itself returns the same aspects/scores regardless of framing, so
 * "romantic"/"platonic" are wired as real RelationType values in
 * lib/compare-guidance.ts that change WHICH already-true data gets
 * surfaced (see sortAspectsForFocus and whatTheyNeed there) — not a
 * cosmetic label on identical output.
 */
const FOCUS_TYPES: { key: RelationType; label: string }[] = [
  { key: "romantic", label: "Romantic" },
  { key: "platonic", label: "Platonic" },
];

export default function QuickComparePage() {
  const viewer = useViewer();
  const [inputA, setInputA] = useState<BirthFormInput>(BASE_BIRTH_INPUT);
  const [inputB, setInputB] = useState<BirthFormInput>(BASE_BIRTH_INPUT);
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [usingMyChart, setUsingMyChart] = useState(false);
  const [relationType, setRelationType] = useState<RelationType>("romantic");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromShareLink, setFromShareLink] = useState(false);

  // Shared link: a_*/b_* birth params in the URL, no names.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = decodeBirthQuery(params, "a_");
    const b = decodeBirthQuery(params, "b_");
    if (a && b) {
      setInputA(a); setInputB(b); setFromShareLink(true);
      void runCompare(a, b, { updateUrl: false });
    }
  }, []);

  // Not a share link — prefill Person A from the logged-in user's own chart
  // once the viewer resolves (same data, now via the shared useViewer hook).
  useEffect(() => {
    if (fromShareLink || result) return;
    if (viewer.selfInput) {
      setInputA(viewer.selfInput);
      // Resolve the user's REAL saved name (grammar bug fix): the third-person
      // copy templates ("→ What {name} needs from you", "{name}'s Cancer Moon
      // means they need…") render "What You needs from you" if a literal "You"
      // is dropped in. Use the self record's display_name like /chart/page.tsx
      // does; "You" only survives as a last-resort fallback (a self chart
      // always has a required display_name, so it never actually renders).
      setNameA(viewer.selfName || "You");
      setUsingMyChart(true);
    }
  }, [viewer.selfInput, viewer.selfName, fromShareLink, result]);

  async function runCompare(a: BirthFormInput, b: BirthFormInput, opts: { updateUrl: boolean } = { updateUrl: true }) {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/quick-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b })
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not compare those two."); return; }
      setResult(body);
      if (opts.updateUrl) {
        const qs = new URLSearchParams([
          ...birthQueryToSearchParams(a, "a_"),
          ...birthQueryToSearchParams(b, "b_")
        ]).toString();
        window.history.replaceState(null, "", `/chart/compare?${qs}`);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const getSign = (chart: NatalChart, body: string) => {
    const p = chart.placements.find((pl) => pl.body === body);
    return p && p.confident !== false ? p.sign : undefined;
  };

  const personA = result ? { display_name: nameA || "Person A", sun: getSign(result.chartA, "sun"), moon: getSign(result.chartA, "moon"), venus: getSign(result.chartA, "venus"), mars: getSign(result.chartA, "mars") } : null;
  const personB = result ? { display_name: nameB || "Person B", sun: getSign(result.chartB, "sun"), moon: getSign(result.chartB, "moon"), venus: getSign(result.chartB, "venus"), mars: getSign(result.chartB, "mars") } : null;

  return (
    <QuickChartShell eyebrow="Quick Compatibility" title={fromShareLink ? "A compatibility reading" : viewer.userId ? "Check your compatibility." : "Check your compatibility, free."} authed={!!viewer.userId}>
      <p className="lede" style={{ marginBottom: 20 }}>
        Enter both birth dates for a real synastry reading — where you flow, where you catch, and what each of you needs. Nothing is saved unless you choose to.
      </p>

      {!result ? (
        <>
          {/* Mode: this choice only ever appears in compatibility mode — a
              solo chart (/chart) has no romantic/platonic dimension. */}
          <section className="glass-card fade-in" style={{ marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>What do you want to see?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Link href="/chart" className="pill-link" style={{ fontSize: ".82rem", padding: "8px 16px", textDecoration: "none" }}>
                Single chart
              </Link>
              <button type="button" className="pill-link" aria-pressed style={{ fontSize: ".82rem", padding: "8px 16px", borderColor: "rgba(230,174,108,.5)", color: "var(--gold)" }}>
                Check compatibility
              </button>
            </div>
          </section>

          <section className="glass-card fade-in" style={{ display: "grid", gap: 16 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Romantic or platonic?</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FOCUS_TYPES.map((t) => (
                  <button key={t.key} type="button" className="pill-link" onClick={() => setRelationType(t.key)}
                    style={{ fontSize: ".8rem", padding: "6px 13px", borderColor: relationType === t.key ? "rgba(230,174,108,.5)" : undefined, color: relationType === t.key ? "var(--gold)" : undefined }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Person A {usingMyChart ? "· using your chart" : ""}</p>
              {usingMyChart ? (
                <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                  <p style={{ color: "var(--teal)", fontSize: ".82rem", fontWeight: 600, margin: "0 0 4px" }}>✓ Using your own chart</p>
                  <button type="button" className="pill-link" style={{ fontSize: ".72rem", padding: "2px 10px" }} onClick={() => { setUsingMyChart(false); setInputA(BASE_BIRTH_INPUT); setNameA(""); }}>Not you? Enter someone else</button>
                </div>
              ) : (
                <>
                  <input className="field" value={nameA} onChange={(e) => setNameA(e.target.value)} placeholder="Name (optional)" style={{ marginBottom: 10, borderRadius: 14 }} />
                  <BirthFields input={inputA} onChange={setInputA} />
                </>
              )}
            </div>

            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Person B</p>
              <input className="field" value={nameB} onChange={(e) => setNameB(e.target.value)} placeholder="Name (optional)" style={{ marginBottom: 10, borderRadius: 14 }} />
              <BirthFields input={inputB} onChange={setInputB} />
            </div>

            <button className="btn-primary" onClick={() => runCompare(inputA, inputB)} disabled={loading} style={{ gap: 8, justifySelf: "start" }}>
              {loading && <Spinner size={13} color="#1a1206" />}
              {loading ? "Comparing…" : "See our compatibility"}
            </button>
            {error ? <p className="error" style={{ fontSize: ".84rem" }}>{error}</p> : null}
          </section>
        </>
      ) : (
        <>
          <section className="glass-card fade-in" style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "var(--cream)", margin: "0 0 4px" }}>
              {personA!.display_name} &amp; {personB!.display_name}
            </p>
            <p className="muted" style={{ fontSize: ".78rem" }}>{relationType}</p>
          </section>

          {!result.synastry ? (
            <section className="glass-card fade-in fade-in-delay-1">
              <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
                One of you has year-only birth data, so a full synastry read isn't possible — the planet-to-planet aspects would be guesses.
                What the generational layer shows: {result.generational.theme}
              </p>
            </section>
          ) : (
            <>
              <section className="glass-card fade-in fade-in-delay-1">
                <p className="eyebrow" style={{ marginBottom: 12 }}>Your dynamic</p>
                <div style={{ borderRadius: 14, background: "rgba(111,177,184,.06)", border: "1px solid rgba(111,177,184,.15)", padding: "4px 0", marginBottom: 14 }}>
                  {Object.entries(result.synastry.scores).map(([key, score]) => {
                    const { word, cls } = compatWord(score as number);
                    return (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderTop: key === "overall" ? "none" : "1px solid rgba(255,255,255,.04)" }}>
                        <span style={{ fontSize: ".82rem", color: "var(--mist)" }}>{COMPAT_LABELS[key] ?? key}</span>
                        <span className={`compat-word ${cls}`} style={{ fontSize: ".88rem", fontFamily: "var(--serif)" }}>{word}</span>
                      </div>
                    );
                  })}
                </div>

                {[personA!, personB!].map((person) => (
                  <div key={person.display_name} style={{ marginBottom: 10, padding: "13px 15px", borderRadius: 13, background: "linear-gradient(165deg, rgba(255,255,255,.025), rgba(255,255,255,.008))", border: "1px solid rgba(183,154,216,.12)" }}>
                    <p style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
                      → What {person.display_name} needs from you
                    </p>
                    <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, fontStyle: "italic", margin: 0 }}>
                      {whatTheyNeed(result.synastry.scores, person, relationType, result.synastry as never)}
                    </p>
                  </div>
                ))}
              </section>

              <section className="glass-card fade-in fade-in-delay-2">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Where it flows and catches</p>
                <p className="muted" style={{ fontSize: ".72rem", marginBottom: 8 }}>
                  {relationType === "romantic"
                    ? "Leading with attraction and partnership aspects (Venus, Mars, Sun–Moon) first."
                    : "Leading with communication and understanding aspects (Mercury, Moon, Jupiter) first."}
                </p>
                {sortAspectsForFocus(result.synastry.aspects.filter((a) => a.from !== a.to).sort((a, b) => a.orb - b.orb), relationType === "romantic" || relationType === "platonic" ? relationType : null).slice(0, 6).map((a, idx) => {
                  const reading = interpretAspect(a.from.toLowerCase() as BodyKey, a.to.toLowerCase() as BodyKey, a.type.toLowerCase() as AspectKey);
                  const flows = a.harmony >= 0;
                  return (
                    <div key={`${a.from}-${a.to}-${idx}`} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: ".8rem", color: flows ? "var(--teal)" : "var(--rose)", flexShrink: 0 }}>{flows ? "↑ flows" : "↓ catches"}</span>
                        <span className="muted" style={{ fontSize: ".82rem" }}>{a.from} {a.type} {a.to}</span>
                        <span className="muted" style={{ fontSize: ".74rem", fontStyle: "italic" }}>{reading.short}</span>
                        <span className="muted" style={{ fontSize: ".72rem", marginLeft: "auto", flexShrink: 0 }}>{a.orb.toFixed(1)}°</span>
                      </div>
                      {/* Reading → action: minimize the clash / nurture the ease, grounded in these two bodies. */}
                      <p style={{ fontSize: ".78rem", color: "var(--cream)", lineHeight: 1.55, margin: "5px 0 0" }}>
                        <span style={{ color: flows ? "var(--teal)" : "var(--gold)", fontWeight: 600 }}>{flows ? "Nurture it: " : "Ease it: "}</span>
                        {aspectActionLine(a, relationType)}
                      </p>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Generational call-out</p>
            <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>{result.generational.theme}</p>
            {result.generational.shared.length > 0 ? (
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>
                Shared sky: {result.generational.shared.map((s) => `${SIGN_GLYPH[s.sign] ?? ""} ${s.planet} in ${s.sign}`).join(" · ")}
              </p>
            ) : null}
          </section>

          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center", display: "grid", gap: 12 }}>
            {!usingMyChart ? <SaveToGalaxyButton birthInput={inputA} defaultName={nameA || undefined} /> : null}
            <SaveToGalaxyButton birthInput={inputB} defaultName={nameB || undefined} />
            <ShareLinkButton url={shareUrl} />
            <button type="button" className="pill-link" onClick={() => { setResult(null); setFromShareLink(false); }}>
              Try another comparison
            </button>
          </section>
        </>
      )}
    </QuickChartShell>
  );
}
