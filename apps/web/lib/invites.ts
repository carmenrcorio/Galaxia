import { createClient } from "@supabase/supabase-js";
import { privateEnv, publicEnv } from "./env";

export interface InviteRecord {
  id: string;
  from_user: string;
  inviter_name: string | null;
  relationship_type: string | null;
  status: string;
  expires_at: string | null;
}

export async function getInviteByToken(token: string): Promise<InviteRecord | null> {
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) return null;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  const { data } = await supabase
    .from("invites")
    .select("id, from_user, relationship_type, status, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.from_user).maybeSingle();
  return {
    ...(data as Omit<InviteRecord, "inviter_name">),
    inviter_name: profile?.display_name ?? null
  };
}
