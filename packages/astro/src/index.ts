import { Body, GeoVector, Ecliptic, EclipticGeoMoon, SiderealTime, SunPosition } from "astronomy-engine";

export type Precision = "exact" | "date" | "year";
export type HouseSystem = "placidus" | "whole" | "equal";
export type Planet = "uranus" | "neptune" | "pluto";
export type BodyName = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";
export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";
export type Sign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export interface Birth {
  dateUTC: string;
  precision: Precision;
  lat?: number;
  lng?: number;
  tzOffsetMin?: number;
  houseSystem?: HouseSystem;
}

export interface Placement {
  body: BodyName;
  lon: number;
  sign: Sign;
  degree: number;
  house?: number;
  retro: boolean;
  confident: boolean;
  possibleSigns?: Sign[];
}

export interface NatalChart {
  placements: Placement[];
  asc?: Sign;
  mc?: Sign;
  cusps?: number[];
  precision: Precision;
  /** The house system actually used to compute `cusps`. Never a system the code did not compute. */
  houseSystem?: HouseSystem;
  /** The system the caller asked for. Differs from `houseSystem` only when a fallback occurred. */
  houseSystemRequested?: HouseSystem;
  /** Human-readable reason when `houseSystem` differs from `houseSystemRequested` (e.g. polar latitude). */
  houseSystemFallbackReason?: string;
  generational: GenSignature;
}

export interface Aspect {
  from: BodyName;
  to: BodyName;
  type: AspectType;
  orb: number;
  harmony: number;
}

export interface SynastryResult {
  aspects: Aspect[];
  houseOverlays: {
    aInB: { body: BodyName; house: number }[];
    bInA: { body: BodyName; house: number }[];
  };
  elementBalance: {
    a: Record<"fire" | "earth" | "air" | "water", number>;
    b: Record<"fire" | "earth" | "air" | "water", number>;
  };
  scores: {
    overall: number;
    emotional: number;
    communication: number;
    warmth: number;
    values: number;
    stability: number;
  };
}

export interface TransitHit {
  transitBody: BodyName;
  natalBody: BodyName;
  type: AspectType;
  orb: number;
  harmony: number;
  summary: string;
}

export interface GenPlanetSignature {
  sign: Sign;
  confident: boolean;
  possibleSigns?: Sign[];
}

export interface GenSignature {
  uranus: GenPlanetSignature;
  neptune: GenPlanetSignature;
  pluto: GenPlanetSignature;
  cohortLabel: string;
  uranusHouse?: number;
  neptuneHouse?: number;
  plutoHouse?: number;
}

export interface GenRelation {
  shared: { planet: Planet; sign: Sign }[];
  diverged: { planet: Planet; signA: Sign; signB: Sign }[];
  sameGeneration: boolean;
  gapApproxYears?: number;
  theme: string;
}

export interface CohortOverlay {
  sharedSky: { planet: Planet; sign: Sign }[];
  faultLines: { planet: Planet; groups: { sign: Sign; names: string[] }[] }[];
  label: string;
}

const SIGNS: Sign[] = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const MAJOR_BODIES: BodyName[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const BODY_MAP: Record<BodyName, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto
};

const ASPECT_DEFS: Record<AspectType, { angle: number; orb: number; harmony: number }> = {
  conjunction: { angle: 0, orb: 8, harmony: 0.6 },
  sextile: { angle: 60, orb: 4, harmony: 1.3 },
  square: { angle: 90, orb: 6, harmony: -1.2 },
  trine: { angle: 120, orb: 6, harmony: 1.7 },
  opposition: { angle: 180, orb: 8, harmony: -1.1 }
};

