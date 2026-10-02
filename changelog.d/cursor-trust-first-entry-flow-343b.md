## Trust-first chart entry and lead consent (branch `cursor/trust-first-entry-flow-343b`) — 2026-10-02

**Trigger:** First-time testers wanted trust before birth data; founder chose value-first email capture after the first chart reveal, staged birth on `/chart`, and Galaxia Notes consent separate from chart mail.

`[ADDED]` **`chart_leads` marketing consent.** Migration `20261002180200_chart_leads_marketing_consent.sql` adds `consent_marketing`, nullable `chart_data`, and `converted_user_id`; conversion functions set user id when email matches signup.

`[CHANGED]` **Quick Chart UX.** Homepage hero keeps date-only try; `/chart` uses Step 1 of 3 date entry, optional advanced precision ladder, post-chart sharpen steps for time and place, and improved `ChartLeadCapture` with Galaxia Notes checkbox and dismiss.

`[ADDED]` **Lead API for blog branch.** `submitNewsletterSignup` in `lib/chart-lead-upsert.ts` and `POST /api/chart-lead/newsletter-signup` for email-only Notes opt-in (`source: blog`).

`[ADDED]` **Lead unsubscribe routes.** Chart mail (`/api/chart-lead/unsubscribe`), Galaxia Notes (`/api/chart-lead/newsletter/unsubscribe`), and manage both (`/api/chart-lead/preferences`).

`[ADDED]` **Analytics events.** `email_prompt_shown`, `email_submitted`, `email_dismissed`, `newsletter_opt_in`, `birth_time_added`, `birth_place_added` (no PII in properties).
