import { planetMeaning, signMeaning } from "./astro-glossary";
import { aspectGlossarySlug, getGlossaryTerm } from "./glossary-terms";
import type { WhyReadingInsightType } from "./why-reading";

export type WhyReadingGlossarySegment = {
  start: number;
  end: number;
  slug?: string;
  sign?: string;
  planet?: string;
};

const ASPECT_WORDS =
  "conjunction|opposition|square|trine|sextile|quincunx";

const INSIGHT_GLOSSARY_DEFAULT: Partial<Record<WhyReadingInsightType, string>> = {
  element_balance: "element",
  house_overlay: "house",
  watch_line_mercury: "mercury",
};

const FLIP_LABEL_TO_GLOSSARY: Record<string, string> = {
  sun: "sun",
  moon: "moon",
  rising: "rising-sign",
};

function glossaryHash(id: string): string {
  return `/glossary#${id}`;
}

function resolveSlug(id: string): string | null {
  return getGlossaryTerm(id) ? id : null;
}

function displayNameToGlossaryId(name: string): string | null {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return getGlossaryTerm(normalized) ? normalized : null;
}

function parseCrossChartAspect(line: string): {
  from: string;
  to: string;
  type: string;
  named?: { nameA: string; nameB: string };
} | null {
  const named = new RegExp(
    `^(.+?)'s\\s+(.+?)\\s+(${ASPECT_WORDS})\\s+(.+?)'s\\s+(.+?),`,
    "i",
  ).exec(line);
  if (named) {
    return {
      from: named[2]!.trim(),
      to: named[5]!.trim(),
      type: named[3]!.toLowerCase(),
      named: { nameA: named[1]!.trim(), nameB: named[4]!.trim() },
    };
  }
  const plain = new RegExp(
    `^(.+?)\\s+(${ASPECT_WORDS})\\s+(.+?),\\s+orb`,
    "i",
  ).exec(line);
  if (plain) {
    return { from: plain[1]!.trim(), to: plain[3]!.trim(), type: plain[2]!.toLowerCase() };
  }
  return null;
}

function comboAspectSlug(from: string, type: string, to: string): string | null {
  const fromId = displayNameToGlossaryId(from);
  const toId = displayNameToGlossaryId(to);
  const aspectSlug = aspectGlossarySlug(type);
  if (!aspectSlug) return null;

  if (fromId && toId) {
    const pairCandidates = [
      `${fromId}-${aspectSlug}-${toId}`,
      aspectSlug === "conjunction" ? `${fromId}-conjunct-${toId}` : null,
    ].filter((id): id is string => id != null);
    for (const pairId of pairCandidates) {
      if (getGlossaryTerm(pairId)) return pairId;
    }
  }
  return resolveSlug(aspectSlug);
}

function parsePlacementSubject(line: string): string | null {
  const match = /^(.+?)\s+in\s+/i.exec(line.trim());
  return match ? match[1]!.trim() : null;
}

function parseGenerationalPlanet(line: string): string | null {
  const shared = /^(\w+)\s+in\s+/i.exec(line.trim());
  if (shared) return shared[1]!;
  const diverged = /Your\s+(\w+)\s+in/i.exec(line);
  if (diverged) return diverged[1]!;
  return null;
}

function parseFlipLabelSlug(line: string): string | null {
  const subject = parsePlacementSubject(line);
  if (!subject) return null;
  const key = subject.toLowerCase();
  const id = FLIP_LABEL_TO_GLOSSARY[key];
  if (id) return resolveSlug(id);
  const fromName = displayNameToGlossaryId(subject);
  return fromName ?? null;
}

function parseChartPatternSlug(line: string): string | null {
  const lower = line.toLowerCase();
  if (lower.startsWith("grand trine")) return resolveSlug("trine");
  if (lower.startsWith("t-square")) return resolveSlug("square");
  if (lower.startsWith("stellium")) return resolveSlug("aspect");
  return null;
}

function aspectPhrase(line: string): string | null {
  const parsed = parseCrossChartAspect(line);
  if (!parsed) return null;
  if (parsed.named) {
    const { from, type, to, named } = parsed;
    return `${named.nameA}'s ${from} ${type} ${named.nameB}'s ${to}`;
  }
  return `${parsed.from} ${parsed.type} ${parsed.to}`;
}

function segmentsOverlap(a: WhyReadingGlossarySegment, b: WhyReadingGlossarySegment): boolean {
  return a.start < b.end && b.start < a.end;
}