function toDate(input: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid dateUTC: ${input}`);
  }
  return date;
}

function normalizeZodiacLongitude(lon: number): number {
  const wrapped = lon % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function normalizeSignedAngle(delta: number): number {
  let adjusted = delta % 360;
  if (adjusted > 180) adjusted -= 360;
  if (adjusted < -180) adjusted += 360;
  return adjusted;
}

function longitudeToSign(lon: number): Sign {
  const normalized = normalizeZodiacLongitude(lon);
  return SIGNS[Math.floor(normalized / 30)] ?? "Aries";
}

function bodyLongitude(body: BodyName, date: Date): number {
  if (body === "sun") return normalizeZodiacLongitude(SunPosition(date).elon);
  if (body === "moon") return normalizeZodiacLongitude(EclipticGeoMoon(date).lon);
  return normalizeZodiacLongitude(Ecliptic(GeoVector(BODY_MAP[body], date, true)).elon);
}

function signFromDate(date: Date, planet: Planet): Sign {
  const body = planet === "uranus" ? Body.Uranus : planet === "neptune" ? Body.Neptune : Body.Pluto;
  return longitudeToSign(Ecliptic(GeoVector(body, date, true)).elon);
}

function getWorkingDate(birth: Birth): Date {
  const raw = toDate(birth.dateUTC);
  if (birth.precision === "exact") return raw;
  if (birth.precision === "date") return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate(), 12, 0, 0));
  return new Date(Date.UTC(raw.getUTCFullYear(), 6, 1, 12, 0, 0));
}

function evaluateSignConfidence(body: BodyName, date: Date, precision: Precision): { confident: boolean; possibleSigns?: Sign[] } {
  if (precision === "exact") return { confident: true };

  if (precision === "date") {
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
    const signs = Array.from(new Set([longitudeToSign(bodyLongitude(body, dayStart)), longitudeToSign(bodyLongitude(body, dayEnd))]));
    return { confident: signs.length === 1, possibleSigns: signs.length > 1 ? signs : undefined };
  }

  // Year precision: sample monthly across the year. Sampling only the year's
  // endpoints falsely reported the Sun as a confident Capricorn (Jan 1 and
  // Dec 31 are both Capricorn) when in truth a year-only Sun can be any sign.
  const year = date.getUTCFullYear();
  const samples: Sign[] = [];
  for (let month = 0; month < 12; month += 1) {
    samples.push(longitudeToSign(bodyLongitude(body, new Date(Date.UTC(year, month, 1, 0, 0, 0)))));
    samples.push(longitudeToSign(bodyLongitude(body, new Date(Date.UTC(year, month, 15, 0, 0, 0)))));
  }
  samples.push(longitudeToSign(bodyLongitude(body, new Date(Date.UTC(year, 11, 31, 23, 59, 59)))));
  const signs = Array.from(new Set(samples));
  return { confident: signs.length === 1, possibleSigns: signs.length > 1 ? signs : undefined };
}

const DEG = Math.PI / 180;

/** Mean obliquity of the ecliptic of date (IAU 1980 series), in degrees. */
function meanObliquityDeg(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545.0) / 36_525;
  return 23.439291111 - 0.013004167 * t - 1.6389e-7 * t * t + 5.0361e-7 * t * t * t;
}

interface Angles {
  ascLon: number;
  mcLon: number;
  /** Right ascension of the Midheaven (local apparent sidereal time), degrees. */
  ramcDeg: number;
  /** Obliquity of the ecliptic of date, degrees. */
  epsilonDeg: number;
}

function computeAscMc(date: Date, lat: number, lng: number): Angles {
  const ramcDeg = normalizeZodiacLongitude(SiderealTime(date) * 15 + lng);
  const theta = ramcDeg * DEG;
  const epsilonDeg = meanObliquityDeg(date);
  const epsilon = epsilonDeg * DEG;
  const phi = lat * DEG;

  // MC is the ecliptic point on the meridian: tan(MC) = tan(RAMC) / cos(ε).
  // (The previous form multiplied by cos ε instead of dividing — up to ~2.7° wrong.)
  const mc = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(epsilon));
  const asc = Math.atan2(Math.cos(theta), -(Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon)));
  return {
    ascLon: normalizeZodiacLongitude((asc / DEG)),
    mcLon: normalizeZodiacLongitude((mc / DEG)),
    ramcDeg,
    epsilonDeg
  };
}

/** Ecliptic longitude (degrees) of the ecliptic point whose right ascension is `raDeg`. */
function eclipticLongitudeFromRA(raDeg: number, epsilonDeg: number): number {
  const ra = raDeg * DEG;
  const lon = Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsilonDeg * DEG));
  return normalizeZodiacLongitude(lon / DEG);
}

/**
 * Real Placidus intermediate cusp via the standard iterative algorithm.
 *
 * A Placidus cusp is the locus of points that have completed a fixed fraction of
 * their diurnal (above horizon) or nocturnal (below horizon) semi-arc. For the
 * ecliptic point with right ascension α: declination δ = atan(tan ε · sin α), and
 * its ascensional difference AD = asin(tan δ · tan φ). Then:
 *   cusp 11: RA = RAMC + (1/3)(90° + AD)
 *   cusp 12: RA = RAMC + (2/3)(90° + AD)
 *   cusp  2: RA = RAMC + 180° − (2/3)(90° − AD)
 *   cusp  3: RA = RAMC + 180° − (1/3)(90° − AD)
 * Iterated to convergence; returns null when the cusp is undefined (circumpolar
 * ecliptic point, i.e. |tan δ · tan φ| ≥ 1), which happens above the polar circle.
 */
function placidusIntermediateCusp(
  ramcDeg: number,
  epsilonDeg: number,
  latDeg: number,
  offsetDeg: 30 | 60 | 120 | 150,
  fraction: number,
  nocturnal: boolean
): number | null {
  const tanEps = Math.tan(epsilonDeg * DEG);
  const tanPhi = Math.tan(latDeg * DEG);
  let ra = ramcDeg + offsetDeg;
  for (let i = 0; i < 100; i += 1) {
    const delta = Math.atan(tanEps * Math.sin(ra * DEG));
    const x = Math.tan(delta) * tanPhi;
    if (Math.abs(x) >= 1) return null; // circumpolar: Placidus undefined here
    const adDeg = Math.asin(x) / DEG;
    const next = nocturnal
      ? ramcDeg + 180 - fraction * (90 - adDeg)
      : ramcDeg + fraction * (90 + adDeg);
    if (Math.abs(next - ra) < 1e-9) {
      ra = next;
      break;
    }
    ra = next;
  }
  return eclipticLongitudeFromRA(ra, epsilonDeg);
}

/**
 * Full Placidus cusp set. Returns null when Placidus is undefined at this
 * latitude (inside the polar circles, |lat| ≳ 66.5°) so the caller can fall
 * back explicitly — never silently.
 */
function computePlacidusCusps(angles: Angles, latDeg: number): number[] | null {
  if (Math.abs(latDeg) >= 90 - angles.epsilonDeg) return null;
  const { ramcDeg, epsilonDeg } = angles;
  const c11 = placidusIntermediateCusp(ramcDeg, epsilonDeg, latDeg, 30, 1 / 3, false);
  const c12 = placidusIntermediateCusp(ramcDeg, epsilonDeg, latDeg, 60, 2 / 3, false);
  const c2 = placidusIntermediateCusp(ramcDeg, epsilonDeg, latDeg, 120, 2 / 3, true);
  const c3 = placidusIntermediateCusp(ramcDeg, epsilonDeg, latDeg, 150, 1 / 3, true);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  const opp = (lon: number) => normalizeZodiacLongitude(lon + 180);
  return [
    angles.ascLon, // 1 = Ascendant
    c2,
    c3,
    opp(angles.mcLon), // 4 = IC
    opp(c11), // 5
    opp(c12), // 6
    opp(angles.ascLon), // 7 = Descendant
    opp(c2), // 8
    opp(c3), // 9
    angles.mcLon, // 10 = MC
    c11,
    c12
  ];
}

const PLACIDUS_POLAR_FALLBACK_REASON =
  "Placidus houses are mathematically undefined at this birth latitude (inside the polar circles), so Whole Sign houses are shown instead.";

interface CuspResult {
  cusps: number[];
  /** The system actually computed. */
  systemUsed: HouseSystem;
  /** Present only when `systemUsed` differs from the requested system. */
  fallbackReason?: string;
}

function computeCusps(angles: Angles, latDeg: number, houseSystem: HouseSystem): CuspResult {
  if (houseSystem === "whole") {
    const houseOneStart = Math.floor(angles.ascLon / 30) * 30;
    return { cusps: Array.from({ length: 12 }, (_, idx) => normalizeZodiacLongitude(houseOneStart + idx * 30)), systemUsed: "whole" };
  }
  if (houseSystem === "equal") {
    return { cusps: Array.from({ length: 12 }, (_, idx) => normalizeZodiacLongitude(angles.ascLon + idx * 30)), systemUsed: "equal" };
  }
  const placidus = computePlacidusCusps(angles, latDeg);
  if (placidus) return { cusps: placidus, systemUsed: "placidus" };
  const houseOneStart = Math.floor(angles.ascLon / 30) * 30;
  return {
    cusps: Array.from({ length: 12 }, (_, idx) => normalizeZodiacLongitude(houseOneStart + idx * 30)),
    systemUsed: "whole",
    fallbackReason: PLACIDUS_POLAR_FALLBACK_REASON
  };
}

function houseFromLongitude(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i += 1) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    if (start < end) {
      if (lon >= start && lon < end) return i + 1;
    } else if (lon >= start || lon < end) {
      return i + 1;
    }
  }
  return 1;
}

function elementForSign(sign: Sign): "fire" | "earth" | "air" | "water" {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "air";
  return "water";
}

export function computeNatalChart(birth: Birth): NatalChart {
  const houseSystemRequested = birth.houseSystem ?? "placidus";
  const date = getWorkingDate(birth);
  const bodies = birth.precision === "year" ? (["sun", "uranus", "neptune", "pluto"] as BodyName[]) : MAJOR_BODIES;

  let ascLon: number | undefined;
  let mcLon: number | undefined;
  let cusps: number[] | undefined;
  let houseSystemUsed: HouseSystem | undefined;
  let houseSystemFallbackReason: string | undefined;

  if (birth.precision === "exact" && birth.lat !== undefined && birth.lng !== undefined) {
    const angles = computeAscMc(date, birth.lat, birth.lng);
    ascLon = angles.ascLon;
    mcLon = angles.mcLon;
    const cuspResult = computeCusps(angles, birth.lat, houseSystemRequested);
    cusps = cuspResult.cusps;
    houseSystemUsed = cuspResult.systemUsed;
    houseSystemFallbackReason = cuspResult.fallbackReason;
  }

  const placements: Placement[] = bodies.map((body) => {
    const lon = bodyLongitude(body, date);
    const tomorrowLon = bodyLongitude(body, new Date(date.getTime() + 24 * 60 * 60 * 1000));
    const retro = normalizeSignedAngle(tomorrowLon - lon) < 0;
    const confidence = evaluateSignConfidence(body, date, birth.precision);
    return {
      body,
      lon,
      sign: longitudeToSign(lon),
      degree: lon % 30,
      house: cusps ? houseFromLongitude(lon, cusps) : undefined,
      retro,
      confident: confidence.confident,
      possibleSigns: confidence.possibleSigns
    };
  });

  const generational = computeGenerational(birth.dateUTC, birth.precision);
  if (cusps) {
    // Only assign a generational house when the planet was actually computed —
    // never derive a house from a fabricated 0° longitude.
    const uranus = placements.find((p) => p.body === "uranus");
    const neptune = placements.find((p) => p.body === "neptune");
    const pluto = placements.find((p) => p.body === "pluto");
    if (uranus) generational.uranusHouse = houseFromLongitude(uranus.lon, cusps);
    if (neptune) generational.neptuneHouse = houseFromLongitude(neptune.lon, cusps);
    if (pluto) generational.plutoHouse = houseFromLongitude(pluto.lon, cusps);
  }

  return {
    placements,
    asc: ascLon === undefined ? undefined : longitudeToSign(ascLon),
    mc: mcLon === undefined ? undefined : longitudeToSign(mcLon),
    cusps,
    precision: birth.precision,
    houseSystem: houseSystemUsed,
    houseSystemRequested,
    houseSystemFallbackReason,
    generational
  };
}

export function computeSynastry(a: NatalChart, b: NatalChart): SynastryResult {
  const aspects: Aspect[] = [];
  for (const pa of a.placements) {
    for (const pb of b.placements) {
      const angle = Math.abs(normalizeSignedAngle(pa.lon - pb.lon));
      for (const [type, def] of Object.entries(ASPECT_DEFS) as [AspectType, (typeof ASPECT_DEFS)[AspectType]][]) {
        const orb = Math.abs(angle - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            from: pa.body,
            to: pb.body,
            type,
            orb: Number(orb.toFixed(2)),
            harmony: Number((def.harmony - orb / (def.orb * 2)).toFixed(2))
          });
        }
      }
    }
  }

  const sumDomain = (bodies: BodyName[]): number =>
    aspects.filter((a1) => bodies.includes(a1.from) || bodies.includes(a1.to)).reduce((acc, hit) => acc + hit.harmony, 0);
  const toScore = (base: number): number => Math.max(0, Math.min(100, Math.round(50 + base * 4)));

  const emotional = toScore(sumDomain(["moon"]));
  const communication = toScore(sumDomain(["mercury"]));
  const warmth = toScore(sumDomain(["venus", "mars"]));
  const values = toScore(sumDomain(["sun", "venus"]));
  const stability = toScore(sumDomain(["saturn", "jupiter"]));
  const overall = Math.round((emotional + communication + warmth + values + stability) / 5);

  const countElements = (placements: Placement[]): Record<"fire" | "earth" | "air" | "water", number> =>
    placements.reduce(
      (acc, placement) => {
        acc[elementForSign(placement.sign)] += 1;
        return acc;
      },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );

  return {
    aspects,
    houseOverlays: {
      aInB: b.cusps ? a.placements.map((p) => ({ body: p.body, house: houseFromLongitude(p.lon, b.cusps!) })) : [],
      bInA: a.cusps ? b.placements.map((p) => ({ body: p.body, house: houseFromLongitude(p.lon, a.cusps!) })) : []
    },
    elementBalance: { a: countElements(a.placements), b: countElements(b.placements) },
    scores: { overall, emotional, communication, warmth, values, stability }
  };
}

export function computeTransits(natal: NatalChart, whenUTC: string): TransitHit[] {
  const date = toDate(whenUTC);
  const transitBodies: BodyName[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const hits: TransitHit[] = [];

  for (const transitBody of transitBodies) {
    const transitLon = bodyLongitude(transitBody, date);
    for (const natalPlacement of natal.placements) {
      const angle = Math.abs(normalizeSignedAngle(transitLon - natalPlacement.lon));
      for (const [type, def] of Object.entries(ASPECT_DEFS) as [AspectType, (typeof ASPECT_DEFS)[AspectType]][]) {
        const maxOrb = transitBody === "moon" ? Math.min(def.orb, 3) : def.orb;
        const orb = Math.abs(angle - def.angle);
        if (orb <= maxOrb) {
          hits.push({
            transitBody,
            natalBody: natalPlacement.body,
            type,
            orb: Number(orb.toFixed(2)),
            harmony: Number(def.harmony.toFixed(2)),
            summary: `${transitBody} ${type} natal ${natalPlacement.body}`
          });
        }
      }
    }
  }

  return hits.sort((a, b) => a.orb - b.orb);
}

function evaluateYearConfidence(year: number, planet: Planet): GenPlanetSignature {
  const startSign = signFromDate(new Date(Date.UTC(year, 0, 1, 0, 0, 0)), planet);
  const midSign = signFromDate(new Date(Date.UTC(year, 6, 1, 0, 0, 0)), planet);
  const endSign = signFromDate(new Date(Date.UTC(year, 11, 31, 23, 59, 59)), planet);
  const signSet = Array.from(new Set([startSign, midSign, endSign]));
  return { sign: midSign, confident: signSet.length === 1, possibleSigns: signSet.length > 1 ? signSet : undefined };
}

export function computeGenerational(dateUTC: string, precision: Precision): GenSignature {
  const date = toDate(dateUTC);
  const year = date.getUTCFullYear();
  const uranus = precision === "year" ? evaluateYearConfidence(year, "uranus") : { sign: signFromDate(date, "uranus"), confident: true };
  const neptune = precision === "year" ? evaluateYearConfidence(year, "neptune") : { sign: signFromDate(date, "neptune"), confident: true };
  const pluto = precision === "year" ? evaluateYearConfidence(year, "pluto") : { sign: signFromDate(date, "pluto"), confident: true };
  // When a year-only planet changed sign during the birth year, say so —
  // never present the mid-year sample as a settled fact.
  const labelFor = (sig: GenPlanetSignature): string =>
    sig.confident || !sig.possibleSigns ? sig.sign : sig.possibleSigns.join(" or ");
  return { uranus, neptune, pluto, cohortLabel: `Pluto in ${labelFor(pluto)} · Neptune in ${labelFor(neptune)} · Uranus in ${labelFor(uranus)}` };
}

export function compareGenerational(a: GenSignature, b: GenSignature, birthYearGap?: number): GenRelation {
  const planets: Planet[] = ["uranus", "neptune", "pluto"];
  const shared: { planet: Planet; sign: Sign }[] = [];
  const diverged: { planet: Planet; signA: Sign; signB: Sign }[] = [];
  for (const planet of planets) {
    if (a[planet].sign === b[planet].sign) shared.push({ planet, sign: a[planet].sign });
    else diverged.push({ planet, signA: a[planet].sign, signB: b[planet].sign });
  }
  const sameGeneration = shared.length >= 2;
  return {
    shared,
    diverged,
    sameGeneration,
    gapApproxYears: birthYearGap,
    theme:
      diverged.length === 0
        ? "You move through power, ideals, and change with very similar instincts."
        : sameGeneration
          ? "Most of your generational sky is shared, with one key fault line that can create contrasting instincts."
          : "You were shaped by different cultural eras, so expectations around change, trust, and purpose can differ."
  };
}

export function cohortOverlay(people: { name: string; gen: GenSignature }[]): CohortOverlay {
  if (people.length < 2) throw new Error("cohortOverlay requires at least two people");
  const planets: Planet[] = ["uranus", "neptune", "pluto"];
  const sharedSky: { planet: Planet; sign: Sign }[] = [];
  const faultLines: { planet: Planet; groups: { sign: Sign; names: string[] }[] }[] = [];
  for (const planet of planets) {
    const grouped = new Map<Sign, string[]>();
    for (const person of people) {
      const sign = person.gen[planet].sign;
      grouped.set(sign, [...(grouped.get(sign) ?? []), person.name]);
    }
    if (grouped.size === 1) sharedSky.push({ planet, sign: [...grouped.keys()][0] as Sign });
    else faultLines.push({ planet, groups: [...grouped.entries()].map(([sign, names]) => ({ sign, names })) });
  }
  const label =
    faultLines.length === 0 ? "One shared generation across outer planets." : faultLines.length === 1 ? "Mostly one generation, with one meaningful split." : "Multiple generational signatures are active in this group.";
  return { sharedSky, faultLines, label };
}

export * from "./birth";
export * from "./geocode";

export * from "./house-system";

export * from "./transits";
