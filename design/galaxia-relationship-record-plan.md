# Galaxia — The Relationship Record Plan

*Drafted 10 July 2026, from two independent product audits (the full walkthrough audit and the Gemini home-screen audit), cross-checked line-by-line against the code on `main`. This plan is Phase-0-complete-aware: it assumes real Placidus, the fabrication rules (ENGINEERING.md §12), and the Vela suggestion chips are merged. It does not touch Phase 1 (pricing/Stripe), which remains the top business priority per `design/galaxia-consolidated-plan.md` and can run in parallel.*

---

## 0. The one-sentence diagnosis

Both audits, from different vantage points, found the same missing object: **the product computes and captures everything about a relationship, and then never reads any of it back.** The walkthrough audit called it dead-ends and evaporating insights; the Gemini audit called it "six tabs" and the "fragment graveyard." They are describing one absence. The fix is not six features — it is one object, the **Relationship Record**, that every feature writes into and every page reads from.

The encouraging part, verified in code: the data layer is already ~80% built.

| What the Record needs | Where it already exists |
|---|---|
| Person-scoped and pair-scoped notes | `notes` table already has `about_person`, `pair_low`, `pair_high` — the "two disconnected note stores" are **one table** written by two UIs that never cross-query |
| Conversation scope | `threads` table already stores `subject_person`, `pair_low`, `pair_high`, `group_id`, `mode` |
| Full conversation history | `messages` per thread (now with `suggestions` split out) |
| Synastry snapshots | `synastry` table exists (`person_low`, `person_high`, `relation_type`, `data jsonb`, `computed_at`) — currently unused by the web Compare flow |
| Birth data for triggers | `people.birth_date/birth_time/birth_place/tz_offset_min` — confirmed populated |
| Live transit computation | `computeTransits` already runs on the home page (`apps/web/app/app/page.tsx` ~line 386) |

What's missing is almost entirely **read paths, handoffs, and three columns**. That is why this plan is achievable without re-architecting anything.

---

## 1. What stays sacred (design & feel)

Nothing in this plan introduces a new visual language. Every surface below is built from the existing kit: glass cards, Fraunces display / Inter body, gold-on-ink accents, mist violet secondary, the element colors only on glyphs, the constellation as the signature. Reference files remain `design/reference/galaxia-landing-v2.html` (material) and `design/reference/galaxia.jsx` (structure).

Hard constraints carried forward, non-negotiable:

- **No streaks, badges, daily horoscope feed, or per-person score as a headline** (consolidated plan §Phase 4, both audits agree).
- **Galaxia never fabricates** (ENGINEERING.md §12). Every trigger in this plan is a real astronomical or user-generated event. Every education string is hand-written, deterministic, rendered verbatim.
- **Privacy is load-bearing** (ENGINEERING.md §9): notes and pinned insights are owner-only, never in shared mode; the minor gate is untouched; nothing in the Record is ever visible to the person it is about.
- **Vela remains the only LLM surface.** The Record, the timeline, the decode layer, the triggers — all deterministic.

---

## 2. The core object: the Relationship Record

### 2.1 Definition

The Record for a scope (a person, a pair, or a group) is the date-ordered union of:

1. **Notes** the user wrote (person page "Private notes" + Compare "Log a moment" + the new tending notes — all already/soon one table).
2. **Vela pins** — insights the user explicitly saved from a conversation.
3. **Saved readings** — a Compare run or a Groups overlay snapshot, saved as an immutable entry with its computed payload.
4. **Conversations** — the Vela threads scoped to this person/pair/group, reopenable.
5. **Live layer** (not stored, computed at render): today's transits touching this person; upcoming solar return.

### 2.2 Data model changes (one migration)

`notes` becomes the single timeline store. It already has `owner_id`, `about_person`, `pair_low`, `pair_high`, `body`, `transit_snapshot jsonb`, `created_at`. Add:

```sql
alter table notes add column if not exists group_id uuid references groups(id);
alter table notes add column if not exists kind text not null default 'note'
  check (kind in ('note','tending','vela_pin','compare_reading','cohort_reading'));
alter table notes add column if not exists payload jsonb;        -- scores, overlay, aspect list for saved readings
alter table notes add column if not exists source_thread_id uuid references threads(id);
```

