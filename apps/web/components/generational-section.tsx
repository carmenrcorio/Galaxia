"use client";

/**
 * Shared "Generational call-out" for Quick Compare (/chart/compare) and
 * compare share snapshots (/s/[token]). One markup path; both surfaces
 * inherit. Looks up curated copy from @galaxia/astro generational-interpretations
 * against the already-computed shared/diverged lists. Never re-derives
 * placements. Missing library entries degrade to an honest generic cohort
 * line (and log the miss); never invent a specific meaning.
 */

import {
  genFrame,
  genHeadline,
  genPlacement,
  type GenPlanet,
  type Sign,
} from "@galaxia/astro";
import { SIGN_GLYPH } from "../lib/design";

export type GenerationalSectionData = {
  shared: { planet: string; sign: string }[];
  diverged: { planet: string; signA: string; signB: string }[];
};

// FOUNDER-REVIEW: authored - honest generic when a placement has no library entry.
const GENERIC_SHARED =
  "You both share this generational placement. It is a cohort-level instinct from the same era, not a personal chart detail.";

function isGenPlanet(planet: string): planet is GenPlanet {
  return planet === "uranus" || planet === "neptune" || planet === "pluto";
}

function planetLabel(planet: string): string {
  if (!planet) return planet;
  return planet.charAt(0).toUpperCase() + planet.slice(1);
}

function placementProof(planet: string, sign: string): string {
  const glyph = SIGN_GLYPH[sign] ?? "";
  const label = planetLabel(planet);
  return `${glyph ? `${glyph} ` : ""}${label} in ${sign}`;
}

function sideProof(planet: string, sign: string, essence: string | null): string {
  const label = planetLabel(planet);
  if (!essence) return `${label} in ${sign}`;
  // Essences are authored as full sentences ending in "."; strip that when nested
  // inside the proof parenthetical so we do not render ".)."
  const nested = essence.replace(/\.\s*$/, "");
  return `${label} in ${sign} (${nested})`;
}

function logMiss(planet: string, sign: string) {
  console.warn(`[genPlacement] missing curated entry for ${planet} in ${sign}`);
}

type Props = {
  generational: GenerationalSectionData;
};

export function GenerationalSection({ generational }: Props) {
  const headline = genHeadline(generational.shared.length, generational.diverged.length);

  return (
    <section className="glass-card fade-in fade-in-delay-2">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Generational call-out</p>
      <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
        {headline}
      </p>

      {generational.shared.length > 0 ? (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {generational.shared.map((entry) => {
            const planet = entry.planet.toLowerCase();
            const sign = entry.sign as Sign;
            if (!isGenPlanet(planet)) {
              logMiss(entry.planet, entry.sign);
              return (
                <div key={`shared-${entry.planet}-${entry.sign}`}>
                  <p style={{ fontSize: ".86rem", color: "var(--cream)", lineHeight: 1.55, margin: 0 }}>
                    {GENERIC_SHARED}
                  </p>
                  <p className="muted" style={{ fontSize: ".72rem", marginTop: 4 }}>
                    {placementProof(entry.planet, entry.sign)}
                  </p>
                </div>
              );
            }
            const reading = genPlacement(planet, sign);
            if (!reading) {
              logMiss(planet, sign);
              return (
                <div key={`shared-${planet}-${sign}`}>
                  <p style={{ fontSize: ".86rem", color: "var(--cream)", lineHeight: 1.55, margin: 0 }}>
                    {GENERIC_SHARED}
                  </p>
                  <p className="muted" style={{ fontSize: ".72rem", marginTop: 4 }}>
                    {placementProof(planet, sign)}
                  </p>
                </div>
              );
            }
            return (
              <div key={`shared-${planet}-${sign}`}>
                <p style={{ fontSize: ".86rem", color: "var(--cream)", lineHeight: 1.55, margin: 0 }}>
                  {reading.essence}
                </p>
                <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.55, marginTop: 6 }}>
                  {reading.shared}
                </p>
                <p className="muted" style={{ fontSize: ".72rem", marginTop: 4 }}>
                  {placementProof(planet, sign)}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {generational.diverged.length > 0 ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {generational.diverged.map((entry) => {
            const planet = entry.planet.toLowerCase();
            const signA = entry.signA as Sign;
            const signB = entry.signB as Sign;
            if (!isGenPlanet(planet)) {
              logMiss(entry.planet, `${entry.signA}/${entry.signB}`);
              return null;
            }
            const frame = genFrame(planet);
            const entryA = genPlacement(planet, signA);
            const entryB = genPlacement(planet, signB);
            if (!entryA) logMiss(planet, signA);
            if (!entryB) logMiss(planet, signB);
            const proof = `You: ${sideProof(planet, signA, entryA?.essence ?? null)}. Them: ${sideProof(planet, signB, entryB?.essence ?? null)}.`;
            return (
              <div key={`diverged-${planet}-${signA}-${signB}`} className="teal-callout" style={{ padding: "14px 16px" }}>
                <p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.45, margin: 0 }}>
                  {frame.domain}
                </p>
                <p style={{ fontSize: ".82rem", color: "var(--cream)", lineHeight: 1.55, margin: "6px 0 0" }}>
                  {frame.diverged}
                </p>
                <p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.5, marginTop: 8 }}>
                  {proof}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
