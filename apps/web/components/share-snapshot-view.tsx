"use client";

/**
 * Read-only renderer for /s/<token> snapshots.
 * Displays the stored computed reading only — never recomputes placements,
 * orbs, or confidence. Compare framing uses stored pairHasMinor; romantic+minor
 * is a render backstop only (persist refuses to create such rows).
 */

import {
  BODY_DOMAIN,
  interpretPlacement,
  interpretRising,
  whatTheyNeed,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";
import { useState } from "react";
import {
  effectiveCompareFraming,
  QUICK_COMPARE_HELD_READING,
  QUICK_COMPARE_MINOR_NOTICE,
  type CompareSharePayload,
  type QuickShareKind,
  type QuickSharePayload,
  type SingleSharePayload,
} from "../lib/quick-share";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../lib/design";
import { useViewer } from "../lib/use-viewer";
import { ChartPdfExport } from "./chart-pdf-export";
import { ChartWheel } from "./chart-wheel";
import { DynamicTableSection } from "./dynamic-table-section";
import { FlowsAndCatchesSection } from "./flows-and-catches-section";
import { QuickChartShell } from "./quick-chart-shell";

function getSign(chart: NatalChart, body: string) {
  const p = chart.placements.find((pl) => pl.body === body);
  return p && p.confident !== false ? p.sign : undefined;
}

function SingleSnapshot({ payload }: { payload: SingleSharePayload }) {
  const viewer = useViewer();
  const [expanded, setExpanded] = useState(false);
  const sun = payload.chart.placements.find((p) => p.body === "sun");
  const moon = payload.chart.placements.find((p) => p.body === "moon");
  const rising = payload.chart.asc;
  const label = payload.name || "This chart";

  return (
    <>
      <section className="glass-card fade-in" style={{ textAlign: "center" }}>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 4 }}>
          {label} · {payload.displayDate}
          {payload.birthPlace ? ` · ${payload.birthPlace}` : ""}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", margin: "14px 0" }}>
          {[
            { label: "Sun", body: sun, sign: sun?.sign },
            { label: "Moon", body: moon, sign: moon?.sign },
            { label: "Rising", body: null, sign: rising },
          ].map(({ label: chipLabel, body, sign }) => {
            if (!sign) {
              return (
                <div key={chipLabel} className="sign-chip" style={{ opacity: 0.45 }}>
                  <span className="sign-chip__glyph">—</span>
                  <span className="sign-chip__label">{chipLabel}</span>
                  <span className="sign-chip__value">{chipLabel === "Rising" ? "Needs time + city" : "—"}</span>
                </div>
              );
            }
            const reading = body
              ? interpretPlacement(body.body as BodyKey, sign as SignKey)
              : interpretRising(sign as SignKey);
            return (
              <div key={chipLabel} className="sign-chip">
                <span className="sign-chip__glyph" style={{ color: `var(--${signElement(sign)})` }}>
                  {SIGN_GLYPH[sign]}
                </span>
                <span className="sign-chip__label">{chipLabel}</span>
                <span className="sign-chip__value">{sign}</span>
                <span className="muted" style={{ fontSize: ".7rem", fontStyle: "italic", display: "block", marginTop: 3 }}>
                  {reading.short}
                </span>
              </div>
            );
          })}
        </div>
        {payload.chart.cusps ? (
          <ChartWheel chart={payload.chart} />
        ) : (
          <p className="muted" style={{ fontSize: ".76rem", marginTop: 8 }}>
            Add an exact time and city to unlock the full wheel, houses, and Rising sign.
          </p>
        )}
      </section>

      <section className="glass-card fade-in fade-in-delay-1">
        <button
          className="pill-link"
          onClick={() => setExpanded((e) => !e)}
          style={{ fontSize: ".82rem", marginBottom: expanded ? 12 : 0 }}
        >
          {expanded ? "▼ Hide full chart" : "▶ See full chart"}
        </button>
        {expanded ? (
          <div style={{ display: "grid", gap: 8 }}>
            {payload.chart.placements.map((p) => {
              if (p.confident === false) {
                return (
                  <div key={p.body} style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.6, padding: "6px 0" }}>
                    <span style={{ width: 20, textAlign: "center" }}>{BODY_GLYPH[p.body] ?? p.body[0]}</span>
                    <span className="muted" style={{ fontSize: ".82rem" }}>
                      {p.body[0].toUpperCase() + p.body.slice(1)} — sign uncertain, add a birth date to settle it
                    </span>
                  </div>
                );
              }
              const reading = interpretPlacement(p.body as BodyKey, p.sign as SignKey);
              return (
                <div
                  key={p.body}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(183,154,216,.08)",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      textAlign: "center",
                      flexShrink: 0,
                      color: `var(--${signElement(p.sign)})`,
                    }}
                  >
                    {BODY_GLYPH[p.body] ?? p.body[0]}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: ".58rem",
                        fontWeight: 700,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: "var(--mist2)",
                      }}
                    >
                      {BODY_DOMAIN[p.body as BodyKey]}
                    </div>
                    <div style={{ fontSize: ".86rem", color: "var(--cream)", fontWeight: 600 }}>
                      {p.body[0].toUpperCase() + p.body.slice(1)} in {p.sign}
                    </div>
                    <div className="muted" style={{ fontSize: ".78rem", fontStyle: "italic" }}>
                      {reading.short}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center", display: "grid", gap: 12 }}>
        {/* PDF stays a paid perk — same gate as /chart. */}
        {viewer.isSubscriber ? (
          <ChartPdfExport
            chart={payload.chart}
            name={payload.name}
            displayDate={payload.displayDate}
            birthPlace={payload.birthPlace}
          />
        ) : null}
      </section>
    </>
  );
}

