/**
 * Chart precision as the product states it: four honest tiers, what each
 * supports, and the single next step that would add missing detail.
 *
 * Engine natal charts use `"exact" | "date" | "year"`. `"none"` is the
 * form/row state for a person whose birth data has not been added yet
 * (`people.birth_precision`). A year, date, or exact-time chart is a real
 * chart. `"none"` is a real person with the chart still waiting.
 */

export type ChartPrecision = "exact" | "date" | "year" | "none";

export const CHART_PRECISIONS: readonly ChartPrecision[] = [
  "exact",
  "date",
  "year",
  "none",
] as const;

/** Features that degrade or hide when the stored precision cannot support them. */
export type ChartPrecisionFeature =
  | "houses"
  | "ascendant"
  | "preciseMoon"
  | "aspects"
  | "planetarySigns"
  | "generational"
  | "dailySky"
  | "synastry"
  | "memorialTimeline"
  | "memorialTransitsDated";

// FOUNDER-REVIEW: authored — add-person data tier ladder (exact).
export const CHART_PRECISION_EXACT_LABEL = "Exact time";
export const CHART_PRECISION_EXACT_UNLOCKS =
  "Full chart: Ascendant, houses, precise Moon, and all 10 planets.";

// FOUNDER-REVIEW: authored — add-person data tier ladder (date).
export const CHART_PRECISION_DATE_LABEL = "Date only";
export const CHART_PRECISION_DATE_UNLOCKS =
  "Sun, Moon, all planetary signs, and the generational layer. No Ascendant.";

// FOUNDER-REVIEW: authored — add-person data tier ladder (year).
export const CHART_PRECISION_YEAR_LABEL = "Year only";
export const CHART_PRECISION_YEAR_UNLOCKS =
  "Generational layer only: good for ancestors and anyone whose date you don't know.";

// FOUNDER-REVIEW: authored — add-person data tier ladder (none).
export const CHART_PRECISION_NONE_LABEL = "Add birth data later";
export const CHART_PRECISION_NONE_UNLOCKS =
  "Just save their name and relationship now: you can add a year, date, or exact time whenever you have it (or ask them to).";

// FOUNDER-REVIEW: authored — profile indicator for a person with no birth data.
export const CHART_PRECISION_NONE_FACT = "No birth data yet";

// FOUNDER-REVIEW: authored — add-person ladder intro. Every tier is a real chart.
export const CHART_PRECISION_LADDER_INTRO =
  "Birth time and city are optional. Pick whatever you actually know: every tier below produces a real chart; more detail just unlocks more of it.";

export const CHART_PRECISION_UNLOCKS: Record<ChartPrecision, string> = {
  exact: CHART_PRECISION_EXACT_UNLOCKS,
  date: CHART_PRECISION_DATE_UNLOCKS,
  year: CHART_PRECISION_YEAR_UNLOCKS,
  none: CHART_PRECISION_NONE_UNLOCKS,
};

/** Persistent fact shown on a profile. Not a warning. */
export const CHART_PRECISION_FACT: Record<ChartPrecision, string> = {
  exact: CHART_PRECISION_EXACT_LABEL,
  date: CHART_PRECISION_DATE_LABEL,
  year: CHART_PRECISION_YEAR_LABEL,
  none: CHART_PRECISION_NONE_FACT,
};

/** Picker rows for add-person / onboarding. `"none"` is appended when allowed. */
export const CHART_PRECISION_TIERS: { key: Exclude<ChartPrecision, "none">; label: string; unlocks: string }[] = [
  { key: "exact", label: CHART_PRECISION_EXACT_LABEL, unlocks: CHART_PRECISION_EXACT_UNLOCKS },
  { key: "date", label: CHART_PRECISION_DATE_LABEL, unlocks: CHART_PRECISION_DATE_UNLOCKS },
  { key: "year", label: CHART_PRECISION_YEAR_LABEL, unlocks: CHART_PRECISION_YEAR_UNLOCKS },
];

export const CHART_PRECISION_NONE_TIER: { key: "none"; label: string; unlocks: string } = {
  key: "none",
  label: CHART_PRECISION_NONE_LABEL,
  unlocks: CHART_PRECISION_NONE_UNLOCKS,
};

