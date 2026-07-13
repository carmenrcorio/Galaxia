## RevenueCat entitlement id fix (branch `cursor/rc-entitlement-id-fix-7547`) — 2026-07-13

**Trigger**: The live RevenueCat dashboard entitlement identifier is
`GalaxiaMea App Unlimited`, but the merged billing code (#63) checked for
`GalaxiaMea App Pro`, so the post-purchase `entitlements.active[...]` check never
matched.

`[FIXED]` **`RC_ENTITLEMENT_ID` = `"GalaxiaMea App Unlimited"`** in
`apps/web/lib/revenuecat.ts` (was `"GalaxiaMea App Pro"`). Must match the
RevenueCat dashboard entitlement id exactly (case- and space-sensitive). The
paywall imports the constant; no other file hardcodes the string, and the
webhook maps by `event.type` (not the entitlement id), so this is the only
place it lives.
