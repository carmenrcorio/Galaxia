import { Body, EclipticLongitude } from "astronomy-engine";

export type Precision = "exact" | "date" | "year";
export type Planet = "uranus" | "neptune" | "pluto";
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

const SIGNS: Sign[] = [
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
  "Pisces"
];

function normalizeZodiacLongitude(lon: number): number {
  const wrapped = lon % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function longitudeToSign(lon: number): Sign {
  const normalized = normalizeZodiacLongitude(lon);
  return SIGNS[Math.floor(normalized / 30)] ?? "Aries";
}

function signFromDate(date: Date, planet: Planet): Sign {
  const body = planet === "uranus" ? Body.Uranus : planet === "neptune" ? Body.Neptune : Body.Pluto;
  const lon = EclipticLongitude(body, date);
  return longitudeToSign(lon);
}

function toDate(input: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid dateUTC: ${input}`);
  }
  return date;
}

function evaluateYearConfidence(year: number, planet: Planet): GenPlanetSignature {
  const startSign = signFromDate(new Date(Date.UTC(year, 0, 1, 0, 0, 0)), planet);
  const midSign = signFromDate(new Date(Date.UTC(year, 6, 1, 0, 0, 0)), planet);
  const endSign = signFromDate(new Date(Date.UTC(year, 11, 31, 23, 59, 59)), planet);
  const signSet = Array.from(new Set([startSign, midSign, endSign]));
  return {
    sign: midSign,
    confident: signSet.length === 1,
    possibleSigns: signSet.length > 1 ? signSet : undefined
  };
}

export function computeGenerational(dateUTC: string, precision: Precision): GenSignature {
  const date = toDate(dateUTC);
  const year = date.getUTCFullYear();

  const uranus = precision === "year" ? evaluateYearConfidence(year, "uranus") : { sign: signFromDate(date, "uranus"), confident: true };
  const neptune = precision === "year" ? evaluateYearConfidence(year, "neptune") : { sign: signFromDate(date, "neptune"), confident: true };
  const pluto = precision === "year" ? evaluateYearConfidence(year, "pluto") : { sign: signFromDate(date, "pluto"), confident: true };

  return {
    uranus,
    neptune,
    pluto,
    cohortLabel: `Pluto in ${pluto.sign} · Neptune in ${neptune.sign} · Uranus in ${uranus.sign}`
  };
}

export function compareGenerational(a: GenSignature, b: GenSignature, birthYearGap?: number): GenRelation {
  const planets: Planet[] = ["uranus", "neptune", "pluto"];
  const shared: { planet: Planet; sign: Sign }[] = [];
  const diverged: { planet: Planet; signA: Sign; signB: Sign }[] = [];

  for (const planet of planets) {
    const signA = a[planet].sign;
    const signB = b[planet].sign;
    if (signA === signB) {
      shared.push({ planet, sign: signA });
    } else {
      diverged.push({ planet, signA, signB });
    }
  }

  const sameGeneration = shared.length >= 2;
  const theme =
    diverged.length === 0
      ? "You move through power, ideals, and change with very similar instincts."
      : sameGeneration
        ? "Most of your generational sky is shared, with one key fault line that can create contrasting instincts."
        : "You were shaped by different cultural eras, so expectations around change, trust, and purpose can differ.";

  return {
    shared,
    diverged,
    sameGeneration,
    gapApproxYears: birthYearGap,
    theme
  };
}

export function cohortOverlay(people: { name: string; gen: GenSignature }[]): CohortOverlay {
  if (people.length < 2) {
    throw new Error("cohortOverlay requires at least two people");
  }

  const planets: Planet[] = ["uranus", "neptune", "pluto"];
  const sharedSky: { planet: Planet; sign: Sign }[] = [];
  const faultLines: { planet: Planet; groups: { sign: Sign; names: string[] }[] }[] = [];

  for (const planet of planets) {
    const grouped = new Map<Sign, string[]>();
    for (const person of people) {
      const sign = person.gen[planet].sign;
      grouped.set(sign, [...(grouped.get(sign) ?? []), person.name]);
    }

    if (grouped.size === 1) {
      const [sign] = grouped.keys();
      sharedSky.push({ planet, sign: sign as Sign });
    } else {
      faultLines.push({
        planet,
        groups: Array.from(grouped.entries()).map(([sign, names]) => ({ sign, names }))
      });
    }
  }

  const label =
    faultLines.length === 0
      ? "One shared generation across outer planets."
      : faultLines.length === 1
        ? "Mostly one generation, with one meaningful split."
        : "Multiple generational signatures are active in this group.";

  return { sharedSky, faultLines, label };
}
