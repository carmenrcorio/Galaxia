# Galaxia — Changelog & Decision Log

Every meaningful change, decision, and reversal. Newest first. If a decision is not written here, it will be re-litigated or broken.

Format: `[TYPE] Summary` followed by the reason. Types: `DECISION`, `FIXED`, `ADDED`, `CHANGED`, `REVERTED`, `BROKEN`, `OPEN`.

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
