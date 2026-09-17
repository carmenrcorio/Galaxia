/**
 * Mobile calls the existing web account routes (D5). One graph: typed
 * confirmation, then `purge_own_account_data`, then GoTrue deleteUser.
 * The app never RPCs purge itself.
 */
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_EXPORT_COPY,
  isDeleteConfirmation
} from "@galaxia/core";
import { siteUrlFor } from "./env";

export interface AccountExportOk {
  ok: true;
  json: string;
  filename: string;
}

export interface AccountActionErr {
  ok: false;
  error: string;
}

function bearerHeaders(accessToken: string, json = false): HeadersInit {
  return json
    ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${accessToken}` };
}

export async function requestAccountExport(
  accessToken: string
): Promise<AccountExportOk | AccountActionErr> {
  let url: string;
  try {
    url = siteUrlFor("api/account/export");
  } catch {
    return { ok: false, error: ACCOUNT_EXPORT_COPY.errorGeneric };
  }
  try {
    const res = await fetch(url, { method: "GET", headers: bearerHeaders(accessToken) });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? ACCOUNT_EXPORT_COPY.errorGeneric };
    }
    const json = await res.text();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? "galaxia-export.json";
    return { ok: true, json, filename };
  } catch {
    return { ok: false, error: ACCOUNT_EXPORT_COPY.errorGeneric };
  }
}

export async function requestAccountDelete(
  accessToken: string,
  confirmation: string
): Promise<{ ok: true } | AccountActionErr> {
  if (!isDeleteConfirmation(confirmation)) {
    return { ok: false, error: 'Type the word "delete" to confirm account deletion.' };
  }
  let url: string;
  try {
    url = siteUrlFor("api/account/delete");
  } catch {
    return { ok: false, error: ACCOUNT_DELETE_COPY.errorGeneric };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: bearerHeaders(accessToken, true),
      body: JSON.stringify({ confirmation: confirmation.trim().toLowerCase() })
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? ACCOUNT_DELETE_COPY.errorGeneric };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: ACCOUNT_DELETE_COPY.errorGeneric };
  }
}
