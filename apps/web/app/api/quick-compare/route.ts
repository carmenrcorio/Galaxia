import {
  compareGenerational,
  computeNatalChart,
  computeSynastry,
  buildBirthInput,
  type GenSignature,
  type BirthFormInput,
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import { NextResponse } from "next/server";

/**
 * Quick Compatibility — public, no login required. Both charts and the
 * synastry are computed here, server-side. Nothing is persisted. Names never
 * reach this route — the client attaches display names to the returned
 * chart/synastry data locally, after the response comes back.
 *
 * Minor safety (ENGINEERING.md §9/§13): this is the compute boundary. We call
 * the shared `isMinorForSafety` util on both people and return `pairHasMinor`
 * so every surface that renders this payload (including a future public share
 * view) can withhold romantic/attraction framing. Detection is not reimplemented
 * here — same call shape as Quick Chart's save-to-galaxy path.
 */
export async function POST(req: Request) {
  let body: { a?: BirthFormInput; b?: BirthFormInput; houseSystem?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.a || !body.b) return NextResponse.json({ error: "Both people's birth data are required." }, { status: 400 });

  let builtA, builtB;
  try {
    builtA = buildBirthInput(body.a);
    builtB = buildBirthInput(body.b);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid birth data." }, { status: 400 });
  }

  // Same call shape as save-to-galaxy / quick-check: no manual checkbox on this
  // path, so the age backstop is the only signal. Year-only near 17/18 fails
  // safe inside isMinorForSafety (Dec 31 assumption).
  const pairHasMinor =
    isMinorForSafety({ isMinor: false, birthDate: builtA.birthDate, birthPrecision: body.a.precision }) ||
    isMinorForSafety({ isMinor: false, birthDate: builtB.birthDate, birthPrecision: body.b.precision });

  const houseSystem = body.houseSystem === "whole" || body.houseSystem === "equal" ? body.houseSystem : "placidus";
  const chartA = computeNatalChart({ ...builtA.birth, houseSystem });
  const chartB = computeNatalChart({ ...builtB.birth, houseSystem });

  if (chartA.precision === "year" || chartB.precision === "year") {
    // Year-only charts have sampled (mid-year) positions — a full synastry read
    // would be fabricated. The generational layer is the honest comparison.
    const generational = compareGenerational(chartA.generational as GenSignature, chartB.generational as GenSignature);
    return NextResponse.json({ chartA, chartB, synastry: null, generational, pairHasMinor });
  }

  const synastry = computeSynastry(chartA, chartB);
  const generational = compareGenerational(chartA.generational as GenSignature, chartB.generational as GenSignature);

  return NextResponse.json({ chartA, chartB, synastry, generational, pairHasMinor });
}
