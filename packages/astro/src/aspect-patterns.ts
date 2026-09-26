import type { Aspect, BodyName, Placement, Sign } from "./index";

export type AspectPatternType = "grand_trine" | "t_square" | "stellium";
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

export interface AspectPattern {
  type: AspectPatternType;
  planets: BodyName[];
  element?: Element;
  modality?: Modality;
  focalPlanet?: BodyName;
  sign?: Sign;
  count?: number;
}

export interface AspectPatternCopy {
  short: string;
  long: string;
}

const STELLIUM_BODIES = new Set<BodyName>([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "north_node",
  "chiron",
]);

function pairKey(a: BodyName, b: BodyName): string {
  return [a, b].sort().join(":");
}

function aspectPairs(aspects: Aspect[], type: Aspect["type"]): Set<string> {
  return new Set(
    aspects
      .filter((aspect) => aspect.type === type && aspect.from !== aspect.to)
      .map((aspect) => pairKey(aspect.from, aspect.to))
  );
}

function hasPair(pairs: Set<string>, a: BodyName, b: BodyName): boolean {
  return pairs.has(pairKey(a, b));
}

function mostCommonElement(placements: Placement[]): Element {
  const counts: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const placement of placements) counts[elementForPatternSign(placement.sign)] += 1;
  return (Object.entries(counts) as [Element, number][]).reduce(
    (best, current) => (current[1] > best[1] ? current : best)
  )[0];
}

function elementForPatternSign(sign: Sign): Element {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "air";
  return "water";
}

function modalityForPatternSign(sign: Sign): Modality {
  if (["Aries", "Cancer", "Libra", "Capricorn"].includes(sign)) return "cardinal";
  if (["Taurus", "Leo", "Scorpio", "Aquarius"].includes(sign)) return "fixed";
  return "mutable";
}

/**
 * Detects natal chart structures from already-computed aspects and placements.
 * Aspect edges are treated as undirected so the same-chart synastry pass may
 * contain both A→B and B→A without producing duplicate patterns.
 */
export function detectAspectPatterns(
  aspects: Aspect[],
  placements: Placement[]
): AspectPattern[] {
  const confidentPlacements = placements.filter(
    (placement) => placement.confident !== false && STELLIUM_BODIES.has(placement.body)
  );
  const placementByBody = new Map(
    confidentPlacements.map((placement) => [placement.body, placement] as const)
  );
  const bodies = confidentPlacements.map((placement) => placement.body);
  const patterns: AspectPattern[] = [];

  const trines = aspectPairs(aspects, "trine");
  for (let i = 0; i < bodies.length - 2; i += 1) {
    for (let j = i + 1; j < bodies.length - 1; j += 1) {
      for (let k = j + 1; k < bodies.length; k += 1) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        const c = bodies[k]!;
        if (!hasPair(trines, a, b) || !hasPair(trines, a, c) || !hasPair(trines, b, c)) {
          continue;
        }
        const trianglePlacements = [placementByBody.get(a), placementByBody.get(b), placementByBody.get(c)]
          .filter((placement): placement is Placement => placement !== undefined);
        patterns.push({
          type: "grand_trine",
          planets: [a, b, c],
          element: mostCommonElement(trianglePlacements),
        });
      }
    }
  }

  const oppositions = aspectPairs(aspects, "opposition");
  const squares = aspectPairs(aspects, "square");
  const seenTSquares = new Set<string>();
  for (let i = 0; i < bodies.length - 1; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const oppositionA = bodies[i]!;
      const oppositionB = bodies[j]!;
      if (!hasPair(oppositions, oppositionA, oppositionB)) continue;
      for (const focalPlanet of bodies) {
        if (
          focalPlanet === oppositionA ||
          focalPlanet === oppositionB ||
          !hasPair(squares, oppositionA, focalPlanet) ||
          !hasPair(squares, oppositionB, focalPlanet)
        ) {
          continue;
        }
        const key = `${pairKey(oppositionA, oppositionB)}:${focalPlanet}`;
        if (seenTSquares.has(key)) continue;
        seenTSquares.add(key);
        const focalPlacement = placementByBody.get(focalPlanet);
        if (!focalPlacement) continue;
        patterns.push({
          type: "t_square",
          planets: [oppositionA, oppositionB, focalPlanet],
          focalPlanet,
          modality: modalityForPatternSign(focalPlacement.sign),
        });
      }
    }
  }

  const planetsBySign = new Map<Sign, BodyName[]>();
  for (const placement of confidentPlacements) {
    planetsBySign.set(placement.sign, [
      ...(planetsBySign.get(placement.sign) ?? []),
      placement.body,
    ]);
  }
  for (const [sign, signBodies] of planetsBySign) {
    if (signBodies.length < 3) continue;
    patterns.push({
      type: "stellium",
      planets: signBodies,
      sign,
      count: signBodies.length,
    });
  }

  return patterns;
}

const GRAND_TRINE_LONG: Record<Element, string> = {
  // FOUNDER-REVIEW: Grand Trine interpretation copy.
  fire: "Creative confidence that feeds itself. Risk: coasting without being tested.",
  // FOUNDER-REVIEW: Grand Trine interpretation copy.
  earth: "Steady material instincts. Risk: comfort that never reaches.",
  // FOUNDER-REVIEW: Grand Trine interpretation copy.
  air: "Ideas connect before finished. Risk: talking instead of doing.",
  // FOUNDER-REVIEW: Grand Trine interpretation copy.
  water: "Emotional intelligence that reads a room. Risk: absorbing what is not yours.",
};

export function aspectPatternCopy(pattern: AspectPattern): AspectPatternCopy {
  if (pattern.type === "grand_trine") {
    return {
      // FOUNDER-REVIEW: Grand Trine short interpretation.
      short: "A rare gift: three planets in effortless conversation",
      long: GRAND_TRINE_LONG[pattern.element ?? "fire"],
    };
  }
  if (pattern.type === "t_square") {
    return {
      // FOUNDER-REVIEW: T-Square short interpretation.
      short: "Built-in tension that demands action",
      // FOUNDER-REVIEW: T-Square long interpretation.
      long: "Two forces pull opposite, both push a third point. That point is where growth happens. Not a flaw. A motor.",
    };
  }
  return {
    // FOUNDER-REVIEW: Stellium short interpretation.
    short: `${pattern.count ?? pattern.planets.length} planets in ${pattern.sign}: a concentration of purpose`,
    // FOUNDER-REVIEW: Stellium long interpretation.
    long: "When this many planets occupy one sign, that energy dominates. Superpower and blind spot in the same breath.",
  };
}
