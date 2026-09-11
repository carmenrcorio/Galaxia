# Galaxia — Engineering Standards

Every rule here exists because we broke it and lost time. Read this before writing code or instructing an AI agent.

---

## 1. Design source of truth lives in the repo

**Rule:** If a design is authoritative, it is committed. No exceptions.

The premium landing page and the app prototype existed for weeks only as files outside the repo. Cursor could not see them, so it invented generic replacements twice: once for the marketing homepage, once for every signed-in screen. Weeks of rework.

- `design/reference/galaxia.jsx` — the app's structural source of truth: natal chart wheel, sign/planet/aspect glyph maps, house rings, Home / Profile / Compare screens, starfield.
- `design/reference/galaxia-landing-v2.html` — the material source of truth: glass card recipe, blur, cosmic aura, gold hairlines, type scale, motion.

**When writing a spec, cite the file and the component.** Never describe a design in prose when a reference implementation exists. Say "port the `Wheel` component from `design/reference/galaxia.jsx`," not "add a chart wheel."

These files are reference, not build inputs. They are never imported by `apps/web`. They exist so humans and agents can read the actual code.

---

## 2. Configuration files that must not be touched

Deploys broke repeatedly because an agent rewrote infrastructure config it did not understand.

**Never modify without explicit human approval:**
- Vercel project settings (Root Directory = `apps/web`, Framework Preset = `Next.js`)
- Root `.npmrc` (`node-linker=hoisted`, required for Expo + pnpm)
- `apps/web/next.config.mjs` core config (you may extend `transpilePackages`, nothing else)
- `supabase/migrations/*` once applied (add a new migration; never edit an applied one)

There is deliberately **no root `vercel.json`.** Vercel's native Next.js detection with Root Directory `apps/web` is the working configuration. Do not add one back.

---

## 3. Work is not done until it is on `main` and deployed

An agent reported "implemented, build passes" for the entire web app. The work sat on an unmerged branch for weeks. `/welcome` and `/app` 404'd in production the whole time while everyone debugged the wrong layer.

**Definition of done, all five required:**
1. Code committed to a branch and pushed.
2. PR opened against `main`.
3. Merged to `main`.
4. Vercel deploy from `main` reaches **Ready**.
5. The change is verified on the live URL by loading it.

For changes under `supabase/functions/**`, also required: the **Deploy Edge Functions** GitHub Action on that merge is green (Vercel does not ship Deno edge code). Do not treat a laptop `supabase functions deploy` as the happy path — see `docs/ship-checklist.md`.

"The build passes locally" is not done. "I implemented it" is not done. An agent claiming completion must report: branch name, PR link, files changed, deploy status, live URL.

---

## 4. Diagnose before fixing

Every deploy failure in this project had a distinct root cause, and each guess-fix cost a cycle. Read the actual error. Trace it to a specific file, setting, or line. State the cause before proposing the fix.

Symptoms are not causes:
- "404 on a route" → is the file on `main`? is it in the build's route table?
- "white screen" → open the console; a route that builds can still throw at runtime
- "wrong design showing" → is the design in the repo at all?

When an agent cannot reproduce, it says so and asks. It does not guess.

---

## 5. One project per service

Two Supabase projects and two Vercel projects caused hours of confusion. Functions were deployed to the wrong backend; secrets were set on a project the code never called.

- **Supabase:** `eigfvribtntbxyjutsma` (GALAXIA org). This is the only Galaxia backend. `nsmkddufubobtmhypfho` is an unrelated project and must never appear in this codebase.
- **Vercel:** the `galaxia` project only. Root Directory `apps/web`, Framework `Next.js`.

Before deploying an edge function or setting a secret, confirm the project ref. The `sb-project-ref` response header tells you which project actually served a request.

---

## 6. Environment variables

- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- Mobile: same values, `EXPO_PUBLIC_` prefix
- Edge functions: Supabase **auto-injects** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Read them with `Deno.env.get`. You cannot set secrets with a `SUPABASE_` prefix; a function that requires you to is broken.
- Vela: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (currently `claude-sonnet-5`).

Never commit a key. Never print a key, a session ID, a user ID, or a project ref in the UI.

A function must fail with a readable message naming the missing variable, never a bare 500.

---

## 7. Nothing internal reaches the user

A shipped build once contained a button labeled `Upgrade to Galaxia+ (debug)`, a footer reading `Connected to shared Supabase account`, and a raw session UUID. For a product whose entire promise is "private by design," this is worse than an ugly screen.

