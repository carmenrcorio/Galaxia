"use client";

/**
 * Quick Chart (/chart) — public, no login required.
 *
 * Top-of-funnel acquisition + in-product utility: a real computed natal chart
 * from @galaxia/astro, computed server-side via POST /api/quick-chart. Nothing
 * is stored unless the visitor explicitly clicks "Save to your galaxy". The
 * name field is local-only — never sent into the shareable URL.
 */

import {
  type NatalChart,
  type BirthFormInput,
} from "@galaxia/astro";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BASE_BIRTH_INPUT, BirthFields } from "../../components/birth-fields";
import { ChartPdfExport } from "../../components/chart-pdf-export";
import { ChartWheel } from "../../components/chart-wheel";
import { QuickChartShell } from "../../components/quick-chart-shell";
import { SaveToGalaxyButton } from "../../components/save-to-galaxy-button";
import { ShareLinkButton } from "../../components/share-link-button";
import { Spinner } from "../../components/spinner";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../../lib/design";
import { BODY_DOMAIN, interpretPlacement, interpretRising, type BodyKey, type SignKey } from "../../lib/interpretations";
import { birthQueryToSearchParams, decodeBirthQuery } from "../../lib/quick-chart";
import { useViewer } from "../../lib/use-viewer";

interface QuickResult {
  chart: NatalChart;
  displayDate: string;
  birthPlace: string | null;
}