export function isChartPrecision(value: unknown): value is ChartPrecision {
  return value === "exact" || value === "date" || value === "year" || value === "none";
}

export function chartPrecisionFact(precision: string | null | undefined): string {
  if (isChartPrecision(precision)) return CHART_PRECISION_FACT[precision];
  return CHART_PRECISION_NONE_FACT;
}

/**
 * Houses / Ascendant need an exact-time chart *and* a resolved place.
 * Time without a city cannot orient the local sky.
 */
export function chartHasLocalSky(
  precision: string | null | undefined,
  hasBirthPlace: boolean
): boolean {
  return precision === "exact" && hasBirthPlace;
}

/**
 * What this precision can honestly support. Used by tests and by any surface
 * that would otherwise hide a feature in silence.
 */
export function chartPrecisionSupportsFeature(
  feature: ChartPrecisionFeature,
  precision: string | null | undefined,
  opts: { hasBirthPlace?: boolean } = {}
): boolean {
  const p = isChartPrecision(precision) ? precision : "none";
  const hasPlace = opts.hasBirthPlace === true;
  switch (feature) {
    case "houses":
    case "ascendant":
    case "preciseMoon":
      return chartHasLocalSky(p, hasPlace);
    case "aspects":
    case "planetarySigns":
    case "dailySky":
    case "synastry":
      return p === "exact" || p === "date";
    case "generational":
      return p === "exact" || p === "date" || p === "year";
    case "memorialTimeline":
      // Gate is remembrance (passed, not self), not chart precision.
      return true;
    case "memorialTransitsDated":
      return p === "exact" || p === "date";
  }
}

// FOUNDER-REVIEW: authored — precision explanation, exact time with city (supports).
const EXACT_SUPPORTS = CHART_PRECISION_EXACT_UNLOCKS;
// FOUNDER-REVIEW: authored — precision explanation, exact time with city (does not).
const EXACT_DOES_NOT =
  "Nothing more is waiting on birth data. This is the full natal chart this sky can give.";
// FOUNDER-REVIEW: authored — precision explanation, exact time with city (why).
const EXACT_WHY =
  "An exact time and city orient the sky to the birth place, which is what houses and the Ascendant need.";

// FOUNDER-REVIEW: authored — precision explanation, exact time without city (supports).
const EXACT_NO_PLACE_SUPPORTS = "The birth time is on file, so the clock is known.";
// FOUNDER-REVIEW: authored — precision explanation, exact time without city (does not).
const EXACT_NO_PLACE_DOES_NOT =
  "Houses, the Ascendant, and Midheaven still need a birth city. Time without a place cannot orient the local sky.";
// FOUNDER-REVIEW: authored — precision explanation, exact time without city (why).
const EXACT_NO_PLACE_WHY =
  "Houses are where each planet lives in this life. That layer is local, so it needs both the time and the city.";

// FOUNDER-REVIEW: authored — precision explanation, date only (does not).
const DATE_DOES_NOT =
  "Houses, the Ascendant, and Midheaven wait on a birth time and city. Daily sky notes that need a precise Moon stay at sign level.";
// FOUNDER-REVIEW: authored — precision explanation, date only (why).
const DATE_WHY =
  "A date places the planets in signs. The local sky (houses and rising) turns on an exact time and city.";

// FOUNDER-REVIEW: authored — precision explanation, year only (does not).
const YEAR_DOES_NOT =
  "Planetary signs, aspects, houses, rising, and daily sky notes wait on a birth date.";
// FOUNDER-REVIEW: authored — precision explanation, year only (why).
const YEAR_WHY =
  "A year can settle the slow outer planets. Personal placements need a day.";

// FOUNDER-REVIEW: authored — precision explanation, no birth data (supports).
const NONE_SUPPORTS =
  "Their name and relationship are in your galaxy. That place is real.";
// FOUNDER-REVIEW: authored — precision explanation, no birth data (does not).
const NONE_DOES_NOT =
  "The chart is waiting. A birth year adds their generational sky. A full date adds every planetary sign. An exact time and city unlock houses, the Ascendant, and the precise Moon.";
