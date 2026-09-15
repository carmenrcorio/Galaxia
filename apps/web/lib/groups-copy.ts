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
export type PairEraGapBand = "adjacent" | "mid" | "distant";

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
export const SHARED_SKY_TAIL: {
  whole: Record<GenPlanetKey, string>;
  majority: Record<GenPlanetKey, string>;
  pair: Record<GenPlanetKey, Record<PairEraGapBand, string>>;
} = {
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
    uranus: {
      adjacent: "They are only one Uranus chapter away from the rest of the room, so they can translate change without sounding alien.",
      mid: "They sit a few Uranus chapters from the room's center, so their pace of change can feel out of sync in both directions.",
      distant: "They stand several Uranus chapters from the room's center, so they may read disruption much earlier or later than everyone else.",
    },
    neptune: {
      adjacent: "Their shared Neptune dream sits near the room's, so the ideals differ by tone more than by direction.",
      mid: "Their Neptune dream comes from a different chapter, close enough to recognize and far enough to misread.",
      distant: "Their Neptune dream was formed far from the room's weather, so they may carry a vision others do not immediately trust.",
    },
    pluto: {
      adjacent: "Their Pluto lesson is one era from the room's, so control clashes are usually about style, not intent.",
      mid: "Their Pluto lesson comes from a clearly different era, so they can agree on stakes while disagreeing on how power should move.",
      distant: "Their Pluto lesson sits generations from the room's center, so they may lock in with each other while others read the stakes differently.",
    },
  },
};

const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const PAIR_ERA_GAP_RULES: Record<GenPlanetKey, { adjacentMax: number; midMax: number }> = {
  // Uranus: ~84-year orbit, ~7 years per sign -> 1 sign ~7y, 2-3 signs ~14-21y, 4+ signs ~28y+.
  uranus: { adjacentMax: 1, midMax: 3 },
  // Neptune: ~165-year orbit, ~13.75 years per sign -> 1 sign ~14y, 2 signs ~28y, 3+ signs ~41y+.
  neptune: { adjacentMax: 1, midMax: 2 },
  // Pluto: ~248-year orbit with variable sign dwell (~12-31y). Band by sign steps: 1 sign (adjacent era), 2 signs (mid), 3+ signs (distant era).
  pluto: { adjacentMax: 1, midMax: 2 },
};

function zodiacSignStepsApart(signA: string, signB: string): number | null {
  const indexA = ZODIAC_SIGNS.indexOf(signA as (typeof ZODIAC_SIGNS)[number]);
  const indexB = ZODIAC_SIGNS.indexOf(signB as (typeof ZODIAC_SIGNS)[number]);
  if (indexA === -1 || indexB === -1) return null;
  const raw = Math.abs(indexA - indexB);
  return Math.min(raw, ZODIAC_SIGNS.length - raw);
}

function pairEraGapBand(planet: string, sharedSign: string, otherSigns: readonly string[]): PairEraGapBand {
  if (!isGenPlanet(planet) || otherSigns.length === 0) return "distant";
  const signSteps = otherSigns
    .map((otherSign) => zodiacSignStepsApart(sharedSign, otherSign))
    .filter((steps): steps is number => steps !== null);
  if (signSteps.length === 0) return "distant";
  const nearestGap = Math.min(...signSteps);
  const rule = PAIR_ERA_GAP_RULES[planet];
  if (nearestGap <= rule.adjacentMax) return "adjacent";
  if (nearestGap <= rule.midMax) return "mid";
  return "distant";
}

export function isGenPlanet(planet: string): planet is GenPlanetKey {
  return (GEN_PLANETS as readonly string[]).includes(planet);
}

export function coverageShape(sharerCount: number, totalMembers: number): SharedSkyCoverage {
  if (totalMembers > 0 && sharerCount >= totalMembers) return "whole";
  if (sharerCount === 2) return "pair";
  return "majority";
}

export function sharedSkyTail(
  coverage: SharedSkyCoverage,
  planet: string,
  pairBand: PairEraGapBand = "distant"
): string | undefined {
  if (!isGenPlanet(planet)) return undefined;
  if (coverage === "pair") return SHARED_SKY_TAIL.pair[planet][pairBand];
  return SHARED_SKY_TAIL[coverage][planet];
}

export const GENERATIONAL_MAP_FRAMING =
  "These planets move slowly, so everyone born within a few years shares them. They show where instincts were formed, and where generations split.";

export const GROUPS_INTRO_LINES = [
  "This page reads the slow planets: Uranus, Neptune, and Pluto. Everyone born within a few years shares them.",
  "Shared sky is what the group has in common. Fault lines are where generations split.",
  "Tap a gold-underlined name to see what a planet or sign means in plain English.",
] as const;

export const GROUPS_INTRO_GOT_IT = "Got it";

export const GROUPS_EXAMPLE_BADGE = "Example";

export const GROUPS_EXAMPLE_TITLE = "A sample group";

export const GROUPS_EXAMPLE_NOTICE =
  "This is an example reading, not your group. The names are fictional. The charts are real.";

