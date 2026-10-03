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

function resolveId(id: string): string | null {
  return getGlossaryTerm(id) ? glossaryHash(id) : null;
}

function displayNameToGlossaryId(name: string): string | null {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return getGlossaryTerm(normalized) ? normalized : null;
}

function parseCrossChartAspect(line: string): {
  from: string;
  to: string;
  type: string;
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
      if (getGlossaryTerm(pairId)) return glossaryHash(pairId);
    }
  }
  return resolveId(aspectSlug);
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

function parseFlipLabel(line: string): string | null {
  const subject = parsePlacementSubject(line);
  if (!subject) return null;
  const key = subject.toLowerCase();
  const id = FLIP_LABEL_TO_GLOSSARY[key];
  return id ? resolveId(id) : displayNameToGlossaryId(subject) ? glossaryHash(displayNameToGlossaryId(subject)!) : null;
}

function parseChartPattern(line: string): string | null {
  const lower = line.toLowerCase();
  if (lower.startsWith("grand trine")) return resolveId("trine");
  if (lower.startsWith("t-square")) return resolveId("square");
  if (lower.startsWith("stellium")) return resolveId("aspect");
  return null;
}

/**
 * When a glossary entry exists for the derivation line, return `/glossary#id`.
 * Otherwise null so callers fall back to `/methodology`.
 */
export function whyReadingGlossaryHref(
  line: string,
  insightType: WhyReadingInsightType,
): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const defaultId = INSIGHT_GLOSSARY_DEFAULT[insightType];
  if (defaultId) return resolveId(defaultId);

  if (insightType === "flip_card") {
    return parseFlipLabel(trimmed);
  }

  if (insightType === "chart_pattern") {
    return parseChartPattern(trimmed);
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
    if (subject) {
      const id = displayNameToGlossaryId(subject);
      if (id) return glossaryHash(id);
    }
  }

  if (insightType === "generational_shared" || insightType === "generational_diverged") {
    const planet = parseGenerationalPlanet(trimmed);
    if (planet) {
      const id = displayNameToGlossaryId(planet);
      if (id) return glossaryHash(id);
    }
  }

  return null;
}
