import {
  computeNatalChart,
  buildBirthInput,
  type BirthFormInput,
} from "@galaxia/astro";
import { NextResponse } from "next/server";

/**
 * Quick Chart — public, no login required. The engine runs here, server-side,
 * never in the browser. Nothing is persisted: no database write happens on this
 * route, regardless of whether the caller has a session.
 */
export async function POST(req: Request) {
  let body: { input?: BirthFormInput; houseSystem?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body.input;
  if (!input) return NextResponse.json({ error: "Birth data is required." }, { status: 400 });

  let built;
  try {
    built = buildBirthInput(input);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid birth data." }, { status: 400 });
  }

  const houseSystem = body.houseSystem === "whole" || body.houseSystem === "equal" ? body.houseSystem : "placidus";
  const chart = computeNatalChart({ ...built.birth, houseSystem });

  return NextResponse.json({
    chart,
    birthDate: built.birthDate,
    birthPlace: built.birthPlace,
    displayDate: built.displayDate,
    tzOffsetMin: built.tzOffsetMin
  });
}