// FOUNDER-REVIEW: authored — precision explanation, no birth data (why).
const NONE_WHY =
  "Nothing was entered yet. Add whatever you actually know. Every tier produces a real chart; more detail just unlocks more of it.";

export type ChartPrecisionExplanation = {
  label: string;
  supports: string;
  doesNot: string;
  why: string;
};

export function chartPrecisionExplanation(
  precision: string | null | undefined,
  opts: { hasBirthPlace?: boolean } = {}
): ChartPrecisionExplanation {
  const p = isChartPrecision(precision) ? precision : "none";
  if (p === "exact" && opts.hasBirthPlace !== true) {
    return {
      label: CHART_PRECISION_FACT.exact,
      supports: EXACT_NO_PLACE_SUPPORTS,
      doesNot: EXACT_NO_PLACE_DOES_NOT,
      why: EXACT_NO_PLACE_WHY,
    };
  }
  if (p === "exact") {
    return { label: CHART_PRECISION_FACT.exact, supports: EXACT_SUPPORTS, doesNot: EXACT_DOES_NOT, why: EXACT_WHY };
  }
  if (p === "date") {
    return {
      label: CHART_PRECISION_FACT.date,
      supports: CHART_PRECISION_DATE_UNLOCKS,
      doesNot: DATE_DOES_NOT,
      why: DATE_WHY,
    };
  }
  if (p === "year") {
    return {
      label: CHART_PRECISION_FACT.year,
      supports: CHART_PRECISION_YEAR_UNLOCKS,
      doesNot: YEAR_DOES_NOT,
      why: YEAR_WHY,
    };
  }
  return {
    label: CHART_PRECISION_FACT.none,
    supports: NONE_SUPPORTS,
    doesNot: NONE_DOES_NOT,
    why: NONE_WHY,
  };
}

// FOUNDER-REVIEW: authored — single upgrade action (year → date).
export const CHART_PRECISION_ADD_DATE = "Add a birth date";
// FOUNDER-REVIEW: authored — single upgrade action (date → exact time).
export const CHART_PRECISION_ADD_TIME = "Add a birth time";
// FOUNDER-REVIEW: authored — single upgrade action (exact time, missing city).
export const CHART_PRECISION_ADD_CITY = "Add a birth city";
// FOUNDER-REVIEW: authored — single upgrade action (no birth data yet).
export const CHART_PRECISION_ADD_DATA = "Add birth data";

export type ChartPrecisionUpgrade = {
  target: Exclude<ChartPrecision, "none">;
  actionLabel: string;
};

/**
 * One next step. Never skips a rung (year goes to date, not straight to
 * exact). Exact with a city has nothing to add. `"none"` offers birth data
 * at date precision so the form is usable, not a jump to exact time.
 */
export function chartPrecisionUpgrade(
  precision: string | null | undefined,
  opts: { hasBirthPlace?: boolean } = {}
): ChartPrecisionUpgrade | null {
  const p = isChartPrecision(precision) ? precision : "none";
  if (p === "none") return { target: "date", actionLabel: CHART_PRECISION_ADD_DATA };
  if (p === "year") return { target: "date", actionLabel: CHART_PRECISION_ADD_DATE };
  if (p === "date") return { target: "exact", actionLabel: CHART_PRECISION_ADD_TIME };
  if (p === "exact" && opts.hasBirthPlace !== true) {
    return { target: "exact", actionLabel: CHART_PRECISION_ADD_CITY };
  }
  return null;
}

/**
 * Year-only rows store `birth_date` as `YYYY-01-01`. That day is a working
 * date for the engine, never a known birthday. Do not prefill January 1
 * when offering a date upgrade.
 */
export function knownBirthYear(
  precision: string | null | undefined,
  birthDate: string | null | undefined
): number | undefined {
  if (!birthDate) return undefined;
  const year = parseInt(birthDate.slice(0, 4), 10);
  if (!Number.isFinite(year)) return undefined;
  if (precision === "year" || precision === "none") return year;
  return year;
}

