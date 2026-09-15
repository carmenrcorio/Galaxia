import {
  ASK_BIRTH_DATA_CREATING,
  ASK_BIRTH_DATA_REUSED,
  ASK_BIRTH_DATA_SHARE,
  askBirthDataAskCopy,
  askBirthDataSendCopy,
  birthDataInviteInsertRow,
  birthDataInviteUrl,
  canCreateBirthDataInvite,
  resolveBirthDataInvite,
  type MinorSafetyInput
} from "@galaxia/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "./env";

export type EnsureBirthDataInviteResult =
  | { status: "refused" }
  | { status: "idle" }
  | { status: "ready"; url: string; reused: boolean };

export async function ensureBirthDataInvite(
  supabase: SupabaseClient,
  {
    userId,
    personId,
    person,
    createIfMissing
  }: {
    userId: string;
    personId: string;
    person: MinorSafetyInput;
    createIfMissing: boolean;
  }
): Promise<EnsureBirthDataInviteResult> {
  if (!canCreateBirthDataInvite(person)) {
    return { status: "refused" };
  }

  const origin = siteUrl();
  if (!origin) {
    throw new Error("Missing EXPO_PUBLIC_SITE_URL in environment. Set it to the Galaxia web origin so the app can build a shareable web link.");
  }

  const { data: pending } = await supabase
    .from("invites")
    .select("token, expires_at")
    .eq("person_id", personId)
    .eq("from_user", userId)
    .eq("kind", "birth_data")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const decided = resolveBirthDataInvite({
    person,
    pendingToken: (pending?.token as string | undefined) ?? null,
    pendingExpiresAt: (pending?.expires_at as string | null | undefined) ?? null
  });

  if (decided.action === "refuse") return { status: "refused" };
  if (decided.action === "reuse") {
    return { status: "ready", url: birthDataInviteUrl(origin, decided.token), reused: true };
  }
  if (!createIfMissing) return { status: "idle" };

  const row = birthDataInviteInsertRow(userId, personId, decided.token, decided.expiresAt);
  const { error } = await supabase.from("invites").insert(row);
  if (error) throw new Error(error.message);
  return { status: "ready", url: birthDataInviteUrl(origin, decided.token), reused: false };
}

export {
  ASK_BIRTH_DATA_CREATING,
  ASK_BIRTH_DATA_REUSED,
  ASK_BIRTH_DATA_SHARE,
  askBirthDataAskCopy,
  askBirthDataSendCopy
};
