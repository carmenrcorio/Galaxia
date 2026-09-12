import { redirect } from "next/navigation";

/**
 * CAN-SPAM opt-out landing page for marketing emails that have no
 * per-category consent flag of their own (trial emails; see
 * `trialUnsubscribeUrl` in `apps/web/lib/emails.ts`). Every email-preference
 * control that actually exists today lives on `/app/settings` (the "Daily
 * sky email" toggle), so this route redirects there rather than duplicating
 * it. Middleware already gates `/app/settings` behind auth.
 */
export default function AccountNotificationsPage() {
  redirect("/app/settings");
}
