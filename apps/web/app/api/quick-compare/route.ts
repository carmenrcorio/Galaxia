import {
  compareGenerational,
  computeNatalChart,
  computeSynastry,
  buildBirthInput,
  type GenSignature,
  type BirthFormInput,
} from "@galaxia/astro";
import { NextResponse } from "next/server";

/**
 * Quick Compatibility — public, no login required. Both charts and the
 * synastry are computed here, server-side. Nothing is persisted. Names never
 * reach this route — the client attaches display names to the returned
 * chart/synastry data locally, after the response comes back.
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

  const houseSystem = body.houseSystem === "whole" || body.houseSystem === "equal" ? body.houseSystem : "placidus";
  const chartA = computeNatalChart({ ...builtA.birth, houseSystem });
  const chartB = computeNatalChart({ ...builtB.birth, houseSystem });

  if (chartA.precision === "year" || chartB.precision === "year") {
    // Year-only charts have sampled (mid-year) positions — a full synastry read
    // would be fabricated. The generational layer is the honest comparison.
    const generational = compareGenerational(chartA.generational as GenSignature, chartB.generational as GenSignature);
    return NextResponse.json({ chartA, chartB, synastry: null, generational });
  }

  const synastry = computeSynastry(chartA, chartB);
  const generational = compareGenerational(chartA.generational as GenSignature, chartB.generational as GenSignature);

  return NextResponse.json({ chartA, chartB, synastry, generational });
}