function CompareSnapshot({ payload }: { payload: CompareSharePayload }) {
  const framing = effectiveCompareFraming(payload);
  const relationType = framing.relationType;
  const personA = {
    display_name: payload.nameA || "Person A",
    sun: getSign(payload.chartA, "sun"),
    moon: getSign(payload.chartA, "moon"),
    venus: getSign(payload.chartA, "venus"),
    mars: getSign(payload.chartA, "mars"),
  };
  const personB = {
    display_name: payload.nameB || "Person B",
    sun: getSign(payload.chartB, "sun"),
    moon: getSign(payload.chartB, "moon"),
    venus: getSign(payload.chartB, "venus"),
    mars: getSign(payload.chartB, "mars"),
  };

  return (
    <>
      <section className="glass-card fade-in" style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "var(--cream)", margin: "0 0 4px" }}>
          {personA.display_name} &amp; {personB.display_name}
        </p>
        <p className="muted" style={{ fontSize: ".78rem", marginBottom: 12 }}>{relationType}</p>
        {payload.pairHasMinor && !framing.romanticHeldNotice ? (
          <p
            className="muted"
            style={{
              fontSize: ".75rem",
              lineHeight: 1.55,
              marginTop: 8,
              textAlign: "left",
              borderLeft: "2px solid rgba(230,174,108,.4)",
              paddingLeft: 10,
            }}
          >
            {QUICK_COMPARE_MINOR_NOTICE}
          </p>
        ) : null}
      </section>

      {framing.romanticHeldNotice || framing.blockRomanticMinorRender ? (
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Reading held</p>
          <p className="muted" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
            {QUICK_COMPARE_HELD_READING}
          </p>
        </section>
      ) : null}

      {framing.blockRomanticMinorRender ? null : !payload.synastry ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
            One of you has year-only birth data, so a full synastry read isn&apos;t possible — the planet-to-planet
            aspects would be guesses. What the generational layer shows: {payload.generational.theme}
          </p>
        </section>
      ) : (
        <>
          <DynamicTableSection scores={payload.synastry.scores}>
            {[personA, personB].map((person) => (
              <div
                key={person.display_name}
                style={{
                  marginBottom: 10,
                  padding: "13px 15px",
                  borderRadius: 13,
                  background: "linear-gradient(165deg, rgba(255,255,255,.025), rgba(255,255,255,.008))",
                  border: "1px solid rgba(183,154,216,.12)",
                }}
              >
                <p
                  style={{
                    fontSize: ".7rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: 6,
                  }}
                >
                  → What {person.display_name} needs from you
                </p>
                <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, fontStyle: "italic", margin: 0 }}>
                  {whatTheyNeed(payload.synastry.scores, person, relationType, payload.synastry as never)}
                </p>
              </div>
            ))}
          </DynamicTableSection>

          <FlowsAndCatchesSection
            aspects={payload.synastry.aspects}
            relationType={relationType}
          />
        </>
      )}

      {!framing.blockRomanticMinorRender ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Generational call-out</p>
          <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
            {payload.generational.theme}
          </p>
          {payload.generational.shared.length > 0 ? (
            <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>
              Shared sky:{" "}
              {payload.generational.shared.map((s) => `${SIGN_GLYPH[s.sign] ?? ""} ${s.planet} in ${s.sign}`).join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

export function ShareSnapshotView({
  kind,
  payload,
}: {
  kind: QuickShareKind;
  payload: QuickSharePayload;
}) {
  const viewer = useViewer();
  const isCompare = kind === "compare";
  // FOUNDER-REVIEW: authored — read-only shared snapshot titles.
  const title = isCompare ? "A shared compatibility reading" : "A shared birth chart";
  const eyebrow = isCompare ? "Shared Compatibility" : "Shared Chart";

  return (
    <QuickChartShell eyebrow={eyebrow} title={title} authed={!!viewer.userId}>
      <p className="lede" style={{ marginBottom: 20 }}>
        {/* FOUNDER-REVIEW: authored — read-only share lede. */}
        A read-only snapshot of a Galaxia reading. Nothing here can be edited, and birth details are not in the link.
      </p>
      {isCompare ? (
        <CompareSnapshot payload={payload as CompareSharePayload} />
      ) : (
        <SingleSnapshot payload={payload as SingleSharePayload} />
      )}
    </QuickChartShell>
  );
}
