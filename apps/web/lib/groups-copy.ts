/**
 * Groups page presentation copy — pure functions only.
 *
 * Every sentence here is derived from data the engine already computed
 * (`@galaxia/astro` cohortOverlay / compareGenerational output, already
 * persisted in `notes.payload`). Nothing here invents a placement, a sign,
 * or a relationship fact — it only phrases facts that are already on the
 * `CohortOverlaySnapshot` / `CohortPairHighlight` shapes (ENGINEERING.md §12).
 *
 * Kept framework-free (no React, no Supabase) so it is trivially unit
 * tested and reusable by any Groups surface.
 */

export const GEN_PLANETS = ["uranus", "neptune", "pluto"] as const;
export type GenPlanetKey = (typeof GEN_PLANETS)[number];

export type SharedSkyCoverage = "whole" | "majority" | "pair";

// FOUNDER-REVIEW: authored. One-line domain gloss per generational planet. Static, never generated.
export const GEN_PLANET_MEANING: Record<GenPlanetKey, string> = {
  uranus: "how the group handles disruption and change",
  neptune: "shared idealism vs. disillusionment",
  pluto: "instincts around power, control, and transformation",
};

/**
 * Shared Sky sentence tails, keyed by coverage shape and planet.
 * Distinct along both axes so Neptune-across-four and Uranus-across-two
 * never resolve to the same ending. Looked up, never generated at render.
 */
// FOUNDER-REVIEW: authored. Shared Sky tails by (coverage, planet).
export const SHARED_SKY_TAIL: Record<SharedSkyCoverage, Record<GenPlanetKey, string>> = {
  whole: {
    uranus: "This is the climate of change the whole group grew up in.",
    neptune: "This is the dream, and the fog, the whole group inherited.",
    pluto: "This is the power lesson the whole group was born into.",
  },
  majority: {
    uranus: "Most of the group was formed in the same climate of change, so their reflex when something breaks is the room's default.",
    neptune: "Most of the group inherited the same dream, which is why that idealism can feel like the group's own weather.",
    pluto: "Most of the group was shaped by the same era of power, so the majority's instincts about control set the tone.",
  },
  pair: {
    uranus: "A pair who break the mold the same way, even when the rest of the group does not.",
    neptune: "A pair who dream in the same key. That private weather does not fill the room.",
    pluto: "Those two were taught the same lesson about power, so they can lock in while others cannot.",
  },
};

export function isGenPlanet(planet: string): planet is GenPlanetKey {
  return (GEN_PLANETS as readonly string[]).includes(planet);
}

export function coverageShape(sharerCount: number, totalMembers: number): SharedSkyCoverage {
  if (totalMembers > 0 && sharerCount >= totalMembers) return "whole";
  if (sharerCount === 2) return "pair";
  return "majority";
}

export function sharedSkyTail(coverage: SharedSkyCoverage, planet: string): string | undefined {
  if (!isGenPlanet(planet)) return undefined;
  return SHARED_SKY_TAIL[coverage][planet];
}

// FOUNDER-REVIEW: authored. Generational map framing line under the header.
export const GENERATIONAL_MAP_FRAMING =
  "These planets move slowly, so everyone born within a few years shares them. They show where instincts were formed, and where generations split.";

// FOUNDER-REVIEW: authored. Groups page first-visit intro, three short lines.
export const GROUPS_INTRO_LINES = [
  "This page reads the slow planets: Uranus, Neptune, and Pluto. Everyone born within a few years shares them.",
  "Shared sky is what the group has in common. Fault lines are where generations split.",
  "Tap a gold-underlined name to see what a planet or sign means in plain English.",
] as const;

// FOUNDER-REVIEW: authored. Dismisses the Groups first-visit intro.
export const GROUPS_INTRO_GOT_IT = "Got it";

