import {
  computeNatalChart,
  buildBirthInput,
  type BirthFormInput,
} from "@galaxia/astro";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { privateEnv, publicEnv } from "../../../../lib/env";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem } from "../../../../lib/house-system";

/**
 * Public write-back for a birth_data invite. The invited person is NOT a
 * Galaxia user, so this runs with the service role. It never exposes any
 * existing data — it only accepts birth details and writes the pending
 * person's chart. All the never-fabricate validation runs through the same
 * buildBirthInput pipeline the app uses (date echo, resolved timezone).
 */
export async function POST(req: Request) {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let payload: { token?: string; input?: BirthFormInput };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const token = payload.token?.trim();
  const input = payload.input;
  if (!token || !input) {
    return NextResponse.json({ error: "Missing token or birth data." }, { status: 400 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });

  const { data: invite } = await supabase
    .from("invites")
    .select("id, from_user, person_id, kind, status")
    .eq("token", token)
    .maybeSingle();
  if (!invite || invite.kind !== "birth_data" || !invite.person_id) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }
  if (invite.status === "accepted") {
    return NextResponse.json({ error: "This link was already used. Thank you!" }, { status: 409 });
  }

  // Build the chart through the same validated pipeline the app uses.
  let built;
  try {
    built = buildBirthInput(input);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid birth data." }, { status: 400 });
  }

  const houseSystem = await getPreferredHouseSystem(supabase, invite.from_user as string);
  const natal = computeNatalChart({ ...built.birth, houseSystem });

  const { error: pErr } = await supabase.from("people").update({
    birth_date: built.birthDate,
    birth_time: built.birthTime,
    birth_place: built.birthPlace,
    birth_precision: input.precision,
    birth_lat: built.birth.lat ?? null,
    birth_lng: built.birth.lng ?? null,
    tz_offset_min: built.tzOffsetMin ?? null,
  }).eq("id", invite.person_id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const { error: cErr } = await supabase.from("charts").upsert({
    person_id: invite.person_id, house_system: natal.houseSystem ?? null, data: natal, engine_version: CHART_ENGINE_VERSION
  });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

  await supabase.from("invites").update({ status: "accepted" }).eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
