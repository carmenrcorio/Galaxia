"use client";

import { getSignMetadata, type NatalChart, type Sign } from "@galaxia/astro";
import { ELEMENT_NODE_COLORS, sunSignFromChart } from "@galaxia/core";
import { useState } from "react";
import { GlossaryTerm } from "./glossary-term";

function firstSentence(copy: string): string {
  const end = copy.indexOf(".");
  return end === -1 ? copy : copy.slice(0, end + 1);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SignMetadataCards({ chart }: { chart: NatalChart }) {
  const sunSign = sunSignFromChart(chart);
  const [originOpen, setOriginOpen] = useState(false);

  if (!sunSign) return null;

  const metadata = getSignMetadata(sunSign as Sign);
  const elementColor = ELEMENT_NODE_COLORS[metadata.element];

  return (
    <section
      aria-label={`${sunSign} sign reference`}
      className="sign-metadata-cards fade-in"
      data-element={metadata.element}
      data-element-color={elementColor}
      data-testid="sign-metadata-cards"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
        gap: 8,
      }}
    >
      <div style={pillStyle}>
        <span style={labelStyle}>
          <GlossaryTerm glossarySlug="element">Element</GlossaryTerm>
        </span>
        <span style={valueStyle}>
          <span
            aria-hidden="true"
            style={{ width: 8, height: 8, borderRadius: "50%", background: elementColor, boxShadow: `0 0 8px ${elementColor}`, flexShrink: 0 }}
          />
          {titleCase(metadata.element)}
        </span>
      </div>

      <div style={pillStyle}>
        <span style={labelStyle}>
          <GlossaryTerm glossarySlug="modality">Modality</GlossaryTerm>
        </span>
        <span style={valueStyle}>{titleCase(metadata.modality)}</span>
      </div>

      <button
        type="button"
        aria-expanded={originOpen}
        // FOUNDER-REVIEW: accessible action label for the approved symbol explanation.
        aria-label={`${originOpen ? "Hide" : "Read"} why ${sunSign} uses the ${metadata.symbol}`}
        onClick={() => setOriginOpen((open) => !open)}
        style={{
          ...pillStyle,
          gridColumn: "span 2",
          cursor: "pointer",
          font: "inherit",
          textAlign: "left",
        }}
      >
        {/* FOUNDER-REVIEW: compact symbol-card label. */}
        <span style={labelStyle}>Symbol · {metadata.symbol}</span>
        <span style={{ ...originStyle, color: originOpen ? "var(--cream)" : "var(--mist)" }}>
          {originOpen ? metadata.symbolOrigin : firstSentence(metadata.symbolOrigin)}
        </span>
      </button>

      <div style={pillStyle}>
        <span style={labelStyle}>
          <GlossaryTerm glossarySlug="ruling-planet">Ruling planet</GlossaryTerm>
        </span>
        <span style={valueStyle}>{metadata.rulingPlanet}</span>
      </div>

      <div style={pillStyle}>
        {/* FOUNDER-REVIEW: traditional material reference label. */}
        <span style={labelStyle}>Metal</span>
        <span style={valueStyle}>{metadata.metal}</span>
      </div>

      <div style={pillStyle}>
        {/* FOUNDER-REVIEW: traditional stone reference label. */}
        <span style={labelStyle}>Birthstone</span>
        <span style={valueStyle}>{metadata.birthstone}</span>
      </div>
    </section>
  );
}

const pillStyle = {
  minWidth: 0,
  borderRadius: 12,
  border: "1px solid rgba(230,174,108,.14)",
  background: "rgba(255,255,255,.025)",
  padding: "9px 11px",
  display: "grid",
  alignContent: "start",
  gap: 4,
} as const;

const labelStyle = {
  color: "var(--mist2)",
  fontSize: ".58rem",
  fontWeight: 700,
  letterSpacing: ".11em",
  textTransform: "uppercase",
} as const;

const valueStyle = {
  color: "var(--cream)",
  fontFamily: "var(--serif)",
  fontSize: ".86rem",
  display: "flex",
  alignItems: "center",
  gap: 6,
} as const;

const originStyle = {
  fontSize: ".74rem",
  lineHeight: 1.5,
} as const;