export default function QuickChartPage() {
  const router = useRouter();
  const viewer = useViewer();
  const [input, setInput] = useState<BirthFormInput>(BASE_BIRTH_INPUT);
  const [name, setName] = useState("");
  const [usingMyChart, setUsingMyChart] = useState(false);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fromShareLink, setFromShareLink] = useState(false);

  // Offer the logged-in user their own birth data as a pre-fill for the single
  // chart, mirroring how /chart/compare pre-fills Person A. Only a suggestion —
  // it fills the same BirthFields the anonymous flow uses; nothing auto-runs.
  const canUseMyChart = !!viewer.selfInput && !fromShareLink && !result;
  function useMyChart() {
    if (!viewer.selfInput) return;
    setInput(viewer.selfInput);
    setName(viewer.selfName || "You");
    setUsingMyChart(true);
  }

  // Opening a shared link: birth params are in the URL, no name (never encoded).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decoded = decodeBirthQuery(params);
    if (!decoded) return;
    setInput(decoded);
    setFromShareLink(true);
    void runChart(decoded, { updateUrl: false });
  }, []);

  async function runChart(birthInput: BirthFormInput, opts: { updateUrl: boolean } = { updateUrl: true }) {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/quick-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: birthInput })
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not compute that chart."); return; }
      setResult(body);
      if (opts.updateUrl) {
        const qs = birthQueryToSearchParams(birthInput).toString();
        window.history.replaceState(null, "", `/chart?${qs}`);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const sun = result?.chart.placements.find((p) => p.body === "sun");
  const moon = result?.chart.placements.find((p) => p.body === "moon");
  const rising = result?.chart.asc;

  const title = fromShareLink
    ? "A birth chart"
    : viewer.userId
      ? "See anyone's real chart."
      : "See anyone's real chart, free.";

  return (
    <QuickChartShell eyebrow="Quick Chart" title={title} authed={!!viewer.userId}>
      <p className="lede" style={{ marginBottom: 20 }}>
        Enter a birth date (and time and city, if known) for a real computed natal chart — Big Three, placements, and the wheel. Nothing is saved unless you choose to.
      </p>

      {!result ? (
        <>
          {/* Mode: a solo chart has no romantic/platonic dimension, so that
              choice only ever appears after picking Compatibility, on
              /chart/compare itself — not here. */}
          <section className="glass-card fade-in" style={{ marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>What do you want to see?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" className="pill-link" aria-pressed style={{ fontSize: ".82rem", padding: "8px 16px", borderColor: "rgba(230,174,108,.5)", color: "var(--gold)" }}>
                Single chart
              </button>
              <button type="button" className="pill-link" onClick={() => router.push("/chart/compare")} style={{ fontSize: ".82rem", padding: "8px 16px" }}>
                Check compatibility
              </button>
            </div>
          </section>

          <section className="glass-card fade-in" style={{ display: "grid", gap: 12 }}>
            {canUseMyChart ? (
              usingMyChart ? (
                <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                  <p style={{ color: "var(--teal)", fontSize: ".82rem", fontWeight: 600, margin: "0 0 4px" }}>✓ Using your own birth data</p>
                  <button type="button" className="pill-link" style={{ fontSize: ".72rem", padding: "2px 10px" }} onClick={() => { setUsingMyChart(false); setInput(BASE_BIRTH_INPUT); setName(""); }}>Not you? Enter someone else</button>
                </div>
              ) : (
                <button type="button" className="pill-link" onClick={useMyChart} style={{ fontSize: ".8rem", justifySelf: "start" }}>
                  ✦ Use my birth data
                </button>
              )
            ) : null}
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional — shown only to you, never saved or shared)" style={{ borderRadius: 14 }} />
            <BirthFields input={input} onChange={setInput} />
            <button className="btn-primary" onClick={() => runChart(input)} disabled={loading} style={{ gap: 8, justifySelf: "start" }}>
              {loading && <Spinner size={13} color="#1a1206" />}
              {loading ? "Computing…" : "See the chart"}
            </button>
            {error ? <p className="error" style={{ fontSize: ".84rem" }}>{error}</p> : null}
          </section>
        </>
      ) : (
        <>
          <section className="glass-card fade-in" style={{ textAlign: "center" }}>
            <p className="muted" style={{ fontSize: ".8rem", marginBottom: 4 }}>
              {name ? name : "This chart"} · {result.displayDate}{result.birthPlace ? ` · ${result.birthPlace}` : ""}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", margin: "14px 0" }}>
              {[
                { label: "Sun", body: sun, sign: sun?.sign },
                { label: "Moon", body: moon, sign: moon?.sign },
                { label: "Rising", body: null, sign: rising }
              ].map(({ label, body, sign }) => {
                if (!sign) return (
                  <div key={label} className="sign-chip" style={{ opacity: .45 }}>
                    <span className="sign-chip__glyph">—</span>
                    <span className="sign-chip__label">{label}</span>
                    <span className="sign-chip__value">{label === "Rising" ? "Needs time + city" : "—"}</span>
                  </div>
                );
                const reading = body ? interpretPlacement(body.body as BodyKey, sign as SignKey) : interpretRising(sign as SignKey);
                return (
                  <div key={label} className="sign-chip">
                    <span className="sign-chip__glyph" style={{ color: `var(--${signElement(sign)})` }}>{SIGN_GLYPH[sign]}</span>
                    <span className="sign-chip__label">{label}</span>
                    <span className="sign-chip__value">{sign}</span>
                    <span className="muted" style={{ fontSize: ".7rem", fontStyle: "italic", display: "block", marginTop: 3 }}>{reading.short}</span>
                  </div>
                );
              })}
            </div>
            {result.chart.cusps ? <ChartWheel chart={result.chart} /> : (
              <p className="muted" style={{ fontSize: ".76rem", marginTop: 8 }}>Add an exact time and city to unlock the full wheel, houses, and Rising sign.</p>
            )}
          </section>

          <section className="glass-card fade-in fade-in-delay-1">
            <button className="pill-link" onClick={() => setExpanded((e) => !e)} style={{ fontSize: ".82rem", marginBottom: expanded ? 12 : 0 }}>
              {expanded ? "▼ Hide full chart" : "▶ See full chart"}
            </button>
            {expanded ? (
              <div style={{ display: "grid", gap: 8 }}>
                {result.chart.placements.map((p) => {
                  if (p.confident === false) return (
                    <div key={p.body} style={{ display: "flex", gap: 10, alignItems: "center", opacity: .6, padding: "6px 0" }}>
                      <span style={{ width: 20, textAlign: "center" }}>{BODY_GLYPH[p.body] ?? p.body[0]}</span>
                      <span className="muted" style={{ fontSize: ".82rem" }}>{p.body[0].toUpperCase() + p.body.slice(1)} — sign uncertain, add a birth date to settle it</span>
                    </div>
                  );
                  const reading = interpretPlacement(p.body as BodyKey, p.sign as SignKey);
                  return (
                    <div key={p.body} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid rgba(183,154,216,.08)" }}>
                      <span style={{ width: 20, textAlign: "center", flexShrink: 0, color: `var(--${signElement(p.sign)})` }}>{BODY_GLYPH[p.body] ?? p.body[0]}</span>
                      <div>
                        <div style={{ fontSize: ".58rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist2)" }}>{BODY_DOMAIN[p.body as BodyKey]}</div>
                        <div style={{ fontSize: ".86rem", color: "var(--cream)", fontWeight: 600 }}>{p.body[0].toUpperCase() + p.body.slice(1)} in {p.sign}</div>
                        <div className="muted" style={{ fontSize: ".78rem", fontStyle: "italic" }}>{reading.short}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center", display: "grid", gap: 12 }}>
            <SaveToGalaxyButton birthInput={input} defaultName={name || undefined} />
            {/* Paid perk: only a real subscriber/trialing user sees this. The
                share link below stays free for everyone (acquisition funnel). */}
            {viewer.isSubscriber ? (
              <ChartPdfExport chart={result.chart} name={name || undefined} displayDate={result.displayDate} birthPlace={result.birthPlace} />
            ) : null}
            <ShareLinkButton url={shareUrl} />
            <button type="button" className="pill-link" onClick={() => { setResult(null); setFromShareLink(false); setUsingMyChart(false); }}>
              Try another chart
            </button>
          </section>
        </>
      )}
    </QuickChartShell>
  );
}
