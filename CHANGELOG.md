# Galaxia — Changelog & Decision Log

Every meaningful change, decision, and reversal. Newest first. If a decision is not written here, it will be re-litigated or broken.

Format: `[TYPE] Summary` followed by the reason. Types: `DECISION`, `FIXED`, `ADDED`, `CHANGED`, `REVERTED`, `BROKEN`, `OPEN`.

---

## Minor safety backstop: age computed from birth_date now protects every gate, not just a manual checkbox (branch `cursor/fix-minor-safety-backstop-b265`)

**Trigger**: a safety audit found a real 9-year-old (Gabriel, born 2017-04-03) in production with `is_minor = false`. Every minor-safety gate — web/mobile Vela's shared-mode block, the edge function's authoritative shared-mode block, and the parenting-framing flag sent to the LLM — read the raw `people.is_minor` boolean and nothing else. There was no automatic age-based backstop anywhere. This is the product's core safety promise (ENGINEERING.md §9: "No two-way AI chat with a minor").

**Phase 0 — confirmed scope (re-queried production before changing anything)**:
- Every person whose birth date implies age < 18: Camila (age 3), Emilio (age 6), and Carmen Sofia (age 8) were all already correctly flagged `is_minor = true`. **Gabriel (age 9) was the only unprotected minor** — the two adults in the account (Carmen, 38; Hubs, 33) were correctly unflagged. Not a systemic mass-failure; one real, live gap.
- Confirmed 5 total write paths for `is_minor`, all with the same underlying flaw: `/welcome` and `apps/mobile/app/onboarding.tsx` (checkbox/switch that **silently resets to unchecked after every successful "Add"**, so adding several children in one sitting risks forgetting to re-check it for one of them — Gabriel's exact failure mode), `apps/web/components/edit-person-panel.tsx` (checkbox persists correctly, no reset bug), and `apps/web/components/quick-check-modal.tsx` + `apps/web/components/save-to-galaxy-button.tsx` (Quick Check and Quick Chart's "Save to your galaxy" — **hardcoded `is_minor: false` with no minor control in the UI at all**).
- Confirmed no code anywhere derived minor status from `birth_date` — safety was 100% dependent on a human remembering to check a box.

**Phase 1 — the age-based backstop (single source of truth)**: added `isMinorForSafety` / `minPossibleAge` to `packages/core/src/index.ts`. `effective minor = is_minor === true OR computedAge < 18` — the manual flag can only ADD protection, never remove it. Year-only birth data is ambiguous (the real birthday could be any day that year), so per "when uncertain, over-protect," age is computed assuming the *latest* possible birthday (Dec 31) — the youngest possible current age — so someone who could be 17 or 18 is treated as 17. Wired into every gate:
- `apps/web/app/app/vela/page.tsx` and `apps/mobile/app/vela.tsx`: `subjectIsMinor`/`minorInScope` (shared-mode block, parenting reassurance banner, "(minor)" dropdown labels) now call `isMinorForSafety`, never read `is_minor` directly. Both now select `birth_date`/`birth_precision` alongside `is_minor`. Web's dead client-side `buildVelaContext` payload (verified: the edge function ignores client-sent `context` and rebuilds its own from the DB) also had its hardcoded `isMinor: false` corrected for hygiene.
- `supabase/functions/vela-chat/index.ts` — the actual authoritative enforcement point (the client check is belt-and-suspenders UX only) — mirrors the identical `isMinorForSafety`/`minPossibleAge` algorithm inline (edge functions on Deno cannot import the pnpm workspace; same pattern already used for `splitVelaReply`/`computeSynastryScores`). Both the shared-mode block and the `parenting` flag sent to the LLM now use it. Verified byte-for-byte behavioral parity against `packages/core`'s implementation across 9 test vectors before deploying. **Deployed to project `eigfvribtntbxyjutsma` (version 8) via the Supabase MCP `deploy_edge_function` tool** — confirmed live with a smoke-test request (401 "Missing bearer token" — function responds, not crashing).
- `packages/vela/src/index.ts` (`buildVelaContext`) needed no change — verified it is a pure passthrough of whatever `isMinor`/`parenting` booleans its caller computes; the fix belongs upstream, at the callers, which now all use the shared function.
- **Known, pre-existing, out-of-scope gap** (not touched — different bug, not "relying on the raw boolean"): the web/mobile client's group-scope UI does not check any group member's minor status before showing the send button (`subjectIsMinor` is hardcoded `false` for `scope === "group"`). The edge function's server-side block IS authoritative and does check every group member, so a shared-mode message to a group containing a minor is still rejected — this gap is cosmetic (a confusing failed-request UX), not a safety bypass.

