# Galaxia — Changelog & Decision Log

Every meaningful change, decision, and reversal. Newest first. If a decision is not written here, it will be re-litigated or broken.

Format: `[TYPE] Summary` followed by the reason. Types: `DECISION`, `FIXED`, `ADDED`, `CHANGED`, `REVERTED`, `BROKEN`, `OPEN`.

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
