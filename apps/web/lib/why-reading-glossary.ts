import { aspectGlossarySlug, getGlossaryTerm } from "./glossary-terms";
import type { WhyReadingInsightType } from "./why-reading";

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