- `kind='note'` — freeform (existing rows default correctly).
- `kind='tending'` — a note logged from a trigger prompt (Workstream C), same privacy as any note.
- `kind='vela_pin'` — body = the pinned Vela paragraph verbatim, `source_thread_id` links back to the reopenable conversation.
- `kind='compare_reading'` — `payload` = `{ relationType, scores, topAspects, generational }` at save time. Immutable; this is what makes "warmth moved from Charged to Tender between July and September" computable later — an honest delta between two saved facts, never an invented narrative.
- `kind='cohort_reading'` — `payload` = the overlay (`sharedSky`, `faultLines`, pair highlights), `group_id` set.

**Why reuse `notes` instead of a new table:** RLS policies, owner scoping, and the privacy promise ("notes are owner-only") already exist and are already correct for this table. A second timeline table would need identical policies and would reintroduce the exact disconnection we are removing. One store, one privacy rule, one query.

No other schema changes are needed for Workstreams A–B. (Workstream C adds one small table for trigger de-duplication, described there.)

### 2.3 The Record read API (one shared lib)

New `apps/web/lib/record.ts`:

- `fetchRecord(scope: { personId } | { pairLow, pairHigh } | { groupId }, limit)` → date-ordered entries: notes of all kinds ∪ threads (as conversation entries with preview + href).
- `fetchVelaTrace(personId | pair)` → the last 1–2 `vela_pin` entries, plus the most recent scoped thread (for "Vela has said this about them").
- `saveReading(...)`, `pinInsight(...)`, `logTending(...)` — thin writers.

Everything below renders from these three calls. This is the connective tissue both audits asked for, as a library instead of six ad-hoc queries.

---

## 3. Workstream A — Close the verified dead-ends (root causes from code)

Small, independently shippable fixes. Each one was verified in the current source; several have precise root causes the audits could only observe from outside.

**A1. Resume a thread — make it actually resume.**
Root cause found: the home chips *do* carry `href="/app/vela?threadId=…"` on current `main` (`apps/web/app/app/page.tsx` ~line 496 — production during the audit predated this), but resume is still broken as an experience: `apps/web/app/app/vela/page.tsx` reads `threadId` only once on mount via `window.location.search`, **never restores the thread's scope** — the Focus selectors stay at defaults (first person, mode "ask"), so the "Asking about X" header misrepresents the conversation — and the subject-change reset effect can silently discard the thread. The `threads` row already stores everything needed (`subject_person`, `pair_low/high`, `group_id`, `mode`). Fix: on `threadId` load, fetch the thread row, set `mode/scope/subjectId/pairId/groupId` from it, *then* load history; switch to `useSearchParams` so client-side navigation works; suppress the reset effect during restoration. Acceptance: click any home chip → the exact conversation reopens, correct people pre-selected, correct mode, sending continues the same thread.

**A2. Compare → Vela handoff carries the pair.**
Root cause found: Compare links to `/app/vela?subjectPersonId=${personA.id}` (`compare/page.tsx` ~line 383) — and the Vela page **never reads that parameter at all**. Fix both sides: Compare passes `?scope=pair&subject=A&pair=B&relType=partners`; Vela reads and applies them. Also pre-fill the first message suggestion from the compare context ("What do we need most from each other?" already exists as a chip). Acceptance: one click from a Compare result lands in Vela with Focus=pair, both people selected, relationship type carried.

**A3. Groups: save the reading, ask Vela, un-inert saved groups.**
The overlay lives only in component state (`groups/page.tsx`) — nothing writes it anywhere. Add: (a) **Save this reading** → `kind='cohort_reading'` note with the overlay payload and `group_id`; (b) **Ask Vela about this group** → `/app/vela?scope=group&groupId=…` (the Vela page and edge function already support group scope end-to-end); (c) selecting a saved group restores its member selection and re-generates the overlay in one step (also fixes the audited "generate twice" bug — the first click currently only registers selection state). Acceptance: build cohort → save → navigate away → reopen group → the reading is there, datestamped, plus one-click Vela.

**A4. Today in your sky — click-through.**
The widget names people with no links (`page.tsx` ~line 484) and shows only the self transit summary. Fix: each named person becomes a link to their profile with the transit context carried (`/app/person/[id]?transit=mercury-trine-mars`), where a small banner renders "Active today: Mercury trine your natal Mars (1.1° orb)" above the chart using the existing deterministic aspect copy, plus an "Ask Vela about this" chip that deep-links with a pre-filled prompt. No new computation — `computeTransits` output is already in hand at render time.

