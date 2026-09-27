"use client";

import {
  plutoGenerationLabel,
  type GenPlanetSignature,
  type NatalChart,
} from "@galaxia/astro";

const OUTER_PLANETS = [
  ["Uranus", "uranus"],
  ["Neptune", "neptune"],
  ["Pluto", "pluto"],
] as const;

function placementLabel(name: string, signature: GenPlanetSignature): string {
  if (signature.confident || !signature.possibleSigns?.length) {
    return `${name} in ${signature.sign}`;
  }
  return `${name}: ${signature.possibleSigns.join(" or ")}`;
}

export function SingleChartGenerationalSummary({
  chart,
}: {
  chart: NatalChart;
}) {
  const plutoLabel = chart.generational.pluto.confident
    ? plutoGenerationLabel(chart.generational.pluto.sign)
    : null;

  return (
    <section className="glass-card fade-in fade-in-delay-1" style={{ marginTop: 16 }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Generational signature</p>
      {plutoLabel ? (
        <p style={{ color: "var(--cream)", fontSize: ".9rem", fontWeight: 600, margin: "0 0 4px" }}>
          {plutoLabel}
        </p>
      ) : null}
      <p className="muted" style={{ fontSize: ".8rem", lineHeight: 1.55, margin: "0 0 12px" }}>
        {chart.generational.cohortLabel}
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {OUTER_PLANETS.map(([name, key]) => (
          <p key={key} style={{ color: "var(--mist)", fontSize: ".82rem", margin: 0 }}>
            {placementLabel(name, chart.generational[key])}
          </p>
        ))}
      </div>
    </section>
  );
}
