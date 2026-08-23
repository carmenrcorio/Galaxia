import type { SupabaseClient } from "@supabase/supabase-js";
import { profileAllowsAccess } from "@galaxia/core";

/**
 * Comp grant/revoke — writes ONLY `profiles.comped`, via the same
 * "read current state -> validate -> guarded UPDATE" shape
 * `transitionSupportRequest` (support-requests.ts) uses for close/reopen.
 * LOCKED (per the Phase 0 dump + Phase 1 spec): comp only, no lifetime
 * write, no `subscription_status`/`trial_ends_at` write in either
 * direction. Hard revoke — `comped = false` and nothing else, no grace.
 */
export type CompTransition = "grant" | "revoke";

export class SelfCompError extends Error {
  constructor() {
    super("An admin cannot grant or revoke comp access on their own account.");
    this.name = "SelfCompError";
  }
}

export class CompTargetNotFoundError extends Error {
  constructor(targetUserId: string) {
    super(`Profile "${targetUserId}" not found.`);
    this.name = "CompTargetNotFoundError";
  }
}

export class CompConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompConflictError";
  }
}

export interface CompProfileRow {
  id: string;
  comped: boolean;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

export interface TransitionCompResult {
  profile: CompProfileRow;
  /**
   * The resulting entitlement, decided by the one shared `hasAccess`
   * (via `profileAllowsAccess`) over the row's real
   * subscription_status/trial_ends_at plus the just-written `comped` —
   * never reimplemented here. For a revoke, this is what actually happens
   * to access: it falls through to whatever the row's real billing/trial
   * state is, which may already be false (e.g. a stale-trialing account).
   */
  hasAccess: boolean;
}

const PROFILE_FIELDS = "id, comped, subscription_status, trial_ends_at";

/**
 * Grants or revokes durable comp access on `targetUserId`. Clones
 * `transitionSupportRequest`'s shape exactly:
 *   1. refuse a self-action (new: a support-request transition has no
 *      "self" concept, but a money column does — an admin acting on their
 *      own account closes the self-grant class this column exists to
 *      close in the first place, see the 20260724180000 migration's own
 *      postmortem on self-writable billing columns).
 *   2. read the current row via service-role; not-found throws.
 *   3. no-op guard: granting an already-comped account, or revoking a
 *      non-comped account, throws a conflict rather than silently
 *      re-stamping the same value and firing a misleading audit entry.
 *   4. write ONLY `comped`, guarded on the expected prior value
 *      (`.eq("comped", expectedPrior)`) so a concurrent transition between
 *      the read and the write can't lost-update it — same protection
 *      `transitionSupportRequest` gets from `.eq("status", ...)`.
 *   5. return the updated row plus the resulting access state from the
 *      shared `hasAccess` precedence (via `profileAllowsAccess`), never a
 *      second, inline access decision.
 *
 * Does NOT write the audit row itself — same contract as
 * `transitionSupportRequest`: the caller (the grant/revoke route handler)
 * calls `writeAdminAuditLog` in the same function, after this resolves.
 * Takes an already-constructed service-role client and imports no
 * `server-only`, so it stays directly live-DB-testable.
 */
export async function transitionComp(
  serviceRoleClient: SupabaseClient,
  targetUserId: string,
  actorId: string,
  transition: CompTransition
): Promise<TransitionCompResult> {
  if (targetUserId === actorId) {
    throw new SelfCompError();
  }

  const nextComped = transition === "grant";
  const requiredCurrentComped = !nextComped;

  const { data: existing, error: fetchError } = await serviceRoleClient
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", targetUserId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new CompTargetNotFoundError(targetUserId);
  const existingRow = existing as CompProfileRow;
  if (existingRow.comped !== requiredCurrentComped) {
    throw new CompConflictError(
      transition === "grant" ? "This account is already comped." : "This account is not comped."
    );
  }

  const { data: updated, error: updateError } = await serviceRoleClient
    .from("profiles")
    .update({ comped: nextComped })
    .eq("id", targetUserId)
    .eq("comped", requiredCurrentComped)
    .select(PROFILE_FIELDS)
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    // The extra `.eq("comped", requiredCurrentComped)` above means a
    // concurrent transition between the read and this write also lands
    // here (0 rows matched) rather than silently overwriting it.
    throw new CompConflictError(
      transition === "grant" ? "This account is already comped." : "This account is not comped."
    );
  }

  const profile = updated as CompProfileRow;
  return {
    profile,
    hasAccess: profileAllowsAccess({
      subscription_status: profile.subscription_status,
      trial_ends_at: profile.trial_ends_at,
      comped: profile.comped
    })
  };
}
