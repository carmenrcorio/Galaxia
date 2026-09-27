"use client";

import { getSignMetadata, type NatalChart, type Sign } from "@galaxia/astro";
import {
  BIRTHSTONE_COLORS,
  BODY_GLYPH,
  ELEMENT_NODE_COLORS,
  SIGN_GLYPH,
  sunSignFromChart,
} from "@galaxia/core";
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
  const birthstoneColor = BIRTHSTONE_COLORS[sunSign];
  const planetGlyph = BODY_GLYPH[metadata.rulingPlanet] ?? BODY_GLYPH[metadata.rulingPlanet.toLowerCase()];

  return (
    <section
      aria-label={`${sunSign} sign reference`}
      className="glass-card fade-in sign-metadata-card"
      data-birthstone-color={birthstoneColor}
      data-element={metadata.element}
      data-element-color={elementColor}
      data-testid="sign-metadata-cards"
    >
      <p className="eyebrow sign-metadata-card__eyebrow">{sunSign}</p>

      <span
        aria-hidden="true"
        className="sign-metadata-card__zodiac"
        style={{ color: elementColor }}
      >
        {SIGN_GLYPH[sunSign]}
      </span>

      <div className="sign-metadata-card__row sign-metadata-card__row--identity">
        <div className="sign-metadata-card__identity">
          <span className="sign-metadata-card__pill">
            <span className="sign-metadata-card__label">
              <GlossaryTerm glossarySlug="element">Element</GlossaryTerm>
            </span>
            <span className="sign-metadata-card__value" style={{ color: elementColor }}>
              <span
                aria-hidden="true"
                className="sign-metadata-card__dot"
                style={{ background: elementColor, boxShadow: `0 0 8px ${elementColor}` }}
              />
              {titleCase(metadata.element)}
            </span>
          </span>

          <span className="sign-metadata-card__pill">
            <span className="sign-metadata-card__label">
              <GlossaryTerm glossarySlug="modality">Modality</GlossaryTerm>
            </span>
            <span className="sign-metadata-card__value sign-metadata-card__value--secondary">
              {titleCase(metadata.modality)}
            </span>
          </span>

          <span className="sign-metadata-card__pill">
            <span className="sign-metadata-card__label">
              <GlossaryTerm glossarySlug="ruling-planet">Ruling planet</GlossaryTerm>
            </span>
            <span className="sign-metadata-card__value">
              <span aria-hidden="true" className="sign-metadata-card__planet">{planetGlyph}</span>
              {metadata.rulingPlanet}
            </span>
          </span>
        </div>

        {/* FOUNDER-REVIEW: approved element significance copy. */}
        <p className="sign-metadata-card__significance" data-testid="element-significance">
          {metadata.elementSignificance}
        </p>
      </div>

      <div className="sign-metadata-card__row sign-metadata-card__row--symbol">
        <button
          type="button"
          aria-expanded={originOpen}
          className="sign-metadata-card__symbol"
          // FOUNDER-REVIEW: accessible action label for the approved symbol explanation.
          aria-label={`${originOpen ? "Hide" : "Read"} why ${sunSign} uses the ${metadata.symbol}`}
          onClick={() => setOriginOpen((open) => !open)}
        >
          <span className="sign-metadata-card__symbol-head">
            {/* FOUNDER-REVIEW: symbol heading follows the approved design structure. */}
            <span className="sign-metadata-card__symbol-name">The {metadata.symbol}</span>
            <span aria-hidden="true" className="sign-metadata-card__chevron">
              {originOpen ? "▲" : "▼"}
            </span>
          </span>
          <span className="sign-metadata-card__origin">
            {originOpen ? metadata.symbolOrigin : firstSentence(metadata.symbolOrigin)}
          </span>
        </button>
      </div>

      <div className="sign-metadata-card__row sign-metadata-card__row--materials">
        <div className="sign-metadata-card__materials">
          <div className="sign-metadata-card__material">
            <span aria-hidden="true" className="sign-metadata-card__metal-dot" />
            <span>
              {/* FOUNDER-REVIEW: traditional material reference label. */}
              <span className="sign-metadata-card__label">Metal</span>
              <span className="sign-metadata-card__material-value">{metadata.metal}</span>
            </span>
            {/* FOUNDER-REVIEW: approved metal significance copy. */}
            <p className="sign-metadata-card__significance" data-testid="metal-significance">
              {metadata.metalSignificance}
            </p>
          </div>

          <div className="sign-metadata-card__material">
            <span
              aria-hidden="true"
              className="sign-metadata-card__dot sign-metadata-card__birthstone-dot"
              style={{ background: birthstoneColor, boxShadow: `0 0 8px ${birthstoneColor}` }}
            />
            <span>
              {/* FOUNDER-REVIEW: traditional stone reference label. */}
              <span className="sign-metadata-card__label">Birthstone</span>
              <span className="sign-metadata-card__material-value">{metadata.birthstone}</span>
            </span>
            {/* FOUNDER-REVIEW: approved birthstone significance copy. */}
            <p className="sign-metadata-card__significance" data-testid="birthstone-significance">
              {metadata.birthstoneSignificance}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
