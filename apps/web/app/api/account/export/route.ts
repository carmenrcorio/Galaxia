import { NextResponse } from "next/server";
import {
  ACCOUNT_EXPORT_COPY,
  ACCOUNT_EXPORT_RATE_LIMIT,
  EXPORT_PROFILE_FIELDS,
  accountExportFilename,
  buildAccountExport,
  type ExportChartRow,
  type ExportGroupMemberRow,
  type ExportGroupRow,
  type ExportMilestoneRow,
  type ExportNoteRow,
  type ExportPersonRow,
  type ExportProfileRow,
  type ExportRelationshipRow
} from "../../../../lib/account-data";
import { createSupabaseClientForRequest } from "../../../../lib/supabase/user-from-request";

export const runtime = "nodejs";

/**
 * Download of everything Galaxia stores for the signed-in person.
 *
 * Every query is filtered to rows the caller owns (owner_id / user_id, or an
 * id list derived from owned rows), on top of RLS. Column lists are explicit
 * so a widened table cannot leak a new internal column into the file, and
 * `@galaxia/core buildAccountExport` resolves people by name so no uuid
 * reaches the download. Vela threads and messages are not read at all.
 *
 * Rate limited to one export per hour per user by an atomic SECURITY DEFINER
 * RPC (serverless has no shared memory, so the counter lives in Postgres).
 */
export async function GET(req: Request) {
  const { supabase, accessToken } = await createSupabaseClientForRequest(req);
  const {
    data: { user }
  } = await supabase.auth.getUser(accessToken ?? undefined);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const uid = user.id;

  const { data: admitted, error: rateError } = await supabase.rpc(
    "check_and_increment_account_export_rate"
  );
  if (rateError) {
    return NextResponse.json({ error: ACCOUNT_EXPORT_COPY.errorGeneric }, { status: 500 });
  }
  if (admitted !== true) {
    return NextResponse.json(
      { error: ACCOUNT_EXPORT_COPY.errorRateLimited },
      { status: 429, headers: { "Retry-After": String(ACCOUNT_EXPORT_RATE_LIMIT.windowSeconds) } }
    );
  }

  const [profileRes, peopleRes, relationshipsRes, groupsRes, notesRes, milestonesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(EXPORT_PROFILE_FIELDS.join(", "))
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("people")
        .select(
          "id, display_name, relation, is_self, is_minor, birth_date, birth_time, birth_place, birth_precision, birth_lat, birth_lng, tz_offset_min, passed_at, died_on, memorial_constellation, created_at"
        )
        .eq("owner_id", uid)
        .order("created_at", { ascending: true }),
      supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", uid),
      supabase
        .from("groups")
        .select("id, name, kind, created_at")
        .eq("owner_id", uid)
        .order("created_at", { ascending: true }),
      supabase
        .from("notes")
        .select(
          "about_person, pair_low, pair_high, group_id, body, kind, theme, tags, created_at, withdrawn_at"
        )
        .eq("owner_id", uid)
        .order("created_at", { ascending: true }),
      supabase
        .from("memorial_milestones")
        .select("profile_id, date, title, note, created_at, updated_at")
        .eq("user_id", uid)
        .order("date", { ascending: true })
    ]);

  const firstError =
    profileRes.error ||
    peopleRes.error ||
    relationshipsRes.error ||
    groupsRes.error ||
    notesRes.error ||
    milestonesRes.error;
  if (firstError) {
    return NextResponse.json({ error: ACCOUNT_EXPORT_COPY.errorGeneric }, { status: 500 });
  }

  const people = (peopleRes.data ?? []) as unknown as ExportPersonRow[];
  const groups = (groupsRes.data ?? []) as unknown as ExportGroupRow[];
  const personIds = people.map((person) => person.id);
  const groupIds = groups.map((group) => group.id);

  const [chartsRes, membersRes] = await Promise.all([
    personIds.length
      ? supabase.from("charts").select("person_id, house_system, computed_at, data").in("person_id", personIds)
      : Promise.resolve({ data: [], error: null }),
    groupIds.length
      ? supabase.from("group_members").select("group_id, person_id").in("group_id", groupIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (chartsRes.error || membersRes.error) {
    return NextResponse.json({ error: ACCOUNT_EXPORT_COPY.errorGeneric }, { status: 500 });
  }

  const exportedAt = new Date();
  const payload = buildAccountExport({
    exportedAt,
    email: user.email ?? null,
    profile: (profileRes.data as unknown as ExportProfileRow | null) ?? null,
    people,
    charts: (chartsRes.data ?? []) as unknown as ExportChartRow[],
    relationships: (relationshipsRes.data ?? []) as unknown as ExportRelationshipRow[],
    groups,
    groupMembers: (membersRes.data ?? []) as unknown as ExportGroupMemberRow[],
    notes: (notesRes.data ?? []) as unknown as ExportNoteRow[],
    milestones: (milestonesRes.data ?? []) as unknown as ExportMilestoneRow[]
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${accountExportFilename(exportedAt)}"`,
      "Cache-Control": "no-store"
    }
  });
}