function pushSegment(segments: WhyReadingGlossarySegment[], line: string, phrase: string, meta: Omit<WhyReadingGlossarySegment, "start" | "end">) {
  const trimmedPhrase = phrase.trim();
  if (!trimmedPhrase) return;
  const start = line.indexOf(trimmedPhrase);
  if (start === -1) return;
  const candidate: WhyReadingGlossarySegment = { start, end: start + trimmedPhrase.length, ...meta };
  if (segments.some((existing) => segmentsOverlap(existing, candidate))) return;
  segments.push(candidate);
}

function pushPlanet(segments: WhyReadingGlossarySegment[], line: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const slug = displayNameToGlossaryId(trimmed);
  if (slug) {
    pushSegment(segments, line, trimmed, { slug });
    return;
  }
  if (planetMeaning(trimmed.toLowerCase())) {
    pushSegment(segments, line, trimmed, { planet: trimmed.toLowerCase() });
  }
}

function pushSign(segments: WhyReadingGlossarySegment[], line: string, sign: string) {
  const trimmed = sign.trim();
  if (!trimmed || !signMeaning(trimmed)) return;
  pushSegment(segments, line, trimmed, { sign: trimmed });
}

function pushSlugTerm(segments: WhyReadingGlossarySegment[], line: string, phrase: string, slug: string) {
  if (!resolveSlug(slug)) return;
  pushSegment(segments, line, phrase, { slug });
}

function placementSignInLine(line: string): string | null {
  const match = /\sin\s+([A-Za-z]+)/i.exec(line);
  return match ? match[1]! : null;
}

function addPlacementStyleSegments(
  segments: WhyReadingGlossarySegment[],
  line: string,
  insightType: WhyReadingInsightType,
) {
  const subject = parsePlacementSubject(line);
  if (subject) {
    if (insightType === "flip_card") {
      const key = subject.toLowerCase();
      const flipSlug = FLIP_LABEL_TO_GLOSSARY[key];
      if (flipSlug && resolveSlug(flipSlug)) {
        pushSegment(segments, line, subject, { slug: flipSlug });
      } else {
        pushPlanet(segments, line, subject);
      }
    } else {
      pushPlanet(segments, line, subject);
    }
  }
  const sign = placementSignInLine(line);
  if (sign) pushSign(segments, line, sign);
}

function addAspectSegments(segments: WhyReadingGlossarySegment[], line: string) {
  const parsed = parseCrossChartAspect(line);
  if (!parsed) return;
  pushPlanet(segments, line, parsed.from);
  const aspectSlug = aspectGlossarySlug(parsed.type);
  if (aspectSlug && resolveSlug(aspectSlug)) {
    pushSegment(segments, line, parsed.type, { slug: aspectSlug });
  }
  pushPlanet(segments, line, parsed.to);
}

/** Ordered, non-overlapping glossary spans for inline popovers in a derivation line. */
export function whyReadingGlossarySegments(
  line: string,
  insightType: WhyReadingInsightType,
): WhyReadingGlossarySegment[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const segments: WhyReadingGlossarySegment[] = [];

  const defaultId = INSIGHT_GLOSSARY_DEFAULT[insightType];
  if (defaultId) {
    const term = getGlossaryTerm(defaultId)?.term;
    if (term && trimmed.toLowerCase().includes(term.toLowerCase())) {
      pushSlugTerm(segments, trimmed, term, defaultId);
    }
    if (insightType === "house_overlay" && /\bhouse\b/i.test(trimmed)) {
      pushSlugTerm(segments, trimmed, "house", "house");
    }
    return segments.sort((a, b) => a.start - b.start);
  }

  if (
    insightType === "natal_placement" ||
    insightType === "first_run_need" ||
    insightType === "flip_card"
  ) {
    addPlacementStyleSegments(segments, trimmed, insightType);
    return segments.sort((a, b) => a.start - b.start);
  }

  if (insightType === "generational_shared") {
    const planet = parseGenerationalPlanet(trimmed);
    if (planet) pushPlanet(segments, trimmed, planet);
    const sign = placementSignInLine(trimmed);
    if (sign) pushSign(segments, trimmed, sign);
    return segments.sort((a, b) => a.start - b.start);
  }

  if (insightType === "generational_diverged") {
    const planet = parseGenerationalPlanet(trimmed);
    if (planet) pushPlanet(segments, trimmed, planet);
    for (const match of trimmed.matchAll(/\bin\s+([A-Za-z]+)/gi)) {
      pushSign(segments, trimmed, match[1]!);
    }
    return segments.sort((a, b) => a.start - b.start);
  }

  if (insightType === "chart_pattern") {
    const slug = parseChartPatternSlug(trimmed);
    const phrase = highlightPhrase(trimmed, insightType, slug ?? "");
    if (slug && phrase) pushSlugTerm(segments, trimmed, phrase, slug);
    return segments.sort((a, b) => a.start - b.start);
  }

  if (
    insightType === "natal_aspect" ||
    insightType === "quick_check_aspect" ||
    insightType === "flows_catches_row" ||
    insightType === "flows_catches_framing"
  ) {
    addAspectSegments(segments, trimmed);
    return segments.sort((a, b) => a.start - b.start);
  }

  return segments.sort((a, b) => a.start - b.start);
}

