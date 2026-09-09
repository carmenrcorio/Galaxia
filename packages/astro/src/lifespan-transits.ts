/**
 * Galaxia — Memorial Timeline lifespan-transit scanner.
 *
 * Real ephemeris positions for the slow-moving outer bodies (Saturn, Jupiter,
 * Uranus, Neptune, Pluto) sampled across a person's own lifespan and compared
 * against THEIR stored natal longitudes — the same deterministic approach as
 * `computeTransits` (index.ts), just swept over decades instead of one
 * instant. Every event returned is a real geometric conjunction the engine
 * found, never a hardcoded "Saturn return at 29" — ages vary with the exact
 * natal degree, and this module finds the actual date.
 *
 * NO FABRICATION (ENGINEERING.md §12): year-only charts are excluded, exactly
 * like `todayTransitsForChart` — their natal longitudes are sampled mid-year,
 * so a "return" computed against them would be a confident-looking guess.
 * Progressed Moon uses real secondary-progression geometry (one day after
 * birth = one year of life), not a fixed "every 2.5 years" rule of thumb.
 */

import { eclipticLongitude, longitudeToSign, type BodyName, type NatalChart, type Sign } from "./index";

export type LifespanTransitKind =
  | "saturn_return"
  | "jupiter_return"
  | "progressed_moon_sign_change"
  | "outer_conjunction";

export interface LifespanTransitEvent {
  kind: LifespanTransitKind;
  /** Best-estimate calendar date (UTC) at the sampling resolution used below. */
  dateUTC: string;
  /** Whole-year age at the event, derived from birthDateUTC. */
  approxAge: number;
  /** The slow-moving transiting body driving this event (absent for progressed Moon). */
  transitBody?: BodyName;
  /** The natal point being touched — a real body, or "ascendant" when houses are known. */
  natalBody?: BodyName | "ascendant";
  /** Zodiac sign for progressed Moon sign changes: the sign the progressed Moon moved into. */
  sign?: Sign;
}

export interface LifespanTransitOptions {
  /** Orb (degrees) counted as a Saturn/Jupiter return. Default 1.0°. */
  returnOrbDeg?: number;
  /** Orb (degrees) counted as an outer-planet conjunction to Sun/Moon/Ascendant. Default 1.5°. */
  outerOrbDeg?: number;
  /** Sampling step (days) for the slow-mover scan. Default 20 — tight enough for Saturn/Jupiter/outer motion. */
  stepDays?: number;
  /** Sampling step (years of life) for the progressed Moon scan. Default 1/12 (monthly). */
  moonStepYears?: number;
}

const MS_PER_DAY = 86_400_000;
const AVG_YEAR_DAYS = 365.25;