**A5. `/account` "Your data" made real.**
The route exists but is a stub ("email support to request an export"). For a privacy-first product this is the promise page. Build self-serve: **Export my data** → server route bundles the user's `people`, `charts`, `notes`, `threads/messages` as JSON download; **Delete account** → typed-confirmation flow calling a server route (service-role cascade). This also closes an App Store review requirement later.

**A6. The 5-person cap dies with Phase 1 — until then, say it.**
Current `main` already blocks with an inline message on `/welcome`; the audited silent redirect appears fixed, but the home "Add people" path should show the same state, not depend on landing in the form first. Phase 1 (one tier, unlimited people) deletes the cap entirely; A6 is a two-line honesty patch in the interim, not an investment.

**A7. Navigation redundancy.**
Keep the header nav as the single global navigation. The duplicated footer links on `/app` become **contextual** actions (they survive only where they are the natural next step: "Add people" stays on home; "Compare these two" appears on a person page; etc.). This is subtraction, not construction.

---

## 4. Workstream B — The Record surfaces

The order matters: B1 is the audit's "one thing" and everything else is the same data rendered elsewhere.

**B1. The person page timeline ("The record").**
New section on `/app/person/[id]`, below the chart sections, above Private notes (which merges into it): the date-ordered Record for this person — notes, tending notes, Vela pins (with "reopen conversation" linking via `source_thread_id`, resolved by A1), saved Compare readings involving this person, and scoped threads. Day-1 user: section shows a single quiet line ("Nothing recorded yet — notes, saved readings, and Vela conversations about {name} will gather here."). Day-60 user: a real history. The chart above never changes; the layer on top accumulates. This is the reference-document → living-document shift, on the page where it was missing.

**B2. "Vela has said this about them."**
Small module near the top of the person page (distinct visual treatment from Private notes — violet hairline, Vela's air-color sender styling from the chat bubbles): the last 1–2 pinned insights about this person or any pair containing them, each with a reopen link. Empty state: a single "Ask Vela about {name}" chip. This is the exact gap the auditor hit standing on Jamie's page after a Carmen×Jamie conversation.

**B3. Pin to profile.**
On every Vela answer bubble (web), a quiet "Pin" affordance (mist text, no gold — same secondary hierarchy as the suggestion chips). Pinning writes `kind='vela_pin'` with the answer body verbatim and the thread reference, scoped to the thread's subject/pair/group. Owner-private always; in shared mode, pinning is still private to the pinner and the pin is never visible to the other participant (privacy rule §9 upheld — the pin is *about* the shared conversation, stored in the pinner's own record).

**B4. Compare: one note store, save the reading, show the delta.**
- "Log a moment" already writes `notes` with `pair_low/pair_high` — keep the write, and render the pair's Record right there under the result (read-side unification; the person page shows the same entries filtered to that person).
- **Save this reading** button → `kind='compare_reading'` snapshot. Also auto-upsert the latest computation into the existing `synastry` table (cheap cache, already schema'd).
- When a previous saved reading exists for the same pair + relationship type, render an honest delta line: "Since 12 July: warmth Charged → Tender, communication unchanged." Computed strictly from the two stored payloads — shown only when both facts exist.

**B5. The Edge Ledger (constellation).**
The Gemini audit's "one thing," built last in this workstream because it is a presentation layer over B1–B4's data. Clicking the connecting line between two nodes on `/app` opens a side panel (bottom sheet under 600px) with three stacked groups: **Active transits between you** (live compute), **Pinned insights** (`vela_pin` for the pair), **Notes & readings** (the pair Record), plus "Open full comparison" and "Ask Vela." Canvas work: the bezier edges need hit-testing (distance-to-quadratic-curve sampling — the canvas already hit-tests nodes for hover, same pattern). The panel replaces nothing on desktop; on first ship, the "Resume a thread" list remains until B1+A1 make it redundant, then it collapses into a smaller "Recent conversations" row.

**B6. Vela name-resolution (the "Riley" disconnect).**
The audit caught Vela saying "I don't have chart info for someone named Riley" while Riley exists as a person. The edge function only receives the thread-scoped people. Fix deterministically — no LLM guessing: before send, the client checks the message text against the user's people names (simple case-insensitive match on `display_name`); on a hit outside the current scope, show an inline suggestion chip above the input: "Switch focus to Riley Nguyen?" / "Add them to this conversation" — explicit user action, never a silent scope change (fabrication rule: we never let the model imply chart access it doesn't have; we also never silently widen scope, which is privacy-relevant in shared mode). On no match: "Add Riley to your constellation" chip linking to capture (Workstream E).