export function knownBirthMonthDay(
  precision: string | null | undefined,
  birthDate: string | null | undefined
): { month: number; day: number } | null {
  if (!birthDate) return null;
  if (precision !== "date" && precision !== "exact") return null;
  const month = parseInt(birthDate.slice(5, 7), 10);
  const day = parseInt(birthDate.slice(8, 10), 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

export const HOUSES_UNAVAILABLE_EYEBROW = "The twelve houses";

// FOUNDER-REVIEW: authored — houses unavailable (year precision).
export const HOUSES_UNAVAILABLE_YEAR_BODY =
  "The house layer needs a birth date and a time. Right now only the sign layer that a year can settle is visible: how each planet behaves, not where it lives in this life. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (year precision), follow-up.
export const HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP =
  "Add a birth date and a time, and the houses, Ascendant, and Midheaven will compute.";

// FOUNDER-REVIEW: authored — houses unavailable (date precision).
export const HOUSES_UNAVAILABLE_DATE_BODY =
  "The house layer needs a birth time. Right now only the sign layer is visible: how each planet behaves, not where it lives in this life. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (date precision), follow-up.
export const HOUSES_UNAVAILABLE_DATE_FOLLOW_UP =
  "Add a birth time and city, and the houses, Ascendant, and Midheaven will compute.";

// FOUNDER-REVIEW: authored — houses unavailable (exact time, no place).
export const HOUSES_UNAVAILABLE_EXACT_BODY =
  "The house layer needs a birth city. Time is known, but houses also need a place. Nothing is missing from the reading. Less was known.";

// FOUNDER-REVIEW: authored — houses unavailable (exact time, no place), follow-up.
export const HOUSES_UNAVAILABLE_EXACT_FOLLOW_UP =
  "Add a birth city, and the houses, Ascendant, and Midheaven will compute.";

export function housesUnavailableCopy(precision: string): { body: string; followUp: string } {
  if (precision === "year") {
    return { body: HOUSES_UNAVAILABLE_YEAR_BODY, followUp: HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP };
  }
  if (precision === "exact") {
    return { body: HOUSES_UNAVAILABLE_EXACT_BODY, followUp: HOUSES_UNAVAILABLE_EXACT_FOLLOW_UP };
  }
  return { body: HOUSES_UNAVAILABLE_DATE_BODY, followUp: HOUSES_UNAVAILABLE_DATE_FOLLOW_UP };
}

// FOUNDER-REVIEW: authored — aspects unavailable (year precision).
export const ASPECTS_UNAVAILABLE_YEAR_BODY =
  "Aspects need a birth date. A year alone cannot place planet-to-planet lines honestly. Nothing is missing from the reading. Less was known.";
// FOUNDER-REVIEW: authored — aspects unavailable (year precision), follow-up.
export const ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP =
  "Add a birth date, and the aspects that can be supported will compute.";

// FOUNDER-REVIEW: authored — daily sky unavailable (year precision). Reuses hedge:year.
export const DAILY_SKY_UNAVAILABLE_YEAR_BODY =
  "Birth year only: a birth date is needed for daily sky notes.";
// FOUNDER-REVIEW: authored — daily sky unavailable (year precision), follow-up.
export const DAILY_SKY_UNAVAILABLE_YEAR_FOLLOW_UP =
  "Add a birth date, and daily sky notes can compute from it.";

// FOUNDER-REVIEW: authored — memorial timeline with no birth data.
export const MEMORIAL_TIMELINE_NEEDS_BIRTH_YEAR =
  "Lifespan transits need a birth year. You can still add the moments that mattered.";

// FOUNDER-REVIEW: authored — no-chart profile when precision is still none.
export const CHART_PRECISION_NONE_WAITING =
  "No birth data yet: their chart is waiting.";

// FOUNDER-REVIEW: authored — no-chart profile when birth details are already stored.
export const CHART_SAVED_DETAILS_NO_CHART_TITLE = "Chart is not on file yet";
export const CHART_SAVED_DETAILS_NO_CHART_BODY =
  "Birth details are already saved. The natal chart has not been built from them yet.";

// FOUNDER-REVIEW: authored — explanation dialog headings.
export const CHART_PRECISION_SUPPORTS_HEADING = "What this supports";
export const CHART_PRECISION_DOES_NOT_HEADING = "What this does not";
export const CHART_PRECISION_WHY_HEADING = "Why";