export function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Oxford-comma join: ["A"] -> "A"; ["A","B"] -> "A and B"; ["A","B","C"] -> "A, B, and C". */
export function joinNames(names: readonly string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export interface CohortOverlayLike {
  sharedSky: Array<{ planet: string; sign: string }>;
  faultLines: Array<{ planet: string; groups: Array<{ sign: string; names: string[] }> }>;
}

/**
 * Reconstructs each member's sign per generational planet directly from the
 * group-level partition (`overlay`) — no separate per-person chart lookup
 * needed. Every member appears in exactly one sharedSky/faultLines entry per
 * planet, so this is a lossless read of data the engine already computed,
 * not a new derivation. Used by both the generational map (band chart) and
 * its one-line summary, so the two surfaces can never disagree.
 */
export function memberSignsFromOverlay(
  memberNames: readonly string[],
  overlay: CohortOverlayLike
): Map<string, Partial<Record<GenPlanetKey, string>>> {
  const result = new Map<string, Partial<Record<GenPlanetKey, string>>>();
  for (const name of memberNames) result.set(name, {});
  for (const s of overlay.sharedSky) {
    if (!GEN_PLANETS.includes(s.planet as GenPlanetKey)) continue;
    const key = s.planet as GenPlanetKey;
    for (const name of memberNames) {
      const rec = result.get(name);
      if (rec) rec[key] = s.sign;
    }
  }
  for (const line of overlay.faultLines) {
    if (!GEN_PLANETS.includes(line.planet as GenPlanetKey)) continue;
    const key = line.planet as GenPlanetKey;
    for (const g of line.groups) {
      for (const name of g.names) {
        const rec = result.get(name);
        if (rec) rec[key] = g.sign;
      }
    }
  }
  return result;
}

/** How many distinct signs a given planet spans across the group ("1" = fully shared). */
export function distinctSignCountForPlanet(overlay: CohortOverlayLike, planet: string): number {
  if (overlay.sharedSky.some((s) => s.planet === planet)) return 1;
  const line = overlay.faultLines.find((f) => f.planet === planet);
  return line ? line.groups.length : 0;
}

/**
 * One-line astrological signature for a group selector card, e.g.
 * "3 members · 2 Pluto signs · 1 fault line". `overlay` is null when there
 * isn't enough chart data for every member to compute one — in that case we
 * show only the honest member count rather than fabricate a signature.
 */
export function groupSignatureLine(totalMembers: number, overlay: CohortOverlayLike | null): string {
  const memberPart = `${totalMembers} ${pluralize(totalMembers, "member")}`;
  if (!overlay) return memberPart;
  const parts = [memberPart];
  const plutoSigns = distinctSignCountForPlanet(overlay, "pluto");
  if (plutoSigns > 1) parts.push(`${plutoSigns} Pluto signs`);
  if (overlay.faultLines.length > 0) {
    parts.push(`${overlay.faultLines.length} ${pluralize(overlay.faultLines.length, "fault line")}`);
  } else {
    parts.push("same generational sky");
  }
  return parts.join(" · ");
}

export interface PartialOverlap {
  planet: string;
  sign: string;
  names: string[];
  /** Full roster size. Needed to distinguish a pair (2) from a majority (3+ of N). */
  totalMembers: number;
}

/**
 * Sub-group overlaps on a planet that fall short of the whole group, e.g.
 * two of three members sharing Pluto in Capricorn. Only meaningful when the
 * planet did NOT make it into `sharedSky` (i.e. it's listed in `faultLines`),
 * and only when a sign-group has 2+ names but fewer than the full roster.
 * Sorted largest cluster first (the strongest signal).
 */
export function sharedSkyPartialOverlaps(
  faultLines: CohortOverlayLike["faultLines"],
  totalMembers: number
): PartialOverlap[] {
  const overlaps: PartialOverlap[] = [];
  for (const line of faultLines) {
    for (const g of line.groups) {
      if (g.names.length >= 2 && g.names.length < totalMembers) {
        overlaps.push({ planet: line.planet, sign: g.sign, names: [...g.names], totalMembers });
      }
    }
  }
  return overlaps.sort((a, b) => b.names.length - a.names.length);
}

/**
 * Group partial overlaps by the set of members who share them, so one
 * sentence can cover every placement that same set holds (not one sentence
 * per placement).
 */
export function groupPartialOverlapsByMembers(overlaps: PartialOverlap[]): PartialOverlap[][] {
  const bySet = new Map<string, PartialOverlap[]>();
  for (const overlap of overlaps) {
    const key = [...overlap.names].sort().join("\0");
    const bucket = bySet.get(key);
    if (bucket) bucket.push(overlap);
    else bySet.set(key, [overlap]);
  }
  const seen = new Set<string>();
  const grouped: PartialOverlap[][] = [];
  for (const overlap of overlaps) {
    const key = [...overlap.names].sort().join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    grouped.push(bySet.get(key)!);
  }
  return grouped;
}

export interface SharedSkyLine {
  key: string;
  coverage: SharedSkyCoverage;
  placements: Array<{ planet: string; sign: string }>;
  names: string[];
  gloss: string;
  tail: string;
  sentence: string;
}

function glossForPlanets(planets: readonly string[]): string {
  return planets
    .filter(isGenPlanet)
    .map((planet) => GEN_PLANET_MEANING[planet])
    .join("; ");
}

function tailForPlanets(coverage: SharedSkyCoverage, planets: readonly string[]): string {
  return planets
    .map((planet) => sharedSkyTail(coverage, planet))
    .filter((tail): tail is string => Boolean(tail))
    .join(" ");
}

function placementPhrase(placements: Array<{ planet: string; sign: string }>): string {
  return joinNames(placements.map((p) => `${capitalizeWord(p.planet)} in ${p.sign}`));
}

function assembleSharedSkySentence(lead: string, gloss: string, tail: string): string {
  if (gloss && tail) return `${lead}: ${gloss}. ${tail}`;
  if (gloss) return `${lead}: ${gloss}.`;
  if (tail) return `${lead}. ${tail}`;
  return `${lead}.`;
}

function fullShareLine(planet: string, sign: string): SharedSkyLine {
  const coverage: SharedSkyCoverage = "whole";
  const placements = [{ planet, sign }];
  const gloss = glossForPlanets([planet]);
  const tail = tailForPlanets(coverage, [planet]);
  const lead = `Everyone shares ${placementPhrase(placements)}`;
  return {
    key: `whole:${planet}-${sign}`,
    coverage,
    placements,
    names: [],
    gloss,
    tail,
    sentence: assembleSharedSkySentence(lead, gloss, tail),
  };
}

function clusterLine(overlaps: PartialOverlap[]): SharedSkyLine {
  const first = overlaps[0]!;
  const coverage = coverageShape(first.names.length, first.totalMembers);
  const placements = overlaps.map((o) => ({ planet: o.planet, sign: o.sign }));
  const planets = placements.map((p) => p.planet);
  const gloss = glossForPlanets(planets);
  const tail = tailForPlanets(coverage, planets);
  const lead = `${joinNames(first.names)} share ${placementPhrase(placements)}`;
  return {
    key: `partial:${[...first.names].sort().join(",")}:${planets.join(",")}`,
    coverage,
    placements,
    names: [...first.names],
    gloss,
    tail,
    sentence: assembleSharedSkySentence(lead, gloss, tail),
  };
}

/** Sentence for a single partial shared-sky overlap. */
export function describePartialOverlap(overlap: PartialOverlap): string {
  return clusterLine([overlap]).sentence;
}

/** Whole-group Shared Sky sentence for one fully shared planet. */
export function describeFullShare(planet: string, sign: string): string {
  return fullShareLine(planet, sign).sentence;
}

/**
 * Every Shared Sky line for a render: full-group shares AND partial
 * clusters, evaluated per planet. A fully shared planet must not suppress
 * partial clusters on the others.
 */
export function sharedSkyLines(overlay: CohortOverlayLike, totalMembers: number): SharedSkyLine[] {
  const full = overlay.sharedSky.filter((s) => isGenPlanet(s.planet)).map((s) => fullShareLine(s.planet, s.sign));
  const partials = groupPartialOverlapsByMembers(sharedSkyPartialOverlaps(overlay.faultLines, totalMembers)).map(
    (cluster) => clusterLine(cluster)
  );
  return [...full, ...partials];
}

/** Fallback line when there is truly no overlap of any size on any planet. */
// FOUNDER-REVIEW: authored. Shared Sky empty state when nothing overlaps.
export const SHARED_SKY_NO_OVERLAP_NOTE =
  "No outer planet sign is shared across all members. This group bridges generational cohorts, which is both its richness and its friction. See Fault Lines below for what divides them.";

function partitionKey(groups: Array<{ names: string[] }>): string {
  return groups
    .map((g) => [...g.names].sort().join(","))
    .sort()
    .join("|");
}

/**
 * Interpretive paragraph that precedes the planet-by-planet Fault Lines
 * list. Derived entirely from the shape of `faultLines` (who splits from
 * whom, and whether that split repeats across planets) — never a new
 * astrology fact, only a narration of the partition the engine already
 * produced.
 */
export function faultLinesInterpretation(faultLines: CohortOverlayLike["faultLines"]): string {
  if (faultLines.length === 0) return "";
  const keys = faultLines.map((l) => partitionKey(l.groups));
  const allSamePartition = keys.every((k) => k === keys[0]);
  const planetLabels = faultLines.map((l) => capitalizeWord(l.planet));

  const planetsPhrase =
    faultLines.length === 3
      ? "On every slow-moving planet"
      : faultLines.length === 2
        ? "On most of the slow-moving planets"
        : `On ${planetLabels[0]}`;

  if (allSamePartition && faultLines[0]!.groups.length === 2) {
    const [g1, g2] = faultLines[0]!.groups;
    const minority = g1!.names.length <= g2!.names.length ? g1! : g2!;
    const majority = minority === g1 ? g2! : g1!;
    return (
      `This group spans two distinct generational cohorts. ${planetsPhrase}, ${joinNames(minority.names)}'s instincts were ` +
      `shaped by a different era than ${joinNames(majority.names)}'s, which is both what makes this group rich and where its deepest friction lives.`
    );
  }

  const planetsList = joinNames(planetLabels);
  return (
    `This group's generational fault lines shift depending on the planet. ${planetsList} ${faultLines.length === 1 ? "splits" : "each split"} ` +
    "the group along a different line. That range is real: different people carry the friction depending on what's being negotiated."
  );
}

/**
 * Connected components of `names` under a symmetric `isLinked` relation.
 * Small-N helper (group sizes are a handful of people), so a plain
 * DFS over an implicit adjacency is simplest and fast enough.
 */
function connectedComponents(names: readonly string[], isLinked: (a: string, b: string) => boolean): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const start of names) {
    if (visited.has(start)) continue;
    const stack = [start];
    visited.add(start);
    const comp: string[] = [];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const other of names) {
        if (!visited.has(other) && isLinked(cur, other)) {
          visited.add(other);
          stack.push(other);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

/**
 * One-line summary under the generational map, e.g. "Camila and Emilio
 * share all three generational planets. Carmen diverges on every one."
 * Reconstructs each member's sign per planet from `overlay` (a partition of
 * the group, already computed) rather than needing raw per-person charts.
 */
export function generationalMapSummary(memberNames: readonly string[], overlay: CohortOverlayLike): string {
  const names = [...new Set(memberNames.filter(Boolean))];
  if (names.length < 2) return "";

  if (overlay.faultLines.length === 0) {
    return "Everyone here shares the same generational sky. Uranus, Neptune, and Pluto all line up for the whole group.";
  }

  const signsByMember = memberSignsFromOverlay(names, overlay);

  function sharedPlanetCount(a: string, b: string): number {
    let count = 0;
    const recA = signsByMember.get(a);
    const recB = signsByMember.get(b);
    for (const planet of GEN_PLANETS) {
      const signA = recA?.[planet];
      const signB = recB?.[planet];
      if (signA && signA === signB) count += 1;
    }
    return count;
  }

  const alignedClusters = connectedComponents(names, (a, b) => sharedPlanetCount(a, b) === GEN_PLANETS.length);
  const largestAligned = alignedClusters
    .filter((c) => c.length >= 2)
    .sort((a, b) => b.length - a.length)[0];

  const outliers = names.filter((n) => names.every((other) => other === n || sharedPlanetCount(n, other) === 0));

  const sentences: string[] = [];
  if (largestAligned) sentences.push(`${joinNames(largestAligned)} share all three generational planets.`);
  if (outliers.length > 0) {
    sentences.push(`${joinNames(outliers)} ${outliers.length === 1 ? "diverges" : "diverge"} on every one.`);
  }
  if (sentences.length === 0) {
    const count = overlay.faultLines.length;
    sentences.push(
      `This group splits along ${count} generational ${pluralize(count, "planet")}, without one clean divide running through all of them.`
    );
  }
  return sentences.join(" ");
}

export interface ParsedPairPlanet {
  planet: string;
  sign?: string;
  signA?: string;
  signB?: string;
}

export interface ParsedPairHighlight {
  sameGeneration: boolean;
  planets: ParsedPairPlanet[];
}

/**
 * Parses the legacy `CohortPairHighlight.summary` string (the only shape the
 * persisted `groups_current` note carries — see @galaxia/core cohort-reading)
 * back into structured planet/sign data, so the UI can build a badge and a
 * plain-English sentence without changing what gets persisted.
 *
 * Formats produced by the engine (page.tsx / /api/groups/cohort), and the
 * only two this parses:
 *   "Same generation (uranus Taurus, neptune Pisces)."
 *   "Fault line: uranus Taurus/Sagittarius · neptune Pisces/Capricorn."
 */
export function parsePairSummary(summary: string): ParsedPairHighlight | null {
  const sameMatch = /^Same generation \((.*)\)\.$/.exec(summary);
  if (sameMatch) {
    const planets = sameMatch[1]!
      .split(", ")
      .filter(Boolean)
      .map((chunk) => {
        const [planet, sign] = chunk.split(" ");
        return { planet: planet ?? "", sign };
      });
    return { sameGeneration: true, planets };
  }
  const faultMatch = /^Fault line: (.*)\.$/.exec(summary);
  if (faultMatch) {
    const planets = faultMatch[1]!
      .split(" · ")
      .filter(Boolean)
      .map((chunk) => {
        const [planet, signPair] = chunk.split(" ");
        const [signA, signB] = (signPair ?? "").split("/");
        return { planet: planet ?? "", signA, signB };
      });
    return { sameGeneration: false, planets };
  }
  return null;
}

export interface PairHighlightPresentation {
  badge: "FAULT LINE" | "SAME GENERATION";
  sentence: string;
  detail: string;
}

/**
 * Turns a raw pair highlight (names + the persisted summary string) into a
 * scannable badge, a plain-English lead sentence, and a secondary detail
 * line of the same planet/sign facts (kept for anyone who wants the raw
 * data — never removed, just no longer the primary read).
 */
export function describePairHighlight(nameA: string, nameB: string, summary: string): PairHighlightPresentation {
  const parsed = parsePairSummary(summary);
  if (!parsed) {
    // Fail-safe: never fabricate a structured read from a string we don't
    // recognize — fall back to showing it verbatim.
    const looksShared = /^same generation/i.test(summary);
    return { badge: looksShared ? "SAME GENERATION" : "FAULT LINE", sentence: summary, detail: summary };
  }

  const planetLabels = parsed.planets.map((p) => capitalizeWord(p.planet));

  if (parsed.sameGeneration) {
    const detail = parsed.planets.map((p) => `${capitalizeWord(p.planet)} ${p.sign}`).join(" · ");
    const sentence =
      planetLabels.length >= GEN_PLANETS.length
        ? `${nameA} and ${nameB} share every generational planet. Their instincts about change, ideals, and power trace back to the same era.`
        : `${nameA} and ${nameB} share ${joinNames(planetLabels)}, enough common generational ground to feel like the same era.`;
    return { badge: "SAME GENERATION", sentence, detail };
  }

  const divergedKeys = parsed.planets.map((p) => p.planet);
  const remainder = GEN_PLANETS.filter((p) => !divergedKeys.includes(p)).map(capitalizeWord);
  const detail = parsed.planets.map((p) => `${capitalizeWord(p.planet)} ${p.signA}/${p.signB}`).join(" · ");
  const sentence =
    planetLabels.length >= GEN_PLANETS.length
      ? `${nameA} and ${nameB} diverge on every generational planet. Their instincts about change, ideals, and power were shaped by different eras.`
      : `${nameA} and ${nameB} diverge on ${joinNames(planetLabels)}${remainder.length > 0 ? `, though they still share ${joinNames(remainder)}` : ""}, a real generational fault line between them.`;
  return { badge: "FAULT LINE", sentence, detail };
}

/** Splits the persisted `"Name A × Name B"` pair key back into the two names. */
export function parsePairNames(pair: string): [string, string] | null {
  const parts = pair.split(" × ");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b) return null;
  return [a, b];
}
