/**
 * Lookup-only generational call-out for mobile Compare.
 * Consumes already-computed shared/diverged lists and curated copy from
 * @galaxia/astro. Never re-derives placements or authors new meaning.
 */

import {
  genFrame,
  genHeadline,
  genPlacement,
  type GenPlanet,
  type Sign
} from "@galaxia/astro";

export type GenerationalCalloutData = {
  shared: { planet: string; sign: string }[];
  diverged: { planet: string; signA: string; signB: string }[];
};

export type SharedGenCard = {
  key: string;
  essence: string;
  guidance: string | null;
  proof: string;
};

export type DivergedGenCard = {
  key: string;
  domain: string;
  watchFor: string;
  proof: string;
};

export type GenerationalCalloutModel = {
  headline: string;
  shared: SharedGenCard[];
  diverged: DivergedGenCard[];
};

// FOUNDER-REVIEW: authored. Honest generic when a placement has no library entry.
export const GENERIC_SHARED =
  "You both share this generational placement. It is a cohort-level instinct from the same era, not a personal chart detail.";

function isGenPlanet(planet: string): planet is GenPlanet {
  return planet === "uranus" || planet === "neptune" || planet === "pluto";
}

function planetLabel(planet: string): string {
  if (!planet) return planet;
  return planet.charAt(0).toUpperCase() + planet.slice(1);
}

function placementProof(planet: string, sign: string): string {
  return `${planetLabel(planet)} in ${sign}`;
}

function sideProof(planet: string, sign: string, essence: string | null): string {
  const label = planetLabel(planet);
  if (!essence) return `${label} in ${sign}`;
  const nested = essence.replace(/\.\s*$/, "");
  return `${label} in ${sign} (${nested})`;
}

function sharedCard(planet: string, sign: string): SharedGenCard {
  const key = `shared-${planet}-${sign}`;
  if (!isGenPlanet(planet)) {
    return { key, essence: GENERIC_SHARED, guidance: null, proof: placementProof(planet, sign) };
  }
  const reading = genPlacement(planet, sign as Sign);
  if (!reading) {
    return { key, essence: GENERIC_SHARED, guidance: null, proof: placementProof(planet, sign) };
  }
  return {
    key,
    essence: reading.essence,
    guidance: reading.shared,
    proof: placementProof(planet, sign)
  };
}

function divergedCard(planet: string, signA: string, signB: string): DivergedGenCard | null {
  if (!isGenPlanet(planet)) return null;
  const frame = genFrame(planet);
  const entryA = genPlacement(planet, signA as Sign);
  const entryB = genPlacement(planet, signB as Sign);
  const proof = `You: ${sideProof(planet, signA, entryA?.essence ?? null)}. Them: ${sideProof(planet, signB, entryB?.essence ?? null)}.`;
  return {
    key: `diverged-${planet}-${signA}-${signB}`,
    domain: frame.domain,
    watchFor: frame.diverged,
    proof
  };
}

export function buildGenerationalCallout(data: GenerationalCalloutData): GenerationalCalloutModel {
  const shared = data.shared.map((entry) => sharedCard(entry.planet.toLowerCase(), entry.sign));
  const diverged: DivergedGenCard[] = [];
  for (const entry of data.diverged) {
    const card = divergedCard(entry.planet.toLowerCase(), entry.signA, entry.signB);
    if (card) diverged.push(card);
  }
  return {
    headline: genHeadline(data.shared.length, data.diverged.length),
    shared,
    diverged
  };
}
