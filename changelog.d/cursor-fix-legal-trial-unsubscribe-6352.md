## Card-optional Terms §5, no-login trial unsubscribe (branch `cursor/fix-legal-trial-unsubscribe-6352`) — 2026-09-16

**Trigger**: Terms §5 still claimed a card on file would be charged when a trial ended, which is not the product model (trial needs no payment method; a subscription starts only on an active upgrade). Trial cron emails linked unsubscribe to the login-walled `/account/notifications` page, which does not satisfy CAN-SPAM.

`[FIXED]` **Terms §5 Free trial.** Replaced the auto-convert / "payment method you provided will be charged" sentence with language that matches the live model: a trial does not require a payment method, does not convert on its own, and a subscription begins only when the user actively chooses to upgrade. Surrounding §5 copy (plans, renewal, cancellation, refunds, billing providers) is unchanged.

`[ADDED]` **`profiles.trial_emails_opted_out`** (`boolean not null default false`). No existing trial opt-out column existed (confirmed against live `profiles`: `daily_nudge_emails_enabled`, `weekly_constellation_letter_enabled`, `unsubscribe_token`, `trial_ends_at` only). Service-role only, by omission from the authenticated insert/update grant lists, same posture as `unsubscribe_token`. Independent of the daily sky email and the weekly letter.

`[ADDED]` **`GET`/`POST /api/unsubscribe`** — no-login, token-based, RFC 8058 one-click. Reuses `profiles.unsubscribe_token` (the same unguessable per-user uuid the nudge emails already embed). GET shows a confirmation page; POST returns a blank 200. Flips only `trial_emails_opted_out`. Missing or unknown tokens are a silent no-op (never leak validity).

`[FIXED]` **Trial emails now link to `/api/unsubscribe?token=…`**, not `/account/notifications`. The trial cron selects `unsubscribe_token` and `trial_emails_opted_out`, skips opted-out rows (`skipped.optedOut`) before the kind picker, and sends RFC 8058 `List-Unsubscribe` headers on the same URL. `/account/notifications` is left in place for already-sent mail.

`[DECISION]` **Do not apply this migration from the agent.** ENGINEERING.md §16: CI detects production drift; applying SQL to production is a human decision after reading what changed.
