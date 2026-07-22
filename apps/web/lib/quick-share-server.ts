/**
 * Server-only Quick Share persistence (service-role Supabase + node:crypto).
 * Do not import from Client Components — use lib/quick-share.ts there.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { missingEnvMessage, privateEnv, publicEnv } from "./env";
import type { QuickShareKind, QuickSharePayload, QuickShareRow } from "./quick-share";

/** Unguessable URL token (~128 bits), nanoid-length, URL-safe. */
export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

function serviceClient() {
  if (!publicEnv.supabaseUrl) {
    throw new Error(missingEnvMessage("NEXT_PUBLIC_SUPABASE_URL"));
  }
  if (!privateEnv.serviceRole) {
    throw new Error(missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY"));
  }
  return createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });
}

export async function insertQuickShareSnapshot(
  kind: QuickShareKind,
  payload: QuickSharePayload
): Promise<{ token: string }> {
  const supabase = serviceClient();
  const share_token = generateShareToken();
  const { error } = await supabase.from("quick_share_snapshots").insert({
    share_token,
    kind,
    payload,
  });
  if (error) throw new Error(error.message);
  return { token: share_token };
}

export async function getQuickShareByToken(token: string): Promise<QuickShareRow | null> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) return null;
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("quick_share_snapshots")
    .select("share_token, kind, payload, created_at")
    .eq("share_token", trimmed)
    .maybeSingle();
  if (error || !data) return null;
  if (data.kind !== "single" && data.kind !== "compare") return null;
  return {
    share_token: data.share_token as string,
    kind: data.kind,
    payload: data.payload as QuickSharePayload,
    created_at: data.created_at as string,
  };
}