function angularSeparation(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function ageAtDate(date: Date, birth: Date): number {
  return (date.getTime() - birth.getTime()) / (AVG_YEAR_DAYS * MS_PER_DAY);
}

/** Merge sample dates that land within `minGapMs` of each other (same real pass, caught by adjacent samples). */
function dedupeClose(dates: Date[], minGapMs: number): Date[] {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const out: Date[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (!last || d.getTime() - last.getTime() > minGapMs) out.push(d);
  }
  return out;
}

/**
 * Scan a transiting body's real longitude against a fixed natal longitude
 * across [birth, end], stepping by `stepDays`, and return the calendar dates
 * of local minima in angular separation that fall within `orbLimitDeg`.
 * A slow outer planet can station and retrograde back over the same natal
 * degree more than once in a season (up to three real passes) — each is its
 * own hit, at the sampling resolution used.
 */
function findConjunctions(
  transitBody: BodyName,
  natalLon: number,
  birth: Date,
  end: Date,
  stepDays: number,
  orbLimitDeg: number
): Date[] {
  const samples: Array<{ date: Date; orb: number }> = [];
  for (let t = birth.getTime(); t <= end.getTime(); t += stepDays * MS_PER_DAY) {
    const date = new Date(t);
    samples.push({ date, orb: angularSeparation(eclipticLongitude(transitBody, date), natalLon) });
  }
  const hits: Date[] = [];
  for (let i = 0; i < samples.length; i++) {
    const cur = samples[i]!;
    if (cur.orb > orbLimitDeg) continue;
    const prev = samples[i - 1];
    const next = samples[i + 1];
    if ((!prev || cur.orb <= prev.orb) && (!next || cur.orb <= next.orb)) hits.push(cur.date);
  }
  return dedupeClose(hits, stepDays * 1.5 * MS_PER_DAY);
}

/**
 * Every major life transit for one person's own chart, across their own
 * lifespan (`birthDateUTC` → `endDateUTC`): Saturn returns, Jupiter returns,
 * progressed Moon sign changes, and the outer planets (Uranus/Neptune/Pluto)
 * conjuncting natal Sun, Moon, or Ascendant. Sorted chronologically.
 */
export function computeLifespanTransits(
  chart: NatalChart,
  birthDateUTC: string,
  endDateUTC: string,
  options: LifespanTransitOptions = {}
): LifespanTransitEvent[] {
  if (chart.precision === "year") return [];

  const birth = new Date(birthDateUTC);
  const end = new Date(endDateUTC);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= birth.getTime()) {
    return [];
  }

  const returnOrbDeg = options.returnOrbDeg ?? 1.0;
  const outerOrbDeg = options.outerOrbDeg ?? 1.5;
  const stepDays = options.stepDays ?? 20;
  const moonStepYears = options.moonStepYears ?? 1 / 12;

  const events: LifespanTransitEvent[] = [];
  const confidentPlacement = (body: BodyName) =>
    chart.placements.find((p) => p.body === body && p.confident !== false);

  const natalSaturn = confidentPlacement("saturn");
  const natalJupiter = confidentPlacement("jupiter");
  const natalSun = confidentPlacement("sun");
  const natalMoon = confidentPlacement("moon");
  const ascLon = chart.cusps?.length === 12 ? chart.cusps[0] : undefined;

  function pushConjunctions(
    kind: LifespanTransitKind,
    transitBody: BodyName,
    natalBody: BodyName | "ascendant",
    natalLon: number,
    orbLimitDeg: number
  ) {
    for (const date of findConjunctions(transitBody, natalLon, birth, end, stepDays, orbLimitDeg)) {
      events.push({
        kind,
        dateUTC: date.toISOString(),
        approxAge: Math.round(ageAtDate(date, birth)),
        transitBody,
        natalBody,
      });
    }
  }

  if (natalSaturn) pushConjunctions("saturn_return", "saturn", "saturn", natalSaturn.lon, returnOrbDeg);
  if (natalJupiter) pushConjunctions("jupiter_return", "jupiter", "jupiter", natalJupiter.lon, returnOrbDeg);

  const outerBodies: BodyName[] = ["uranus", "neptune", "pluto"];
  const targets: Array<{ natalBody: BodyName | "ascendant"; lon: number }> = [];
  if (natalSun) targets.push({ natalBody: "sun", lon: natalSun.lon });
  if (natalMoon) targets.push({ natalBody: "moon", lon: natalMoon.lon });
  if (ascLon != null) targets.push({ natalBody: "ascendant", lon: ascLon });
  for (const outer of outerBodies) {
    for (const target of targets) {
      pushConjunctions("outer_conjunction", outer, target.natalBody, target.lon, outerOrbDeg);
    }
  }

  // Progressed Moon sign changes — secondary progression (one day after birth
  // stands for one year of life). Monthly life-year sampling is far tighter
  // than the Moon needs to catch every 30° sign boundary.
  let prevSign: Sign | null = null;
  const lifespanYears = ageAtDate(end, birth);
  for (let ageYears = 0; ageYears <= lifespanYears; ageYears += moonStepYears) {
    const progressedDate = new Date(birth.getTime() + ageYears * MS_PER_DAY);
    const sign = longitudeToSign(eclipticLongitude("moon", progressedDate));
    if (prevSign && sign !== prevSign) {
      const realDate = new Date(birth.getTime() + ageYears * AVG_YEAR_DAYS * MS_PER_DAY);
      events.push({
        kind: "progressed_moon_sign_change",
        dateUTC: realDate.toISOString(),
        approxAge: Math.round(ageYears),
        sign,
      });
    }
    prevSign = sign;
  }

  return events.sort((a, b) => a.dateUTC.localeCompare(b.dateUTC));
}
