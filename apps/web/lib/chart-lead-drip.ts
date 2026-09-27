import {
  interpretPlacement,
  type BodyKey,
  type NatalChart,
  type SignKey,
} from "@galaxia/astro";

const DAY_MS = 86_400_000;
const DUE_DAY_BY_CURRENT_STEP = [1, 3, 7] as const;

export type ChartLeadDripStep = 1 | 2 | 3;

export interface ChartLeadPlacementCopy {
  statement: string;
  reading: string;
}

export interface ChartLeadChartCopy {
  moon: ChartLeadPlacementCopy;
  mercury: ChartLeadPlacementCopy;
  mars: ChartLeadPlacementCopy;
}

export type ChartLeadDripSkipReason =
  | "notDue"
  | "noResendKey"
  | "invalidChartData"
  | "sendFailed";

export type ChartLeadDripSkipped = Record<ChartLeadDripSkipReason, number>;

export function emptyChartLeadDripSkipped(): ChartLeadDripSkipped {
  return {
    notDue: 0,
    noResendKey: 0,
    invalidChartData: 0,
    sendFailed: 0,
  };
}

export function chartLeadDueStep(
  currentStep: number,
  createdAt: string,
  nowMs: number = Date.now()
): ChartLeadDripStep | null {
  if (!Number.isInteger(currentStep) || currentStep < 0 || currentStep >= 3) return null;
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return null;
  const dueDay = DUE_DAY_BY_CURRENT_STEP[currentStep]!;
  return nowMs - createdMs >= dueDay * DAY_MS ? ((currentStep + 1) as ChartLeadDripStep) : null;
}

function placementCopy(chart: NatalChart, body: "moon" | "mercury" | "mars"): ChartLeadPlacementCopy {
  const placement = chart.placements.find((candidate) => candidate.body === body);
  const label = body === "moon" ? "Moon" : body === "mercury" ? "Mercury" : "Mars";

  if (placement?.confident === true) {
    const sign = placement.sign as SignKey;
    // FOUNDER-REVIEW: "This chart has [placement] in [sign]."
    return {
      statement: `This chart has ${label} in ${sign}.`,
      reading: interpretPlacement(body as BodyKey, sign, { minorSafe: true }).short,
    };
  }

  const possible = placement?.possibleSigns?.filter(Boolean) ?? [];
  if (possible.length > 0) {
    // FOUNDER-REVIEW: "This chart does not settle the [placement] sign. It could be [signs]."
    // FOUNDER-REVIEW: "A more precise birth date and time can settle this placement."
    return {
      statement: `This chart does not settle the ${label} sign. It could be ${possible.join(" or ")}.`,
      reading: "A more precise birth date and time can settle this placement.",
    };
  }

  // FOUNDER-REVIEW: "This chart does not have enough birth detail to settle the [placement] sign."
  // FOUNDER-REVIEW: "Add more birth detail in Galaxia before treating this placement as settled."
  return {
    statement: `This chart does not have enough birth detail to settle the ${label} sign.`,
    reading: "Add more birth detail in Galaxia before treating this placement as settled.",
  };
}

export function chartLeadChartCopy(chart: NatalChart): ChartLeadChartCopy {
  return {
    moon: placementCopy(chart, "moon"),
    mercury: placementCopy(chart, "mercury"),
    mars: placementCopy(chart, "mars"),
  };
}
