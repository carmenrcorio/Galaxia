"use client";

/**
 * Shared markup for the generational era reading and the professional work
 * view. Lookup only: every string comes from `@galaxia/astro`. Missing copy
 * renders nothing (§12). Inner surfaces always show the Pluto source line.
 */

import {
  ERA_READING_HEADING,
  ERA_READING_LABELS,
  WORK_VIEW_HEADING,
  WORK_VIEW_LABELS,
  getPlutoEraReading,
  getPlutoWorkView,
  plutoSourceLine,
  type SignKey,
} from "@galaxia/astro";

type Props = {
  sign: SignKey;
  /** Professional recorded relationship: lead with respect / decisions / friction. */
  showWorkView?: boolean;
  /** Inner product surfaces keep the placement visible. Marketing layer-one omits it. */
  showSource?: boolean;
};

export function GenerationalEraSurface({
  sign,
  showWorkView = false,
  showSource = true,
}: Props) {
  const era = getPlutoEraReading(sign);
  const work = showWorkView ? getPlutoWorkView(sign) : null;
  if (!era && !work) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {work ? (
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
      ) : null}
      {era ? (
        <div>
          <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: work ? "var(--mist2)" : "var(--gold-soft)", margin: "0 0 8px" }}>
            {ERA_READING_HEADING}
          </p>
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
      ) : null}
      {showSource ? (
        <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>
          {plutoSourceLine(sign)}
        </p>
      ) : null}
    </div>
  );
}
