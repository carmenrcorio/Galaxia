## Free chart lead drip and conversion tracking (branch `cursor/chart-lead-capture-a84c`) — 2026-09-27

**Trigger**: Free chart leads were captured with birth inputs and drip state, but no scheduled sequence, unsubscribe path, or signup conversion stop existed.

`[ADDED]` A three-message day 1, day 3, and day 7 chart-lead sequence, scheduled daily through GitHub Actions. Each send recomputes the stored birth inputs with the current astrology engine, includes one-click unsubscribe headers and the CAN-SPAM footer, and advances the lead only after Resend accepts the message.

`[ADDED]` No-login chart-alert unsubscribe and signup conversion tracking. New auth accounts mark a matching lead converted immediately, while every drip run reconciles existing auth emails before selecting subscribed leads.
