/**
 * Server-only Quick Share persistence (service-role Supabase + node:crypto).
 * Do not import from Client Components — use lib/quick-share.ts there.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { missingEnvMessage, publicEnv } from "./env";
import { privateEnv } from "./env.server";
import {
  isShareActive,
  resolveShareExpiresAt,
  SHARE_DEFAULT_EXPIRY_DAYS,
  type QuickShareKind,
  type QuickShareListItem,
  type QuickSharePayload,
  type QuickShareRow,
  type SingleSharePayload,
} from "./quick-share";

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
  payload: QuickSharePayload,
  createdBy?: string | null,
  expiresInDays: number | null = SHARE_DEFAULT_EXPIRY_DAYS,
): Promise<{ token: string; expiresAt: string | null }> {
  const supabase = serviceClient();
  const share_token = generateShareToken();
  const expires_at = resolveShareExpiresAt(expiresInDays);
  const row: {
    share_token: string;
    kind: QuickShareKind;
    payload: QuickSharePayload;
    created_by?: string;
    expires_at: string | null;
  } = {
    share_token,
    kind,
    payload,
    expires_at,
  };
  // Anonymous funnel inserts stay null; only set when the request has a session.
  if (createdBy) row.created_by = createdBy;
  const { error } = await supabase.from("quick_share_snapshots").insert(row);
  if (error) throw new Error(error.message);
  return { token: share_token, expiresAt: expires_at };
}

export async function getQuickShareByToken(token: string): Promise<QuickShareRow | null> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) return null;
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("quick_share_snapshots")
    .select("share_token, kind, payload, created_at, expires_at, revoked_at")
    .eq("share_token", trimmed)
    .maybeSingle();
  if (error || !data) return null;
  if (data.kind !== "single" && data.kind !== "compare") return null;
  const row: QuickShareRow = {
    share_token: data.share_token as string,
    kind: data.kind,
    payload: data.payload as QuickSharePayload,
    created_at: data.created_at as string,
    expires_at: (data.expires_at as string | null) ?? null,
    revoked_at: (data.revoked_at as string | null) ?? null,
  };
  if (!isShareActive(row)) return null;
  return row;
}

export async function listQuickSharesByCreator(userId: string): Promise<QuickShareListItem[]> {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("quick_share_snapshots")
    .select("share_token, kind, payload, created_at, expires_at, revoked_at")
    .eq("created_by", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const now = new Date();
  const items: QuickShareListItem[] = [];
  for (const row of data) {
    const expires_at = (row.expires_at as string | null) ?? null;
    const revoked_at = (row.revoked_at as string | null) ?? null;
    if (!isShareActive({ expires_at, revoked_at }, now)) continue;
    const kind = row.kind === "compare" ? "compare" : "single";
    const payload = row.payload as QuickSharePayload;
    const single = kind === "single" ? (payload as SingleSharePayload) : null;
    items.push({
      token: row.share_token as string,
      kind,
      created_at: row.created_at as string,
      expires_at,
      displayDate: single?.displayDate ?? null,
      birthPlace: single?.birthPlace ?? null,
    });
  }
  return items;
}

export async function revokeQuickShare(token: string, userId: string): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 64) return false;
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("quick_share_snapshots")
    .update({ revoked_at: new Date().toISOString() })
    .eq("share_token", trimmed)
    .eq("created_by", userId)
    .is("revoked_at", null)
    .select("share_token")
    .maybeSingle();
  if (error || !data) return false;
  return true;
}
