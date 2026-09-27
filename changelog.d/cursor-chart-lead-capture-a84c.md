## Free chart transit-alert capture (branch `cursor/chart-lead-capture-a84c`) — 2026-09-26

**Trigger**: Anonymous Quick Chart visitors had no way to keep the chart useful after leaving the results page.

`[ADDED]` Anonymous post-generation email capture on `/chart`, hidden for signed-in members. The service-role API validates and upserts normalized addresses with birth inputs only, protected by the existing in-memory IP rate limiter.

`[ADDED]` A service-role-only `chart_leads` table with subscription, drip, conversion, and timestamp fields. Computed placements are intentionally excluded so later drip jobs can recompute against the current astrology engine.

`[ADDED]` A three-message day 1, day 3, and day 7 chart-lead sequence, scheduled daily through GitHub Actions. Each send recomputes the stored birth inputs with the current astrology engine, includes one-click unsubscribe headers and the CAN-SPAM footer, and advances the lead only after Resend accepts the message.

`[ADDED]` No-login chart-alert unsubscribe and signup conversion tracking. New auth accounts mark a matching lead converted immediately, while every drip run reconciles existing auth emails before selecting subscribed leads.
