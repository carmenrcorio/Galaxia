import { createClient } from "@supabase/supabase-js";
import { privateEnv, publicEnv } from "./env";

export interface InviteRecord {
  id: string;
  from_user: string;
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
  return (data as InviteRecord | null) ?? null;
}