---

## 5. Workstream C — Honest return reasons

All three triggers are real events from data already stored. No mechanic is app-invented. Delivery order: in-app cards first (zero infra), email digest second (Resend, already available in the stack).

**C1. Solar return / birthday horizon.**
Nightly-computable, but implementable with zero infrastructure by computing at home-page load: for each person with a stored `birth_date`, days until solar return (transit Sun conjunct natal Sun — computed from the real ephemeris, not calendar-day approximation, matching the "real astrology" promise; fall back to calendar birthday for date-precision people and say which it is). Within 14 days → a home card: "Jamie Chen's solar return is in 9 days" → links to their profile, which shows what's active in their solar-return year (deterministic transit copy) + "Ask Vela how to mark it" chip + "Log a tending note." Year-only people get the honest version: "Riley's birth year puts their solar return sometime in {year} — add a birth date to track it."

**C2. Transit-triggered tending prompt.**
Extends A4: when a tight transit (≤1.5° orb, already the home-page threshold) touches a non-self person, the person link opens their profile with the transit banner and a one-line deterministic tending prompt drawn from a new hand-written map (transit aspect type × natal body domain — e.g., Mercury trine natal Mars → communication/drive: "a good week for the direct conversation you've been postponing"). Bottom of the banner: **Log a tending note** (`kind='tending'`). This is the Gemini audit's Tending Workspace, embedded in the existing person page rather than a new surface.

**C3. Note echo.**
On home, at most one card, at most once per week: a note from ≥11 months ago about a person, resurfaced verbatim with its date — "A year ago you wrote about Riley: '…' — here's what's active for them now" → links to their Record. Uses only `notes.created_at` + the live transit layer. New tiny table for politeness: `trigger_log (owner_id, kind, subject, fired_at)` so no echo repeats and frequency caps are enforceable server-side later.

**C4. Weekly digest email (opt-in, later).**
One email, weekly max, assembled from C1–C3's already-computed cards via Resend. Opt-in from Settings, one-click unsubscribe. Explicitly not in the first cut; listed so the trigger design keeps a serialization-friendly shape.

**Never:** push streaks, red badges, daily horoscope feed, or any notification without a named real event behind it.

---

## 6. Workstream D — The Decode layer (education in place)

The literacy gap opens exactly where the jargon renders, so the explanation lives exactly there. All copy hand-written, deterministic, rendered verbatim — this extends the interpretation-library moat, it does not add an LLM.

**D1. Glossary primitives.** New `apps/web/lib/decode.ts`: `ASPECT_DECODE` (5 entries: mechanics + relational meaning + tending action — the three-tier structure from the Gemini audit), `ORB_DECODE` (what an orb is; "the smaller, the tighter it runs"), `GLYPH_DECODE` (planets, signs, ASC/MC/DSC/IC), `UNCERTAINTY_DECODE` (plain-language "why twelve possible signs" for year-precision), `HOUSE_DECODE` already exists in `house-interpretations.ts`.

**D2. The affordance.** One component, two behaviors: tap/hover on any aspect name, orb figure, or glyph opens the existing glass tooltip (the `HouseBadge` pattern on the person page, generalized) for one-liners; the three-tier aspect decode opens a slide-in **Context drawer** (right-side panel desktop, bottom sheet mobile) since three tiers don't fit a tooltip. Every aspect row in Key Aspects, every transit line on home, every synastry aspect in Compare becomes decodable. Dotted-underline treatment on decodable terms — subtle, discoverable, not noisy.

**D3. "What am I looking at" wheel toggle.** A small toggle on the natal wheel card. On: plain-language labels render onto the wheel (ASC "rising — how they meet the world," MC, house numbers get their domain word, the ring legend names the three rings) using the existing SVG label pattern. Off by default; state remembered in `localStorage`.

**D4. Uncertainty, kindly.** Where "sign uncertain — could be X or Y" renders (post-Phase-0 honesty), attach the decode: "Why? The {planet} changed signs during {year}. A birth date settles it." — turning the honest-but-confusing state the auditor saw on Riley's page into an honest-and-teachable one, with the add-birth-date action right there.

---

## 7. Workstream E — Capturing people (the direct answer to the closing question)