function highlightPhrase(
  line: string,
  insightType: WhyReadingInsightType,
  slug: string,
): string | null {
  const trimmed = line.trim();
  const entryTerm = getGlossaryTerm(slug)?.term;

  if (
    insightType === "natal_aspect" ||
    insightType === "quick_check_aspect" ||
    insightType === "flows_catches_row" ||
    insightType === "flows_catches_framing"
  ) {
    const phrase = aspectPhrase(trimmed);
    if (phrase && trimmed.includes(phrase)) return phrase;
    if (entryTerm && trimmed.toLowerCase().includes(entryTerm.toLowerCase())) {
      return entryTerm;
    }
    return phrase;
  }

  if (insightType === "natal_placement" || insightType === "first_run_need") {
    return parsePlacementSubject(trimmed);
  }

  if (insightType === "flip_card") {
    return parsePlacementSubject(trimmed);
  }

  if (insightType === "generational_shared" || insightType === "generational_diverged") {
    const planet = parseGenerationalPlanet(trimmed);
    if (!planet) return null;
    return planet.charAt(0).toUpperCase() + planet.slice(1);
  }

  if (insightType === "chart_pattern") {
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("grand trine")) return trimmed.split(",")[0]?.trim() ?? "Grand trine";
    if (lower.startsWith("t-square")) return trimmed.split(",")[0]?.trim() ?? "T-square";
    if (lower.startsWith("stellium")) return trimmed.split(",")[0]?.trim() ?? "Stellium";
  }

  if (entryTerm && trimmed.toLowerCase().includes(entryTerm.toLowerCase())) {
    return entryTerm;
  }

  return entryTerm ?? null;
}

/**
 * Glossary slug for a derivation line, when `GLOSSARY_TERMS` has a match.
 */
export function whyReadingGlossarySlug(
  line: string,
  insightType: WhyReadingInsightType,
): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const defaultId = INSIGHT_GLOSSARY_DEFAULT[insightType];
  if (defaultId) return resolveSlug(defaultId);

  if (insightType === "flip_card") {
    return parseFlipLabelSlug(trimmed);
  }

  if (insightType === "chart_pattern") {
    return parseChartPatternSlug(trimmed);
  }

  if (
    insightType === "natal_aspect" ||
    insightType === "quick_check_aspect" ||
    insightType === "flows_catches_row" ||
    insightType === "flows_catches_framing"
  ) {
    const parsed = parseCrossChartAspect(trimmed);
    if (parsed) return comboAspectSlug(parsed.from, parsed.type, parsed.to);
  }

  if (
    insightType === "natal_placement" ||
    insightType === "first_run_need"
  ) {
    const subject = parsePlacementSubject(trimmed);
    if (subject) return displayNameToGlossaryId(subject);
  }

  if (insightType === "generational_shared" || insightType === "generational_diverged") {
    const planet = parseGenerationalPlanet(trimmed);
    if (planet) return displayNameToGlossaryId(planet);
  }

  return null;
}

/** Slug plus the substring in `line` that should open the glossary popover. */
export function whyReadingGlossaryHighlight(
  line: string,
  insightType: WhyReadingInsightType,
): { slug: string; phrase: string } | null {
  const segments = whyReadingGlossarySegments(line, insightType);
  const first = segments.find((segment) => segment.slug);
  if (first?.slug) {
    return { slug: first.slug, phrase: line.slice(first.start, first.end) };
  }
  const slug = whyReadingGlossarySlug(line, insightType);
  if (!slug) return null;
  const phrase = highlightPhrase(line, insightType, slug);
  if (!phrase) return null;
  return { slug, phrase };
}

/**
 * When a glossary entry exists for the derivation line, return `/glossary#id`.
 * Otherwise null so callers fall back to `/methodology`.
 */
export function whyReadingGlossaryHref(
  line: string,
  insightType: WhyReadingInsightType,
): string | null {
  const slug = whyReadingGlossarySlug(line, insightType);
  return slug ? glossaryHash(slug) : null;
}