**Phase 2 — closed the insert holes**: the age backstop now also runs at every write path, computed from the birth data being saved in that same transaction, so a child is protected the instant they're saved even if the checkbox was left unchecked — not only when a gate later reads the row.
- `apps/web/app/welcome/page.tsx` (`persistPerson`) and `apps/mobile/app/onboarding.tsx` (`persistPerson`): compute `isMinorForSafety({ isMinor, birthDate, birthPrecision })` and persist that instead of the raw checkbox value. Added an honest note under the checkbox/switch: "Galaxia also automatically protects anyone whose birth date shows they're under 18, even if this stays unchecked" — so the reset-after-add behavior (kept, since it's correct for a *new*, different person) no longer implies "unchecked = unprotected."
- `apps/web/components/quick-check-modal.tsx` and `apps/web/components/save-to-galaxy-button.tsx`: replaced hardcoded `is_minor: false` with `isMinorForSafety({ isMinor: false, birthDate, birthPrecision })` computed from the entered birthday — these flows have no minor control at all, so the age backstop is the *only* protection a child saved here gets.
- `apps/web/components/edit-person-panel.tsx`: same write-time computation on save, plus the same honest note under the checkbox.

**Phase 3 — remediated existing data**: `UPDATE people SET is_minor = true WHERE id = '68062aa5-e3e8-49f0-8487-ca999e97fa2c'` (Gabriel) via the Supabase MCP, done immediately so the live account is protected even before this code deploys (the old gates reading the raw boolean are still live in production until Vercel deploys `main`). Re-queried afterward: **zero remaining people with a birth date implying age < 18 and `is_minor = false`** — only the two correctly-unflagged adults remain.

**Test added**: `packages/core/test/minor-safety.test.ts` (new `vitest` setup for `packages/core`, mirroring `packages/astro`'s config) — 15 tests, including the exact regression case (`isMinorForSafety({ isMinor: false, birthDate: "2017-04-03", birthPrecision: "exact" })` → `true`, Gabriel's real data), the manual-flag-only-adds-protection invariant, the year-only over-protect boundary (17/18), and the "turns 18 today" edge case. All pass. Verified the edge function's mirrored implementation produces identical output to `packages/core`'s across 9 vectors before deploying.

**Verified**: `packages/core` typecheck + `vitest run` (15/15 pass); `apps/web` `tsc --noEmit` and `next build` both pass; `apps/mobile` typecheck passes; `packages/astro` (27 tests) and `packages/vela` (4 tests) unaffected and still pass.

## Marketing hero cleanup: removed waitlist email capture + false iOS/Android claim (branch `fix/marketing-hero-cleanup`)

**Trigger**: two conversion-killing hero problems confirmed by screenshot on the live site — a "Notify me" waitlist box competing with the real "Start 14 days free" CTA on an already-launched product, and a "Mobile-first · iOS & Android · private by design" line promising native apps that don't exist.

**Phase 0 — located, no orphaned CSS or JS found (report before editing)**: `apps/web/app/page.tsx`'s marketing landing is a raw HTML string rendered via `dangerouslySetInnerHTML`, not JSX — checked every CSS class involved (`.form`, `.form input`, `.btn`, `.meta`, `.ok`, `.ok.show`) and found **none of them exclusive to the removed elements** — all are shared with things staying on the page: `.form`/`.btn` also style the "Start 14 days free" button's own wrapper; `.meta` also styles the closing section's "Be among the first to map your galaxy" line; `.ok`/`.form input` also style the closing section's own separate, still-intact email capture (`email2`/`ok2`, out of this task's scope — the task explicitly named the *hero's* email box only). **No CSS needed deletion.** The JS handler (`document.querySelectorAll('.btn[data-form]').forEach(...)`) is generic — driven entirely by whatever `data-form` elements exist at load time, with no hardcoded reference to the hero's specific `data-form="1"`. Removing the HTML just means the loop finds one fewer element; nothing errors, nothing is orphaned. **No JS needed changing.**

**Phase 1 — removed**: deleted the hero's entire email-capture block (`<input id="email1">`, the "Notify me" button, and the `<p id="ok1">` success message) and the "Mobile-first · iOS & Android · private by design" line. Left "Start 14 days free" as the hero's single CTA. No new copy added, nothing else in the hero touched.

**Verified**: `tsc --noEmit` and `next build` pass. Live-rendered the page and confirmed via the DOM: zero email-capture elements remain in the hero (`#email1`, `data-form="1"` button, `#ok1` all absent), zero "Mobile-first" text in the hero, exactly one CTA link remains (`"Start 14 days free"`), and the closing section's separate email capture (`#email2`/`#ok2`) is confirmed still present and untouched. Screenshotted at desktop and 320/375/390px — hero flows cleanly straight from the lede paragraph into the single CTA with no leftover gap.

## Mobile content column flush to screen edges — a different bug from the background-layer fix (branch `fix/mobile-content-width`)

**Trigger**: real-iPhone screenshot showing content edge-to-edge with near-zero side margin, the "Galaxia" wordmark touching the left screen edge, at full zoom-out. Explicitly not the `.milkyway`/fixed-background-layer bug from the prior PR — that fix is correct and untouched here.

**Phase 0 — diagnosis, not relying on `scrollWidth`**: walked actual element geometry (`getBoundingClientRect`), not just `document.documentElement.scrollWidth` — the same blind spot that missed the background-layer bug would have missed this one too, since padding differences don't change `scrollWidth` at all.

- **Root cause, confirmed empirically (measured the "Galaxia" link's left edge at exactly `x=0` on a real rendered page)**: `apps/web/components/app-nav.tsx`'s header row is `<div className="container" style={{ ...padding: "10px 0" }}>`. `.container` (globals.css) sets `padding: 0 32px` (`0 22px` below 640px) for its horizontal gutter — but the inline `padding` **shorthand** on the same element overrides all four sides at once, silently zeroing the horizontal padding the CSS class was providing. This was a self-inflicted regression from the prior in-app-nav mobile fix (branch `fix/app-nav-mobile`), which added this inline padding for the drawer's vertical spacing without realizing it also killed the class's horizontal padding.
- The mobile drawer (`.app-nav-drawer` in globals.css, applied alongside `.container` on the same element) had the **identical bug via a different mechanism**: a CSS class's own `padding: 4px 0 16px` shorthand, defined later in the stylesheet than `.container`, wins for the whole property at equal specificity — same result, zeroed horizontal padding, drawer links flush to the edges when opened.
- **This turned out to be a systemic pattern, not a one-off**: grepped every `className="container"` usage in `apps/web` and found the *same* shorthand-padding-on-a-`.container`-element mistake repeated across **14 more files** — `/privacy`, `/terms`, `/login`, `/signup`, `/download`, `/r/[slug]`, `/invite/[token]` (all 3 branches), `/account`, `/account/data`, `/account/cancel`, `/account/subscription`, `/subscribe`, `components/trial-banner.tsx`, and `components/quick-chart-shell.tsx` (the shell used by the public `/chart` and `/chart/compare` acquisition pages — confirmed their main content, not just header/footer, had this exact bug). All of these predate this branch; this wasn't only a nav-fix regression.
- `.app-content` (the per-page content column on `/app/*`) was **not** overflowing anywhere — its `width: min(860px, 94vw)` + `margin: 0 auto` produces a real, if thin (~10px at 320px wide), gutter via implicit centering rather than explicit padding. Not a bug, but not "comfortable" either.
- **Confirmed**: zero horizontal overflow (`scrollWidth === clientWidth`) on every route tested at every viewport, both before and after this fix — this specific class of bug (padding, not overflow) was never going to show up in a `scrollWidth` check, consistent with the prior background-layer bug's same blind spot.

**Phase 1 — fix**:

- **[FIXED]** Every file above: replaced the shorthand inline/CSS `padding: "Xpx 0"` (or `"Xpx 0 Ypx"`) with explicit `paddingTop`/`paddingBottom` (longhand) only — leaves `.container`'s horizontal padding entirely alone, since longhand properties don't touch sides they don't name.
- **[ADDED]** `.app-content`'s mobile media query (`@media (max-width: 600px)`, globals.css) now sets `width: 100%` and an explicit `padding: 20px 16px 80px` instead of relying solely on the shrinking `94vw`-based implicit margin — gives every phone the same predictable, comfortable 16px gutter regardless of exact viewport width, rather than ~10px on the smallest ones.
- **[CLEANED UP]** `apps/web/app/app/settings/page.tsx` used `className="container app-content"` (redundant double class, not itself a mobile bug — confirmed the mobile media query still applied correctly — but a real cascade oddity on desktop). Dropped `container`, matching every other `/app/*` page's `className="app-content"` alone.
- The natal wheel (`ChartWheel`) was not touched — already correctly responsive, confirmed unaffected.

**Verified**: `tsc --noEmit` and `next build` pass. Re-tested all 17 public and authenticated routes at 320/375/390px after the fix (51 checks): zero horizontal overflow anywhere, and every page with a nav bar now measures the brand link's left edge at the correct `~22px` gutter (matching `.container`'s CSS) instead of `0`. Screenshots confirm comfortable, consistent margins on `/app/person/[id]` and `/chart` specifically. All test data deleted after verification.

**This is the content-column fix, separate from the prior `.milkyway`/fixed-background-layer fix** (branch `fix/mobile-overflow-and-starfield-speed`) — that fix addressed a decorative layer escaping its container; this fix addresses the actual content column's own padding being silently zeroed by inline-style/CSS-class shorthand collisions. Neither fix redoes or depends on the other.

## Shared-space user-connect entry point removed, feature deferred to v2 (branch `chore/remove-shared-space-button`)

**Trigger**: the "shared space" / user-to-user connect feature is deferred to v2; asked to remove its entry-point button so users don't hit a dead or incomplete path.

**Phase 0 — diagnosis, reported before changing anything**: **no such button exists in the shipped UI, on web or mobile.** Searched exhaustively:
- `apps/web/components/ask-birth-data.tsx` — the only code anywhere that inserts an `invites` row — hardcodes `kind: "birth_data"` unconditionally. That's a different, fully-built, working feature ("Ask {name} for their birth details"), not user-to-user connect.
- A direct grep for `invite`/`Invite` across the entire authenticated app surface (`apps/web/app/app/*`) returned zero matches.
- Confirmed live: **zero `invites` rows of any kind exist in the production database** — not even a legacy `shared_space` one.
- The only user-facing surface tied to the deferred feature was a **passive fallback render branch** in `apps/web/app/invite/[token]/page.tsx` (the `else` case when `invite.kind !== "birth_data"`) — unreachable through any current flow, since nothing creates a link that would land there. It previously claimed "Open this invite in the mobile app to continue," which was false — mobile has no handler for it either.
- **[CONFIRMED UNTOUCHED]** Vela's existing "Shared space" mode toggle (`apps/web/app/app/vela/page.tsx`, mirrored in `apps/mobile/app/vela.tsx`) is a completely separate, working, safety-gated feature (two people co-present in a Vela chat thread, with a consent gate and minor-blocking) — not what's deferred. Verified via `git diff` after the fix: zero changes to that file, `apps/mobile/app/vela.tsx`, or `supabase/functions/vela-chat/index.ts`.

**Phase 1 — fix**: since there was no button to remove, fixed the one dead-end surface instead. `apps/web/app/invite/[token]/page.tsx`'s non-`birth_data` fallback now says plainly "This invite isn't ready yet ... that feature is still being built," instead of falsely claiming a working path exists. Removed the now-unused `SmartAppBanner`/`deepLink` usage that only existed for that branch.

**Recommendation on the orphaned stub**: keep `/invite/[token]/page.tsx` and its fallback branch — the route is shared with the fully-working `birth_data` invite flow, so the file can't be deleted, and the fallback branch is still the correct place to handle a `kind` the type system permits even though nothing generates it today. `apps/web/components/smart-app-banner.tsx` is now unused anywhere in the app (it was generic, not deferred-feature-specific) — recommend leaving it in place rather than deleting, since it's a reusable "get the app" primitive that could be picked up elsewhere (e.g. `/download`, `/account`) rather than dead code tied to this feature specifically.

**Verified**: `tsc --noEmit` and `next build` pass. `git diff --stat` confirms exactly one file changed.

## Quick Chart: optional time/location + mode selection + honest romantic/platonic (branch `feat/quick-chart-modes`)

**Phase 0 — diagnosis (verdict reported before building anything)**:

- **Verdict (b): the engine could support honest romantic/platonic differentiation with a scoped change.** `computeSynastry(a, b)` takes no relationship-type parameter at all — it always returns the full `aspects[]` (every body-pair cross-aspect), `houseOverlays`, and the same 6 scores, regardless of framing. Any differentiation has to happen in the interpretation layer.
- The existing "relationship-type-aware synastry" (`lib/compare-guidance.ts`'s `whatTheyNeed()`, shared by `/app/compare` and `/chart/compare`) is real but shallow: of its 5 `RelationType` values, only `partners` and `parent-child` ever produce differentiated text — one conditional sentence each (`partners` only when score ≥70; `parent-child` always, one fixed sentence). `siblings`/`friends`/`ancestor` produce **zero** differentiated content — fully generic, identical to each other.
- "Romantic"/"platonic" don't map cleanly onto that machinery — there's no "platonic" analog with any real content today. **But** the raw data for an honest differentiation already exists in `SynastryResult.aspects`: every Venus-Mars, Sun-Moon, Mercury-Moon cross-aspect is already computed, and none of those bodies need houses or exact birth time — they work from date-only or even year-only precision. So a genuine, scoped, non-fabricating change is buildable: reorder/prioritize which already-true aspects surface, and which already-existing need-line gets shown, by focus.
- `/app/compare`'s existing 5-value picker is untouched, out of scope, not regressed.

**Phase 1 — birth time/location genuinely optional**:

- Confirmed via `buildBirthInput`/`lib/birth.ts` (pre-existing, unchanged): `date`/`year` precision already omit time and location with zero error — `lat`/`lng` are parsed as `undefined` when blank, never required. Only `exact` precision requires a resolved timezone (from a city), because a local time is meaningless without one — that's a real astronomical necessity, not a bug, and it fails with a clear, honest error rather than silently guessing (pre-existing `BUG C` fix).
- **[ADDED]** `components/birth-fields.tsx`: a clarifying note above the precision tiers — "Birth time and city are optional. Pick whatever you actually know — every tier below produces a real chart; more detail just unlocks more of it." Shared by `/welcome`, `/chart`, `/chart/compare`, the edit-person panel, and the invite-birth-data form.
- **Verified live**, hitting `/api/quick-chart` and `/api/quick-compare` directly: year-only and date-only with zero time/location both return `200` with the correctly hedged chart (Sun sign per precision rules, no Ascendant/cusps); a date-only pair produces a real synastry result with no error; a year-only pair correctly returns `synastry: null` (honest generational-only, never fabricated orbs); `exact` precision with no location correctly returns `400` with the existing clear error, never a silent wrong guess.

**Phase 2 — mode selection**:

- **[ADDED]** `/chart`: a "What do you want to see?" mode selector — `Single chart` (current page, stays) / `Check compatibility` (routes to `/chart/compare`). Styled with the same pill-button pattern `/app/compare`'s relationship-type picker already uses.
- **[ADDED]** `/chart/compare`: the mirror mode selector, with `Check compatibility` shown active and a `Single chart` link back to `/chart`.
- **[REMOVED]** `/chart/compare`'s old 5-value "Relationship type" picker (`partners`/`siblings`/`friends`/`parent-child`/`ancestor`) — replaced by the 2-value Romantic/Platonic picker described below. `/app/compare`'s own 5-value picker is untouched.
- Verified: clicking "Check compatibility" on `/chart` navigates to `/chart/compare` and shows Romantic/Platonic (confirmed present) with no trace of the old 5-value list (confirmed absent); clicking "Single chart" on `/chart/compare` navigates back to `/chart`, which shows no romantic/platonic language anywhere — the choice never appears outside compatibility mode.

**Phase 3 — wiring romantic/platonic per the Phase 0 (b) verdict**:

- **[ADDED]** `lib/compare-guidance.ts`: `"romantic"` and `"platonic"` are new `RelationType` values (not a parallel system) and a new exported `sortAspectsForFocus(aspects, focus)` that reorders a real, already-computed aspect list so the domain-relevant ones surface first — romantic prioritizes Venus/Mars/Sun-Moon; platonic prioritizes Mercury/Moon/Jupiter. Never adds, removes, or alters an aspect — only changes presentation order of real data.
- **[ADDED]** `whatTheyNeed()`: romantic keeps the existing Venus "how they feel loved" line (Venus is genuinely the attraction-relevant body). Platonic skips that line (a romantic frame doesn't fit a friendship reading) and instead surfaces a real Mercury-domain aspect from the same computed data when one exists among the tightest 3, or a generic communication-emphasis line when the communication score is low and no such aspect exists — never invented, never shown without real grounding.
- `/chart/compare` shows a one-line note above "Where it flows and catches" naming which domain is being prioritized, so the framing is transparent, not implicit.
- **Verified with a real two-chart synastry result** (not a mock): confirmed romantic and platonic produce genuinely different `whatTheyNeed()` text for the same two charts (Venus love-language line vs. Mercury communication line), and genuinely different aspect ordering (a real `mercury-mars square` aspect sorts to position 1 under platonic, position 4 under romantic, for the identical input data) — differentiation is real and data-driven, not cosmetic.

**Verified**: `tsc --noEmit`, `next build`, and the `packages/astro` test suite (27/27) all pass. Full end-to-end browser run: filled both people with date-only precision (no time/location), selected Platonic, ran the comparison, confirmed the platonic framing and aspect reordering rendered correctly with zero errors; repeated for Romantic, confirmed distinctly different output for the same inputs.

## Mobile page-width overflow + starfield twinkle speed (branch `fix/mobile-overflow-and-starfield-speed`)

**Trigger**: real-phone report of two issues: (A) pages render too wide, forcing pinch-zoom, with the natal chart specifically "too small to read" after zooming out; (B) starfield stars blink too fast on both web and mobile. (A) explicitly contradicted a prior headless audit that measured zero `scrollWidth` overflow at 375px — the report asked to reconcile that, not dismiss the human's report.

**Phase 0 — diagnosis, read-only, reported before any change**:

- Walked the full DOM (not excluding any `position` value this time, unlike the prior audit's overflow-detector) across `/app/person/[id]` at all three birth precisions (exact/date/year) and `/chart`, at 320/375/390px. **The only element wider than the viewport, on every single page/precision/viewport combination, was `.milkyway`** in `components/cosmic-background.tsx` — computed width exactly 1.4× the viewport every time (448px @320, 525px @375, 546px @390), from `inset:-20% -20% auto -20%`.
- Root cause: `.milkyway` (and its four siblings — `.aura`, `#stars` canvas, `.grain`, `.vignette`) were each **independently `position:fixed`**, nested inside a wrapper that was *also* `position:fixed` with no `overflow` set. `overflow:hidden` on a `position:fixed` ancestor does not clip `position:fixed` descendants — they escape to the viewport/initial containing block directly, bypassing any ancestor's containment entirely. That's the specific reason this never registers in a `scrollWidth`-based check: `position:fixed` elements don't contribute to `document.documentElement.scrollWidth` regardless of how far they visually extend, by spec — confirmed empirically (`scrollWidth === clientWidth` identically before *and* after fixing the positioning, since that metric was never sensitive to this class of element to begin with). This is exactly why the prior headless audit's methodology structurally could not have caught it.
- **[OPEN]** I could not literally reproduce the reported "forced pinch-zoom" behavior in headless desktop Chromium — that's a real mobile rendering engine's viewport-sizing computation, which a custom-sized headless Chromium viewport doesn't replicate. Flagging this rather than fabricating an on-device confirmation I don't have. What I *can* confirm: `.milkyway`'s exact architecture (`position:fixed` + `transform` + oversized-via-negative-inset, with zero actual containment) is a well-documented category of mobile-WebKit viewport-computation risk, present identically on every route using `CosmicBackground` — `/app/*`, `/welcome`, `/account`, `/subscribe`, `/chart`, `/chart/compare` — plus the marketing landing's own separately-authored duplicate of the same five layers.
- Ruled out, with evidence: long `display_name`/`birth_place` text (tested explicitly at 320px — zero overflow); fixed px widths or literal `min-width` anywhere in `person/[id]/page.tsx` or `chart-wheel.tsx` (read exhaustively — nothing exceeds ~240px); tables/pre/code blocks (none exist on these pages). `ChartWheel` itself remains correctly responsive — re-verified: `viewBox` + `width:100%`, no fixed `height` attribute, renders at exactly its container's width at every tested size (250.8px @320px viewport, matching `.app-content`'s `min(860px,94vw)` minus card padding).
- **A second, separate, genuinely `scrollWidth`-visible bug was found and confirmed visually while re-testing at 320px**: the marketing landing's "How it works" mock cards (`.chips` row, and the shared `.step` grid) overflowed by 51px at exactly 320px (not 375/390) — visibly cutting off the third "RISING · Cancer" chip and wrapping headline/paragraph text past the screen edge. Root cause: CSS Grid's default `min-width:auto` on grid items, cascading through `.steps` → `.step` → `.mock`/`.step-text` — none of them would shrink below their own content's natural minimum, independent of which specific mock was inside. Confirmed pre-existing on `main` before any of today's changes (verified by stashing and re-testing against the unmodified baseline).

**Phase 1 — fixes**:

- **[FIXED]** `components/cosmic-background.tsx`: added `overflow:"hidden"` to the root wrapper and changed all five children from `position:"fixed"` to `position:"absolute"`. Since the wrapper is already `position:fixed;inset:0` (i.e. already pinned to and exactly sized to the viewport at all times), this is pixel-identical visually while making the containment actually real — nothing inside can be measured wider than the viewport on any browser, regardless of any specific engine's fixed+transform quirks.
- **[FIXED]** `apps/web/app/page.tsx` (marketing landing): the CSS already defined a `.sky` wrapper class (`position:fixed;inset:0;z-index:0`) that was **never actually used to wrap anything in the markup** — an orphaned rule, strongly suggesting this was the original intent before a regression dropped the wrapping element. Added `overflow:hidden` to `.sky`, wrapped the five decorative elements in a `<div class="sky">` in the markup, and changed each from `position:fixed` to `position:absolute` — the same fix as the React component, for the same reason.
- **[FIXED]** `apps/web/app/page.tsx`: added `min-width:0` to `.chip` (flex item), and to `.step` and `.step-text`/`.mock` (grid items) — breaks the default-auto-minimum cascade. Verified: 320px overflow eliminated (`scrollWidth` now equals `clientWidth`), the "RISING · Cancer" chip and all body text now wrap correctly within the viewport, and the desktop two-column layout above the 780px breakpoint is pixel-identical to before (re-verified at 1280px: `.step` width 1116px, matching `.wrap`'s expected content box exactly).

**Phase 2 — starfield twinkle speed**:

- **[FIXED]** Both starfield implementations — `components/cosmic-background.tsx` (in-app/`/chart`/`/welcome`/`/account`/`/subscribe`) and the marketing landing's separate embedded script — had per-star twinkle speed `Math.random()*0.02 + 0.004`, a full pulse every ~2–13 seconds per star, reported as a fast flicker across many stars at once. Slowed ~5x to `Math.random()*0.004 + 0.0008` (~10–65s per pulse) — a gentle shimmer.
- **[OPEN, not fabricated]** Both implementations already honored `prefers-reduced-motion` before this change (confirmed by reading the code: the twinkle increment and the animation loop are both skipped entirely, drawing one static frame instead). Not claiming to have "added" reduced-motion support that already existed — only the speed constant changed.

**Verification**: `tsc --noEmit` and `next build` pass. Full DOM-walk overflow check re-run across `/app/person/[id]` (all three precisions), `/chart`, and `/` at 320/375/390px after every fix: zero overflow everywhere. Marketing "How it works" section re-screenshotted at 320px (fixed, no more cutoff) and 1280px (unchanged). All test accounts/people/charts created for this verification deleted afterward; confirmed zero rows remain.

## In-app nav: real mobile menu, no more overflow (branch `fix/app-nav-mobile`)

**Trigger**: a mobile-friendliness audit found this was the worst break in the app. `apps/web/app/app/layout.tsx`'s nav put 6 links + the Account pill in one flex row with a hardcoded `height:64`. Below ~860px those 7 items couldn't fit one line; the only escape valve (`flexWrap:wrap` on the inner group) wrapped them into 2–3 rows that didn't fit the fixed-height box, spilling both above and below it — pushing "Home"/"Compare"/"Groups" off the top of the viewport (unreachable, not merely scrolled away) and rendering the gold "Account" pill directly on top of `TrialBanner`'s text underneath, with zero clearance between the two. Every link was also a bare 23px-tall text node with no padding. This affected all 6 routes sharing the layout: `/app`, `/app/compare`, `/app/groups`, `/app/person/[id]`, `/app/settings`, `/app/vela` — confirmed no others use it.

**Phase 1 — real responsive nav, not a fixed-height patch**:

- **[ADDED]** `apps/web/components/app-nav.tsx` — the nav extracted into its own client component (`"use client"`, needed for the drawer's open/close state). Below the breakpoint, the header row now holds only the brand and a hamburger trigger — nothing left to wrap, so nothing can spill out of a fixed-height box. The 6 links + Account move into a drawer rendered in normal document flow directly under the header, inside the same `position: sticky` `<nav>`; opening it grows the nav and pushes `TrialBanner`/page content down instead of overlapping them, because there is no fixed height anywhere left to overflow.
- **[FIXED]** Removed the `height: 64` constraint entirely; the header row uses `minHeight: 64` instead, which only ever holds 2 items on mobile (brand + trigger) so it can never wrap.
- **[FIXED]** Tap targets: the hamburger trigger is 44×44px; every drawer link is a full-width row with `min-height: 48px` and real padding — a button-shaped tappable row, not bare text. (Desktop links are deliberately left as the existing bare-text style — see below.)
- **[ADDED]** `globals.css`: `.app-nav-links`/`.app-nav-trigger-btn`/`.app-nav-drawer`/`.app-nav-drawer-link` rules, gated on `@media (max-width: 860px)` — the same breakpoint the marketing nav already uses, for consistency.
- Drawer closes automatically on route change (`usePathname` effect) and on Escape; never left open across a navigation.
- **Desktop unchanged**: above 860px the same inline links row and gold Account pill render with identical styling to before — verified pixel-identical link positions/sizes via the same measurement script used to diagnose the bug.
- **Reusable primitive**: `AppNav` is now a standalone component, but the marketing nav (`apps/web/app/page.tsx`) is raw HTML in a JS string, not JSX — it can't import this directly without first being ported to JSX, which is out of scope here. Noting the seam rather than doing that port.

**Verification**: `tsc --noEmit` and `next build` pass. Live-verified against a real signed-up-and-confirmed test account at 320/375/390px: zero horizontal overflow before or after opening the drawer; all 6 links + Account visible, each a full-width 48px-tall row, sequential with no overlap; hamburger trigger measured 44×44px exactly; drawer confirmed closed after clicking a link and navigating. Desktop re-verified at 1280px: all 7 items render in the original single row, same positions/sizes as pre-fix measurements, hamburger trigger confirmed hidden (`display:none`). All test data deleted after verification.

## Subscribe page no longer claims a trial ended when it hasn't (branch `fix/subscribe-trial-status-claim`)

**Trigger**: `components/paywall.tsx` rendered the eyebrow "YOUR TRIAL HAS ENDED" unconditionally — a hardcoded string, not derived from any prop, state, or query. Verified on a fresh account with 14 real days remaining (`trial_ends_at` 2026-07-24): the page still claimed the trial had ended. Same class of bug ENGINEERING.md §12 exists to prevent, on the exact page where a user decides whether to pay.

**Phase 0 — diagnosis**:
- Confirmed `<p className="eyebrow">YOUR TRIAL HAS ENDED</p>` (was line 74) was a literal string; `Paywall` only ever received `foundingRemaining` as a prop — no subscription data reached it at all.
- `subscription_status`/`trial_ends_at` live on `profiles`, already read elsewhere (`TrialBanner`, `/account`, `middleware.ts`) via `@galaxia/core`'s `hasAccess`/`trialDaysRemaining`, but never fetched by `/subscribe/page.tsx` or passed to `Paywall`.
- Real states that reach this page: `trialing` (with real days left, or expired/missing `trial_ends_at`), `active`, `lifetime`, `canceled`, `past_due`, and — briefly, for a just-created account — no profile row at all. The design spec (`galaxia-pricing-copy.md` §1) only ever describes this page as "shown at trial end," but middleware redirects `canceled`/`past_due`/expired-`trialing` users here alike, and nothing stops an `active`/`lifetime` user or a mid-trial user from navigating here directly (`/account`'s own "Subscribe" pill is correctly gated by status, but the page itself had no such gate).

**Phase 1 — copy now derived from real state**, via a new pure function `deriveHeaderCopy(subscriptionStatus, trialEndsAt)` in `paywall.tsx` (exported for direct verification):
- **[FIXED]** `trialing` + real days left → `"N DAYS LEFT IN YOUR TRIAL"`, honest, never "ended."
- **[FIXED]** `trialing` + expired or missing `trial_ends_at` → the original approved `"YOUR TRIAL HAS ENDED"` copy — now the only state it renders for.
- **[ADDED]** `canceled` / `past_due` → new copy, `"PICK UP WHERE YOU LEFT OFF"` — these users were subscribers, not trial users; calling it a trial ending would be a second, different false claim. Body text reused verbatim (it never mentioned "trial" to begin with).
- **[ADDED]** `active` / `lifetime` → new copy, `"YOUR PLAN"` / "You're already in." — the entire checkout section (price cards, plan buttons, cancel/charge reassurance) is now hidden for these two statuses, replaced with a single "Manage my subscription" link to `/account`. Also hides the founding-member upsell specifically for `lifetime` (already a lifetime member).
- **[FIXED]** Missing/unrecognized status (e.g. a brand-new account whose `handle_new_user` trigger row hasn't landed yet) → no eyebrow at all, neutral body ("Nothing here is locked. This is the whole product.") — asserts nothing, per the explicit "say nothing rather than assert" rule.
- `apps/web/app/subscribe/page.tsx` now fetches `subscription_status, trial_ends_at` from `profiles` server-side (alongside the existing founding-count query) and passes them to `Paywall` as props.

**Verification**: `tsc --noEmit` and `next build` pass. Live-verified against a real database round trip: created a fresh confirmed test account, confirmed its trigger-created profile row was `subscription_status: 'trialing'`, `trial_ends_at` 14 days out (the exact reported scenario) — then ran the real, exported `deriveHeaderCopy` against that value and all other real statuses (`active`, `lifetime`, `canceled`, `past_due`, expired-trialing, missing-trialing, unknown). Fresh 14-day trial now returns `"14 DAYS LEFT IN YOUR TRIAL"`, never `"YOUR TRIAL HAS ENDED"`. Full interactive browser confirmation of the rendered page was blocked by an unrelated Supabase Auth 500 on a manually-inserted test user (a GoTrue quirk with directly-inserted `auth.users`/`auth.identities` rows, not a fix bug); noting this rather than silently skipping it. All test data (user, identity, profile) deleted after verification.

## Quick Chart nav entry points (branch `feat/quick-chart-nav-link`)

**Trigger**: Quick Chart (`/chart`, `/chart/compare`) shipped as a public acquisition tool but had no link from anywhere in the product — an acquisition funnel with no front door.

- **[ADDED]** Marketing landing nav (`apps/web/app/page.tsx`, the raw HTML/CSS string injected via `dangerouslySetInnerHTML`): a plain `Quick Chart` link to `/chart`, placed between "Pricing" and the gold "Start 14 days free" CTA. Styled identically to the other `.nav-links a` items (no new CSS); inherits the existing `@media(max-width:860px){.nav-links a:not(.nav-cta){display:none}}` rule automatically, so mobile behavior matches "Pricing" and every other non-CTA link exactly — hidden below 860px along with the rest, leaving only the gold CTA. No hamburger/drawer exists on this nav to update.
- **[ADDED]** In-app nav (`apps/web/app/app/layout.tsx`): a `Quick Chart` `NavLink` to `/chart`, after "Settings" and before the gold "Account" pill. Same `NavLink` component as every other in-app nav item; the container already wraps via `flexWrap: "wrap"` on narrow viewports, so this item wraps the same way — no separate mobile-menu logic exists here either.
- `/chart` is a public route; neither link needed or received an auth guard.
- **Left untouched, confirmed intact**: the floating "✦ Quick check" launcher (`apps/web/components/quick-check-modal.tsx`'s `QuickCheckLauncher`, rendered only on `/app`'s Home). It's a `position: fixed` button that opens a fast in-app compatibility modal — a different job from the new nav links, which open the full public `/chart` experience. Not removed, not restyled, not repositioned.
- Typecheck and production build clean; grepped the build output to confirm both "Quick Chart" strings survived into the compiled bundles for `/` and `/app/*`.

## Enforce single self (branch `fix/enforce-single-self`)

**Trigger**: QA audit reported multiple `is_self` person records on one account (a real "Carmen" plus three junk "TestSelfDup" rows), causing Home's constellation center node to be labeled with a junk record while linking to the real profile, and `/welcome` to name the wrong record.

**Phase 0 — diagnosis (reported before any change)**: `people.is_self` (boolean) plus `people.relation` (text, can independently equal `'self'`) both represent "self"; ownership is `people.owner_id → auth.users(id)`.

- **[OPEN]** Queried the live database (`is_self=true`, `relation='self'`, `display_name ILIKE '%testselfdup%'`, combined, no owner filter) and grepped the full repo + git history for the literal string `TestSelfDup`. Found **zero** matches anywhere — only one self-flagged row exists (Carmen). Confirmed only one Supabase project is reachable (`eigfvribtntbxyjutsma`, the documented sole backend), so this isn't a wrong-project miss. Reporting this rather than fabricating a cleanup of records that don't exist in the environment available to this agent. Phase 1 (data cleanup) is therefore a no-op — nothing found to remove or demote.
- **[FIXED]** `/welcome`'s duplicate-self guard did query the database (not pure local state, contra the QA hypothesis) — but only once, on mount, into React state. That's a point-in-time check, not a constraint: a second tab, a slow reload, or a retried request could still race past it.
- **[BROKEN → FIXED]** `apps/mobile/app/onboarding.tsx`'s `saveSelf` had **no guard at all** — a second, independent code path with zero protection against creating a duplicate self. This is the real reason a client-side guard in one file was never going to be enough.
- **[FIXED]** Home (`apps/web/app/app/page.tsx`) selected self via `people.find(p => p.is_self)` after loading `people` ordered by `created_at ascending` — the *oldest* self-flagged row, an arbitrary tie-breaker if duplicates exist. Separately, the canvas draw loop forced *every* `is_self` row to the exact same center coordinates and painted labels in array order, so with duplicates the *last*-drawn label (not necessarily the one `.find()` picked for the "My chart" link) would visually win — a second, independent bug explaining the exact "labeled X, links to Y" symptom reported.

**Phase 2 — structural enforcement**:

- **[ADDED]** Migration `20260710213000_enforce_single_self.sql`: partial unique index `people_one_self_per_owner on people (owner_id) WHERE is_self = true`. Applied cleanly (no duplicates existed to violate it). Verified live with a rolled-back transaction that attempted a second self insert for the same owner — rejected with `23505 duplicate key value violates unique constraint "people_one_self_per_owner"`.
- **[FIXED]** `apps/web/app/welcome/page.tsx` `saveSelf`: re-checks the database immediately before inserting (closes the race a mount-only check left open), and catches a `people_one_self_per_owner` violation gracefully (never a raw Postgres error, never a false "saved") in case of a genuine concurrent race.
- **[FIXED]** `apps/mobile/app/onboarding.tsx`: added the identical database re-check before insert, the identical unique-violation handling, and an "already in your sky" panel (mirroring web) that replaces the create-self form when a self exists — this screen previously always showed the create form regardless.
- **[FIXED]** `apps/web/app/app/page.tsx`: removed a dead, unused `selfIdx` lookup; documented that `selfPerson = people.find(p => p.is_self)` is now safe by construction (the unique index makes "more than one to find" impossible), not by ordering luck.
- **[FIXED]** Removed now-pointless `order("created_at", ...).limit(1)` tie-breakers on single-self lookups in `apps/web/app/app/person/[id]/page.tsx`, `apps/web/components/quick-check-modal.tsx`, `apps/web/app/chart/compare/page.tsx`, and `apps/mobile/app/profile/[personId].tsx` — replaced with plain `.maybeSingle()`/`.single()`, since there is structurally nothing left to break the tie on.
- Typecheck (web + mobile) clean. Web production build passes. `packages/astro` test suite (27 tests) unaffected and green.

## 2026-07-10 (Vela fabrication purge — QA audit response)

QA flagged 3 stored "Record" entries asserting zodiac placements contradicting the computed chart (Riley Nguyen: confident "Cancer Sun" on a year-only, minor profile; Carmen: "Scorpio Moon under a Pisces Sun" ×2, real chart is Capricorn Sun / Taurus Moon). Diagnosed before any fix, per instructions.

**Phase 0 — diagnosis (correcting the premise first).** "The Record" is not one table: `lib/record.ts` unions `notes` (pinned/saved entries) with live previews pulled from `threads`+`messages`. **All three flagged fabrications, and two more found below, live in `messages` as ordinary Vela chat replies — zero `notes`/`vela_pin` rows anywhere in the database match any of the fabricated text.** This changed where Phase 2's remediation needed to point.

Exact timestamps: Riley's message — `2026-07-09 01:30:34 UTC`. Carmen's two — `2026-07-09 00:04:46` and `01:04:29 UTC`. The fix commit (`410beb8`, "Phase 0: real Placidus…fabrication audit") introduced `engine_version 2`, per-placement `confident`/`possibleSigns` flags, and the Vela edge function's `confident === false` hedging check — the only commit in history that does. Both flagged people's `charts` rows already show this exact post-fix shape at `computed_at` **2026-07-08 18:29–18:31 UTC**, ~29 hours before `410beb8`'s git author timestamp. I'm flagging that inconsistency rather than hiding it: I treated the live database's internal clock as authoritative (one continuous external clock) over cross-referencing sandbox git timestamps, corroborated by structural evidence (only post-fix code produces these fields at all).

**The context-builder question, answered precisely, verified against the LIVE deployed function (not just git):**
- **Riley's mechanism — a real, now-closed hole.** The pre-fix edge function (`git show 5a2e898`) did `placements.find(p => p.body === body)?.sign ?? "Unknown"` with **no confidence check** — it would hand the model `"sun": "Cancer"` (the stored mid-year-sampling fallback for her year-only birth) as if it were fact. Smoking-gun corroboration: her fabricated message says "Riley's Cancer Sun" — an exact match to that fallback value, not a plausible independent guess. Pulled the **currently active deployed function** via `get_edge_function` (version 7) and confirmed byte-for-byte it now sends `"Uncertain — birth year only"` instead. **This hole is closed. Per the stated gating rule, Phase 1 is skipped for this mechanism — no fix invented for a bug that's already fixed.**
- **Carmen's mechanism — not a context-builder hole.** Her chart has been correct (`confident: true` Capricorn Sun / Taurus Moon) continuously since creation; no duplicate self-profile, no stale row, nothing upstream was ever wrong. Vela was given the correct chart and asserted a different one anyway, on the first-ever message about her. **Phase 1 as scoped ("Vela can still be handed a concrete sign the data cannot support") does not apply — the data always supported the correct sign.** Noted, not silently fixed: the Anthropic call sets no `temperature` (defaults to 1.0) — a real, currently-live, separate gap I'm flagging for your decision rather than folding into this fix.

**Phase 2.2 — full-table detection pass (not just the 3 examples given).** Wrote `scripts/detect-vela-fabrications.mjs`: regex-extracts Sun/Moon/Rising-sign assertions from every `messages` (sender='vela') and `notes` row, cross-checks against the scoped person's(s') computed chart, flags when no scoped person confidently matches. Ran the equivalent query live via SQL (Postgres word-boundary syntax differs from JS: `\y`, not `\b` — caught and fixed after an initial silent zero-match). **Result: 5 distinct fabricated messages, not 3** — the detector caught two previously unreported fabrications about a third person, **Jamie Chen** (`e81c7dad…`, `2026-07-08 23:56:02 UTC`, pair thread with Morgan Lee: "her Cancer sun"; `11b84fb9…`, `2026-07-09 01:28:17 UTC`, solo thread: "Jamie's Sun in Cancer"). Real computed Sun for Jamie: Leo, confident. Zero fabrications found in `notes`.

| # | table | id | person | minor | created_at | asserted | computed |
|---|---|---|---|---|---|---|---|
| 1 | messages | `92b33191…` | Carmen | no | 07-09 00:04:46 | Sun=Pisces, Moon=Scorpio | Sun=Capricorn, Moon=Taurus (confident) |
| 2 | messages | `1294c8a5…` | Carmen | no | 07-09 01:04:29 | Sun=Pisces, Moon=Scorpio | Sun=Capricorn, Moon=Taurus (confident) |
| 3 | messages | `e4b596b4…` | Riley Nguyen | **yes** | 07-09 01:30:34 | Sun=Cancer (asserted as fact) | Sun unconfident — year-only, cannot support a concrete sign |
| 4 | messages | `9905e813…` | Jamie Chen | no | 07-08 23:56:02 | Sun=Cancer | Sun=Leo (confident) |
| 5 | messages | `e9298be5…` | Jamie Chen | no | 07-09 01:28:17 | Sun=Cancer | Sun=Leo (confident) |

All 5 predate the fix window. 4 of 5 (everyone except Riley) are the "correct data, wrong assertion anyway" class — the dominant failure mode here, not the minority case.

**Phase 2.1 — migration** (`20260710210000_withdrawn_entries.sql`, applied): nullable `withdrawn_at timestamptz` + `withdrawn_reason text` on **both** `messages` (where today's real fabrications live) and `notes` (where `vela_pin` is a live path for the same failure, even though none has hit it yet). No data loss.

**Phase 2.3 — marked, not deleted.** All 5 rows above: `withdrawn_at` set, `withdrawn_reason` states the asserted-vs-computed mismatch plainly, **original `body` untouched** — the audit trail survives, which matters given entry #3 is on a minor's profile. Verified the later, *correct* Riley thread (`84bf2d36…`, 2026-07-10, "without a precise birth time or known Sun sign for Riley, I can't point to a specific placement") was left alone. Added `scripts/mark-vela-fabrications-withdrawn.mjs`, a separate, explicit, id-list-driven marking script — it never decides what's a fabrication on its own.

**UI**: a withdrawn message renders as a quiet muted/italic note ("This note referenced inaccurate chart data and has been withdrawn," or the specific stored reason) in place of its content — in the Vela chat thread itself, in the person page's Record timeline, in the "Vela on {name}" pinned-insights module, and in "Past conversations." Never silently dropped from any list. `lib/record.ts`'s thread-preview logic (used by both active and archived conversation lists) now checks the latest message's `withdrawn_at` and substitutes the note.

**Judgment calls for you to verify:**
1. Whether to add a low `temperature` to the Anthropic call as hardening against Carmen's failure class (not applied — outside Phase 1's literal trigger condition, flagged rather than assumed).
2. The two additional Jamie Chen fabrications the detector found beyond your original 3 — I withdrew them under the same rule, but you didn't ask about Jamie specifically.
3. The git-commit-vs-database-timestamp discrepancy noted above (sandbox clock reliability across sessions) — noted, not resolved, since it doesn't change any conclusion here.

Verified: `tsc --noEmit` and `next build` pass; 27/27 astro tests pass (untouched). No `next.config.mjs`, root `.npmrc`, or Vercel settings touched. (No ESLint config exists in this repo — `next lint` prompts to create one interactively; skipped rather than adding lint tooling mid-fix.)

---

## 2026-07-10 (Quick Chart — top-of-funnel acquisition + in-app utility)

Three modes, per spec. No database rows are ever created by a visit alone — only an explicit "Save"/"Add" click writes anything.

**Mode 1 — Quick Natal (`/chart`), public, no login.** Structured birth entry (reusing the never-fabricate `BirthFields`/geocoder), computed **server-side** via `POST /api/quick-chart` (engine never runs in the browser for this path). Shows Big Three with `interpretPlacement`/`interpretRising` readings, a collapsed-by-default full placements list, and the chart wheel when houses are available. "Save to your galaxy" and "Copy share link" — no paywall, no Vela.

**Mode 2 — Quick Compatibility (`/chart/compare`), public, no login.** Same pattern via `POST /api/quick-compare`: both charts + synastry computed server-side, qualitative labels, "What X needs from you" (reused from Compare), key cross-aspects with `interpretAspect`. Logged-in visitors get their own stored chart pre-filled as Person A (read-only reuse of the existing row — no recomputation). Year-only precision on either side returns the honest generational-only read (`synastry: null`), never a fabricated one — verified live.

**Mode 3 — in-app Quick Check, logged-in only.** Floating "✦ Quick check" button on `/app` opens a modal: the user's own stored chart is Person A, the other person needs only a birthday. Computed client-side, consistent with the existing authenticated Compare/person-page convention (this one screen intentionally does not match the public routes' server-side rule — see rationale below). "Add to my galaxy" writes the person; "Discard" writes nothing (there is nothing to clean up).

**Never-fabricate rules held throughout:** the share URL encodes only birth data — **never a name** — verified by reading `lib/quick-chart.ts`'s encoder, which has no name field. Sharing a saved-into-database resolved place is fine (a city, not a person). Nothing persists on a bare visit; only the three explicit "Save"/"Add" actions write rows, and even those reuse the same `buildBirthInput` validation (structured dates, geocode disambiguation, required timezone for exact precision) as every other add-person flow.

**Signed-out save path:** `/chart`'s "Save to your galaxy" → `/signup?next=/welcome?prefill=...&name=...`. `next` now flows end-to-end: `SignupForm` forwards it into `emailRedirectTo`'s own `next` param (the existing `/auth/callback` route already reads and redirects to it — no change needed there), and on immediate-session signups `router.push`es there directly. `/welcome` parses `prefill`/`name` from the URL on mount and populates the Add-person form — **never auto-submitted**, always reviewed and confirmed by the user like any other add.

**Refactors done to enable reuse (behavior-preserving):**
- `ChartWheel` extracted from `person/[id]/page.tsx` → `components/chart-wheel.tsx`.
- `BirthFields` extracted from `welcome/page.tsx` → `components/birth-fields.tsx`.
- `whatTheyNeed`/`RelationType` extracted from `compare/page.tsx` → `lib/compare-guidance.ts`.

**Design rationale documented in code:** the public routes (`/chart`, `/chart/compare`) compute via server API routes per the spec's explicit instruction. The in-app Quick Check computes client-side because that already matches the codebase's established, unremarked pattern for every other *authenticated* screen (Compare, person page, and `welcome` itself all import `@galaxia/astro` directly into `"use client"` components) — the engine has no secrets, so this isn't a security boundary, and introducing a fourth pattern for one modal seemed worse than being consistent with the other twenty screens. Flagging this explicitly in case a stricter server-only rule was intended for all three modes.

**Verified:** `tsc` + `next build` pass; both new API routes smoke-tested directly (Little Rock Placidus regression chart reproduces `Capricorn` Sun via `/api/quick-chart`; `/api/quick-compare` returns real scores/aspects for two real dates and correctly returns `synastry: null` — never a guess — when either side is year-only; bad input returns the same validation errors as the rest of the app). 27/27 astro tests still pass (untouched).

**Skipped/deferred:** no dedicated `/chart` link was added to the marketing landing nav (not requested; `page.tsx` wasn't touched this round). Quick Check's date picker is date-only by design (no exact time/city) per the spec's "fast, date-night" framing — exact-time compatibility isn't offered from that entry point, only from the full Compare page.

---

## 2026-07-10 (Pricing Part 7 emails + FAQ + QA bugs + archive threads)

**Migration `20260710183000_threads_status_and_trial_emails.sql`** (applied via MCP): `threads.status` (`active`|`archived`, default active) + a `trial_emails(user_id, kind)` idempotency table (service-role only).

**Part 7 — trial emails.** `apps/web/lib/emails.ts` renders all five emails **verbatim** from copy §3, except Day-11 which uses the approved card-optional rewrite (no "you'll be charged"; "your galaxy pauses until you continue"). `sendEmail` posts to Resend and **no-ops + logs when `RESEND_API_KEY` is absent**. `apps/web/app/api/cron/trial-emails/route.ts` is a daily, `CRON_SECRET`-gated handler (GET/POST) that evaluates every trialing user and sends whichever email is due, once (idempotent). Windows: day1 (age <3d, ≥1 person), day4_one (age 3–8d, exactly 1 person — the at-risk branch), day4_multi (age 3–8d, ≥2), day11 (~3d before trial end), day14 (trial ended, still trialing). Every count (people/notes/threads/groups) and the person name are **real per-user values**; nothing fabricated.
- **Not wired to a schedule (reported):** no `vercel.json` added (constraint + ENGINEERING §2). To activate: set `CRON_SECRET` + `RESEND_API_KEY` (and optional `RESEND_FROM`), then schedule the route daily via a Vercel cron (Vercel auto-sends `Authorization: Bearer <CRON_SECRET>`) or Supabase `pg_cron`. Until then the route returns 503 (no secret) and never sends.

**Item 2 — FAQ.** Replaced the stale "When can I use it?" answer verbatim with "Available now on the web at galaxia.app. iOS and Android are in development. Sign up today and your account works across all platforms when the mobile apps launch." Additive text-only edit to `page.tsx`; no section/animation/other copy touched.

**Bug A — /welcome duplicate self.** On load, `/welcome` now checks for an existing `is_self` person. If one exists, the "You first" create form is replaced with a "You're in your sky" panel linking to the existing chart; `saveSelf` also hard-guards against creating a second self. Adding other people still works.

**Bug B — Compare carries the person.** The profile "Compare" button now links to `/app/compare?a=<personId>`. Compare reads `useSearchParams()` (wrapped in a Suspense boundary) and pre-fills Person A from `a`, choosing a different Person B.

**Archive threads.** New `ThreadMenu` (⋯ → Resume / Archive) on the home "Resume a thread" chips and on the person Record's conversation entries. Archiving sets `threads.status='archived'` (never deletes) and hides the thread from default lists. The person profile gains a **"Past conversations"** section listing archived threads with Resume + Unarchive. `lib/record.ts` filters active threads in `fetchRecord` and adds `fetchArchivedThreads` + `setThreadStatus`.

**Skipped/pending:** Stripe (Part 3) still needs keys; the trial-email cron needs `CRON_SECRET`/`RESEND_API_KEY` + a scheduler; mobile "Galaxia+/Free" display copy still deferred.

---

## 2026-07-10 (Minor-safety gate fix + Pricing Part 5 & 6)

**[FIXED] Minor safety gate was too broad — blocked the core parenting use case.**
Previously any thread with a minor in scope was refused in ALL modes ("use private notes"), which blocked a parent from privately asking Vela how to reach their teenager — the exact guidance the landing page promises.
- **Edge function** (`vela-chat`, redeployed v7 via MCP): the block is now `mode === "shared" && minor in scope` only. Private ask-mode about a child is allowed; the `parenting` flag already puts Vela in coach-the-parent mode (never addressing the child).
- **Web** (`vela/page.tsx`): removed the blanket `minorChatBlocked`. Input is hidden only in shared mode with a minor (`sharedBlocked`), which now offers a one-tap "Switch to Private (ask)". In ask mode with a minor subject, the input shows normally with two reassurances: a banner ("Vela coaches you about your child privately. Your child is never part of this conversation and will never see it.") and a label above the input ("Vela will coach you as the parent — your child won't see this conversation."). The old "Two-way chat is turned off / use private notes" copy is gone.
- Shared-mode-with-minor stays refused (the correct line).

**Pricing Part 5 — cancellation (one screen, one click).** Copy verbatim from copy §4. `/account/cancel` + `<CancelSubscription/>`: "Cancel your subscription?", the two body lines (with `{period_end_date}` from `current_period_end`), primary "Cancel subscription" → `POST /api/cancel` (**stub 501** until Stripe), secondary "Never mind, keep Galaxia". No retention offer, discount, pause, or pre-button survey; the optional "what was missing?" question appears only after confirmation. `/account` links here when status is `active`/`past_due` (else shows Subscribe; lifetime shows neither).

**Pricing Part 6 — marketing pricing section + CTAs** (`apps/web/app/page.tsx`, additive only — no redesign):
- New `#pricing` section between FAQ and the close: eyebrow "PRICING", "One price. Everyone you love.", the body line, two price cards (annual highlighted "Best value" $89/yr · $7.42/mo · save 26%; monthly $9.99), the five included items **verbatim**, "Cancel in one click, any time.", CTA "Start 14 days free" → `/signup`. Built with the page's existing `.glass`/tokens/`.reveal` animation; added scoped `.pcard`/`.incl` CSS.
- Nav gains a **Pricing** link; the nav CTA and both hero + close CTAs now read **"Start 14 days free"** → `/signup`. The email capture is kept as a secondary **"Notify me"**. No existing section, animation, or body copy was rewritten.

**Constraint note:** this message's trailing block said "do not touch page.tsx" (attached to the minor-gate task) while the body requested Part 6 and the mid-message constraint said "no page.tsx **redesign**". Read together with the pricing spec's explicit "permitted to modify page.tsx for Part 6 only," I treated it as add-only. Flag if that wasn't intended.

**Part 7 (trial emails): NOT wired.** Per instruction, the rewritten card-optional day-11 copy is presented for approval first; no email code shipped this round.

**Stripe (Part 3) still skipped.** Env vars needed before it can be wired: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`, `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL`, `NEXT_PUBLIC_STRIPE_PRICE_LIFETIME`, `NEXT_PUBLIC_FOUNDING_ENABLED`; `RESEND_API_KEY` for Part 7.

---

## 2026-07-10 (Pricing — Part 2 + Part 4: card-optional trial model + paywall UI)

Stops before Stripe (Part 3). Amendments applied: card-optional trial; founding cap 300.

**Part 2 — data model & shared entitlement.**
- Migration `20260710163000_trial_model.sql` (applied to Galaxia `eigfvribtntbxyjutsma` via MCP): adds `subscription_status` (default `trialing`), `trial_ends_at`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `plan`. `subscription_tier` kept but commented DEPRECATED and no longer read anywhere in web.
- **Card-optional (Amendment 1):** signup still collects email + password only — no card, no Stripe at signup. A DB trigger `handle_new_user` (SECURITY DEFINER, on `auth.users` insert) creates the profile with `subscription_status='trialing'`, `trial_ends_at = now() + 14 days`. Works for web and mobile regardless of email-confirmation. A TODO in the migration notes the 90-day revisit of card-required.
- **Backfill deviation (reported):** the spec suggested `trial_ends_at = created_at + 14 days`. Because middleware now redirects expired trials to `/subscribe` and checkout is stubbed until Part 3, dating from `created_at` would instantly soft-lock existing accounts (incl. the reviewer) with no way to subscribe. Backfilled to `now() + 14 days` instead. Verified: the one existing profile is `trialing` until 2026-07-24.
- **One shared `hasAccess`** in `packages/core`: `active || lifetime || (trialing && trial_ends_at > now)`, plus `trialDaysRemaining`. `@galaxia/core` added to `apps/web` `transpilePackages` (permitted extension).
- **Web middleware** enforces it server-side: `/app/*` and `/welcome` require access; expired → redirect `/subscribe`. `/account` and `/subscribe` stay reachable always (export/subscribe/cancel; data never deleted). Fail-open only when no profile row exists yet (trigger settling).
- **Mobile revenue bug fixed (ENGINEERING §7):** `apps/mobile` entitlement-provider rewritten to read `subscription_status`/`trial_ends_at` and expose the shared `hasAccess`. The `setTier` self-grant (which let a user write themselves a paid plan) is **removed**, and the "Upgrade to Galaxia+ (debug)" button in mobile Settings is gone. Old per-count caps (people/day) are removed (non-gating shims kept so the other mobile screens compile during rollout).

**Part 4 — paywall UI (static; no Stripe).**
- New route `/subscribe` + `<Paywall />` (`components/paywall.tsx`), rendered over the cosmic background — looks like the landing, not a billing page. All copy **verbatim** from `galaxia-pricing-copy.md` §1: eyebrow "YOUR TRIAL HAS ENDED", Fraunces "Keep your galaxy.", the body line, the two price cards, the reassurance line, and the five included items. No tiers, no comparison table, no asterisks, no countdown, no fake scarcity.
- **Annual pre-selected + "Best value":** `$89 /year`, `$7.42 a month · save 26%`; Monthly `$9.99 /month`.
- Primary "Continue with Galaxia" → `POST /api/checkout` (**stub, 501** until Part 3; a neutral error shows if clicked).
- **Founding block (Amendment 2):** rendered only when `NEXT_PUBLIC_FOUNDING_ENABLED === "true"` (off by default). Capped at **300** ("FOUNDING MEMBERS · 300 ONLY", "Three hundred people…"), remaining computed from a real DB count (`300 − count(status='lifetime')`), never faked.
- **Calm trial banner** (`components/trial-banner.tsx`): shows only while `trialing` — "Trial ends {date} · N days left" + "Continue with Galaxia →". Added to the `/app` layout (persistent across app screens) and `/account`.
- `/account`: quick actions now include a **Subscribe** button → `/subscribe`. `/account/subscription` left in place (neutral copy from Part 1), just no longer linked.

**Skipped/deferred (reported):** Stripe wiring (Part 3), cancellation screen (Part 5), marketing pricing section + CTAs (Part 6), trial emails (Part 7) — all after this stop point. Mobile display copy still says "Galaxia+"/"Free" in a few screens (vela/compare/groups/index/onboarding); deferred to a dedicated mobile pass since mobile is not store-deployed and the revenue-bug + shared-entitlement requirements are met.

---

## 2026-07-10 (Pricing — Part 1: remove every freemium remnant)

Executing `design/galaxia-pricing-implementation-spec.md` Part 1, deployed on its own before the data model / paywall / Stripe. Two amendments apply to later parts (card-optional trial; 300 founding members) and are noted where relevant.

Two independent audits found the single biggest reason a trial user won't pay: the live product tells them they're already on a permanent free plan. Every such surface in `apps/web` is removed. Grep sweep results (`free plan`, `5-person`, `personLimit`, `Galaxia+`, `subscription_tier`, `tier ===`) — all web hits resolved:

- **`/welcome`** — deleted the 5-person cap entirely (the `peopleLimit`, the "Free plan: 5-person limit reached" save-gate, the disabled button, and the "Free plan · N people remaining" header line). A brand-new signup can now add six or more people with no gate. Stopped reading `subscription_tier`.
- **`/app/settings`** — removed the "Galaxia+ — coming soon" upsell card and its "Notify me when it's available" button. The Subscription section now shows only approved copy (§5): "Nothing here is locked. This is the whole product." + "14 days, everything included. We'll remind you before the trial ends."
- **`/account`** — removed the "Free plan — up to 5 people" / "Galaxia+ ✦" badge; replaced with the same approved line. Stopped reading `subscription_tier`.
- **`/account/subscription`** — removed "Current plan: Free/Galaxia+" and the mobile-IAP billing framing; interim approved copy until Part 4 wires the real Paywall/portal.
- **`/app` (home)** — removed the tier state, the `subscription_tier` read, and the "Free plan · N of 5 remaining" note.

No copy was invented: interim text is verbatim from `design/galaxia-pricing-copy.md` §5. The `subscription_tier` **column** is untouched (Part 2 deprecates it); only web *reads* of it are gone. The now-unused `.upsell-card` CSS rule is left in `globals.css` (harmless; not user-facing).

**Deferred, reported explicitly:** the **mobile app** (`apps/mobile`) still contains extensive freemium logic (`entitlement-provider` people/Vela caps, the "Upgrade to Galaxia+ (debug)" tier switch flagged in ENGINEERING §7, Galaxia+ gates in compare/groups/vela/settings). Mobile is a separate, not-yet-store-deployed product; reworking its entitlement belongs with Part 2's shared `packages/core` `hasAccess` and is out of scope for this web-deploy-first Part 1. Tracked for the data-model stage.

---

## 2026-07-10 (Relationship Record — R1: the Record itself)

The connective tissue. `notes` becomes the single per-scope timeline; the person page reads it back.

**[ADDED] Migration `20260710020000_record_timeline.sql`** — extends `notes` with `group_id`, `kind` (`note`|`tending`|`vela_pin`|`compare_reading`|`cohort_reading`), `payload jsonb`, `source_thread_id`. One store, the existing owner-only RLS, no second notes table.

**[ADDED] `apps/web/lib/record.ts`** — the only read/write path: `fetchRecord(scope)` (notes of all kinds ∪ scoped conversations, date-ordered), `fetchVelaPins(personId)`, `orderPair()`.

**[ADDED] B1 — the person-page Record timeline.** The old "Private notes" section is now "The record": the note composer plus a date-ordered timeline of notes, tending notes, Vela pins (with reopen links), saved comparisons, saved cohort readings, and scoped conversations. Empty state names what will gather there; the chart above is unchanged — this is the layer that accumulates.

**[ADDED] B2 — "Vela on {name}".** A module near the top of the person page showing the last two pinned Vela insights (with reopen-conversation links), or an "Ask Vela about {name}" chip when empty. Closes the audited gap where a person's page didn't know about the conversation just had about them.

**[ADDED] B3 — pin Vela insights.** Every Vela answer bubble has a quiet "＋ Pin to record" affordance (mist, secondary). Pins write `kind='vela_pin'` scoped to the current person/pair/group, owner-private, with `source_thread_id` for reopening. **Shared-mode rule enforced:** only Vela's messages are pinnable (the button never renders on a participant's message), and the pin is private to the pinner. The shared-space consent gate copy now states this plainly before anyone enters.

**[ADDED] B4 — Compare saves a dated snapshot, never a trend.**
- "Save this reading" writes `kind='compare_reading'` with an immutable `payload` (scores, top aspects, generational, `engineVersion`, `birthFingerprint`), on the pair's shared record (visible on both people's pages).
- **No synastry delta.** `computeSynastry` is deterministic, so saved readings render as "Read on {date}". If a re-run differs, the cause is attributed exactly from the stored fingerprint/engine: "…the birth data changed since — not because the relationship did" or "…the astrology engine was updated." An input change is never presented as a relationship change.
- The "Log a moment" note and the person-page notes are now explicitly one store (pair notes surface on both people's records).
- Groups gained the deferred "Save this reading" (`kind='cohort_reading'`, on the group's record).

**[ADDED] Determinism regression test** (`packages/astro/test/synastry-determinism.test.ts`): asserts `computeSynastry` returns byte-identical output across repeated/"different-day" calls and takes no temporal argument (signature guard) — locking out any future time-varying synastry that could tempt a fake trend. 27/27 astro tests pass.

**Requires:** `supabase db push` for the new migration. No edge-function change.

---

## 2026-07-10 (Relationship Record — R5-E1: progressive capture + ask-them link)

Pulled forward ahead of R1 per the activation priority (25–55% of trial users never add a second person). Two features shipped together.

**[ADDED] Progressive capture — save a person with just name + relation.**
- Migration `20260710014000_progressive_capture.sql`: `people.birth_precision` gains a `'none'` state (default), so a person can exist before any birth data.
- `/welcome` add-person form gains an "Add birth data later" tier (self entry does not — self always needs a chart). Choosing it saves name/relation/minor only, no chart row, no synthesized date.
- `apps/web/lib/birth.ts`: `BirthFormInput.precision` widened to `FormPrecision = Precision | "none"`; `buildBirthInput` throws if ever called with `'none'` (guard — callers persist directly).
- The person page renders a first-class "add birth data" state for a chartless person (what each precision unlocks + the edit panel + the ask-them link) instead of the old "Profile not found" error. The `EditPersonPanel` accepts a `'none'` person and defaults its form to date precision so data can be added immediately.

**[ADDED] E3 — "Ask them for their birth details" share link.**
- Same migration extends `invites` with `person_id` + `kind` (`shared_space` | `birth_data`) and an RLS policy letting an authenticated owner manage their own invites.
- `AskBirthData` component (person page + edit panel for non-exact profiles) creates a `birth_data` invite and shows a copyable link.
- `/invite/[token]` branches on `kind`: a birth-data invite renders a warm, public, unauthenticated one-person form (`InviteBirthDataForm`) — structured month/day/year, optional exact time, Open-Meteo city disambiguation — that never shows any existing data.
- `POST /api/invite/birth-data` writes back via the service role through the **same `buildBirthInput` + `computeNatalChart` pipeline** the app uses (date echo, resolved timezone — no fabrication), updates the pending person, upserts the chart, and marks the invite accepted.

Privacy upheld throughout: the invited person sees only a request for their own birth details — never notes, never charts, never other people.

**Requires:** `supabase db push` for the new migration. No edge-function change in this stage.

---

## 2026-07-10 (Relationship Record — R0: close the verified dead-ends)

First implementation stage of `design/galaxia-relationship-record-plan.md`. No schema changes; behavior/handoff fixes only.

**[FIXED] A1 — "Resume a thread" now restores the conversation's scope.**
Root cause: `apps/web/app/app/vela/page.tsx` read `threadId` on mount but never restored the thread's `mode`/scope/people from the `threads` row, so the Focus selectors and the "Asking about X" header misrepresented every resumed conversation, and the focus-change reset effect could discard it. Now: on entry the page fetches the `threads` row (`subject_person`, `pair_low/high`, `group_id`, `mode`) and sets scope/mode/people from it before loading history; a `restoringRef` suppresses the reset during restoration; all entry params are parsed once from the entry URL (navigation into Vela is always cross-route, so the page remounts and the read is reliable).

**[FIXED] A2 — Compare → Vela handoff carries the pair.**
Root cause: Compare linked to `/app/vela?subjectPersonId=…` and the Vela page never read that parameter at all. Compare now passes `?scope=pair&subject=A&pair=B&relType=…`; Vela reads `scope/subject/pair/relType` (plus legacy `subjectPersonId`) and opens on Focus=pair with both people and the relationship type applied. A `q` param prefills the input (never auto-sends).

**[FIXED] A3 — Groups: one-click restore + Ask Vela; overlay bugs.**
Selecting a saved group now regenerates its overlay in the same action (audited "saved groups are inert" + "generate twice"), by passing the member ids explicitly to `buildOverlay` instead of waiting on `setState`. `buildOverlay` no longer leaves the spinner stuck when a chart is missing (early returns now reset state in a `finally`). Added "Ask Vela about this group" (→ `/app/vela?scope=group&groupId=…`, already supported end-to-end). **Deferred to R1:** "Save this reading" persistence needs the `notes.kind/payload/group_id` columns from R1's migration.

**[FIXED] A4 — "Today in your sky" is no longer a dead text block.**
Each named person is now a link to their profile. The person page computes its own transits (deterministic: real ephemeris vs stored natal positions; skipped for year-only charts) and shows an "Active today" banner with the tight hits and an "Ask Vela how this is showing up" deep link (prefilled prompt).

**[CHANGED] A6 — the 5-person cap is stated on home, not enforced by silent redirect.**
Home now shows "Free plan · N of 5 remaining" / a plain at-cap message. Phase 1 removes the cap entirely.

**[CHANGED] A7 — duplicate navigation removed.**
The home footer row duplicated the sticky header (Compare/Groups/Vela). It's now just the two contextual actions that are the natural next step from home (My chart, Add people); global nav lives only in the header.

---

## 2026-07-10 (Vela presentation bugs)

**[FIXED] Vela's suggested follow-ups rendered as raw "→ " text inside the answer bubble.**

The system prompt asks the model to end with up to 3 follow-up prompts, each on its own line prefixed "→ ". The web client never parsed them, so newlines collapsed and replies ended in a run-on string of arrows.

- New `apps/web/lib/vela-parse.ts` — `splitVelaReply()`: everything before the first "→ " line is the answer body; each "→ " line is one suggestion (max 3). No "→ " lines → no chips; suggestions are never fabricated.
- `apps/web/app/app/vela/page.tsx`:
  - Body renders as the chat bubble (now `white-space: pre-wrap`, so the model's real line breaks survive). Suggestions render **below** the bubble as tappable pill chips — translucent violet border `rgba(183,154,216,.22)`, mist text, no gold (secondary to the answer).
  - Tapping a chip sends it as the user's next message.
  - Streaming: mid-stream the split is applied on every chunk, so a half-written "→ …" line stays buffered and is only revealed as a chip after the stream ends.
  - Chips show under the **latest** Vela answer only — earlier suggestions are stale once the conversation moves on.
- Persistence: new migration `20260710011000_add_message_suggestions.sql` adds `messages.suggestions jsonb`. The edge function now stores the body and the suggestions separately, so a resumed thread renders correctly. Legacy rows (raw reply with arrows in `body`) are split client-side on load. If the migration isn't applied yet, the function falls back to persisting the raw reply — nothing breaks, the client parser still handles it.
- Edge function history context now feeds the model answer bodies only (strips legacy "→ " lines).

**[FIXED] The safety/consent line rendered per-message.**
"Private by default · no private notes in shared mode · consent required for shared threads" was a system chat bubble re-inserted on every thread reset. It is now a single quiet caption under the thread header ("Asking about X"), shown once. The system-bubble message type is gone from the page.

**[FIXED] Chat bubble CSS never matched.** `globals.css` styled `.bubble.user` / `.bubble.vela` but the page renders `bubble bubble-user` / `bubble bubble-vela`, so the user/vela variant styles (alignment, gold/violet tints, sender label treatment) silently never applied. Selectors now cover both forms.

**Requires redeploy:** `supabase functions deploy vela-chat` (project `eigfvribtntbxyjutsma`), and `supabase db push` for the `messages.suggestions` migration — apply the migration first, though order is safe either way thanks to the insert fallback.

**Skipped:** `apps/mobile/app/vela.tsx` still renders replies raw (same arrow symptom on mobile); out of scope for this web fix, logged for the mobile pass. No unit-test home exists for `apps/web` lib code (web `test` script is a stub) — parser verified by direct execution of the edge cases instead.

---

## 2026-07-09 (Phase 0 — real Placidus, stop fabricating)

**[FIXED] House cusps were Equal House labeled "Placidus" — real Placidus implemented.**

Root cause: `computeCusps()` in `packages/astro/src/index.ts` returned Equal House cusps (`ascLon + idx * 30`) for the `"placidus"` system, with a comment admitting it was a fallback. Every chart write stored `house_system: "placidus"`; the UI said "Placidus". An external audit confirmed every cusp sat at exactly the Ascendant degree + 30° steps — the Equal House signature.

Changes to `packages/astro/src/index.ts`:

1. **Real Placidus cusps** — the standard iterative algorithm, pure TypeScript, no new dependency. From RAMC (via `SiderealTime`), the obliquity of the ecliptic **of date** (previously a fixed J2000 constant), and geographic latitude. Cusps 11, 12, 2, 3 iterate on the semi-arc fractions (AD = asin(tan δ · tan φ), δ = atan(tan ε · sin RA)); 5, 6, 8, 9 derive by opposition; 1 = Ascendant, 10 = MC.
2. **MC formula bug found and fixed by the external regression test** — the old code computed `atan2(sin θ · cos ε, cos θ)` (multiplying by cos ε instead of dividing), putting the MC up to ~2.7° off. Correct: `atan2(sin θ, cos θ · cos ε)`. This also affected the IC and house 10/4 boundaries under the old Equal fallback.
3. **Polar honesty** — Placidus is undefined inside the polar circles (|lat| ≥ 90° − ε ≈ 66.5°) or when a cusp point is circumpolar. The engine falls back to Whole Sign **explicitly**: `houseSystem` on the chart records what was actually computed, `houseSystemRequested` what was asked, `houseSystemFallbackReason` a human-readable reason shown in the UI. Verified by a Svalbard (78.2°N) test.
4. **Three explicit systems** — `"placidus"` (default; matches astro.com and Cafe Astrology), `"whole"`, `"equal"`. The stored `charts.house_system` is now always the system actually computed.

**Regression test against external ground truth** (`packages/astro/test/placidus-external-ground-truth.test.ts`):
Birth 1987-12-29, 22:30 CST, Little Rock AR (34.7465, −92.2896). Asserted against Cafe Astrology's published Placidus values, tolerance 1 arc-minute. Results (computed vs published):

| Point | Computed | Cafe Astrology |
|---|---|---|
| ASC | 16°01′29″ Virgo | 16°01′50″ Virgo |
| MC | 14°36′35″ Gemini | 14°36′ Gemini |
| 2nd | 12°03′30″ Libra | 12°03′49″ Libra |
| 3rd | 12°03′18″ Scorpio | 12°03′38″ Scorpio |
| 5th | 17°21′26″ Capricorn | 17°21′50″ Capricorn |
| 6th | 18°11′37″ Aquarius | 18°12′01″ Aquarius |

All within 1′. The test values are hand-entered from Cafe Astrology and must never be regenerated from engine output (a previous heliocentric bug passed its own self-referential tests). An anti-regression test also asserts the cusps are *not* the Equal House signature.

**House system is a stored user choice:**
- New migration `20260709230000_add_house_system_pref.sql`: `profiles.house_system` (`placidus` default).
- Settings → new "House system" card: Placidus / Whole Sign / Equal House with plain descriptions and a note about polar fallback.
- All chart writers (`/welcome`, `EditPersonPanel`, mobile onboarding) compute with the user's preference and store `natal.houseSystem` — the computed truth, never a hardcoded string.
- UI labels ("Natal wheel · Placidus", Twelve Houses subtitle) derive from `chart.houseSystem` via `houseSystemLabelForChart()` — never hardcoded.

**Backfill:** `CHART_ENGINE_VERSION` bumped to 2. On profile load, a chart with `engine_version < 2` (or a house system that no longer matches the user's preference) recomputes from the stored, user-confirmed birth fields and is re-stored. When a legacy chart cannot be recomputed (missing coordinates/timezone), its stored label is corrected to `"equal"` — what the cusps actually are — instead of continuing the false "placidus" claim.

**[FIXED] Fabrication audit — every silent fallback found, fixed or documented.**

Fixed:
1. `geocode.ts` `tzOffsetMinutesForDate` returned **0 (UTC) on failure** — now returns `null`; exact-precision saves are blocked without a resolved timezone (existing guard in `buildBirthInput`).
2. `geocode.ts` `searchPlaces` returned `[]` on network failure, so the UI said **"No places found"** during an outage — now throws `GeocodeUnavailableError`; both search UIs show the real cause.
3. `geocodeCity` (take-the-first-result API) **deleted**. The edit panel silently geocoded an unresolved city on save (the Jacksonville FL/AR bug in a second code path) — now it requires an explicit pick from the candidate list.
4. Person-page backfill used **`new Date()` (now!) as the birth date** when `birth_date` was missing, and silently geocoded the first candidate — removed; recompute only happens from stored, user-confirmed fields (`rebuildDateUTC` returns null rather than substituting).
5. **Year-only Sun shown as a confident sign.** `evaluateSignConfidence` sampled only Jan 1 and Dec 31 — both Capricorn — so a year-only Sun claimed `confident: true` while the real sign is unknowable. Now samples twice monthly; the Sun correctly reports all 12 `possibleSigns`.
6. **Uncertainty flags were computed and then ignored by every surface.** Now respected: person page (header, Big Three, placement rows, generational rows show "sign uncertain — could be X or Y"), the wheel (unconfident placements are not plotted at guessed positions), element/modality tallies and stellium detection (known signs only), Key Aspects (skipped for year charts — orbs from sampled positions would be fabricated), Compare (year-only people get the generational comparison plus an explanation instead of fabricated synastry scores), and the Vela edge function (unconfident signs are sent as "Uncertain (X or Y)", never as fact).
7. `cohortLabel` said "Pluto in Scorpio" even when the planet changed sign during a year-only birth year — now "Pluto in Scorpio or Sagittarius".
8. Generational houses were computed from a **fabricated 0° longitude** (`?? 0`) if a planet was missing — now only assigned when the planet exists.
9. Edit panel hour dropdown rendered `22:xx` — now matches onboarding's `22:00 (10 pm)` format.

Documented and deliberately left (with reasons):
- `getWorkingDate` noon-UTC convention for date-only births: a midpoint convention, honest because sign-confidence flags carry the ambiguity (e.g. Moon `possibleSigns` when it changed sign that day) and houses/angles are never computed without exact time.
- Constellation link intensity uses a neutral default when a chart row is missing — purely decorative opacity; no score is displayed anywhere.
- Compare `ageGap ?? 0`: unknown age gap conservatively skips the ancestral headline; nothing false is asserted.
- "No notable transits today" can also appear when chart data is missing — cosmetic; transit copy never names a specific placement it doesn't have.
- `longitudeToSign` `?? "Aries"` and `houseFromLongitude` terminal `return 1`: mathematically unreachable defensive branches (inputs normalized to [0,360), cusps cover the circle).
- Groups cohort overlay groups year-only members by their representative sign even when unconfident; fault lines can therefore be uncertain. Fixing requires uncertainty states through `cohortOverlay` and the groups UI — logged as follow-up, and the underlying signatures now carry honest `possibleSigns`.
- Charts recompute on person-page load, not in bulk: Compare/Groups/Vela read stored placements (longitudes unaffected by the house fix) and the corrected labels/houses propagate the first time each profile is opened.

**[ADDED] ENGINEERING.md §12 — "Galaxia never fabricates."** The rule, the four shipped instances, and what it means in code (labels derive from data, uncertainty flags must be respected everywhere, tests assert external ground truth).

---

## 2026-07-09 (house interpretations wired)

**[ADDED] House layer wired into /app/person/[id] from lib/house-interpretations.ts.**

Previously: every placement row showed a house badge (H4, H8) that said nothing. The sign reading was the only content. Half a chart was rendered.

Changes to `apps/web/app/app/person/[id]/page.tsx`:

1. **Expanded placement row — three blocks:**  
   Expanding any placement now shows (a) "IN [SIGN]" → `interpretPlacement.long`, (b) "IN THE [N]TH HOUSE" → `interpretHouse(body, house).long` with `houseMeaning.domain` as subtitle, (c) "ASPECTS" → every aspect this planet makes via `interpretAspect`, with orb and tight-accent treatment. House block only appears when exact birth time + location are present.

2. **House badge tooltip:**  
   The H4/H8 badge is now a button. Clicking it shows `houseMeaning(h).name` + `.short` in a glass tooltip ("Fourth House · the foundation under everything"). Never blank.

3. **The Twelve Houses section:**  
   New collapsible card after Placements, visible only when `chart.cusps` has 12 entries (exact birth time + location). Each house shows: number, name, cusp sign with degree, domain label, planet glyphs. Expanding a house shows `houseMeaning(h).long` and per-occupant `interpretHouse(body, house).short` readings. Empty houses get a plain explanation ("An empty house is normal — the themes are present in the life, just not strongly emphasised by birth placement."). Expand all / Collapse all control. Without exact time: dashed card explaining what's needed to unlock the layer.

4. **Stellium detection:**  
   Before placements list: if 3+ planets share one house OR one sign, a gold alert shows "Stellium in the 4th house" / "Stellium in Capricorn", lists the bodies, and renders `STELLIUM_NOTE` verbatim.

5. **Modality balance:**  
   Alongside element balance: cardinal/fixed/mutable tally with `MODALITY_DOMINANT` / `MODALITY_ABSENT` prose (thresholds: dominant ≥ 4, absent = 0), both from locally defined maps.

No LLM in this path. All copy from `lib/house-interpretations.ts` (hand-written). Rendered verbatim.

---

## 2026-07-09 (data-entry bugs)

**[FIXED] Three data-entry bugs causing wrong charts.**

Root cause of wrong Sun sign (1987-12-29, Jacksonville AR → Sagittarius instead of Capricorn):
The geocoder silently returned Jacksonville, FL instead of AR (limit=1, no disambiguation).
Additionally, birth time was being treated as UTC rather than converted from local time.
Neither failure was surfaced to the user.

**BUG A — Free-text date/time replaced with structured selects.**
`apps/web/app/welcome/page.tsx` `BirthFields` component rewritten:
- Month is now a named-month select (January … December). Day is a number select. Year is a number select. No user can enter "12/29/1987" and get it silently misinterpreted.
- Days-in-month are constrained to the selected month and year (Feb 30 impossible).
- Hour and minute are separate selects for exact-time entry with AM/PM labels.
- Parsed date is shown back to the user in unambiguous form ("29 December 1987") before they submit.
- `BirthFormInput` in `lib/birth.ts` updated: structured `month`/`day`/`year`/`hour`/`minute`/`yearOnly` fields replace the old free-text `date`/`time`/`year` strings.
- `EditPersonPanel` updated to use the same structured fields, populating them from stored `birth_date`/`birth_time` DB columns on open.

**BUG B — Geocoder switched to Open-Meteo; disambiguation list required.**
`apps/web/lib/geocode.ts` rewritten:
- Backend: Nominatim → Open-Meteo (`geocoding-api.open-meteo.com`), which returns structured `admin1` (state/region) and `country` fields, making disambiguation unambiguous. Keyless, generous rate limits.
- `searchPlaces(query, birthDate)` returns up to 5 candidates.
- UI in `BirthFields` shows the disambiguation list and requires the user to explicitly choose. Never auto-accepts the first result — even if only one result returns, it is displayed for confirmation.
- After selection, shows: "Jacksonville, Arkansas, United States · 34.8659°, -92.1099° · America/Chicago (UTC-6h at birth date)".
- User can type a region to narrow results: "Jacksonville, Arkansas" returns AR before FL.

**BUG C — Silent UTC fallback removed; exact precision blocked without timezone.**
`lib/birth.ts` `localTimeToUTC()` previously fell back to treating local time as UTC when no timezone was known ("This is the old (wrong) behavior"). Now throws:
`"A birth place with a resolved timezone is required for exact precision. Without it, birth time cannot be converted to UTC and the chart will be wrong."`
The `buildBirthInput` function enforces this: `exact` precision without a resolved `tzOffsetMin` is a hard error, not a silent degradation.

**Regression tests added** (`packages/astro/test/natal-synastry-transits.test.ts`):
- `Sun is Capricorn for 1987-12-29 date-only` — locks the correct Sun sign.
- `Sun is Capricorn for 1987-12-29 with Jacksonville AR coords (exact, local midnight)` — verifies UTC conversion via tz offset.
- `geocoding disambiguation: Open-Meteo returns multiple Jacksonville results` — documents that `searchPlaces("Jacksonville")` returns ≥ 2 results, proving the disambiguation list is populated.
All 9 tests pass.

**Deferred / not changed:**
- `apps/web/app/page.tsx` (marketing landing) — not touched per constraint.
- Minute select offers every minute (0–59) in the `EditPersonPanel` for birth-certificate precision, and common 5-minute intervals first in `BirthFields` for ease of entry.

---

## 2026-07-09 (interpretation wiring)

**[CHANGED] Interpretation library wired into /app/person/[id].**

Root cause of dull chart reads: old stub was `BODY_LABEL[body] + " · " + SIGN_LINE[sign]` — 10 labels × 12 sign lines, so every planet in the same sign got identical text.

Fixes:
- `interpretations.ts` (user-committed 309-line library) wired into person page. Old `BODY_LABEL`, `SIGN_LINE`, `interpretBigThree`, old `interpretPlacement(string,string)→string` all deleted.
- New API: `interpretPlacement(body,sign)→Reading`, `interpretRising(sign)→Reading`, `interpretAspect(a,b,type)→Reading`, `BODY_DOMAIN`, `ELEMENT_DOMINANT`, `ELEMENT_ABSENT`.
- Expandable rows on every placement and aspect (click or Expand all). Big Three default open, rest default collapsed.
- `BODY_DOMAIN` renders as label-caps row label ("HOW THEY LOVE", "DRIVE & CONFLICT").
- Element balance: bare counts replaced with `ELEMENT_DOMINANT` / `ELEMENT_ABSENT` prose readings.
- Case-normalisation guards on all lookups; missing readings log in dev, never render blank.

Verified: Venus/Aquarius ≠ Mars/Aquarius; Saturn/Capricorn ≠ Uranus/Capricorn.

---

## 2026-07-09 (bugfixes)

**[FIXED — SAFETY] Minor chat gate was not enforced (BUG 1).**
Root cause: `minorInScope` only blocked `mode === "shared"`. Ask mode with a minor as subject passed through to Vela.

Client fix (`apps/web/app/app/vela/page.tsx`):
- `minorChatBlocked` flag replaces the entire input + send button with a visible explanation ("Two-way chat is turned off for minors") and a link to the person's private notes.
- Blocks ALL modes, not just shared.
- `useEffect` ref tracks `subjectId` changes — switching focus resets `threadId` and `lines` so each person gets an isolated thread.

Server fix (`supabase/functions/vela-chat/index.ts`):
- Added `is_minor` check *before* the shared-mode block, covering all modes.
- Returns clear 400 if any scoped person is a minor: "Two-way chat is turned off when a minor is the conversation subject."
- Requires re-deploy: `supabase functions deploy vela-chat --project-ref eigfvribtntbxyjutsma --no-verify-jwt`

**[FIXED] Rising sign never computed despite "exact precision" data (BUG 2).**
Root cause: `BirthFields` in `welcome/page.tsx` collected a city name but never called `geocodeCity`, so `lat`/`lng` remained empty strings. `computeNatalChart` received `undefined` for both, so `computeAscMc()` was never called and `chart.asc` was always `undefined`.

Also: birth time was stored and treated as UTC. Birth time is local time at birth; it must be converted to UTC via the birth-place timezone.

Fixes:
- `lib/birth.ts`: added `tzOffsetMin` to `BirthFormInput`; `localTimeToUTC()` converts local → UTC using tz offset. Old data without a timezone still stores, but the UI notes the degradation.
- `BirthFields` in `welcome/page.tsx`: geocodes on city-field `onBlur`, writes `lat`/`lng`/`tzOffsetMin` into form state, shows confirmation label. Auto-geocodes again at save if coords still absent.
- `persistPerson` in `welcome`: also auto-geocodes at save as a safety net; persists `tz_offset_min` column.
- `EditPersonPanel`: same geocode-at-save pattern, now persists `tz_offset_min`.
- `apps/web/app/app/person/[id]/page.tsx`: backfills on load — if person has `birth_place` but no `birth_lat`/`birth_lng`, geocodes, recomputes chart with correct UTC time, persists both.

Verification: load a profile with date + time + city → Rising sign renders in Big Three chips and house cusps appear on wheel.

**[FIXED] Compare "What X needs from you" returned identical text for all people (BUG 3).**
Root cause: `whatTheyNeed()` tested the shared `scores` object with the same threshold tree for both Person A and Person B. Both typically hit the first `communication < 52` branch and got identical copy.

Fix:
- `whatTheyNeed()` now takes the person's actual Moon/Venus sign (from the chart, which `runCompare()` now populates on each `PersonLite`) and the computed synastry result.
- Builds copy from three sources: Moon sign need (from a 12-entry map), Venus sign love language (from a 12-entry map), and the tightest cross-aspect orb.
- Different Moon signs produce different first sentences. Different synastry aspect patterns produce different action lines.
- `runCompare()` enriches each `PersonLite` with `sun`/`moon`/`venus`/`mars` from `natalA`/`natalB` before calling `setResult`.

Score band fix (`lib/design.ts`):
- Bands widened: ≥76 Effortless / ≥65 Easy & warm / ≥54 Workable / ≥43 Tender / ≥32 Some friction / <32 Charged.
- Previously: 30, 21, 15, 15 all resolved to "Charged". Now they get distinct labels.

---

## 2026-07-09 (cleanup)

**[FIXED] Custom checkbox component everywhere** (`CustomCheck`).
The native browser `<input type="checkbox">` on `/welcome` ("This person is a minor") and in `EditPersonPanel` (Minor field) replaced with the `CustomCheck` component — rounded-square, gold check, violet fill — as specified in §3. Component lives at `apps/web/components/custom-check.tsx`.

**[ADDED] Inline spinners on all network action buttons** (`Spinner`).
Every button that triggers a network call now shows a small animated ring while in-flight and disables: Save my profile, Add to constellation, Save changes (edit panel), Confirm delete, Run comparison, Save private moment, Save group, Generate cohort overlay, Save note (person page), Send (Vela), Sign out (settings). Component at `apps/web/components/spinner.tsx`. Uses `.spin` keyframe added to `globals.css`.

**[FIXED] `#3a2f63` stroke comment removed** from person page wheel. Confirmed no literal `#3a2f63` appears in any rendered SVG — all structural lines use `rgba(230,174,108,.13)` (`LINE_COLOR` const).

**[FIXED] Groups page placement class names** updated from old set (`placement-row`, `glyph`) to current set (`pl-row`, `glyph-sq`) matching `globals.css`.

---

## 2026-07-09

**[ADDED] Chart wheel on `/app/person/[id]` (deferred from step 6, now built).**
Ported `Wheel()` from `design/reference/galaxia.jsx`. SVG ring chart: outer ring, 12-sector sign ring with element fill (18% opacity) + cream glyphs, house ring (only when cusps available), planets at true ecliptic longitudes with element-coloured glyphs, aspect lines across inner disc. `#3a2f63` strokes replaced with `rgba(230,174,108,.13)` gold hairline. When no exact time: renders zodiac + planets only, with a note explaining houses and rising require exact time + location. Responsive via SVG viewBox.

**[FIXED] Groups page placement classes** updated to `pl-row` / `pl-body` / `pl-desc` / `glyph-sq` matching the current CSS.

**[CHANGED] Design parity steps 4–6 (`cursor/design-steps-4-6-b265`).**

Step 4 — `/app` constellation:
- Canvas rendering ported from `design/reference/galaxia-constellation-prototype.html`. Node forms now derived from relationship type: self (gold disc + outer ring), binary partner (two orbiting bodies + ellipse), moon/child (crescent), fixed/parent (four-point flare + disc), ancient/ancestor (diffuse glow + expanding ring), star/sibling (disc + highlight).
- Radial glow halos: `createRadialGradient`, halo radius scales with data precision (exact=5.5×, date=8×, year=11×) — year-only people render as soft diffuse light, exact-time as crisp.
- Links: quadratic bezier curves + gradient between node element colours (prototype `hexA` pattern). Travelling light pulse along each link via `t * 0.0002` fraction along the bezier.
- Gentle drift: `sin/cos` with per-person phase and speed, matching prototype `pos()`.
- Hover inspector: glass card floating over canvas, slides in, shows form / precision / "click to open".
- Click on any node routes to `/app/person/[id]`.
- Legend strip: celestial form key at bottom of canvas container.
- Duplicate bottom nav row deleted per spec.
- Canvas fills full container width (was ~55% with dead space).

Step 5 — `/app/compare`:
- Numeric score line (`Overall 52 · emotional 55`) replaced with `.dyn`-style labeled qualitative outcomes from landing: word labels from `galaxia.jsx sdesc()` thresholds (≥76 Effortless, ≥68 Easy & warm, ≥58 Workable, ≥48 Tender, else Charged), colour-banded with thin underline bars sized to percentage.
- Raw numbers behind a "Show numbers" disclosure.
- **Built the missing "What [name] needs from you" callout** — the tip block that the landing promises and the app never had. Renders for both persons with italic body copy and gold `→` lead-in.

Step 6 — `/app/person/[id]`:
- Big Three replaced with 3-up glyph chips from landing `.chip` pattern: glyph (zodiac unicode), label-caps (SUN/MOON/RISING), value (sign name), one-line vibe from `galaxia.jsx VIBE`.
- Placement list from landing `.pl` pattern: element-gradient glyph square (`galaxia.jsx EL_GRAD`), body name + house badge, degree as `16°48′` (not decimal), SIGN_VIBE gloss.
- Aspect section: sorted by orb ascending, tight (<2°) get gold left-border accent class, loose (>5°) dimmed. Aspect glyphs from `galaxia.jsx ASPGLY`, one-liners from `ASPLINE`.
- Glyph maps in `lib/design.ts` extended with `ASPECT_GLYPH`, `ASPECT_LINE`, `SIGN_VIBE`, `HOUSE_AREA`, `EL_GRAD` (all from `galaxia.jsx`).

---

## 2026-07-08

**[DECISION] `design/reference/` is the design source of truth, committed to the repo.**
`galaxia.jsx` (app structure: chart wheel, glyph maps, Home/Profile/Compare, starfield) and `galaxia-landing-v2.html` (material: glass, blur, aura, type scale). Reason: these lived outside the repo for weeks, so Cursor never saw them and invented generic replacements twice. Reference only; never imported by `apps/web`.

**[ADDED] `ENGINEERING.md`.** Standards derived from the failure modes actually hit in this project.

**[OPEN] Design parity work not started.** `.glass-card` in `apps/web/app/globals.css` uses `blur(8px)`, an opaque violet border, `16px` radius, `18px` padding, and **zero `box-shadow` anywhere in the file**. The landing uses `blur(22px) saturate(1.15)`, a translucent gold hairline `rgba(230,174,108,.13)`, `22px` radius, `24px` padding, and a two-layer shadow with an inset highlight. There is also **no starfield or cosmic aura in the app shell**. This is the single highest-leverage fix. See `galaxia-design-parity-spec.md`.

**[FIXED] Vela edge function reaching Anthropic.** Rewritten for the Anthropic Messages API (`https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`, system prompt as a top-level field, `content_block_delta` SSE parsing). Runs on a single `ANTHROPIC_API_KEY`. Model pinned to `claude-sonnet-5` via `ANTHROPIC_MODEL`.

**[FIXED] Vela deployed to the wrong Supabase project.** The function was deployed and tested against `nsmkddufubobtmhypfho` (an unrelated project) while the key lived on `eigfvribtntbxyjutsma`. Symptom was a misleading "not configured" 503.

**[FIXED] Edge function required manually-set `SUPABASE_*` secrets.** Supabase auto-injects these and blocks setting them by hand. The function now reads the injected values.

**[FIXED] Hardcoded placeholder synastry scores fed to Vela.** Vela was reasoning over invented compatibility numbers. Now uses real `computeSynastry` output.

**[FIXED] Debug scaffolding shipped to production.** Removed: `Upgrade to Galaxia+ (debug)` label, `Connected to shared Supabase account` footer, raw session UUID, `monospace` fonts in the notes and Vela inputs, and a black-on-dark Arial rendering bug on `/app/groups`. The debug tier toggle wrote directly to the database, allowing a user to grant themselves a paid plan. That was a revenue defect.

**[FIXED] App screens 404'd in production.** The entire web app (`/welcome`, `/app`, `/app/person/[id]`, `/app/compare`, `/app/groups`, `/app/vela`, `/app/settings`) sat unmerged on branch `cursor/web-app-vertical-slice-b265` for weeks while everyone debugged deploy config. Merged to `main` with `-X theirs`, keeping the premium landing page.

**[DECISION] No root `vercel.json`.** Vercel's native Next.js detection with Root Directory `apps/web` and Framework Preset `Next.js` is the working configuration. Every custom `vercel.json` we tried fought one of those two settings (doubled output paths, missing Next detection, or a hunt for a nonexistent `public/` directory).

**[FIXED] Premium landing design ported into `apps/web/app/page.tsx`.** Previously the design only existed on a throwaway static Vercel project (`galaxia-site`) while the real project served a bland stub.

**[OPEN] Retire the `galaxia-site` Vercel project.** Only after confirming the `galaxia` project serves the premium landing.

---

## 2026-07-07 and earlier

**[FIXED] Geocoding and timezone for birth data.** City → lat/lng, IANA timezone via coordinate lookup, stored `tz_offset_min`. Birth time was previously treated as UTC, which silently produced wrong houses and rising signs.

**[DECISION] Keyless geocoding.** Open-Meteo (not Nominatim) plus `tz-lookup`. City-level accuracy is sufficient for a natal chart; a keyed provider adds billing setup for no accuracy benefit. Manual lat/lng remains an advanced override.

**[DECISION] Interpretation copy is a static curated library, not LLM-generated.** Reason: instant, free, deterministic, and it protects the brand promise ("real astrology, not AI making things up"). Vela remains the conversational layer on top.

**[FIXED] Supabase schema applied.** Four migrations run in order against `eigfvribtntbxyjutsma`; 14 tables. The schema had never been applied to this project, so every write would have failed.

**[DECISION] `eigfvribtntbxyjutsma` (GALAXIA org) is the only Galaxia Supabase project.** `nsmkddufubobtmhypfho` belongs to an unrelated project and must never appear in this codebase.

**[FIXED] `ERR_INVALID_THIS` on every Vercel install.** pnpm 9.12.3 could not reach the npm registry on Vercel's Node version. Vercel ignores the `packageManager` field, so the version had to be forced. Since resolved by removing custom install commands entirely.

**[FIXED] Expo web white screen.** Metro cannot resolve pnpm's nested `node_modules`. Root `.npmrc` now sets `node-linker=hoisted`. Also added the missing `metro.config.js` and `babel.config.js` to `apps/mobile`.

**[FIXED] Critical engine bug: heliocentric coordinates in a natal chart.** An AI agent used `EclipticLongitude()` (heliocentric) instead of geocentric positions. The Moon, Mercury, Venus, and Mars were all wrong. The agent's own tests passed because they tested its own wrong output. Fixed with `GeoVector`/`Ecliptic`/`EclipticGeoMoon`. **Lesson: test against external ground truth, never self-consistency.**

**[DECISION] `astronomy-engine` (MIT), not Swiss Ephemeris (AGPL).** Chiron and asteroids will come from an embedded ephemeris data table rather than an AGPL dependency.

**[DECISION] Names are locked.** App = Galaxia. Home view = Galaxia Mea. AI guide = Vela. Do not re-suggest.

---

## Open items

- **[OPEN] Design parity.** Card recipe, app-shell atmosphere, shared components. See `galaxia-design-parity-spec.md`. Highest leverage work in the product.
- **[OPEN] The moat is undesigned.** Three independent audits agreed: the constellation graph and the generational layer are the only features no competitor has, and they are currently the least designed things we ship. The constellation is a cropped force graph with no glow, no curves, no hover state, using ~55% of its container.
- **[OPEN] `/app/compare` contradicts the marketing promise.** It prints `Overall 52 · emotional 55` while the landing promises "Not a dating-app score. A real map." The "What [name] needs from you" callout, the actionable payoff of the whole feature, was never built.
- **[OPEN] Natal chart is incomplete.** Missing Chiron, North/South Node, Lilith, retrograde flags, element/modality balance, and the chart wheel that exists in `design/reference/galaxia.jsx`. House system must default to **Placidus** to match the sites users cross-check against; the engine currently uses whole-sign. See `galaxia-natal-chart-standard.md`.
- **[OPEN] Constellation as a living sky.** Prototype exists (`galaxia-constellation-prototype.html`): celestial form derived from bond type, sharpness derived from birth-data precision, nebulae for generational cohorts, transits as shooting stars, drag-to-name constellations. Not yet specced for build. Held pending review.
- **[OPEN] Chart accuracy regression tests** against astro.com for known charts.
- **[OPEN] Mobile app** (`apps/mobile`) still points at the wrong Supabase URL in its local `.env`.