export const GROUPS_CREATE_REQUIREMENT = "A group needs three or more people.";

export const GROUPS_EMPTY_ADD_SOMEONE = "Add someone";

export const GROUPS_EMPTY_BUILD_THIS_GROUP = "Build this group";

export const GROUPS_EMPTY_DEFAULT_NAME = "My circle";

/**
 * One-tap prefill ceiling. Matches the chart-grid max so a user with a large
 * roster (the founder's account has 16 people) is not offered a 16-person
 * overlay that the rest of Groups then truncates.
 */
export const GROUPS_EMPTY_PREFILL_MAX = 8;

export const GROUPS_EXAMPLE_CANNOT_SAVE = "Example people cannot be saved as a group.";

/** How many more people a roster needs to reach the group minimum of three. */
export function groupsEmptyPeopleNeeded(peopleCount: number): number {
  return Math.max(0, 3 - Math.max(0, peopleCount));
}


export function groupsEmptyPeopleStatus(peopleCount: number): string {
  const have = Math.max(0, peopleCount);
  const more = groupsEmptyPeopleNeeded(have);
  if (more === 0) return "";
  if (have === 0) return "You have no people yet. Add 3 to read a group.";
  if (have === 1) return "You have 1 person. Add 2 more to read a group.";
  return `You have ${have} people. Add ${more} more to read a group.`;
}

/** People named and prefilled for the one-tap empty-state offer. */
export function groupsEmptyPrefillPeople<T>(people: readonly T[]): T[] {
  return people.slice(0, GROUPS_EMPTY_PREFILL_MAX);
}


export function groupsEmptyBuildWith(names: readonly string[]): string {
  return `Build a group with ${joinNames(names)}.`;
}

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
  /**
   * Pair-only era-gap band against the nearest non-sharer sign group on this
   * planet. Undefined for majority/whole coverage.
   */
  pairEraGapBand?: PairEraGapBand;
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
        const otherSigns = line.groups.filter((other) => other !== g).map((other) => other.sign);
        overlaps.push({
          planet: line.planet,
          sign: g.sign,
          names: [...g.names],
          totalMembers,
          pairEraGapBand: g.names.length === 2 ? pairEraGapBand(line.planet, g.sign, otherSigns) : undefined,
        });
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

