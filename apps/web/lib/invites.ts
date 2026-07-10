import { createClient } from "@supabase/supabase-js";
import { privateEnv, publicEnv } from "./env";

export interface InviteRecord {
  id: string;
  from_user: string;
  inviter_name: string | null;
  relationship_type: string | null;
  status: string;
  expires_at: string | null;
  kind: "shared_space" | "birth_data";
  person_id: string | null;
  /** For birth_data invites: the name of the person whose data is being collected. */
  person_name: string | null;
}

export async function getInviteByToken(token: string): Promise<InviteRecord | null> {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) return null;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  const { data } = await supabase
    .from("invites")
    .select("id, from_user, relationship_type, status, expires_at, kind, person_id")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.from_user).maybeSingle();
  let personName: string | null = null;
  if (data.person_id) {
    const { data: person } = await supabase.from("people").select("display_name").eq("id", data.person_id).maybeSingle();
    personName = person?.display_name ?? null;
  }
  return {
    id: data.id as string,
    from_user: data.from_user as string,
    relationship_type: (data.relationship_type as string | null) ?? null,
    status: data.status as string,
    expires_at: (data.expires_at as string | null) ?? null,
    kind: (data.kind as "shared_space" | "birth_data" | null) ?? "shared_space",
    person_id: (data.person_id as string | null) ?? null,
    inviter_name: profile?.display_name ?? null,
    person_name: personName
  };
}
