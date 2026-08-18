import { joinFullName } from "@galaxia/core";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Carries the name collected at signup into `profiles.display_name`, which stays
 * the single source of truth that every surface reads through
 * `resolveAccountName`.
 *
 * Why a two-step at all: when email confirmation is on, `supabase.auth.signUp`
 * returns no session, so the browser cannot write to `profiles` yet (RLS
 * requires `id = auth.uid()`). The name therefore rides along in the auth user's
 * metadata, which `signUp` accepts before any session exists, and is copied into
 * the profile on the first authenticated entry.
 *
 * Auth metadata is transport only. Nothing reads it for display. If this copy
 * never happens the user simply has no name yet, sees the honest "add your name"
 * state on `/account`, and can set it there. That is why a failure here is not
 * fatal and is not surfaced as an error: no screen claims a name that is not
 * stored, so there is nothing dishonest to report, and blocking a login over a
 * name copy would be worse than the missing name.
 */

/** Metadata keys the signup form writes. Read here and nowhere else. */
interface SignupNameMetadata {
  full_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The name captured at signup, or an empty string when signup did not collect one. */
export function signupNameFromUserMetadata(user: Pick<User, "user_metadata"> | null | undefined): string {
  const metadata = (user?.user_metadata ?? {}) as SignupNameMetadata;
  const full = asString(metadata.full_name).trim();
  if (full) return full;
  return joinFullName(asString(metadata.first_name), asString(metadata.last_name));
}

export async function syncSignupNameToProfile(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "user_metadata"> | null | undefined
): Promise<void> {
  if (!user?.id) return;

  const signupName = signupNameFromUserMetadata(user);
  // Costs nothing for every existing account and every signup that did not
  // collect a name: no name in metadata means no queries at all.
  if (!signupName) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  // No row yet means the new-user trigger has not settled. Skip rather than
  // insert: a partial insert here would create a profile without the trial
  // columns the trigger owns, which the entitlement gate reads.
  if (error || !profile) return;

  // Never overwrite a name the user has already set for themselves.
  if (asString(profile.display_name).trim()) return;

  await supabase.from("profiles").update({ display_name: signupName }).eq("id", user.id);
}