**Recommendation: both, converging on one pipeline — conversational capture in front, the structured confirmation as the single non-negotiable gate.** Not either/or, and the order matters.

The structured entry (BirthFields) is not incidental UI — it is the enforcement point of the never-fabricate pipeline: named-month date selects (no format ambiguity), the geocode **disambiguation list** (the Jacksonville AR/FL lesson), the resolved-timezone display, the parsed-date echo. A pure chat capture that lets an LLM extract "my sister, Chicago, July 22 1988, 9am" straight into `computeNatalChart` would reintroduce every bug Phase 0 just eliminated, with a friendlier face. So:

**E1. Progressive capture (the real friction killer — build first).**
Allow saving a person with just name + relation. No birth data required to exist in the constellation. Their node renders (already supported visually — year-precision nodes are diffuse), their page shows what's missing and what each addition unlocks ("a birth year adds their generational sky · a date adds their planets · an exact time adds houses"). This is consolidated-plan Phase 2 item 10 and directly attacks the 25–55% never-add-a-second-person number. Schema: `birth_precision` gains an `'unknown'` state (or nullable birth fields with precision `'none'` — decide in implementation; migration either way is additive).

**E2. Vela-assisted capture (build second).**
In any Vela conversation, "Add my sister Rosa, born in Chicago on July 22 1988 around 9am" produces — not a saved person — a **pre-filled confirmation card** rendered in the chat flow: the structured fields populated from the model's extraction, the date echoed back in unambiguous form ("22 July 1988 — confirm?"), and the city as a live disambiguation chip-row (the same Open-Meteo candidates: "Chicago, Illinois, United States" / "Chicago Heights, …"). Saving requires tapping confirm on the card; the card runs the exact same `buildBirthInput` validation as the form. The LLM proposes; the deterministic pipeline disposes. Ambiguity in extraction (two dates, no year) renders as a question, never a guess.

