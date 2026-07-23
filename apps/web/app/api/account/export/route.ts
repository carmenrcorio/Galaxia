import { NextResponse } from "next/server";
import { ACCOUNT_EXPORT_COPY, type AccountExportPayload } from "../../../../lib/account-data";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

/**
 * Machine-readable export of the signed-in user's owned rows.
 * Ownership enforced by RLS + explicit owner_id / id filters.
 * Real stored rows only; never fabricates placeholders.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const uid = user.id;
  // Literal select (not join()) so supabase-js keeps a concrete row type.
  // Must stay aligned with EXPORT_PROFILE_FIELDS in lib/account-data.ts.
  const [
    profileRes,
    peopleRes,
    relationshipsRes,
    groupsRes,
    synastryRes,
    notesRes,
    threadsRes
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, created_at, house_system, subscription_status, trial_ends_at, plan, current_period_end, cancel_at_period_end"
      )
      .eq("id", uid)
      .maybeSingle(),
    supabase.from("people").select("*").eq("owner_id", uid),
    supabase.from("relationships").select("*").eq("owner_id", uid),
    supabase.from("groups").select("*").eq("owner_id", uid),
    supabase.from("synastry").select("*").eq("owner_id", uid),
    supabase.from("notes").select("*").eq("owner_id", uid),
    supabase.from("threads").select("*").eq("owner_id", uid)
  ]);

  const firstError =
    profileRes.error ||
    peopleRes.error ||
    relationshipsRes.error ||
    groupsRes.error ||
    synastryRes.error ||
    notesRes.error ||
    threadsRes.error;
  if (firstError) {
    return NextResponse.json({ error: ACCOUNT_EXPORT_COPY.errorGeneric }, { status: 500 });
  }

  const people = peopleRes.data ?? [];
  const personIds = people.map((p) => p.id as string);
  const groups = groupsRes.data ?? [];
  const groupIds = groups.map((g) => g.id as string);
  const threads = threadsRes.data ?? [];
  const threadIds = threads.map((t) => t.id as string);

  const [chartsRes, membersRes, messagesRes] = await Promise.all([
    personIds.length
      ? supabase.from("charts").select("*").in("person_id", personIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    groupIds.length
      ? supabase.from("group_members").select("*").in("group_id", groupIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    threadIds.length
      ? supabase.from("messages").select("*").in("thread_id", threadIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null })
  ]);

  if (chartsRes.error || membersRes.error || messagesRes.error) {
    return NextResponse.json({ error: ACCOUNT_EXPORT_COPY.errorGeneric }, { status: 500 });
  }

  const payload: AccountExportPayload = {
    exported_at: new Date().toISOString(),
    account_email: user.email ?? null,
    profile: (profileRes.data as Record<string, unknown> | null) ?? null,
    people: people as Record<string, unknown>[],
    charts: (chartsRes.data ?? []) as Record<string, unknown>[],
    relationships: (relationshipsRes.data ?? []) as Record<string, unknown>[],
    groups: groups as Record<string, unknown>[],
    group_members: (membersRes.data ?? []) as Record<string, unknown>[],
    synastry: (synastryRes.data ?? []) as Record<string, unknown>[],
    notes: (notesRes.data ?? []) as Record<string, unknown>[],
    threads: threads as Record<string, unknown>[],
    messages: (messagesRes.data ?? []) as Record<string, unknown>[]
  };

  // Refuse to ship Stripe / billing plumbing even if a future select widens.
  if (payload.profile) {
    delete payload.profile.stripe_customer_id;
    delete payload.profile.stripe_subscription_id;
    delete payload.profile.subscription_tier;
  }

  const body = JSON.stringify(payload, null, 2);
  const filename = `galaxia-export-${uid.slice(0, 8)}.json`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
