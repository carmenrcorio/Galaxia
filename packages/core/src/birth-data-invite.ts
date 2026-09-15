/**
 * Birth-data invite rules. The AskBirthData UI (web and mobile) must go
 * through these helpers so token shape, expiry, reuse, and the minor
 * refusal cannot drift.
 *
 * Does not change the invites schema. birth_data invites still require
 * person_id (nullable on the table, required here).
 */

import { isMinorForSafety, type MinorSafetyInput } from "./minor-safety";

export const BIRTH_DATA_INVITE_KIND = "birth_data" as const;
export const BIRTH_DATA_INVITE_TTL_DAYS = 30;

/** Existing string. Do not rewrite. */
export function askBirthDataSendCopy(personName: string): string {
  return `Send this to ${personName}. When they fill it in, their chart appears here automatically.`;
}

/** Existing string. Do not rewrite. */
export const ASK_BIRTH_DATA_CREATING = "Creating link…";

export function askBirthDataAskCopy(personName: string): string {
  return `Ask ${personName} for their birth details`;
}

export const ASK_BIRTH_DATA_SHARE = "Share";

export const ASK_BIRTH_DATA_REUSED =
  "This is the same link as before.";

export const ASK_BIRTH_DATA_TOGGLE = "Ask them for their birth details";

export function birthDataInviteExpiresAt(now: Date = new Date()): string {
  return new Date(now.getTime() + BIRTH_DATA_INVITE_TTL_DAYS * 86_400_000).toISOString();
}

export function birthDataInvitePath(token: string): string {
  return `/invite/${token}`;
}

export function birthDataInviteUrl(base: string, token: string): string {
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}${birthDataInvitePath(token)}`;
}

export function newBirthDataInviteToken(): string {
  const raw =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return raw.replace(/-/g, "");
}

export function canCreateBirthDataInvite(person: MinorSafetyInput, now?: Date): boolean {
  return !isMinorForSafety(person, now);
}

export function isBirthDataInviteExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export type ResolveBirthDataInviteResult =
  | { action: "refuse"; reason: "minor" }
  | { action: "reuse"; token: string }
  | { action: "create"; token: string; expiresAt: string };

/**
 * Decide whether to refuse, reuse a pending invite, or mint a new one.
 * Callers still perform the read/insert; this is the single decision.
 */
export function resolveBirthDataInvite(input: {
  person: MinorSafetyInput;
  pendingToken: string | null;
  pendingExpiresAt?: string | null;
  now?: Date;
}): ResolveBirthDataInviteResult {
  const now = input.now ?? new Date();
  if (!canCreateBirthDataInvite(input.person, now)) {
    return { action: "refuse", reason: "minor" };
  }
  if (
    input.pendingToken &&
    !isBirthDataInviteExpired(input.pendingExpiresAt, now)
  ) {
    return { action: "reuse", token: input.pendingToken };
  }
  return {
    action: "create",
    token: newBirthDataInviteToken(),
    expiresAt: birthDataInviteExpiresAt(now)
  };
}

export type BirthDataInviteInsert = {
  from_user: string;
  person_id: string;
  kind: typeof BIRTH_DATA_INVITE_KIND;
  token: string;
  relationship_type: null;
  expires_at: string;
};

export function birthDataInviteInsertRow(
  userId: string,
  personId: string,
  token: string,
  expiresAt: string
): BirthDataInviteInsert {
  if (!personId) {
    throw new Error("A birth_data invite needs a person.");
  }
  return {
    from_user: userId,
    person_id: personId,
    kind: BIRTH_DATA_INVITE_KIND,
    token,
    relationship_type: null,
    expires_at: expiresAt
  };
}