Before any deploy, grep for: `debug`, `TODO`, `FIXME`, `Supabase`, `console.log`, raw UUIDs, backtick-wrapped route names in user copy.

A control that writes to the database must never be a debug toggle. The tier switch that let a user grant themselves a paid plan was a revenue bug, not a cosmetic one.

---

## 8. Astrology correctness is non-negotiable

The brand promise is "real astrology, real data, not AI making things up." Users will cross-check against astro.com.

- Tropical zodiac, **Placidus** houses, True Node. These match the reference sites users trust.
- Birth time is **local time at the birth place**, converted to UTC via that place's historical timezone including DST. Treating birth time as UTC produces a confidently wrong chart, which is worse than an incomplete one.
- Planet longitudes must match astro.com within ~0.1°; Ascendant within ~0.5°. Keep regression tests against known charts.
- Chart interpretation copy is a curated static library. The LLM never invents a placement. Vela interprets computed facts only.
- The engine is `@galaxia/astro`. An AI agent once replaced geocentric coordinates with heliocentric ones and its own tests passed because they tested its own wrong output. **Test against external ground truth, not self-consistency.**

---

## 9. Privacy rules that are load-bearing

- A user's notes about a person are private to that user. Never shared, never shown to the subject, never fed into a conversation the subject can see.
- No two-way AI chat with a minor. Guidance about a child is private to the parent.
- In a consented shared space, Vela never takes a side.

These are product promises made on the landing page. Code that violates them is a defect, regardless of how it looks.

---

## 10. Instructing AI coding agents

- Cite reference files and components, not prose descriptions.
- State explicitly what must not be touched (Section 2).
- Require a milestone: one deployed, verifiable vertical slice before broad work.
- Require the agent to report: root cause, branch, PR, files changed, deploy status, live URL.
- Never accept "it works" without a live URL you loaded yourself.
- Finalize the spec before the build starts. Mid-build spec changes are how we got three competing versions of the same screen.

---

## 11. Changes are recorded

Every meaningful change, decision, or reversal is recorded with a date and a reason. If we cannot reconstruct why something is the way it is, we will break it again.

**How to record it (merge-proof convention):** do **not** edit the top of `CHANGELOG.md`. Every branch used to append to the same spot there, so nearly every PR hit a pointless merge conflict on the changelog. Instead, each change adds its **own file**:

- Create one file per change at `changelog.d/<your-branch-slug>.md` (branch name, slashes → `-`). Because the filename is unique to the branch, parallel branches never touch the same file and never conflict.
- Write the entry as it should appear in `CHANGELOG.md` — a `## Title (branch …) — YYYY-MM-DD` section using the `[TYPE]` format above (`DECISION`, `FIXED`, `ADDED`, `CHANGED`, `REVERTED`, `BROKEN`, `OPEN`). Copy `changelog.d/_TEMPLATE.md` to start. See `changelog.d/README.md` for the full convention.
- Commit the fragment on the same branch as the code change.
- At release, a maintainer runs `pnpm changelog:collate --write`, which folds every fragment into the top of `CHANGELOG.md` (newest first) and deletes the consumed files. `CHANGELOG.md` remains the append-only released history.

**One-line instruction for AI-agent prompts:** *"Record this change by adding a new `changelog.d/<branch-slug>.md` fragment (see `changelog.d/README.md`) — do not edit `CHANGELOG.md` directly."*

---

## 12. Galaxia never fabricates

**Galaxia never fabricates. Where the data or the method is not what we claim, we say so, or we do not show it. A silent fallback that produces a confident wrong answer is worse than no answer.**

This rule exists because the same failure shipped four times:

1. Year-only births were silently computed for July 1 and shown as settled signs.
2. A missing timezone was silently treated as UTC (the code comment called it "the old (wrong) behavior").
3. An ambiguous city was silently geocoded to the first result (Jacksonville, Florida instead of Arkansas).
4. Equal House cusps were silently labeled **Placidus**.

What this means in code:

- A default that stands in for missing data is only acceptable when the UI says so (e.g. "sign uncertain — could be X or Y", "Whole Sign shown because Placidus is undefined at this latitude").
- Labels are derived from the data (`chart.houseSystem`, the stored row), never hardcoded strings that assert a method.
- A lookup or network failure surfaces as an error the user can read — never as an empty result, a zero, or "no results found" for an outage.
- Uncertainty flags computed by the engine (`confident`, `possibleSigns`, `houseSystemFallbackReason`) must be respected by every surface that renders the data, including what is fed to Vela.
- Regression tests assert against **external ground truth** (astro.com, Cafe Astrology), never the engine's own output.

---

## 13. The constellation reflects the record, never app usage

**The map may reflect facts of the record — an active transit, a saved reading, a written note, an approaching solar return — but never app-usage frequency.**

Edge weight or node emphasis that encodes "how often you open this person in the app" is a streak wearing a costume. It would quietly punish the healthiest relationships: the ones you don't need to check on. Every visual difference on the constellation must map to a real, inspectable event — click the edge and the reason is right there.

This is a corollary of §12 (never fabricate) and the product's own constraint list (no streaks, no badges, no per-person score as a headline). A synastry score is time-invariant (two fixed birth charts produce one constant); it is a fact, not a trend, and must never be animated into a fake trajectory. What genuinely moves is transits against a natal chart and the notes a person writes — build every "living" surface from those.

---

## 14. Cron routes need a scheduler outside `vercel.json` — use GitHub Actions

A `POST`-able route existing under `app/api/cron/*` is not the same as it running. `relational-transit-scan` and `relational-transit-push` (Generations Feature 3) shipped, passed review, and sat unscheduled for a stretch because the obvious fix — a Vercel Cron Jobs entry — requires a committed `vercel.json`, which §2 forbids (Vercel's native Next.js detection with Root Directory `apps/web` is the working deploy config; a `vercel.json` broke it before). Nobody wrote down that constraint next to the routes, so the missing schedule wasn't obvious from the code.

**The fix:** schedule these routes from `.github/workflows/relational-transits.yml` instead. GitHub Actions' own `schedule:` cron trigger calls the deployed route over HTTPS with `curl`, exactly like a Vercel Cron Job would — the route itself stays framework-agnostic (`CRON_SECRET`-bearer-gated, unaware of what triggered it) and `vercel.json` is never touched.

- Two jobs, `scan` then `push` (`needs: scan`), daily, plus `workflow_dispatch` for an on-demand run from the Actions tab.
- Off-peak cron minute/hour (not `:00`) — GitHub's scheduler queue is busiest at the top of the hour and can delay or drop runs there.
- Requires two repository secrets that are **not** set automatically (see the PR/task that added this workflow for the exact names and value formats): the deployed `apps/web` origin, and a value matching the `CRON_SECRET` already configured on the Vercel project's env vars. A run fails loudly (`::error::`) if either is missing, rather than silently no-op'ing.
- Both cron routes return a JSON body with real counts (`ownersScanned`/`eventsUpserted`/`skipped` for scan; `evaluated`/`pushed`/`skipped` for push) — the workflow echoes the HTTP status and that body (never the secret) so a red run in the Actions log says *why*, not just *that*.
- **`nudge-compute`, `nudge-send`, and `trial-emails` are wired up the same way** — `.github/workflows/nudge-delivery.yml` (`compute` then `send`, `needs: compute`, hourly — see below for why `compute` also runs hourly, not daily) and `.github/workflows/trial-emails.yml` (daily). Every route's success response is already a JSON object with real numeric counts (never a bare `200`); the workflows echo status + body the same way `relational-transits.yml` does.
- **Why `nudge-compute` runs hourly, not once a day:** `nudge-send`'s own doc comment requires an hourly trigger (`isDueForNudgeSend` narrows each hourly run to the owners whose *local* clock just reached 9am — one UTC cron can't hit "9am local" for every IANA timezone at once). A single once-daily `nudge-compute` run at a fixed UTC time provably cannot precede every timezone's local-9am check (offsets span UTC-12..UTC+14, a 26-hour spread against a 24-hour day — some offset's local-9am always lands before a fixed daily run gets to it). `nudge-compute`'s upsert is idempotent (`onConflict: person_id,date, ignoreDuplicates: true`), so running it every hour alongside `send` closes that gap exactly, at the cost of 23 extra cheap no-op passes a day rather than one real one.
- Every workflow above needs the same two repository secrets (`GALAXIA_APP_URL`, `CRON_SECRET`) — see the PR/task that added each workflow for the exact names and value formats. A run fails loudly (`::error::`) if either is missing, rather than silently no-op'ing.
