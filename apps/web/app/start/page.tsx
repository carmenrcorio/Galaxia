import { isFirstRunSettled } from "@galaxia/core";
import { redirect } from "next/navigation";
import { syncSignupNameToProfile } from "../../lib/account-name";
import { readFirstRunProfile } from "../../lib/first-run";
import { createSupabaseServerClient } from "../../lib/supabase/server";

/**
 * /start — post-login destination resolver (smart routing).
 *
 * Every login/confirm flow with no explicit deep-link `next` sends the user
 * here instead of hardcoding `/welcome`. This route decides where they belong:
 *
 *   first run already settled  → /app     (a returning user)
 *   first run not settled      → /welcome (orientation, which resumes itself)
 *
 * SIGNAL (changed by the first-run orientation flow): `profiles.onboarding_completed_at`.
 *
 * This route previously derived the answer from the record instead: a self
 * `people` row AND at least one non-self row. That was the right call while
 * onboarding always went self-first and had no state a row could not express.
 * The five-step orientation flow leads with the other person and has steps that
 * leave no trace in `people` at all (choosing a relationship, reading the first
 * statement), so the old two-fact signal can no longer tell "finished" from
 * "stopped halfway". See supabase/migrations/20260914180000_profiles_onboarding_state.sql
 * for the full reasoning, including why the drift risk the old note named is
 * contained.
 *
 * Fail-open is deliberate and unchanged in spirit: a missing or unreadable
 * profile row reads as "not settled", which shows orientation one extra time.
 * The opposite default would silently swallow a new user's first run.
 *
 * Deep links are never routed through here — middleware preserves the original
 * path as `?next=` and the login form pushes straight to it, so logging in from
 * an `/app/person/…` link still lands on that person.
 */
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/start");
  }

  // Catch-up for a name collected at signup that never reached `profiles`, for
  // any login path that skipped /auth/callback. Costs nothing when there is no
  // pending name, which is every established account.
  await syncSignupNameToProfile(supabase, user);

  const profile = await readFirstRunProfile(supabase, user.id);

  if (isFirstRunSettled(profile)) {
    redirect("/app");
  }
  // Orientation re-reads the record on load and resumes at the right step, so
  // this hands off the destination without needing to know the step itself.
  redirect("/welcome");
}