**E3. "Ask them" link (build third).**
On an incomplete profile: "Ask Rosa for her birth time" generates a share link (the `invites` table and `/invite/[token]` route already exist) → a public, unauthenticated, warm one-field page (birth date/time/city with the same disambiguation) that writes back to the pending person on submit. The person entering their own data never sees notes, charts, or anything else (privacy rule). This turns the hardest data acquisition (other people's birth times) into the other person's 30 seconds.

**E4. Entry points.** The constellation gets a first-class "+" affordance (empty-ish state: prominent; populated: quiet corner). Post-self-save onboarding moment ("Who do you want to understand better?" — consolidated plan item 8) routes into E1's minimal capture.

---

## 8. The constellation as a living map — with guardrails

Both audits want the home graph to reflect accumulated reality. Agreed, with one line drawn carefully:

- **Yes:** edge and node rendering may reflect *facts of the record* — an edge with an active tight transit gets the pulse traveling along it (the pulse animation already exists); an edge with a saved reading or recent note renders at slightly higher opacity; a person nearing a solar return gets a warmer halo. Every visual difference maps to a real, inspectable event (click the edge — the Edge Ledger shows exactly why).
- **No:** edge weight must never encode "how often you open this person in the app" or any engagement frequency. That is a streak wearing a costume, and it would quietly punish the healthiest relationships (the ones you don't need to check on). The Gemini audit's "edges change weight based on how frequently the user checks in" is adopted only in the note/reading sense (deliberate acts of tending), never the app-usage sense.

Scale requirement carried from the consolidated plan: the layout must stay elegant at 20+ nodes, since unlimited people is a pricing promise.

---

## 9. Sequencing and dependencies

Ordered by structural leverage; each stage ships independently. No calendar estimates — scope is characterized by what it touches.

| Stage | Contents | Touches | Depends on |
|---|---|---|---|
| **R0** | A1 resume-with-scope, A2 pair handoff, A3 groups save/ask/restore, A4 transit links, A6 cap honesty, A7 nav cleanup | `vela/page.tsx`, `compare/page.tsx`, `groups/page.tsx`, `app/page.tsx` — no schema | Nothing. Start immediately. |
| **R1** | §2 migration + `lib/record.ts`, B1 person timeline, B2 Vela trace, B3 pin, B4 compare save/delta | One migration, person page, compare page, vela page, edge function (pin needs no function change — client writes `notes` directly) | R0-A1 (reopen links) |
| **R2** | B5 edge ledger, B6 name resolution, A5 data export/delete | Canvas hit-testing on `app/page.tsx`, new export/delete server routes | R1 (renders the Record) |
| **R3** | C1 solar return, C2 tending prompts, C3 note echo, `trigger_log` | Home page, person page, one tiny migration, new deterministic copy maps | R1 (tending notes land in the Record) |
| **R4** | D1–D4 decode layer | New `lib/decode.ts` (hand-written copy — the long pole), tooltip/drawer component, person + compare + home surfaces | Nothing (parallelizable with R1–R3) |
| **R5** | E1 progressive capture, E2 Vela capture card, E3 ask-them link, E4 entry points | Welcome/onboarding, vela page + edge function (extraction), invite route, small migration for `'unknown'` precision | E2 depends on nothing in R1–R3; E1 unblocks activation and may be pulled forward next to R0 |
| **Parallel** | **Phase 1 pricing/Stripe** per `galaxia-pricing-implementation-spec.md` | — | Independent; A6 becomes moot when it lands |

Risk notes: R1's migration is additive-only (safe); B5's canvas hit-testing is the only genuinely fiddly UI work in the plan; E2 is the only place an LLM touches structured data and it is sandboxed behind the confirmation card; the Vela edge function changes (B6 hint context, E2 extraction) each require a `supabase functions deploy vela-chat`.

Mobile: everything here is web-first (the live product). The mobile app inherits the data model for free — the Record, pins, and saved readings are plain rows; mobile surfaces follow in a later pass and are explicitly out of scope here.

---

## 10. Acceptance criteria (the audit, re-run, passes)

1. Clicking any "Resume a thread" chip reopens that exact conversation with the correct people and mode selected; sending continues the same thread. The truncated-snippet dead-end no longer exists.
2. "Ask Vela about this relationship" from a Carmen×Jamie compare lands with Focus=pair, both selected, type carried.
3. A Vela insight about Jamie, once pinned, is visible on Jamie's page with a working reopen link; the page "knows about" the conversation.
4. A note logged from Compare about Carmen-and-Jamie appears on both the pair Record and Jamie's person timeline. One store, filterable, verified by writing in one place and reading in the other.
5. A generated cohort overlay can be saved, survives navigation, reappears when the group is reopened, and offers one-click Vela.
6. "Today in your sky" names are links; each lands on a person page showing that transit applied to them, with a tending-note action.
7. A person with a birthday in ≤14 days produces a home card computed from the real solar return; a year-only person produces the honest variant.
8. Every aspect name, orb figure, and glyph on person, compare, and home surfaces is tappable and explains itself in place; the wheel has a working plain-language toggle.
9. A person can be saved with name + relation only, and completed later — including by the person themselves via share link.
10. "Add my sister…" in Vela yields a pre-filled confirmation card that enforces date echo + city disambiguation; nothing saves without explicit confirmation.
11. Zero streaks, badges, or engagement-frequency visuals anywhere; every nudge names its real-world cause; every Record entry is owner-private.

---

## 11. What we will not build (so it's on the record)

- A daily horoscope feed, or any content not grounded in the user's actual charts and record.
- Engagement-frequency edge weights, streaks, badges, leaderboards, red-dot mechanics.
- LLM-generated interpretation copy in the deterministic layer (decode, tending prompts, readings are hand-written).
- Silent scope-widening in Vela (name resolution always asks).
- Auto-saved chat capture (E2 always confirms).
- A second notes store.

---

## 12. Open decisions for Carmen

1. **Pin visibility in shared mode:** plan says pins are always private to the pinner, even pins of shared-thread messages. Confirm this matches the intended shared-space social contract.
2. **Compare auto-snapshot vs explicit save:** plan makes saving explicit (auto-upserting only the invisible `synastry` cache) so the Record stays intentional. The alternative — auto-save every run — makes the delta feature richer but the timeline noisier. Plan recommends explicit; flag if you want auto.
3. **"Resume a thread" afterlife:** once the Edge Ledger and person Records exist, does the home list collapse to a compact "Recent conversations" row (plan's recommendation) or disappear entirely?
4. **E1 `'unknown'` precision naming** — cosmetic but schema-visible; will be decided at implementation unless you have a preference.
5. **R5-E1 pull-forward:** activation data (25–55% single-person trials) argues for shipping progressive capture alongside R0 rather than last. Plan sequences it in R5 for coherence; say the word and it moves.
