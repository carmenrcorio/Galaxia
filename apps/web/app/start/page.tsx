import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";

/**
 * /start — post-login destination resolver (smart routing).
 *
 * Every login/confirm flow with no explicit deep-link `next` sends the user
 * here instead of hardcoding `/welcome`. This route reads the user's actual
 * record and decides where they belong:
 *
 *   established constellation  → /app   (a returning user)
 *   new / incomplete           → /welcome (guided onboarding)
 *
 * SIGNAL (reported, deliberate): a real self `people` row AND at least one
 * non-self `people` row. Chosen over a stored `onboarding_completed` flag
 * because it is *derived from the record*, not a boolean that can drift —
 * a pre-flag account, or one that deleted everyone, would lie. This honors
 * ENGINEERING.md §12 (never assert a state the data doesn't support) and
 * needs no migration.
 *
 * Deep links are never routed through here — middleware preserves the
 * original path as `?next=` and the login form pushes straight to it, so
 * logging in from an `/app/person/…` link still lands on that person.
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

  // Only the two facts the signal needs. No chart, no join — cheap and honest.
  const { data: people } = await supabase.from("people").select("id, is_self").eq("owner_id", user.id);

  const rows = people ?? [];
  const hasSelf = rows.some((p) => p.is_self === true);
  const hasOther = rows.some((p) => p.is_self !== true);

  // Established constellation → home. Anything less → guided onboarding, which
  // itself resumes at the right step (it re-reads the same record on load).
  if (hasSelf && hasOther) {
    redirect("/app");
  }
  redirect("/welcome");
}
