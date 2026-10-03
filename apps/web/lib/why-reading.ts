import {
  bodyDisplayName,
  CHART_ELEMENTS,
  formatTSquarePatternDetail,
  type AspectPattern,
  type HouseOverlayLine,
  type PairElementBalance,
} from "@galaxia/astro";

/** Vercel Analytics payload for why_reading_opened (no PII). */
export type WhyReadingInsightType =
  | "flows_catches_row"
  | "flows_catches_framing"
  | "quick_check_aspect"
  | "watch_line_mercury"
  | "generational_shared"
  | "generational_diverged"
  | "flip_card"
  | "natal_placement"
  | "natal_aspect"
  | "chart_pattern"
  | "element_balance"
  | "house_overlay"
  | "first_run_need";

export type CrossChartAspect = {
  from: string;
  to: string;
  type: string;
  orb: number;
};

function capPlanet(body: string): string {
  return bodyDisplayName(body);
}

function formatOrbDegrees(orb: number): string {
  return `${orb.toFixed(1)} degrees`;
}

/** Cross-chart synastry aspect with optional display names. */
export function formatCrossChartAspectLine(
  aspect: CrossChartAspect,
  nameA?: string,
  nameB?: string
): string {
  const from = capPlanet(aspect.from);
  const to = capPlanet(aspect.to);
  const type = aspect.type.toLowerCase();
  const orb = formatOrbDegrees(aspect.orb);
  if (nameA && nameB) {
    return `${nameA}'s ${from} ${type} ${nameB}'s ${to}, orb ${orb}.`;
  }
  return `${from} ${type} ${to}, orb ${orb}.`;
}

export function formatNatalAspectLine(aspect: CrossChartAspect): string {
  const from = capPlanet(aspect.from);
  const to = capPlanet(aspect.to);
  return `${from} ${aspect.type.toLowerCase()} ${to}, orb ${formatOrbDegrees(aspect.orb)}.`;
}

export function formatPlacementLine(body: string, sign: string, house?: number, degree?: number): string {
  const label = capPlanet(body);
  let line = `${label} in ${sign}`;
  if (house != null) line += `, house ${house}`;
  if (degree != null) line += `, ${degree.toFixed(1)} degrees`;
  return `${line}.`;
}

export function formatFlipCardLine(label: string, sign: string): string {
  return `${label} in ${sign}.`;
}

export function formatGenerationalSharedLine(planet: string, sign: string): string {
  const name = planet.charAt(0).toUpperCase() + planet.slice(1);
  return `${name} in ${sign}.`;
}

export function formatGenerationalDivergedLine(planet: string, signA: string, signB: string): string {
  const name = planet.charAt(0).toUpperCase() + planet.slice(1);
  return `Your ${name} in ${signA}, their ${name} in ${signB}.`;
}

export function formatElementBalanceLine(balance: PairElementBalance, nameA: string, nameB: string): string {
  const fmtCounts = (counts: PairElementBalance["a"]) =>
    CHART_ELEMENTS.map((el) => `${el[0]!.toUpperCase()}${el.slice(1)} ${counts[el]}`).join(", ");

  const parts = [`${nameA}: ${fmtCounts(balance.a)}`, `${nameB}: ${fmtCounts(balance.b)}`];

  if (balance.balanced) {
    parts.push("Combined mix is balanced across elements.");
  } else if (balance.dominantElements.length > 0) {
    const labels = balance.dominantElements.map((el) => el[0]!.toUpperCase() + el.slice(1)).join(", ");
    parts.push(`Combined dominant: ${labels}.`);
  }

  if (balance.missingElements.length > 0) {
    const labels = balance.missingElements.map((el) => el[0]!.toUpperCase() + el.slice(1)).join(", ");
    parts.push(`Lightly represented combined: ${labels}.`);
  }

  return parts.join(" ");
}

export function formatChartPatternLine(pattern: AspectPattern): string {
  if (pattern.type === "grand_trine") {
    const planets = pattern.planets.map(bodyDisplayName).join(", ");
    const el = pattern.element ? `${pattern.element[0]!.toUpperCase()}${pattern.element.slice(1)} ` : "";
    return `Grand trine: ${el}${planets}.`;
  }
  if (pattern.type === "t_square") {
    return `${formatTSquarePatternDetail(pattern)}.`;
  }
  const planets = pattern.planets.map(bodyDisplayName).join(", ");
  return `Stellium in ${pattern.sign}: ${planets}.`;
}

export function formatHouseOverlayLine(
  line: HouseOverlayLine,
  nameA: string,
  nameB: string
): string {
  const body = capPlanet(line.body);
  const ownerName = line.owner === "A" ? nameA : nameB;
  const hostName = line.owner === "A" ? nameB : nameA;
  return `${ownerName}'s ${body} in ${hostName}'s house ${line.house} (${line.area}).`;
}

export function formatFirstRunNeedLine(body: string, sign: string): string {
  return `${capPlanet(body)} in ${sign}.`;
}

/**
 * Same Mercury-aspect pick as relationshipWatchLine() uses for platonic copy.
 * Does not call relationshipWatchLine; mirrors its aspect branch only.
 */
export function platonicWatchMercuryAspect(
  synastry: { aspects: CrossChartAspect[] } | null
): CrossChartAspect | null {
  const receivingAspects =
    synastry?.aspects
      .filter((a) => a.orb < 4)
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 3) ?? [];

  const mercuryAspect = receivingAspects.find(
    (a) => a.from.toLowerCase() === "mercury" || a.to.toLowerCase() === "mercury"
  );
  return mercuryAspect ?? null;
}

export function platonicWatchLineDerivation(
  synastry: { aspects: CrossChartAspect[] } | null,
  nameA: string,
  nameB: string
): string | null {
  const aspect = platonicWatchMercuryAspect(synastry);
  if (!aspect) return null;
  return formatCrossChartAspectLine(aspect, nameA, nameB);
}
