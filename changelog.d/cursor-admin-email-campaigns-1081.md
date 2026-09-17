## Admin email catalog, campaigns, and open tracking (branch `cursor/admin-email-campaigns-1081`) — 2026-09-17

**Trigger**: Carmen asked for `/admin` to see and edit every automated Galaxia email, create campaigns, and see whether a recipient opened the mail.

`[DECISION]` **Postgres is the copy source of truth. Resend is the pipe.** `email_templates` holds subject, preview, paragraphs, CTA, and pause. Triggers, consent columns, and computed bodies (nudge `copy_resolved`, letter portraits, chart placements) stay in code. Crons fall back to the shipped copy in `apps/web/lib/email-copy.ts` if the table is missing. No freeform HTML CMS. No `vercel.json`.

`[DECISION]` **First-party open tracking, with Resend as a backup.** Every Galaxia-sent mail gets a 1x1 pixel at `/api/email/open?t=<uuid>` and an `email_sends` row. `opened_at` is first open; `open_count` is totals. The pixel always returns the GIF, so a missing id cannot be probed. When `RESEND_WEBHOOK_SECRET` is set, `email.opened` also records against `resend_id`. Some mail apps block pixels, so the admin number is a floor, not a census.

`[ADDED]` **`/admin/emails`.** Catalog of the five trial emails, daily sky, weekly letter, blog chart reading, and the three GoTrue sign-in mails (read-only; those stay in Supabase Auth). Pause, edit allowed fields, send-to-me, and a per-recipient open table. Campaigns are one-shot drafts with a 500-recipient cap and 1:1 send so each person gets their own pixel.

`[ADDED]` **Independent campaign unsubscribe.** `profiles.campaign_emails_opted_out` (default false, service-role only) and `/api/campaign-email/unsubscribe`. Independent of trial / daily sky / weekly letter. Blog audience honors `blog_email_captures.unsubscribed_at`.

`[UNCHANGED]` **`hasAccess`, consent columns, and GoTrue templates.** Pause skips the next cron; it does not rewrite who is eligible. Sign-in mail is still edited in the Auth dashboard and resent from `/admin/users`.

`[OPEN]` **Apply `20260917035202_email_admin_templates_campaigns_sends.sql` to production after merge.** This branch does not apply it (ENGINEERING.md §16). Until it lands, `/admin/emails` cannot load and crons keep using shipped copy.

`[ADDED]` **`changelog.d/cursor-admin-email-campaigns-1081.md`** (this file).