function tailForOverlaps(coverage: SharedSkyCoverage, overlaps: readonly Pick<PartialOverlap, "planet" | "pairEraGapBand">[]): string {
  return overlaps
    .map((overlap) => sharedSkyTail(coverage, overlap.planet, overlap.pairEraGapBand))
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
  const tail = tailForOverlaps(coverage, [{ planet }]);
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
  const planets = overlaps.map((p) => p.planet);
  const gloss = glossForPlanets(planets);
  const tail = tailForOverlaps(coverage, overlaps);
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
export const SHARED_SKY_NO_OVERLAP_NOTE =
  "No outer planet sign is shared across all members. This group bridges generational cohorts, which is both its richness and its friction. See Fault Lines below for what divides them.";

function partitionKey(groups: Array<{ names: string[] }>): string {
  return groups
    .map((g) => [...g.names].sort().join(","))
    .sort()
    .join("|");
}

/** How many of the three generational planets are in play. Always 1, 2, or 3. */
export type PlanetCountBand = 1 | 2 | 3;

export function toPlanetCountBand(count: number): PlanetCountBand {
  if (count >= 3) return 3;
  if (count === 2) return 2;
  return 1;
}

function planetPhrase(planets: readonly string[]): string {
  return joinNames(planets.map((planet) => capitalizeWord(planet)));
}

type TwoWayFaultLeadFn = (planets: string, minority: string, majority: string) => string;
type ShiftingFaultLeadFn = (planets: string) => string;

/**
 * Fault Lines section lead, clean 2-way split (same people on each side of
 * every listed planet). Banded by how many planets create the split.
 */
export const FAULT_LINES_LEAD_TWO_WAY: Record<PlanetCountBand, TwoWayFaultLeadFn> = {
  1: (planets, minority, majority) =>
    `This group spans two distinct generational cohorts. ${planets} is the one planet that splits them: ${minority}'s instincts were shaped by a different era than ${majority}'s.`,
  2: (planets, minority, majority) =>
    `This group spans two distinct generational cohorts. On ${planets}, ${minority}'s instincts were shaped by a different era than ${majority}'s. The same split runs through both planets.`,
  3: (planets, minority, majority) =>
    `This group spans two distinct generational cohorts. On ${planets}, ${minority}'s instincts were shaped by a different era than ${majority}'s, which is both what makes this group rich and where its deepest friction lives.`,
};

/**
 * Fault Lines section lead when the people on each side change by planet.
 * Banded by how many planets create a split.
 */
export const FAULT_LINES_LEAD_SHIFTING: Record<PlanetCountBand, ShiftingFaultLeadFn> = {
  1: (planets) =>
    `${planets} splits this group along more than one sign. That split is real: different people carry the friction depending on what is being negotiated.`,
  2: (planets) =>
    `This group's generational fault lines shift depending on the planet. ${planets} each split the group along a different line. Different people carry the friction depending on what is being negotiated.`,
  3: (planets) =>
    `${planets} each split this group along a different line. The fault line moves with the planet, so different people carry the friction depending on what is being negotiated.`,
};

/**
 * Interpretive paragraph that precedes the planet-by-planet Fault Lines
 * list. Derived entirely from the shape of `faultLines` (who splits from
 * whom, and whether that split repeats across planets) — never a new
 * astrology fact, only a narration of the partition the engine already
 * produced. Banded by planet count (1 / 2 / 3) so the lead names the
 * actual planets instead of a generic "slow-moving" phrase.
 */
export function faultLinesInterpretation(faultLines: CohortOverlayLike["faultLines"]): string {
  if (faultLines.length === 0) return "";
  const keys = faultLines.map((l) => partitionKey(l.groups));
  const allSamePartition = keys.every((k) => k === keys[0]);
  const planets = planetPhrase(faultLines.map((l) => l.planet));
  const band = toPlanetCountBand(faultLines.length);

  if (allSamePartition && faultLines[0]!.groups.length === 2) {
    const [g1, g2] = faultLines[0]!.groups;
    const minority = g1!.names.length <= g2!.names.length ? g1! : g2!;
    const majority = minority === g1 ? g2! : g1!;
    return FAULT_LINES_LEAD_TWO_WAY[band](planets, joinNames(minority.names), joinNames(majority.names));
  }

  return FAULT_LINES_LEAD_SHIFTING[band](planets);
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

type PairShareLeadFn = (nameA: string, nameB: string, planets: string) => string;
type PairFaultLeadFn = (nameA: string, nameB: string, planets: string, remainder: string) => string;

/**
 * Pair Dynamics Same Generation lead, banded by how many generational
 * planets the pair shares. Each template names those planets.
 *
 * `compareGenerational` currently classifies a pair as same-generation only
 * when 2 or 3 planets are shared; the 1-planet band is still authored so the
 * axis stays fully enumerable if a persisted summary lists a single share.
 */
export const SAME_GENERATION_LEAD: Record<PlanetCountBand, PairShareLeadFn> = {
  1: (nameA, nameB, planets) =>
    `${nameA} and ${nameB} share ${planets}. That one planet is a common thread in how they were formed.`,
  2: (nameA, nameB, planets) =>
    `${nameA} and ${nameB} share ${planets}. Those two planets give them enough common generational ground to feel like the same era.`,
  3: (nameA, nameB, planets) =>
    `${nameA} and ${nameB} share ${planets}. Their instincts about change, ideals, and power all come from the same era.`,
};

/**
 * Pair Dynamics Fault Line lead, banded by how many generational planets
 * the pair diverges on. Each template names those planets. Counts 1 and 2
 * also name the still-shared remainder (a lossless complement of the three
 * generational planets, never a new fact).
 *
 * `compareGenerational` currently emits a fault-line summary when fewer
 * than 2 planets are shared (so 2 or 3 diverge); the 1-planet band is still
 * authored so the axis stays fully enumerable.
 */
export const FAULT_LINE_PAIR_LEAD: Record<PlanetCountBand, PairFaultLeadFn> = {
  1: (nameA, nameB, planets, remainder) =>
    `${nameA} and ${nameB} diverge on ${planets}. That one planet is the generational split between them, and they still share ${remainder}.`,
  2: (nameA, nameB, planets, remainder) =>
    `${nameA} and ${nameB} diverge on ${planets}. Those two planets are a real generational fault line, though they still share ${remainder}.`,
  3: (nameA, nameB, planets) =>
    `${nameA} and ${nameB} diverge on ${planets}. Their instincts about change, ideals, and power were shaped by different eras.`,
};

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

  const planetKeys = parsed.planets.map((p) => p.planet).filter(Boolean);
  if (planetKeys.length === 0) {
    return {
      badge: parsed.sameGeneration ? "SAME GENERATION" : "FAULT LINE",
      sentence: summary,
      detail: summary,
    };
  }

  const band = toPlanetCountBand(planetKeys.length);
  const planets = planetPhrase(planetKeys);

  if (parsed.sameGeneration) {
    const detail = parsed.planets.map((p) => `${capitalizeWord(p.planet)} ${p.sign}`).join(" · ");
    return { badge: "SAME GENERATION", sentence: SAME_GENERATION_LEAD[band](nameA, nameB, planets), detail };
  }

  const remainderKeys = GEN_PLANETS.filter((p) => !planetKeys.includes(p));
  const remainder = planetPhrase(remainderKeys);
  const detail = parsed.planets.map((p) => `${capitalizeWord(p.planet)} ${p.signA}/${p.signB}`).join(" · ");
  const sentence =
    (band === 1 || band === 2) && remainder.length === 0
      ? FAULT_LINE_PAIR_LEAD[3](nameA, nameB, planets, "")
      : FAULT_LINE_PAIR_LEAD[band](nameA, nameB, planets, remainder);
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
