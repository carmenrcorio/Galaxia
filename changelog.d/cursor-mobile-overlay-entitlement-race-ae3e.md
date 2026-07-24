## Mobile Groups: ungated local overlay on load (branch `cursor/mobile-overlay-entitlement-race-ae3e`) - 2026-07-23

**Trigger**: Mobile auto-built the cohort overlay on saved-group load, but still required `canUseGroups`. `hasAccess` defaults false until the profile refreshes, so a fast tap after app open silently cleared the overlay for a paying user. That is a state race, not a paywall. Web never gated local overlay compute.

`[FIXED]` **Local overlay compute is ungated on mobile.** `loadGroup` builds when `ids.length >= 3`; `buildOverlay` no longer early-returns on `canUseGroups`. Overlay is client-side from charts the user already has.

`[CONFIRMED UNTOUCHED]` **Save gating stays.** `saveGroup` still checks `canUseGroups`. Entitlement banner and Galaxia+ copy unchanged. `isMinorForSafety` untouched on all group surfaces.

`[FIXED]` **vela-chat stale-v10 gap closed.** Live was redeployed past v10 (group cohort context + later framing fixes are on the project). Ongoing: merge-to-main edge deploy + daily source-body parity in GitHub Actions (see `cursor/edge-functions-ci-deploy-1d5a`) so this class of silence cannot recur.
