import {
  cohortOverlay,
  compareGenerational,
  type GenSignature,
  type NatalChart
} from "@galaxia/astro";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

/**
 * Refresh the current cohort overlay for a saved group.
 *
 * Path (a) for Vela group context: compute with `@galaxia/astro` `cohortOverlay`
 * (same engine as the Groups page), persist to `notes` (`kind: cohort_reading`,
 * `payload.source: "vela_cohort_current"`). The vela-chat edge function reads
 * that row. It must not recompute overlay math and must not trust client-built
 * context on the chat request.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { groupId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const groupId = body.groupId;
  if (!groupId) return NextResponse.json({ error: "groupId is required." }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("person_id")
    .eq("group_id", groupId);
  const memberIds = (memberRows ?? []).map((r) => r.person_id as string);
  if (memberIds.length < 2) {
    return NextResponse.json(
      { error: "Group needs at least two members for a cohort overlay." },
      { status: 400 }
    );
  }

  const { data: people } = await supabase
    .from("people")
    .select("id, display_name")
    .in("id", memberIds)
    .eq("owner_id", user.id);
  if (!people?.length || people.length !== memberIds.length) {
    return NextResponse.json({ error: "Group members not found." }, { status: 404 });
  }

  const { data: chartRows } = await supabase
    .from("charts")
    .select("person_id, data")
    .in("person_id", memberIds);
  const chartById = new Map(
    (chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart | undefined])
  );

  const named = people.map((p) => {
    const chart = chartById.get(p.id as string);
    return {
      id: p.id as string,
      name: p.display_name as string,
      gen: chart?.generational as GenSignature | undefined
    };
  });
  const missing = named.find((n) => !n.gen);
  if (missing) {
    return NextResponse.json({ error: `Missing chart for ${missing.name}.` }, { status: 400 });
  }

  const overlay = cohortOverlay(named.map((n) => ({ name: n.name, gen: n.gen! })));
  const memberNames = named.map((n) => n.name);

  const pairHighlights: Array<{ pair: string; summary: string }> = [];
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const a = named[i]!;
      const b = named[j]!;
      const rel = compareGenerational(a.gen!, b.gen!);
      pairHighlights.push({
        pair: `${a.name} × ${b.name}`,
        summary: rel.sameGeneration
          ? `Same generation (${rel.shared.map((s) => `${s.planet} ${s.sign}`).join(", ")}).`
          : `Fault line: ${rel.diverged.map((d) => `${d.planet} ${d.signA}/${d.signB}`).join(" · ")}.`
      });
    }
  }

  const payload = {
    source: "vela_cohort_current" as const,
    overlay,
    memberNames,
    pairHighlights: pairHighlights.slice(0, 3)
  };
  const bodyText = `Current cohort overlay for ${group.name}: ${overlay.label}`;

  // Keep a single current row per group so Ask Vela does not flood the Record.
  const { data: existingRows } = await supabase
    .from("notes")
    .select("id, payload")
    .eq("owner_id", user.id)
    .eq("group_id", groupId)
    .eq("kind", "cohort_reading")
    .order("created_at", { ascending: false })
    .limit(30);
  const existing = (existingRows ?? []).find(
    (r) => (r.payload as { source?: string } | null)?.source === "vela_cohort_current"
  );

  if (existing?.id) {
    const { error } = await supabase
      .from("notes")
      .update({ body: bodyText, payload })
      .eq("id", existing.id)
      .eq("owner_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("notes").insert({
      owner_id: user.id,
      group_id: groupId,
      kind: "cohort_reading",
      body: bodyText,
      payload
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    group: { id: group.id, name: group.name },
    cohort: {
      sharedSky: overlay.sharedSky,
      faultLines: overlay.faultLines,
      members: memberNames
    }
  });
}
