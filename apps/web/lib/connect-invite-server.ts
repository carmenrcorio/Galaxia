import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  type ConnectLanding,
  type ConnectLandingStatus,
  isConnectToken,
  landingStatusFromInvite,
} from "./connect-invite";
import { publicEnv } from "./env";
import { privateEnv } from "./env.server";

/**
 * Public, unauthenticated projection of a constellation_connect invite.
 * Service-role only, same pattern as getInviteByToken: the recipient has no
 * RLS visibility into invites. Returns nothing about the sender's galaxy.
 */
export async function getConnectInviteLanding(
  token: string,
): Promise<ConnectLanding | "not_found" | "wrong_kind" | "unconfigured"> {
  if (!isConnectToken(token)) return "not_found";
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) return "unconfigured";

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });

  const { data } = await supabase
    .from("invites")
    .select("from_user, relationship_type, status, expires_at, kind")
    .eq("token", token)
    .maybeSingle();

  if (!data) return "not_found";
  if (data.kind === "birth_data" || data.kind === "shared_space") return "wrong_kind";
  if (data.kind !== "constellation_connect") return "not_found";

  let status = data.status as string;
  const expiresAt = (data.expires_at as string | null) ?? null;

  if (status === "pending" && expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    await supabase
      .from("invites")
      .update({ status: "expired" })
      .eq("token", token)
      .eq("kind", "constellation_connect")
      .eq("status", "pending");
    status = "expired";
  }

  const landingStatus: ConnectLandingStatus = landingStatusFromInvite(status, expiresAt);

  const { data: selfRow } = await supabase
    .from("people")
    .select("display_name")
    .eq("owner_id", data.from_user)
    .eq("is_self", true)
    .maybeSingle();

  return {
    inviterName: (selfRow?.display_name as string | null)?.trim() || "Someone you know",
    relation: (data.relationship_type as string | null) ?? "",
    status: landingStatus,
    expiresAt,
  };
}
