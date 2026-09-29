"use client";

/**
 * Shared markup for the generational era reading and the professional work
 * view. Lookup only: every string comes from `@galaxia/astro`. Missing copy
 * renders nothing (§12). Inner surfaces always show the Pluto source line.
 *
 * `GenerationalEraSections` is the person-card layout: the era reading, its
 * source line, and the other cohort blocks sit after the three star rows.
 * They are not part of the Pluto row's open state.
 */

import { useState } from "react";
import {
  ERA_READING_HEADING,
  ERA_READING_LABELS,
  PLUTO_SIGN_EXTENDED,
  WORK_VIEW_HEADING,
  WORK_VIEW_LABELS,
  getPlutoEraReading,
  getPlutoWorkView,
  plutoSourceLine,
  type PlutoSignExtended,
  type SignKey,
} from "@galaxia/astro";

type HeadingVariant = "inline" | "eyebrow";
type BlockOrder = "work-first" | "era-first";

type Props = {
  sign: SignKey;
  /** Professional recorded relationship: respect / decisions / friction. */
  showWorkView?: boolean;
  /** Inner product surfaces keep the placement visible. Marketing layer-one omits it. */
  showSource?: boolean;
  /**
   * Person card uses the section eyebrow already on that card.
   * Compare keeps the compact inline label.
   */
  headingVariant?: HeadingVariant;
  /**
   * Person card: era reading, then the source line, then the work view.
   * Compare keeps the work view in front when it is shown.
   */
  order?: BlockOrder;
};

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="eyebrow" style={{ marginBottom: 8 }}>
      {children}
    </p>
  );
}

export function GenerationalEraSurface({
  sign,
  showWorkView = false,
  showSource = true,
  headingVariant = "inline",
  order = "work-first",
}: Props) {
  const era = getPlutoEraReading(sign);
  const work = showWorkView ? getPlutoWorkView(sign) : null;
  if (!era && !work) return null;

  const eraBlock = era ? (
    <div>
      {headingVariant === "eyebrow" ? (
        <SectionEyebrow>{ERA_READING_HEADING}</SectionEyebrow>
      ) : (
        <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: work && order === "work-first" ? "var(--mist2)" : "var(--gold-soft)", margin: "0 0 8px" }}>
          {ERA_READING_HEADING}
        </p>
      )}
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--cream)" }}>{ERA_READING_LABELS.authority}.</strong> {era.authority}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--cream)" }}>{ERA_READING_LABELS.institutions}.</strong> {era.institutions}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--cream)" }}>{ERA_READING_LABELS.change}.</strong> {era.change}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>
        <strong style={{ color: "var(--cream)" }}>{ERA_READING_LABELS.trust}.</strong> {era.trust}
      </p>
    </div>
  ) : null;

  const workBlock = work ? (
    <div>
      <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gold-soft)", margin: "0 0 8px" }}>
        {WORK_VIEW_HEADING}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--cream)" }}>{WORK_VIEW_LABELS.respect}.</strong> {work.respect}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: "0 0 8px" }}>
        <strong style={{ color: "var(--cream)" }}>{WORK_VIEW_LABELS.decisions}.</strong> {work.decisions}
      </p>
      <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>
        <strong style={{ color: "var(--cream)" }}>{WORK_VIEW_LABELS.friction}.</strong> {work.friction}
      </p>
    </div>
  ) : null;

  const sourceBlock = showSource ? (
    <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>
      {plutoSourceLine(sign)}
    </p>
  ) : null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {order === "era-first" ? (
        <>
          {eraBlock}
          {sourceBlock}
          {workBlock}
        </>
      ) : (
        <>
          {workBlock}
          {eraBlock}
          {sourceBlock}
        </>
      )}
    </div>
  );
}

/**
 * Cohort blocks that used to render inside the Pluto row. They describe the
 * era, so they stay visible with the era reading. Copy is unchanged.
 */
export function GenerationalCohortSections({ sign }: { sign: SignKey }) {
  const extended = PLUTO_SIGN_EXTENDED[sign];
  if (!extended) return null;
  return <GenerationalCohortBody key={sign} extended={extended} />;
}

function GenerationalCohortBody({ extended }: { extended: PlutoSignExtended }) {
  const [openEraEvent, setOpenEraEvent] = useState<string | null>(null);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gold-soft)", margin: "0 0 4px" }}>
          The corruption signature
        </p>
        <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, margin: 0 }}>{extended.corruptionSignature}</p>
      </div>
      {extended.historicalFigures.length > 0 ? (
        <div>
          <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 6px" }}>
            Others who carried this
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {extended.historicalFigures.map((figure) => (
              <div key={figure.name}>
                <p style={{ fontSize: ".82rem", color: "var(--cream)", margin: 0 }}>
                  <strong>{figure.name}</strong>: {figure.knownFor}
                </p>
                <p className="muted" style={{ fontSize: ".76rem", lineHeight: 1.5, margin: "2px 0 0" }}>{figure.plutoBridge}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {extended.eraEvents.length > 0 ? (
        <div>
          <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--mist2)", margin: "0 0 6px" }}>
            What they lived through
          </p>
          <div className="prompt-chips">
            {extended.eraEvents.map((event) => (
              <button
                key={event.label}
                type="button"
                className="prompt-chip"
                onClick={() => setOpenEraEvent(prev => prev === event.label ? null : event.label)}
                aria-expanded={openEraEvent === event.label}
              >
                {event.label}
              </button>
            ))}
          </div>
          {openEraEvent ? (
            <p className="muted" style={{ fontSize: ".8rem", lineHeight: 1.55, marginTop: 8 }}>
              {extended.eraEvents.find(e => e.label === openEraEvent)?.detail}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Person card: era section, then the remaining cohort blocks. Always mounted. */
export function GenerationalEraSections({
  sign,
  showWorkView = false,
}: {
  sign: SignKey;
  showWorkView?: boolean;
}) {
  if (!PLUTO_SIGN_EXTENDED[sign]) return null;
  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
      <GenerationalEraSurface
        sign={sign}
        showWorkView={showWorkView}
        showSource
        headingVariant="eyebrow"
        order="era-first"
      />
      <GenerationalCohortSections sign={sign} />
    </div>
  );
}
