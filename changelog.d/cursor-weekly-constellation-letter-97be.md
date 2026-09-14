## Weekly constellation letter (branch `cursor/weekly-constellation-letter-97be`) — 2026-09-14

**Trigger**: Build a Sunday letter about who in a person's constellation has something real moving this week, scheduled from the existing relational-transits GitHub Actions workflow (no `vercel.json`).

`[DECISION]` **Phase 0: `relational_transits` is a now-window store, not a week-ahead forecast.** Each row is one slow outer body (Jupiter/Saturn/Uranus/Neptune/Pluto) forming the same aspect to 2+ people, with `active_from`/`active_to` derived from exact-pass dates and measured daily motion. The daily scan upserts events in orb at that instant. A week-ahead view for a whole constellation *can* be computed in one pass: `scanRelationalTransitsForWeek` takes every natal chart in the circle and samples owner-local noon for the seven civil days Sunday through Saturday, unioning by `relationalTransitDedupKey`. Stored rows overlapping the week are a cache of what was already in orb; they are not sufficient for events that only enter orb later in the week. The letter therefore recomputes, it does not invent.

`[DECISION]` **Email infrastructure to reuse, not replace.** `apps/web/lib/emails.ts` already owns Resend send, the CAN-SPAM footer, RFC 8058 `List-Unsubscribe` headers, and the shared ink/cream shell. A new scheduled send is a `POST /api/cron/constellation-letter` job on `.github/workflows/relational-transits.yml` (`needs: scan`), the same `GALAXIA_APP_URL` + `CRON_SECRET` pattern as scan/push. No new scheduler. No `vercel.json`.

`[DECISION]` **Unsubscribe to reuse: `profiles.unsubscribe_token`.** The daily sky email's no-login token stays unique and service-role only. The letter gets its own route (`/api/constellation-letter/unsubscribe`) that flips only `weekly_constellation_letter_enabled`. The nudge route still only flips `daily_nudge_emails_enabled`. The two emails are independent.

`[ADDED]` **Sunday constellation letter.** One email, letter voice (no headers, no bullets, no dashboard). Opening names only the people the letter is about. Two to four people with a real in-orb hit, each with one sentence about the dynamic (natal body + transiting body + aspect) and one suggested intention keyed to the same body x aspect class as the in-app This Week cards. If only one adult remains after minor exclusion, the letter says so. If nothing is active, do not send.

`[ADDED]` **`profiles.weekly_constellation_letter_enabled`** (opt-out, default on) and Settings toggle, independent of daily sky email and of `relational_transit_alerts`.

`[ADDED]` **`constellation_letters` ledger** (service-role only): one row per `(owner_id, week_of)` with `resend_id`, `sent_at`, first-touch `opened_at`/`clicked_at`, and `open_count`/`click_count`. First-party pixel (`/api/constellation-letter/open`) and click wrapper (`/api/constellation-letter/go`) record engagement without requiring Resend webhooks. `POST /api/webhooks/resend` is the optional native path (fails closed on unset `RESEND_WEBHOOK_SECRET`).

`[OPEN]` **Apply `20260914250000_weekly_constellation_letter.sql` to production after merge.** This branch does not apply it (ENGINEERING.md §16). Until it lands, Settings cannot persist the new column and the cron will error on the missing table/column. Point Resend at `/api/webhooks/resend` for `email.opened` and `email.clicked` if native open/click events should supplement the pixel.

`[CHANGED]` **Migration timestamp bumped to `20260914250000`.** `main` landed `20260914240000_comparison_history.sql` under the same prefix. The letter migration now runs after it, and `purge_own_account_data` keeps both `comparison_history` and `constellation_letters` deletes.

`[NOTE]` The `letter` job uses `--max-time 180` because the week-ahead scan samples seven owner-local noons per constellation. The known 2022-07-10 Ada/Bo/Cy week is locked in `@galaxia/astro`: Bo is in the circle with no in-orb hit, so the letter is Cy and Ada only.
