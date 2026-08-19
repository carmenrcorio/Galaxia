## Marketing landing page: Login button beside Sign Up (branch `cursor/marketing-add-login-button-b629`) — 2026-08-19

**Trigger**: The logged-out landing page only ever offered "Start 14 days free" — a returning visitor had no way back to their account without knowing to type `/login` directly.

`[ADDED]` **"Log in" secondary CTA beside "Start 14 days free" in three places.** Desktop sticky nav (`marketing-nav.tsx`, inside `.app-nav-links`, immediately before the gold pill), the hero's `.hero-actions` row (beside the primary `.btn-primary` button), and the mobile hamburger drawer (plain `.app-nav-drawer-link` row, not the `--gold` modifier, immediately before "Start 14 days free"). All three route to the existing `/login` page — no auth/routing changes, no changes to any of the five existing Sign Up CTAs.

`[DECISION]` **Reused the existing `.pill-link` outline class rather than inventing new CSS** — same class already used for "See full chart" / "Try another chart" on the chart page. In the nav, Login gets the same inline `padding: 9px 18px` override the gold pill already uses, so the two align. In the hero only, added one new modifier class `.hero-login-btn` (`padding: 14px 26px; font-size: .95rem`) so Login matches `.btn-primary`'s footprint exactly — the two hero buttons read as equal-weight primary/secondary pair, not big-button-next-to-small-pill.

`[DECISION]` **Deliberately left Login off the pricing cards and the closing section.** Those are bottom-of-funnel conversion CTAs; a competing "Log in" button there would dilute the ask and there's no existing precedent for an anti-CTA in those sections.

`[OPEN]` **Label inconsistency, not resolved here.** The new buttons say "Log in" (matching the existing text link on `/signup`'s own page: "Already have an account? Log in"). But the `/login` page itself calls itself "Sign in to Galaxia" and its submit button says "Sign in" — so the product has two labels for the same action depending on which page you're on. Went with "Log in" per the approved spec; a future pass should pick one term and use it everywhere (nav, drawer, hero, `/login` heading, `/login` submit button, and the `/signup` cross-link).

Verified at 390px on a live-reloaded dev server: hero's two pills sit side by side with no horizontal overflow (own screenshot, not eyeballed); desktop nav shows Login aligned before Sign Up; mobile drawer shows the plain "Log in" row before the gold "Start 14 days free" row; `/login` navigation confirmed from both nav and drawer.
